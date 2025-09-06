import express from 'express';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger, logBusiness } from '../utils/logger.js';

const router = express.Router();

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findOne({ userId: req.user.userId });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.json({
    success: true,
    data: user
  });
}));

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName, preferences, integrations } = req.body;
  
  const updateFields = {};
  if (firstName) updateFields.firstName = firstName;
  if (lastName) updateFields.lastName = lastName;
  if (preferences) updateFields.preferences = { ...req.user.preferences, ...preferences };
  if (integrations) updateFields.integrations = { ...req.user.integrations, ...integrations };

  const user = await User.findOneAndUpdate(
    { userId: req.user.userId },
    updateFields,
    { new: true, runValidators: true }
  );

  logBusiness('User profile updated', { 
    userId: user.userId,
    updatedFields: Object.keys(updateFields)
  });

  res.json({
    success: true,
    data: user
  });
}));

// @desc    Get user usage statistics
// @route   GET /api/users/usage
// @access  Private
router.get('/usage', asyncHandler(async (req, res) => {
  const user = req.user;
  
  const limits = {
    free: { apps: 1, functions: 3 },
    pro: { apps: 5, functions: 25 },
    enterprise: { apps: Infinity, functions: Infinity }
  };

  const userLimits = limits[user.subscriptionTier];

  res.json({
    success: true,
    data: {
      current: user.usage,
      limits: userLimits,
      subscriptionTier: user.subscriptionTier,
      percentageUsed: {
        apps: userLimits.apps === Infinity ? 0 : (user.usage.appsDeployed / userLimits.apps) * 100,
        functions: userLimits.functions === Infinity ? 0 : (user.usage.serverlessFunctions / userLimits.functions) * 100
      }
    }
  });
}));

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password confirmation required'
    });
  }

  const user = await User.findOne({ userId: req.user.userId });
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid password'
    });
  }

  // Soft delete - mark as inactive
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${user.email}`;
  await user.save();

  logBusiness('User account deleted', { 
    userId: user.userId,
    email: req.user.email
  });

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

export default router;
