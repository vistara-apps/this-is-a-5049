import express from 'express';
import DeployedApp from '../models/DeployedApp.js';
import { MonitoringService } from '../services/MonitoringService.js';
import { monitoringRateLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger, logBusiness } from '../utils/logger.js';

const router = express.Router();

// @desc    Get monitoring dashboard data
// @route   GET /api/monitoring/dashboard
// @access  Private
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Get user's apps with monitoring data
  const apps = await DeployedApp.find({
    userId,
    isActive: true,
    deploymentStatus: 'deployed'
  }).select('appId appName healthStatus monitoring lastCheck deployment.url');

  // Calculate summary statistics
  const totalApps = apps.length;
  const upApps = apps.filter(app => app.healthStatus === 'up').length;
  const downApps = apps.filter(app => app.healthStatus === 'down').length;
  const warningApps = apps.filter(app => app.healthStatus === 'warning').length;

  // Calculate average uptime
  const avgUptime = totalApps > 0 
    ? apps.reduce((sum, app) => sum + app.monitoring.uptimePercentage, 0) / totalApps 
    : 100;

  // Calculate average response time
  const appsWithResponseTime = apps.filter(app => app.monitoring.responseTime.current > 0);
  const avgResponseTime = appsWithResponseTime.length > 0
    ? appsWithResponseTime.reduce((sum, app) => sum + app.monitoring.responseTime.current, 0) / appsWithResponseTime.length
    : 0;

  // Get recent incidents
  const recentIncidents = [];
  apps.forEach(app => {
    const incidents = app.monitoring.incidents
      .filter(incident => !incident.resolved)
      .slice(0, 5)
      .map(incident => ({
        ...incident.toObject(),
        appName: app.appName,
        appId: app.appId
      }));
    recentIncidents.push(...incidents);
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalApps,
        upApps,
        downApps,
        warningApps,
        uptimePercentage: avgUptime,
        averageResponseTime: avgResponseTime
      },
      apps: apps.map(app => ({
        appId: app.appId,
        appName: app.appName,
        healthStatus: app.healthStatus,
        uptimePercentage: app.monitoring.uptimePercentage,
        responseTime: app.monitoring.responseTime.current,
        lastCheck: app.lastCheck,
        url: app.deployment.url
      })),
      recentIncidents: recentIncidents.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)).slice(0, 10)
    }
  });
}));

// @desc    Get app monitoring details
// @route   GET /api/monitoring/apps/:appId
// @access  Private
router.get('/apps/:appId', asyncHandler(async (req, res) => {
  const app = await DeployedApp.findOne({
    appId: req.params.appId,
    userId: req.user.userId,
    isActive: true
  });

  if (!app) {
    return res.status(404).json({
      success: false,
      error: 'App not found'
    });
  }

  res.json({
    success: true,
    data: {
      appId: app.appId,
      appName: app.appName,
      healthStatus: app.healthStatus,
      lastCheck: app.lastCheck,
      monitoring: app.monitoring,
      configuration: app.configuration,
      uptimeStatus: app.uptimeStatus
    }
  });
}));

// @desc    Trigger manual health check
// @route   POST /api/monitoring/apps/:appId/check
// @access  Private
router.post('/apps/:appId/check', monitoringRateLimiter, asyncHandler(async (req, res) => {
  const app = await DeployedApp.findOne({
    appId: req.params.appId,
    userId: req.user.userId,
    isActive: true
  });

  if (!app) {
    return res.status(404).json({
      success: false,
      error: 'App not found'
    });
  }

  try {
    // Get monitoring service instance from app
    const monitoringService = req.app.get('monitoringService') || new MonitoringService();
    
    await monitoringService.performManualCheck(app.appId);

    // Refresh app data
    await app.reload();

    logBusiness('Manual health check performed', {
      userId: req.user.userId,
      appId: app.appId,
      appName: app.appName,
      result: app.healthStatus
    });

    res.json({
      success: true,
      data: {
        appId: app.appId,
        healthStatus: app.healthStatus,
        lastCheck: app.lastCheck,
        responseTime: app.monitoring.responseTime.current,
        consecutiveFailures: app.monitoring.consecutiveFailures
      }
    });

  } catch (error) {
    logger.error('Manual health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
}));

// @desc    Update monitoring configuration
// @route   PUT /api/monitoring/apps/:appId/config
// @access  Private
router.put('/apps/:appId/config', asyncHandler(async (req, res) => {
  const app = await DeployedApp.findOne({
    appId: req.params.appId,
    userId: req.user.userId,
    isActive: true
  });

  if (!app) {
    return res.status(404).json({
      success: false,
      error: 'App not found'
    });
  }

  const {
    monitoringEnabled,
    healthCheckInterval,
    healthCheckPath,
    timeout,
    autoRestart,
    alerts
  } = req.body;

  // Update monitoring configuration
  if (typeof monitoringEnabled === 'boolean') {
    app.monitoringEnabled = monitoringEnabled;
  }

  if (healthCheckInterval) {
    app.configuration.healthCheckInterval = Math.max(10, Math.min(3600, healthCheckInterval));
  }

  if (healthCheckPath) {
    app.configuration.healthCheckPath = healthCheckPath;
  }

  if (timeout) {
    app.configuration.timeout = Math.max(5, Math.min(300, timeout));
  }

  if (typeof autoRestart === 'boolean') {
    app.configuration.autoRestart = autoRestart;
  }

  if (alerts && Array.isArray(alerts)) {
    app.monitoring.alerts = alerts;
  }

  await app.save();

  logBusiness('Monitoring configuration updated', {
    userId: req.user.userId,
    appId: app.appId,
    appName: app.appName,
    changes: Object.keys(req.body)
  });

  res.json({
    success: true,
    data: {
      monitoringEnabled: app.monitoringEnabled,
      configuration: app.configuration,
      alerts: app.monitoring.alerts
    }
  });
}));

// @desc    Get monitoring statistics
// @route   GET /api/monitoring/stats
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  const { period = '24h' } = req.query;
  
  // Calculate date range based on period
  let startDate;
  switch (period) {
    case '1h':
      startDate = new Date(Date.now() - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  // Get user's apps
  const apps = await DeployedApp.find({
    userId: req.user.userId,
    isActive: true,
    deploymentStatus: 'deployed'
  });

  // Calculate statistics
  const stats = {
    totalApps: apps.length,
    monitoredApps: apps.filter(app => app.monitoringEnabled).length,
    averageUptime: 0,
    averageResponseTime: 0,
    totalIncidents: 0,
    resolvedIncidents: 0,
    activeIncidents: 0,
    checksPerformed: 0
  };

  if (apps.length > 0) {
    stats.averageUptime = apps.reduce((sum, app) => sum + app.monitoring.uptimePercentage, 0) / apps.length;
    
    const appsWithResponseTime = apps.filter(app => app.monitoring.responseTime.average > 0);
    if (appsWithResponseTime.length > 0) {
      stats.averageResponseTime = appsWithResponseTime.reduce((sum, app) => sum + app.monitoring.responseTime.average, 0) / appsWithResponseTime.length;
    }

    // Count incidents
    apps.forEach(app => {
      const incidents = app.monitoring.incidents.filter(incident => 
        new Date(incident.startTime) >= startDate
      );
      stats.totalIncidents += incidents.length;
      stats.resolvedIncidents += incidents.filter(incident => incident.resolved).length;
      stats.activeIncidents += incidents.filter(incident => !incident.resolved).length;
      stats.checksPerformed += app.monitoring.checksPerformed;
    });
  }

  res.json({
    success: true,
    data: {
      period,
      startDate,
      endDate: new Date(),
      stats
    }
  });
}));

// @desc    Get incident history
// @route   GET /api/monitoring/incidents
// @access  Private
router.get('/incidents', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, appId, severity, resolved } = req.query;
  
  const query = { 
    userId: req.user.userId, 
    isActive: true 
  };
  
  if (appId) query.appId = appId;

  const apps = await DeployedApp.find(query);
  
  // Collect all incidents from all apps
  let allIncidents = [];
  apps.forEach(app => {
    const incidents = app.monitoring.incidents.map(incident => ({
      ...incident.toObject(),
      appId: app.appId,
      appName: app.appName
    }));
    allIncidents.push(...incidents);
  });

  // Filter incidents
  if (severity) {
    allIncidents = allIncidents.filter(incident => incident.severity === severity);
  }
  
  if (resolved !== undefined) {
    const isResolved = resolved === 'true';
    allIncidents = allIncidents.filter(incident => incident.resolved === isResolved);
  }

  // Sort by start time (newest first)
  allIncidents.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  // Paginate
  const total = allIncidents.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedIncidents = allIncidents.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      incidents: paginatedIncidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

export default router;
