import mongoose from 'mongoose';

const serverlessFunctionSchema = new mongoose.Schema({
  functionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  appId: {
    type: String,
    required: true,
    ref: 'DeployedApp'
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  functionName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    match: [/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Function name must start with a letter and contain only letters, numbers, hyphens, and underscores']
  },
  description: {
    type: String,
    maxlength: 500
  },
  triggerType: {
    type: String,
    required: true,
    enum: ['webhook', 'scheduled', 'event', 'manual']
  },
  executionStatus: {
    type: String,
    enum: ['active', 'inactive', 'error', 'deploying'],
    default: 'inactive'
  },
  runtime: {
    type: String,
    enum: ['nodejs18', 'nodejs16', 'python39', 'python38', 'go119', 'java11'],
    default: 'nodejs18'
  },
  code: {
    source: {
      type: String,
      required: true // Base64 encoded source code or URL to source
    },
    entryPoint: {
      type: String,
      default: 'index.handler'
    },
    dependencies: {
      type: Map,
      of: String, // package name -> version
      default: new Map()
    },
    size: {
      type: Number,
      default: 0 // in bytes
    },
    lastModified: {
      type: Date,
      default: Date.now
    }
  },
  trigger: {
    webhook: {
      url: String,
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'POST'
      },
      headers: {
        type: Map,
        of: String
      },
      authentication: {
        type: {
          type: String,
          enum: ['none', 'api_key', 'bearer_token', 'basic_auth']
        },
        apiKey: String,
        token: String,
        username: String,
        password: String
      }
    },
    schedule: {
      cron: String, // Cron expression
      timezone: {
        type: String,
        default: 'UTC'
      },
      enabled: {
        type: Boolean,
        default: true
      },
      nextRun: Date
    },
    event: {
      source: {
        type: String,
        enum: ['app_deployment', 'monitoring_alert', 'user_action', 'external_webhook']
      },
      filters: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
      }
    }
  },
  configuration: {
    timeout: {
      type: Number,
      default: 30, // seconds
      min: 1,
      max: 900 // 15 minutes
    },
    memory: {
      type: Number,
      default: 128, // MB
      min: 64,
      max: 3008
    },
    maxConcurrency: {
      type: Number,
      default: 10,
      min: 1,
      max: 1000
    },
    environmentVariables: [{
      key: String,
      value: String,
      encrypted: {
        type: Boolean,
        default: false
      }
    }],
    retryPolicy: {
      maxRetries: {
        type: Number,
        default: 3,
        min: 0,
        max: 10
      },
      retryDelay: {
        type: Number,
        default: 1000, // milliseconds
        min: 100,
        max: 60000
      }
    }
  },
  execution: {
    totalExecutions: {
      type: Number,
      default: 0
    },
    successfulExecutions: {
      type: Number,
      default: 0
    },
    failedExecutions: {
      type: Number,
      default: 0
    },
    lastExecution: {
      id: String,
      startTime: Date,
      endTime: Date,
      duration: Number, // milliseconds
      status: {
        type: String,
        enum: ['success', 'error', 'timeout', 'cancelled']
      },
      result: mongoose.Schema.Types.Mixed,
      error: String,
      logs: String,
      memoryUsed: Number, // MB
      billingDuration: Number // milliseconds
    },
    averageExecutionTime: {
      type: Number,
      default: 0
    },
    recentExecutions: [{
      id: String,
      startTime: Date,
      duration: Number,
      status: String,
      memoryUsed: Number
    }]
  },
  monitoring: {
    enabled: {
      type: Boolean,
      default: true
    },
    alerts: [{
      type: {
        type: String,
        enum: ['error_rate', 'execution_time', 'memory_usage', 'execution_count']
      },
      threshold: Number,
      enabled: {
        type: Boolean,
        default: true
      },
      recipients: [String]
    }],
    metrics: {
      errorRate: {
        type: Number,
        default: 0 // percentage
      },
      averageMemoryUsage: {
        type: Number,
        default: 0 // MB
      },
      coldStarts: {
        type: Number,
        default: 0
      },
      throttles: {
        type: Number,
        default: 0
      }
    }
  },
  deployment: {
    provider: {
      type: String,
      enum: ['aws_lambda', 'vercel_functions', 'netlify_functions', 'cloudflare_workers'],
      default: 'vercel_functions'
    },
    deploymentId: String,
    version: {
      type: String,
      default: '1'
    },
    lastDeployed: Date,
    deploymentStatus: {
      type: String,
      enum: ['pending', 'deploying', 'deployed', 'failed'],
      default: 'pending'
    },
    deploymentLogs: String
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
      // Remove sensitive data from JSON output
      if (ret.configuration && ret.configuration.environmentVariables) {
        ret.configuration.environmentVariables = ret.configuration.environmentVariables.map(env => ({
          key: env.key,
          encrypted: env.encrypted,
          value: env.encrypted ? '[ENCRYPTED]' : env.value
        }));
      }
      
      if (ret.trigger && ret.trigger.webhook && ret.trigger.webhook.authentication) {
        const auth = ret.trigger.webhook.authentication;
        if (auth.apiKey) auth.apiKey = '[ENCRYPTED]';
        if (auth.token) auth.token = '[ENCRYPTED]';
        if (auth.password) auth.password = '[ENCRYPTED]';
      }
      
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
serverlessFunctionSchema.index({ functionId: 1 });
serverlessFunctionSchema.index({ appId: 1 });
serverlessFunctionSchema.index({ userId: 1 });
serverlessFunctionSchema.index({ executionStatus: 1 });
serverlessFunctionSchema.index({ triggerType: 1 });
serverlessFunctionSchema.index({ 'trigger.schedule.nextRun': 1 });
serverlessFunctionSchema.index({ createdAt: -1 });
serverlessFunctionSchema.index({ isActive: 1 });

// Compound indexes
serverlessFunctionSchema.index({ userId: 1, isActive: 1 });
serverlessFunctionSchema.index({ appId: 1, isActive: 1 });
serverlessFunctionSchema.index({ executionStatus: 1, isActive: 1 });

// Virtual for success rate
serverlessFunctionSchema.virtual('successRate').get(function() {
  if (this.execution.totalExecutions === 0) return 100;
  return (this.execution.successfulExecutions / this.execution.totalExecutions) * 100;
});

// Virtual for webhook URL
serverlessFunctionSchema.virtual('webhookUrl').get(function() {
  if (this.triggerType === 'webhook' && this.trigger.webhook.url) {
    return this.trigger.webhook.url;
  }
  return null;
});

// Method to execute function
serverlessFunctionSchema.methods.execute = async function(payload = {}, context = {}) {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = new Date();
  
  try {
    // Update execution stats
    this.execution.totalExecutions += 1;
    
    // Create execution record
    const execution = {
      id: executionId,
      startTime,
      status: 'success' // This would be determined by actual execution
    };
    
    // Simulate execution (in real implementation, this would call the actual function)
    const result = await this.simulateExecution(payload, context);
    
    const endTime = new Date();
    const duration = endTime - startTime;
    
    execution.endTime = endTime;
    execution.duration = duration;
    execution.result = result;
    execution.memoryUsed = Math.floor(Math.random() * this.configuration.memory);
    execution.billingDuration = Math.ceil(duration / 100) * 100; // Round up to nearest 100ms
    
    // Update stats
    this.execution.successfulExecutions += 1;
    this.execution.lastExecution = execution;
    
    // Update average execution time
    const totalSuccessful = this.execution.successfulExecutions;
    const currentAvg = this.execution.averageExecutionTime;
    this.execution.averageExecutionTime = 
      ((currentAvg * (totalSuccessful - 1)) + duration) / totalSuccessful;
    
    // Add to recent executions (keep last 10)
    this.execution.recentExecutions.unshift({
      id: executionId,
      startTime,
      duration,
      status: 'success',
      memoryUsed: execution.memoryUsed
    });
    
    if (this.execution.recentExecutions.length > 10) {
      this.execution.recentExecutions = this.execution.recentExecutions.slice(0, 10);
    }
    
    await this.save();
    return { success: true, result, executionId };
    
  } catch (error) {
    const endTime = new Date();
    const duration = endTime - startTime;
    
    this.execution.failedExecutions += 1;
    this.execution.lastExecution = {
      id: executionId,
      startTime,
      endTime,
      duration,
      status: 'error',
      error: error.message
    };
    
    // Update error rate
    this.monitoring.metrics.errorRate = 
      (this.execution.failedExecutions / this.execution.totalExecutions) * 100;
    
    await this.save();
    throw error;
  }
};

// Method to simulate function execution (placeholder)
serverlessFunctionSchema.methods.simulateExecution = async function(payload, context) {
  // This is a placeholder - in real implementation, this would:
  // 1. Deploy the function code to the selected provider
  // 2. Execute it with the given payload
  // 3. Return the result
  
  return {
    message: 'Function executed successfully',
    payload,
    context,
    timestamp: new Date().toISOString()
  };
};

// Method to schedule next execution for cron jobs
serverlessFunctionSchema.methods.scheduleNext = function() {
  if (this.triggerType === 'scheduled' && this.trigger.schedule.cron) {
    // This would use a cron parser to calculate next execution time
    // For now, we'll just add 1 hour as an example
    this.trigger.schedule.nextRun = new Date(Date.now() + 60 * 60 * 1000);
    return this.save();
  }
};

// Static method to find functions ready for scheduled execution
serverlessFunctionSchema.statics.findScheduledFunctions = function() {
  return this.find({
    triggerType: 'scheduled',
    executionStatus: 'active',
    isActive: true,
    'trigger.schedule.enabled': true,
    'trigger.schedule.nextRun': { $lte: new Date() }
  });
};

// Static method to find functions by trigger type
serverlessFunctionSchema.statics.findByTrigger = function(triggerType, filters = {}) {
  return this.find({
    triggerType,
    executionStatus: 'active',
    isActive: true,
    ...filters
  });
};

const ServerlessFunction = mongoose.model('ServerlessFunction', serverlessFunctionSchema);

export default ServerlessFunction;
