import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from '../utils/logger.js';

// Create rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiter - 100 requests per minute
  general: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  }),

  // Authentication endpoints - stricter limits
  auth: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 10, // 10 attempts
    duration: 60, // Per minute
    blockDuration: 300, // Block for 5 minutes
  }),

  // Password reset - very strict
  passwordReset: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 3, // 3 attempts
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour
  }),

  // Deployment operations - moderate limits
  deployment: new RateLimiterMemory({
    keyGenerator: (req) => req.user?.userId || req.ip,
    points: 20, // 20 deployments
    duration: 3600, // Per hour
    blockDuration: 300, // Block for 5 minutes
  }),

  // Monitoring checks - higher limits for automated systems
  monitoring: new RateLimiterMemory({
    keyGenerator: (req) => req.user?.userId || req.ip,
    points: 200, // 200 checks
    duration: 60, // Per minute
    blockDuration: 60, // Block for 1 minute
  })
};

export const rateLimiter = async (req, res, next) => {
  try {
    // Use general rate limiter by default
    await rateLimiters.general.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn(`Rate limit exceeded for IP ${req.ip}`, {
      remainingPoints,
      msBeforeNext,
      url: req.url,
      method: req.method
    });

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimiters.general.points,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
    });

    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: Math.round(msBeforeNext / 1000) || 1
    });
  }
};

export const authRateLimiter = async (req, res, next) => {
  try {
    await rateLimiters.auth.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn(`Auth rate limit exceeded for IP ${req.ip}`, {
      remainingPoints,
      msBeforeNext,
      url: req.url,
      method: req.method
    });

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimiters.auth.points,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
    });

    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
      retryAfter: Math.round(msBeforeNext / 1000) || 1
    });
  }
};

export const passwordResetRateLimiter = async (req, res, next) => {
  try {
    await rateLimiters.passwordReset.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn(`Password reset rate limit exceeded for IP ${req.ip}`, {
      remainingPoints,
      msBeforeNext,
      url: req.url,
      method: req.method
    });

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimiters.passwordReset.points,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
    });

    res.status(429).json({
      error: 'Too many password reset attempts, please try again later',
      retryAfter: Math.round(msBeforeNext / 1000) || 1
    });
  }
};

export const deploymentRateLimiter = async (req, res, next) => {
  try {
    const key = req.user?.userId || req.ip;
    await rateLimiters.deployment.consume(key);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn(`Deployment rate limit exceeded for ${req.user?.userId || req.ip}`, {
      remainingPoints,
      msBeforeNext,
      url: req.url,
      method: req.method
    });

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimiters.deployment.points,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
    });

    res.status(429).json({
      error: 'Too many deployment requests, please try again later',
      retryAfter: Math.round(msBeforeNext / 1000) || 1
    });
  }
};

export const monitoringRateLimiter = async (req, res, next) => {
  try {
    const key = req.user?.userId || req.ip;
    await rateLimiters.monitoring.consume(key);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn(`Monitoring rate limit exceeded for ${req.user?.userId || req.ip}`, {
      remainingPoints,
      msBeforeNext,
      url: req.url,
      method: req.method
    });

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimiters.monitoring.points,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
    });

    res.status(429).json({
      error: 'Too many monitoring requests, please try again later',
      retryAfter: Math.round(msBeforeNext / 1000) || 1
    });
  }
};

// Middleware to add rate limit headers to successful requests
export const addRateLimitHeaders = (limiterType = 'general') => {
  return async (req, res, next) => {
    try {
      const limiter = rateLimiters[limiterType];
      if (!limiter) {
        return next();
      }

      const key = limiterType === 'general' ? req.ip : (req.user?.userId || req.ip);
      const resRateLimiter = await limiter.get(key);
      
      if (resRateLimiter) {
        res.set({
          'X-RateLimit-Limit': limiter.points,
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints || limiter.points,
          'X-RateLimit-Reset': new Date(Date.now() + (resRateLimiter.msBeforeNext || 0))
        });
      }
      
      next();
    } catch (error) {
      // Don't fail the request if rate limit header addition fails
      logger.error('Error adding rate limit headers:', error);
      next();
    }
  };
};
