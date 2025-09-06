import mongoose from 'mongoose';

const deployedAppSchema = new mongoose.Schema({
  appId: {
    type: String,
    required: true,
    unique: true,
    default: () => `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  appName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  lowCodePlatform: {
    type: String,
    required: true,
    enum: ['bubble', 'webflow', 'retool', 'zapier', 'airtable', 'notion', 'custom']
  },
  deploymentStatus: {
    type: String,
    enum: ['pending', 'deploying', 'deployed', 'failed', 'stopped', 'updating'],
    default: 'pending'
  },
  healthStatus: {
    type: String,
    enum: ['up', 'down', 'warning', 'restarting', 'unknown'],
    default: 'unknown'
  },
  monitoringEnabled: {
    type: Boolean,
    default: true
  },
  lastCheck: {
    type: Date,
    default: Date.now
  },
  deployment: {
    provider: {
      type: String,
      enum: ['vercel', 'netlify', 'aws', 'heroku', 'digitalocean', 'custom'],
      default: 'vercel'
    },
    url: String,
    customDomain: String,
    buildCommand: String,
    outputDirectory: String,
    environmentVariables: [{
      key: String,
      value: String,
      encrypted: {
        type: Boolean,
        default: false
      }
    }],
    deploymentId: String,
    lastDeployment: {
      id: String,
      status: String,
      createdAt: Date,
      completedAt: Date,
      logs: String
    }
  },
  monitoring: {
    uptimePercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    responseTime: {
      current: {
        type: Number,
        default: 0
      },
      average: {
        type: Number,
        default: 0
      },
      p95: {
        type: Number,
        default: 0
      }
    },
    checksPerformed: {
      type: Number,
      default: 0
    },
    consecutiveFailures: {
      type: Number,
      default: 0
    },
    lastFailure: Date,
    incidents: [{
      id: String,
      type: {
        type: String,
        enum: ['downtime', 'slow_response', 'error_rate', 'ssl_issue']
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      startTime: Date,
      endTime: Date,
      duration: Number, // in seconds
      resolved: {
        type: Boolean,
        default: false
      },
      description: String,
      affectedUsers: Number
    }],
    alerts: [{
      type: {
        type: String,
        enum: ['email', 'slack', 'webhook', 'sms']
      },
      recipient: String,
      enabled: {
        type: Boolean,
        default: true
      },
      conditions: {
        downtime: {
          type: Boolean,
          default: true
        },
        slowResponse: {
          threshold: {
            type: Number,
            default: 5000 // 5 seconds
          },
          enabled: {
            type: Boolean,
            default: true
          }
        },
        errorRate: {
          threshold: {
            type: Number,
            default: 5 // 5%
          },
          enabled: {
            type: Boolean,
            default: true
          }
        }
      }
    }]
  },
  source: {
    type: {
      type: String,
      enum: ['git', 'zip', 'url', 'platform_export'],
      default: 'platform_export'
    },
    repository: String,
    branch: String,
    commitHash: String,
    zipUrl: String,
    platformExportUrl: String,
    lastSync: Date
  },
  configuration: {
    autoRestart: {
      type: Boolean,
      default: true
    },
    restartPolicy: {
      type: String,
      enum: ['always', 'on-failure', 'unless-stopped'],
      default: 'on-failure'
    },
    maxRestartAttempts: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    healthCheckPath: {
      type: String,
      default: '/'
    },
    healthCheckInterval: {
      type: Number,
      default: 30, // seconds
      min: 10,
      max: 3600
    },
    timeout: {
      type: Number,
      default: 30, // seconds
      min: 5,
      max: 300
    }
  },
  resources: {
    cpu: {
      type: String,
      default: '0.1'
    },
    memory: {
      type: String,
      default: '128Mi'
    },
    storage: {
      type: String,
      default: '1Gi'
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  archivedAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive environment variables from JSON output
      if (ret.deployment && ret.deployment.environmentVariables) {
        ret.deployment.environmentVariables = ret.deployment.environmentVariables.map(env => ({
          key: env.key,
          encrypted: env.encrypted,
          // Only show value if not encrypted
          value: env.encrypted ? '[ENCRYPTED]' : env.value
        }));
      }
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
deployedAppSchema.index({ userId: 1 });
deployedAppSchema.index({ appId: 1 });
deployedAppSchema.index({ deploymentStatus: 1 });
deployedAppSchema.index({ healthStatus: 1 });
deployedAppSchema.index({ 'deployment.url': 1 });
deployedAppSchema.index({ createdAt: -1 });
deployedAppSchema.index({ lastCheck: 1 });
deployedAppSchema.index({ isActive: 1 });

// Compound indexes
deployedAppSchema.index({ userId: 1, isActive: 1 });
deployedAppSchema.index({ userId: 1, deploymentStatus: 1 });
deployedAppSchema.index({ monitoringEnabled: 1, isActive: 1 });

// Virtual for full URL
deployedAppSchema.virtual('fullUrl').get(function() {
  if (this.deployment.customDomain) {
    return `https://${this.deployment.customDomain}`;
  }
  return this.deployment.url;
});

// Virtual for uptime status
deployedAppSchema.virtual('uptimeStatus').get(function() {
  const uptime = this.monitoring.uptimePercentage;
  if (uptime >= 99.9) return 'excellent';
  if (uptime >= 99.0) return 'good';
  if (uptime >= 95.0) return 'fair';
  return 'poor';
});

// Method to update health status
deployedAppSchema.methods.updateHealthStatus = function(status, responseTime = null) {
  this.healthStatus = status;
  this.lastCheck = new Date();
  this.monitoring.checksPerformed += 1;
  
  if (responseTime !== null) {
    this.monitoring.responseTime.current = responseTime;
    // Update average response time (simple moving average)
    const totalChecks = this.monitoring.checksPerformed;
    const currentAvg = this.monitoring.responseTime.average;
    this.monitoring.responseTime.average = 
      ((currentAvg * (totalChecks - 1)) + responseTime) / totalChecks;
  }
  
  if (status === 'up') {
    this.monitoring.consecutiveFailures = 0;
  } else if (status === 'down' || status === 'warning') {
    this.monitoring.consecutiveFailures += 1;
    this.monitoring.lastFailure = new Date();
  }
  
  // Update uptime percentage
  const uptimeChecks = this.monitoring.checksPerformed - this.monitoring.consecutiveFailures;
  this.monitoring.uptimePercentage = 
    (uptimeChecks / Math.max(this.monitoring.checksPerformed, 1)) * 100;
  
  return this.save();
};

// Method to create incident
deployedAppSchema.methods.createIncident = function(type, severity, description) {
  const incident = {
    id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    startTime: new Date(),
    description,
    resolved: false
  };
  
  this.monitoring.incidents.push(incident);
  return this.save();
};

// Method to resolve incident
deployedAppSchema.methods.resolveIncident = function(incidentId) {
  const incident = this.monitoring.incidents.id(incidentId);
  if (incident) {
    incident.resolved = true;
    incident.endTime = new Date();
    incident.duration = Math.floor((incident.endTime - incident.startTime) / 1000);
  }
  return this.save();
};

// Method to check if restart is needed
deployedAppSchema.methods.shouldAutoRestart = function() {
  return this.configuration.autoRestart && 
         this.monitoring.consecutiveFailures >= 3 &&
         this.healthStatus === 'down';
};

// Static method to find apps needing monitoring
deployedAppSchema.statics.findAppsForMonitoring = function() {
  return this.find({
    monitoringEnabled: true,
    isActive: true,
    deploymentStatus: 'deployed',
    $or: [
      { lastCheck: { $lt: new Date(Date.now() - 30000) } }, // 30 seconds ago
      { lastCheck: { $exists: false } }
    ]
  });
};

const DeployedApp = mongoose.model('DeployedApp', deployedAppSchema);

export default DeployedApp;
