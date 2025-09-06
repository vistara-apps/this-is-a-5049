import express from 'express';
import DeployedApp from '../models/DeployedApp.js';
import { checkUsageLimits } from '../middleware/auth.js';
import { deploymentRateLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger, logBusiness } from '../utils/logger.js';

const router = express.Router();

// @desc    Get all user's deployed apps
// @route   GET /api/apps
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, platform } = req.query;
  
  const query = { 
    userId: req.user.userId, 
    isActive: true 
  };
  
  if (status) query.deploymentStatus = status;
  if (platform) query.lowCodePlatform = platform;

  const apps = await DeployedApp.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await DeployedApp.countDocuments(query);

  res.json({
    success: true,
    data: {
      apps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @desc    Get single deployed app
// @route   GET /api/apps/:appId
// @access  Private
router.get('/:appId', asyncHandler(async (req, res) => {
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
    data: app
  });
}));

// @desc    Deploy new app
// @route   POST /api/apps
// @access  Private
router.post('/', checkUsageLimits('apps'), deploymentRateLimiter, asyncHandler(async (req, res) => {
  const {
    appName,
    description,
    lowCodePlatform,
    deployment,
    configuration,
    source,
    tags
  } = req.body;

  // Validation
  if (!appName || !lowCodePlatform) {
    return res.status(400).json({
      success: false,
      error: 'App name and platform are required'
    });
  }

  // Create app
  const app = await DeployedApp.create({
    userId: req.user.userId,
    appName,
    description,
    lowCodePlatform,
    deployment: deployment || {},
    configuration: configuration || {},
    source: source || {},
    tags: tags || []
  });

  // Update user usage
  await req.user.updateUsage('appsDeployed');

  logBusiness('App deployment started', {
    userId: req.user.userId,
    appId: app.appId,
    appName,
    platform: lowCodePlatform
  });

  // TODO: Trigger actual deployment process
  // This would integrate with cloud providers like Vercel, Netlify, etc.

  res.status(201).json({
    success: true,
    data: app
  });
}));

// @desc    Update deployed app
// @route   PUT /api/apps/:appId
// @access  Private
router.put('/:appId', asyncHandler(async (req, res) => {
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

  const allowedUpdates = [
    'appName', 'description', 'configuration', 
    'monitoringEnabled', 'tags'
  ];
  
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  Object.assign(app, updates);
  await app.save();

  logBusiness('App updated', {
    userId: req.user.userId,
    appId: app.appId,
    updatedFields: Object.keys(updates)
  });

  res.json({
    success: true,
    data: app
  });
}));

// @desc    Delete deployed app
// @route   DELETE /api/apps/:appId
// @access  Private
router.delete('/:appId', asyncHandler(async (req, res) => {
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

  // Soft delete
  app.isActive = false;
  app.archivedAt = new Date();
  await app.save();

  // Update user usage
  await req.user.updateUsage('appsDeployed', -1);

  logBusiness('App deleted', {
    userId: req.user.userId,
    appId: app.appId,
    appName: app.appName
  });

  res.json({
    success: true,
    message: 'App deleted successfully'
  });
}));

// @desc    Restart app
// @route   POST /api/apps/:appId/restart
// @access  Private
router.post('/:appId/restart', asyncHandler(async (req, res) => {
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

  // Update status to restarting
  app.healthStatus = 'restarting';
  await app.save();

  logBusiness('App restart initiated', {
    userId: req.user.userId,
    appId: app.appId,
    appName: app.appName
  });

  // TODO: Implement actual restart logic with cloud providers

  res.json({
    success: true,
    message: 'App restart initiated'
  });
}));

export default router;
