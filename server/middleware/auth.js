import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findOne({ 
      userId: decoded.userId,
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token - user not found or inactive',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Update last activity
    user.usage.lastActivity = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

export const requireSubscription = (requiredTier = 'pro') => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const tierLevels = {
      'free': 0,
      'pro': 1,
      'enterprise': 2
    };

    const userLevel = tierLevels[user.subscriptionTier] || 0;
    const requiredLevel = tierLevels[requiredTier] || 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: `${requiredTier} subscription required`,
        code: 'SUBSCRIPTION_REQUIRED',
        currentTier: user.subscriptionTier,
        requiredTier
      });
    }

    next();
  };
};

export const checkUsageLimits = (resource) => {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    try {
      let canProceed = false;
      let currentUsage = 0;
      let limit = 0;

      switch (resource) {
        case 'apps':
          canProceed = user.canDeployApp();
          currentUsage = user.usage.appsDeployed;
          limit = { free: 1, pro: 5, enterprise: Infinity }[user.subscriptionTier];
          break;
        case 'functions':
          canProceed = user.canCreateFunction();
          currentUsage = user.usage.serverlessFunctions;
          limit = { free: 3, pro: 25, enterprise: Infinity }[user.subscriptionTier];
          break;
        default:
          canProceed = true;
      }

      if (!canProceed) {
        return res.status(429).json({ 
          error: `Usage limit exceeded for ${resource}`,
          code: 'USAGE_LIMIT_EXCEEDED',
          currentUsage,
          limit,
          subscriptionTier: user.subscriptionTier
        });
      }

      next();
    } catch (error) {
      logger.error('Usage limit check error:', error);
      return res.status(500).json({ 
        error: 'Failed to check usage limits',
        code: 'USAGE_CHECK_ERROR'
      });
    }
  };
};

export const generateToken = (user) => {
  const payload = {
    userId: user.userId,
    email: user.email,
    subscriptionTier: user.subscriptionTier
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const generateRefreshToken = (user) => {
  const payload = {
    userId: user.userId,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};
