import axios from 'axios';
import cron from 'node-cron';
import DeployedApp from '../models/DeployedApp.js';
import User from '../models/User.js';
import { NotificationService } from './NotificationService.js';
import { logger } from '../utils/logger.js';

export class MonitoringService {
  constructor(io) {
    this.io = io;
    this.notificationService = new NotificationService();
    this.monitoringJobs = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Monitoring service is already running');
      return;
    }

    logger.info('Starting monitoring service...');
    this.isRunning = true;

    // Schedule monitoring checks every 30 seconds
    this.scheduleMonitoring();
    
    // Schedule cleanup tasks
    this.scheduleCleanup();
    
    logger.info('Monitoring service started successfully');
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Monitoring service is not running');
      return;
    }

    logger.info('Stopping monitoring service...');
    
    // Stop all cron jobs
    this.monitoringJobs.forEach((job) => {
      job.stop();
    });
    this.monitoringJobs.clear();
    
    this.isRunning = false;
    logger.info('Monitoring service stopped');
  }

  scheduleMonitoring() {
    // Main monitoring job - runs every 30 seconds
    const monitoringJob = cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.performMonitoringChecks();
      } catch (error) {
        logger.error('Error in monitoring job:', error);
      }
    }, {
      scheduled: false
    });

    this.monitoringJobs.set('main-monitoring', monitoringJob);
    monitoringJob.start();

    // Health check aggregation - runs every 5 minutes
    const aggregationJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.aggregateHealthMetrics();
      } catch (error) {
        logger.error('Error in aggregation job:', error);
      }
    }, {
      scheduled: false
    });

    this.monitoringJobs.set('aggregation', aggregationJob);
    aggregationJob.start();
  }

  scheduleCleanup() {
    // Cleanup old monitoring data - runs daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        logger.error('Error in cleanup job:', error);
      }
    }, {
      scheduled: false
    });

    this.monitoringJobs.set('cleanup', cleanupJob);
    cleanupJob.start();
  }

  async performMonitoringChecks() {
    try {
      // Find all apps that need monitoring
      const apps = await DeployedApp.findAppsForMonitoring();
      
      if (apps.length === 0) {
        return;
      }

      logger.info(`Performing monitoring checks for ${apps.length} apps`);

      // Process apps in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < apps.length; i += batchSize) {
        const batch = apps.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(app => this.checkAppHealth(app))
        );
      }

    } catch (error) {
      logger.error('Error performing monitoring checks:', error);
    }
  }

  async checkAppHealth(app) {
    const startTime = Date.now();
    let status = 'unknown';
    let responseTime = null;
    let error = null;

    try {
      const url = app.fullUrl || app.deployment.url;
      if (!url) {
        logger.warn(`No URL found for app ${app.appId}`);
        return;
      }

      const healthCheckPath = app.configuration.healthCheckPath || '/';
      const checkUrl = url.endsWith('/') ? url + healthCheckPath.slice(1) : url + healthCheckPath;
      const timeout = app.configuration.timeout * 1000 || 30000;

      logger.debug(`Checking health for ${app.appName} at ${checkUrl}`);

      const response = await axios.get(checkUrl, {
        timeout,
        validateStatus: (status) => status < 500, // Accept 4xx as "up" but 5xx as "down"
        headers: {
          'User-Agent': 'DeployWise-Monitor/1.0',
          'Accept': 'text/html,application/json,*/*'
        }
      });

      responseTime = Date.now() - startTime;

      if (response.status >= 200 && response.status < 400) {
        status = 'up';
      } else if (response.status >= 400 && response.status < 500) {
        status = 'warning'; // Client errors might indicate issues but app is responding
      } else {
        status = 'down';
      }

    } catch (err) {
      responseTime = Date.now() - startTime;
      error = err.message;

      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
        status = 'down';
      } else if (err.response && err.response.status >= 500) {
        status = 'down';
      } else {
        status = 'warning';
      }

      logger.warn(`Health check failed for ${app.appName}: ${error}`);
    }

    // Update app health status
    await app.updateHealthStatus(status, responseTime);

    // Check if we need to send alerts
    await this.checkAlertConditions(app, status, responseTime, error);

    // Check if auto-restart is needed
    if (app.shouldAutoRestart()) {
      await this.attemptAutoRestart(app);
    }

    // Emit real-time update to connected clients
    this.emitHealthUpdate(app);

    logger.debug(`Health check completed for ${app.appName}: ${status} (${responseTime}ms)`);
  }

  async checkAlertConditions(app, status, responseTime, error) {
    try {
      const user = await User.findOne({ userId: app.userId });
      if (!user) return;

      const shouldAlert = this.shouldSendAlert(app, status, responseTime);
      
      if (shouldAlert) {
        const alertData = {
          app,
          user,
          status,
          responseTime,
          error,
          consecutiveFailures: app.monitoring.consecutiveFailures,
          lastCheck: app.lastCheck
        };

        // Send notifications based on user preferences
        await this.notificationService.sendAlert(alertData);

        // Create incident if this is a new issue
        if (app.monitoring.consecutiveFailures === 1 && status === 'down') {
          await app.createIncident('downtime', 'high', `Application is down: ${error || 'Unknown error'}`);
        }
      }

    } catch (error) {
      logger.error(`Error checking alert conditions for app ${app.appId}:`, error);
    }
  }

  shouldSendAlert(app, status, responseTime) {
    // Don't send alerts if monitoring is disabled
    if (!app.monitoringEnabled) return false;

    // Alert on downtime
    if (status === 'down' && app.monitoring.consecutiveFailures >= 3) {
      return true;
    }

    // Alert on slow response times
    if (responseTime && responseTime > 5000 && app.monitoring.consecutiveFailures >= 2) {
      return true;
    }

    // Alert on warning status with multiple failures
    if (status === 'warning' && app.monitoring.consecutiveFailures >= 5) {
      return true;
    }

    return false;
  }

  async attemptAutoRestart(app) {
    try {
      logger.info(`Attempting auto-restart for app ${app.appName}`);

      // Update status to restarting
      app.healthStatus = 'restarting';
      await app.save();

      // Emit update to clients
      this.emitHealthUpdate(app);

      // Simulate restart process (in real implementation, this would call cloud provider APIs)
      await this.simulateRestart(app);

      logger.info(`Auto-restart completed for app ${app.appName}`);

    } catch (error) {
      logger.error(`Auto-restart failed for app ${app.appId}:`, error);
      
      // Update status back to down if restart failed
      app.healthStatus = 'down';
      await app.save();
      this.emitHealthUpdate(app);
    }
  }

  async simulateRestart(app) {
    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would:
    // 1. Call the cloud provider's API to restart the application
    // 2. Wait for the restart to complete
    // 3. Verify the application is responding
    
    // For now, we'll just reset the consecutive failures and mark as up
    app.monitoring.consecutiveFailures = 0;
    app.healthStatus = 'up';
    app.lastCheck = new Date();
    await app.save();
  }

  async aggregateHealthMetrics() {
    try {
      logger.info('Aggregating health metrics...');

      const apps = await DeployedApp.find({ 
        isActive: true, 
        deploymentStatus: 'deployed' 
      });

      for (const app of apps) {
        // Calculate uptime percentage for the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // In a real implementation, you would query historical monitoring data
        // For now, we'll use the current consecutive failures to estimate uptime
        const estimatedUptime = Math.max(0, 100 - (app.monitoring.consecutiveFailures * 2));
        app.monitoring.uptimePercentage = estimatedUptime;
        
        await app.save();
      }

      logger.info('Health metrics aggregation completed');

    } catch (error) {
      logger.error('Error aggregating health metrics:', error);
    }
  }

  async cleanupOldData() {
    try {
      logger.info('Cleaning up old monitoring data...');

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Clean up old incidents
      await DeployedApp.updateMany(
        {},
        {
          $pull: {
            'monitoring.incidents': {
              startTime: { $lt: thirtyDaysAgo },
              resolved: true
            }
          }
        }
      );

      logger.info('Old monitoring data cleanup completed');

    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  emitHealthUpdate(app) {
    if (!this.io) return;

    // Emit to user's room
    this.io.to(`user-${app.userId}`).emit('app-health-update', {
      appId: app.appId,
      healthStatus: app.healthStatus,
      lastCheck: app.lastCheck,
      responseTime: app.monitoring.responseTime.current,
      uptimePercentage: app.monitoring.uptimePercentage,
      consecutiveFailures: app.monitoring.consecutiveFailures
    });
  }

  // Manual health check endpoint
  async performManualCheck(appId) {
    try {
      const app = await DeployedApp.findOne({ appId, isActive: true });
      if (!app) {
        throw new Error('App not found');
      }

      await this.checkAppHealth(app);
      return app;

    } catch (error) {
      logger.error(`Manual health check failed for app ${appId}:`, error);
      throw error;
    }
  }

  // Get monitoring statistics
  async getMonitoringStats() {
    try {
      const totalApps = await DeployedApp.countDocuments({ 
        isActive: true, 
        deploymentStatus: 'deployed' 
      });

      const upApps = await DeployedApp.countDocuments({ 
        isActive: true, 
        deploymentStatus: 'deployed',
        healthStatus: 'up'
      });

      const downApps = await DeployedApp.countDocuments({ 
        isActive: true, 
        deploymentStatus: 'deployed',
        healthStatus: 'down'
      });

      const warningApps = await DeployedApp.countDocuments({ 
        isActive: true, 
        deploymentStatus: 'deployed',
        healthStatus: 'warning'
      });

      const avgResponseTime = await DeployedApp.aggregate([
        {
          $match: { 
            isActive: true, 
            deploymentStatus: 'deployed',
            'monitoring.responseTime.current': { $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$monitoring.responseTime.current' }
          }
        }
      ]);

      return {
        totalApps,
        upApps,
        downApps,
        warningApps,
        uptimePercentage: totalApps > 0 ? (upApps / totalApps) * 100 : 100,
        averageResponseTime: avgResponseTime[0]?.avgResponseTime || 0
      };

    } catch (error) {
      logger.error('Error getting monitoring stats:', error);
      throw error;
    }
  }
}
