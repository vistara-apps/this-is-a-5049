import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  paymentInfo: {
    stripeCustomerId: String,
    subscriptionId: String,
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete'],
      default: null
    },
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    }
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      slack: {
        type: Boolean,
        default: false
      },
      webhooks: {
        type: Boolean,
        default: false
      }
    },
    monitoring: {
      checkInterval: {
        type: Number,
        default: 30, // seconds
        min: 30,
        max: 3600
      },
      alertThreshold: {
        type: Number,
        default: 3, // consecutive failures before alert
        min: 1,
        max: 10
      }
    }
  },
  integrations: {
    slack: {
      webhookUrl: String,
      enabled: {
        type: Boolean,
        default: false
      }
    },
    lowCodePlatforms: [{
      platform: {
        type: String,
        enum: ['bubble', 'webflow', 'retool', 'zapier', 'airtable', 'notion']
      },
      apiKey: String,
      enabled: {
        type: Boolean,
        default: true
      },
      lastSync: Date
    }]
  },
  usage: {
    appsDeployed: {
      type: Number,
      default: 0
    },
    monitoringChecks: {
      type: Number,
      default: 0
    },
    serverlessFunctions: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ 'paymentInfo.stripeCustomerId': 1 });
userSchema.index({ createdAt: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check subscription limits
userSchema.methods.canDeployApp = function() {
  const limits = {
    free: 1,
    pro: 5,
    enterprise: Infinity
  };
  
  return this.usage.appsDeployed < limits[this.subscriptionTier];
};

userSchema.methods.canCreateFunction = function() {
  const limits = {
    free: 3,
    pro: 25,
    enterprise: Infinity
  };
  
  return this.usage.serverlessFunctions < limits[this.subscriptionTier];
};

// Method to update usage stats
userSchema.methods.updateUsage = function(type, increment = 1) {
  const update = {
    $inc: { [`usage.${type}`]: increment },
    $set: { 'usage.lastActivity': new Date() }
  };
  
  return this.updateOne(update);
};

const User = mongoose.model('User', userSchema);

export default User;
