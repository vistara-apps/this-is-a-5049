import express from 'express';
import ServerlessFunction from '../models/ServerlessFunction.js';
import { checkUsageLimits } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger, logBusiness } from '../utils/logger.js';

const router = express.Router();

// @desc    Get all user's serverless functions
// @route   GET /api/functions
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, appId, triggerType, status } = req.query;
  
  const query = { 
    userId: req.user.userId, 
    isActive: true 
  };
  
  if (appId) query.appId = appId;
  if (triggerType) query.triggerType = triggerType;
  if (status) query.executionStatus = status;

  const functions = await ServerlessFunction.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await ServerlessFunction.countDocuments(query);

  res.json({
    success: true,
    data: {
      functions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @desc    Get single serverless function
// @route   GET /api/functions/:functionId
// @access  Private
router.get('/:functionId', asyncHandler(async (req, res) => {
  const func = await ServerlessFunction.findOne({
    functionId: req.params.functionId,
    userId: req.user.userId,
    isActive: true
  });

  if (!func) {
    return res.status(404).json({
      success: false,
      error: 'Function not found'
    });
  }

  res.json({
    success: true,
    data: func
  });
}));

// @desc    Create new serverless function
// @route   POST /api/functions
// @access  Private
router.post('/', checkUsageLimits('functions'), asyncHandler(async (req, res) => {
  const {
    appId,
    functionName,
    description,
    triggerType,
    runtime,
    code,
    trigger,
    configuration,
    tags
  } = req.body;

  // Validation
  if (!appId || !functionName || !triggerType || !code) {
    return res.status(400).json({
      success: false,
      error: 'App ID, function name, trigger type, and code are required'
    });
  }

  // Create function
  const func = await ServerlessFunction.create({
    appId,
    userId: req.user.userId,
    functionName,
    description,
    triggerType,
    runtime: runtime || 'nodejs18',
    code,
    trigger: trigger || {},
    configuration: configuration || {},
    tags: tags || []
  });

  // Update user usage
  await req.user.updateUsage('serverlessFunctions');

  logBusiness('Serverless function created', {
    userId: req.user.userId,
    functionId: func.functionId,
    functionName,
    triggerType,
    runtime: func.runtime
  });

  res.status(201).json({
    success: true,
    data: func
  });
}));

// @desc    Update serverless function
// @route   PUT /api/functions/:functionId
// @access  Private
router.put('/:functionId', asyncHandler(async (req, res) => {
  const func = await ServerlessFunction.findOne({
    functionId: req.params.functionId,
    userId: req.user.userId,
    isActive: true
  });

  if (!func) {
    return res.status(404).json({
      success: false,
      error: 'Function not found'
    });
  }

  const allowedUpdates = [
    'functionName', 'description', 'code', 'trigger', 
    'configuration', 'executionStatus', 'tags'
  ];
  
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Update code modification timestamp if code changed
  if (updates.code) {
    updates['code.lastModified'] = new Date();
  }

  Object.assign(func, updates);
  await func.save();

  logBusiness('Serverless function updated', {
    userId: req.user.userId,
    functionId: func.functionId,
    updatedFields: Object.keys(updates)
  });

  res.json({
    success: true,
    data: func
  });
}));

// @desc    Delete serverless function
// @route   DELETE /api/functions/:functionId
// @access  Private
router.delete('/:functionId', asyncHandler(async (req, res) => {
  const func = await ServerlessFunction.findOne({
    functionId: req.params.functionId,
    userId: req.user.userId,
    isActive: true
  });

  if (!func) {
    return res.status(404).json({
      success: false,
      error: 'Function not found'
    });
  }

  // Soft delete
  func.isActive = false;
  func.archivedAt = new Date();
  await func.save();

  // Update user usage
  await req.user.updateUsage('serverlessFunctions', -1);

  logBusiness('Serverless function deleted', {
    userId: req.user.userId,
    functionId: func.functionId,
    functionName: func.functionName
  });

  res.json({
    success: true,
    message: 'Function deleted successfully'
  });
}));

// @desc    Execute serverless function
// @route   POST /api/functions/:functionId/execute
// @access  Private
router.post('/:functionId/execute', asyncHandler(async (req, res) => {
  const func = await ServerlessFunction.findOne({
    functionId: req.params.functionId,
    userId: req.user.userId,
    isActive: true
  });

  if (!func) {
    return res.status(404).json({
      success: false,
      error: 'Function not found'
    });
  }

  if (func.executionStatus !== 'active') {
    return res.status(400).json({
      success: false,
      error: 'Function is not active'
    });
  }

  const { payload = {}, context = {} } = req.body;

  try {
    const result = await func.execute(payload, context);

    logBusiness('Serverless function executed', {
      userId: req.user.userId,
      functionId: func.functionId,
      executionId: result.executionId
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Function execution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Function execution failed',
      details: error.message
    });
  }
}));

// @desc    Get function execution history
// @route   GET /api/functions/:functionId/executions
// @access  Private
router.get('/:functionId/executions', asyncHandler(async (req, res) => {
  const func = await ServerlessFunction.findOne({
    functionId: req.params.functionId,
    userId: req.user.userId,
    isActive: true
  });

  if (!func) {
    return res.status(404).json({
      success: false,
      error: 'Function not found'
    });
  }

  res.json({
    success: true,
    data: {
      recentExecutions: func.execution.recentExecutions,
      lastExecution: func.execution.lastExecution,
      statistics: {
        totalExecutions: func.execution.totalExecutions,
        successfulExecutions: func.execution.successfulExecutions,
        failedExecutions: func.execution.failedExecutions,
        successRate: func.successRate,
        averageExecutionTime: func.execution.averageExecutionTime
      }
    }
  });
}));

export default router;
