import nodemailer from 'nodemailer';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export class NotificationService {
  constructor() {
    this.emailTransporter = this.createEmailTransporter();
  }

  createEmailTransporter() {
    // Configure email transporter based on environment
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      logger.warn('Email credentials not configured. Email notifications will be disabled.');
      return null;
    }

    return nodemailer.createTransporter(emailConfig);
  }

  async sendAlert(alertData) {
    const { app, user, status, responseTime, error, consecutiveFailures } = alertData;

    try {
      // Determine alert severity
      const severity = this.determineAlertSeverity(status, consecutiveFailures, responseTime);
      
      // Create alert message
      const alertMessage = this.createAlertMessage(app, status, responseTime, error, severity);

      // Send notifications based on user preferences
      const notifications = [];

      if (user.preferences.notifications.email) {
        notifications.push(this.sendEmailAlert(user, app, alertMessage, severity));
      }

      if (user.preferences.notifications.slack && user.integrations.slack.enabled) {
        notifications.push(this.sendSlackAlert(user, app, alertMessage, severity));
      }

      if (user.preferences.notifications.webhooks) {
        notifications.push(this.sendWebhookAlert(user, app, alertMessage, severity));
      }

      // Wait for all notifications to complete
      const results = await Promise.allSettled(notifications);
      
      // Log results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`Notification ${index} failed:`, result.reason);
        }
      });

      logger.info(`Sent ${results.filter(r => r.status === 'fulfilled').length} notifications for app ${app.appName}`);

    } catch (error) {
      logger.error('Error sending alert:', error);
    }
  }

  determineAlertSeverity(status, consecutiveFailures, responseTime) {
    if (status === 'down' && consecutiveFailures >= 5) {
      return 'critical';
    } else if (status === 'down') {
      return 'high';
    } else if (responseTime && responseTime > 10000) {
      return 'medium';
    } else if (status === 'warning') {
      return 'low';
    }
    return 'low';
  }

  createAlertMessage(app, status, responseTime, error, severity) {
    const timestamp = new Date().toISOString();
    
    let message = {
      title: `🚨 Alert: ${app.appName} is ${status}`,
      summary: '',
      details: {
        appName: app.appName,
        status,
        timestamp,
        url: app.fullUrl || app.deployment.url,
        responseTime: responseTime ? `${responseTime}ms` : 'N/A',
        consecutiveFailures: app.monitoring.consecutiveFailures,
        uptime: `${app.monitoring.uptimePercentage.toFixed(2)}%`,
        severity
      }
    };

    switch (status) {
      case 'down':
        message.summary = `Your application "${app.appName}" is currently down and not responding to health checks.`;
        message.title = `🔴 ${app.appName} is DOWN`;
        break;
      case 'warning':
        message.summary = `Your application "${app.appName}" is experiencing issues but is still responding.`;
        message.title = `⚠️ ${app.appName} has issues`;
        break;
      case 'up':
        message.summary = `Your application "${app.appName}" has recovered and is now responding normally.`;
        message.title = `✅ ${app.appName} is back UP`;
        break;
      default:
        message.summary = `Status update for your application "${app.appName}".`;
    }

    if (error) {
      message.details.error = error;
    }

    return message;
  }

  async sendEmailAlert(user, app, alertMessage, severity) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d'
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${alertMessage.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: ${severityColors[severity]}; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .details { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .detail-label { font-weight: 600; color: #374151; }
          .detail-value { color: #6b7280; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${alertMessage.title}</h1>
          </div>
          <div class="content">
            <p>${alertMessage.summary}</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Application:</span>
                <span class="detail-value">${alertMessage.details.appName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${alertMessage.details.status.toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Response Time:</span>
                <span class="detail-value">${alertMessage.details.responseTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Uptime:</span>
                <span class="detail-value">${alertMessage.details.uptime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Consecutive Failures:</span>
                <span class="detail-value">${alertMessage.details.consecutiveFailures}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${new Date(alertMessage.details.timestamp).toLocaleString()}</span>
              </div>
              ${alertMessage.details.error ? `
              <div class="detail-row">
                <span class="detail-label">Error:</span>
                <span class="detail-value">${alertMessage.details.error}</span>
              </div>
              ` : ''}
            </div>

            ${alertMessage.details.url ? `
            <div style="text-align: center;">
              <a href="${alertMessage.details.url}" class="button">View Application</a>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This alert was sent by DeployWise monitoring system.</p>
            <p>You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"DeployWise Alerts" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: alertMessage.title,
      html: emailHtml,
      text: `${alertMessage.title}\n\n${alertMessage.summary}\n\nDetails:\n- Status: ${alertMessage.details.status}\n- Response Time: ${alertMessage.details.responseTime}\n- Uptime: ${alertMessage.details.uptime}\n- Time: ${new Date(alertMessage.details.timestamp).toLocaleString()}`
    };

    const result = await this.emailTransporter.sendMail(mailOptions);
    logger.info(`Email alert sent to ${user.email} for app ${app.appName}`);
    return result;
  }

  async sendSlackAlert(user, app, alertMessage, severity) {
    const webhookUrl = user.integrations.slack.webhookUrl;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d'
    };

    const slackMessage = {
      text: alertMessage.title,
      attachments: [
        {
          color: severityColors[severity],
          title: alertMessage.title,
          text: alertMessage.summary,
          fields: [
            {
              title: 'Application',
              value: alertMessage.details.appName,
              short: true
            },
            {
              title: 'Status',
              value: alertMessage.details.status.toUpperCase(),
              short: true
            },
            {
              title: 'Response Time',
              value: alertMessage.details.responseTime,
              short: true
            },
            {
              title: 'Uptime',
              value: alertMessage.details.uptime,
              short: true
            },
            {
              title: 'Consecutive Failures',
              value: alertMessage.details.consecutiveFailures.toString(),
              short: true
            },
            {
              title: 'Time',
              value: new Date(alertMessage.details.timestamp).toLocaleString(),
              short: true
            }
          ],
          footer: 'DeployWise',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    if (alertMessage.details.error) {
      slackMessage.attachments[0].fields.push({
        title: 'Error',
        value: alertMessage.details.error,
        short: false
      });
    }

    if (alertMessage.details.url) {
      slackMessage.attachments[0].actions = [
        {
          type: 'button',
          text: 'View Application',
          url: alertMessage.details.url
        }
      ];
    }

    const response = await axios.post(webhookUrl, slackMessage);
    logger.info(`Slack alert sent for app ${app.appName}`);
    return response.data;
  }

  async sendWebhookAlert(user, app, alertMessage, severity) {
    // This would send to user-configured webhook endpoints
    // For now, we'll just log that we would send a webhook
    logger.info(`Would send webhook alert for app ${app.appName} (webhook notifications not fully implemented)`);
    
    // In a real implementation, you would:
    // 1. Get webhook URLs from user configuration
    // 2. Send POST requests to those URLs with the alert data
    // 3. Handle retries and failures appropriately
    
    return Promise.resolve();
  }

  async sendWelcomeEmail(user) {
    if (!this.emailTransporter) {
      logger.warn('Cannot send welcome email: Email transporter not configured');
      return;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to DeployWise</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .feature { margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 6px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to DeployWise!</h1>
            <p>Effortless Deployment & Uptime for Your Low-Code Apps</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>Welcome to DeployWise! We're excited to help you deploy and monitor your low-code applications with ease.</p>
            
            <div class="feature">
              <h3>🎯 One-Click Deployment</h3>
              <p>Deploy your low-code applications to the cloud instantly with just one click.</p>
            </div>
            
            <div class="feature">
              <h3>📊 Real-time Monitoring</h3>
              <p>Get immediate alerts when your applications go down or experience issues.</p>
            </div>
            
            <div class="feature">
              <h3>⚡ Serverless Functions</h3>
              <p>Add backend logic to your applications without managing servers.</p>
            </div>
            
            <div class="feature">
              <h3>🔄 Auto-restart</h3>
              <p>Automatic health checks and restarts keep your applications running smoothly.</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="button">Get Started</a>
            </div>

            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy deploying!</p>
            <p>The DeployWise Team</p>
          </div>
          <div class="footer">
            <p>© 2024 DeployWise. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"DeployWise" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Welcome to DeployWise! 🚀',
      html: emailHtml,
      text: `Welcome to DeployWise!\n\nHi ${user.firstName},\n\nWelcome to DeployWise! We're excited to help you deploy and monitor your low-code applications with ease.\n\nFeatures:\n- One-Click Deployment\n- Real-time Monitoring\n- Serverless Functions\n- Auto-restart\n\nGet started at: ${process.env.CLIENT_URL || 'http://localhost:5173'}\n\nThe DeployWise Team`
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${user.email}:`, error);
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    if (!this.emailTransporter) {
      logger.warn('Cannot send password reset email: Email transporter not configured');
      return;
    }

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: #3b82f6; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>We received a request to reset your password for your DeployWise account.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, please don't share this email with anyone.</p>
          </div>
          <div class="footer">
            <p>© 2024 DeployWise. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"DeployWise Security" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Reset Your DeployWise Password',
      html: emailHtml,
      text: `Password Reset\n\nHi ${user.firstName},\n\nWe received a request to reset your password for your DeployWise account.\n\nReset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nDeployWise Security Team`
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${user.email}:`, error);
      throw error;
    }
  }
}
