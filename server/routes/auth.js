import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { NotificationService } from '../services/NotificationService.js';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../middleware/auth.js';
import { 
  authRateLimiter, 
  passwordResetRateLimiter 
} from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger, logSecurity, logBusiness } from '../utils/logger.js';

const router = express.Router();
const notificationService = new NotificationService();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authRateLimiter, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Validation
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: 'Please provide all required fields'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logSecurity('Registration attempt with existing email', { email, ip: req.ip });
    return res.status(400).json({
      success: false,
      error: 'User already exists with this email'
    });
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName
  });

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Log successful registration
  logBusiness('User registered', { 
    userId: user.userId, 
    email: user.email,
    subscriptionTier: user.subscriptionTier 
  });

  // Send welcome email (async, don't wait)
  notificationService.sendWelcomeEmail(user).catch(error => {
    logger.error('Failed to send welcome email:', error);
  });

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
      refreshToken
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide email and password'
    });
  }

  // Check for user
  const user = await User.findOne({ email, isActive: true });
  if (!user) {
    logSecurity('Login attempt with non-existent email', { email, ip: req.ip });
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Check if account is locked
  if (user.isLocked) {
    logSecurity('Login attempt on locked account', { 
      userId: user.userId, 
      email, 
      ip: req.ip 
    });
    return res.status(423).json({
      success: false,
      error: 'Account is temporarily locked due to too many failed login attempts'
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Increment login attempts
    await user.incLoginAttempts();
    
    logSecurity('Failed login attempt', { 
      userId: user.userId, 
      email, 
      ip: req.ip,
      loginAttempts: user.loginAttempts + 1
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Log successful login
  logBusiness('User logged in', { 
    userId: user.userId, 
    email: user.email,
    ip: req.ip
  });

  res.json({
    success: true,
    data: {
      user,
      token,
      refreshToken
    }
  });
}));

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token required'
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user
    const user = await User.findOne({ 
      userId: decoded.userId, 
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    logSecurity('Invalid refresh token used', { 
      refreshToken: refreshToken.substring(0, 20) + '...', 
      ip: req.ip 
    });
    
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
}));

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', passwordResetRateLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  const user = await User.findOne({ email, isActive: true });
  
  // Always return success to prevent email enumeration
  if (!user) {
    logSecurity('Password reset attempt for non-existent email', { email, ip: req.ip });
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Send password reset email
  try {
    await notificationService.sendPasswordResetEmail(user, resetToken);
    
    logBusiness('Password reset email sent', { 
      userId: user.userId, 
      email: user.email 
    });

  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.error('Error sending password reset email:', error);
    return res.status(500).json({
      success: false,
      error: 'Email could not be sent'
    });
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent'
  });
}));

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
router.put('/reset-password/:resettoken', asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: resetPasswordToken,
    passwordResetExpires: { $gt: Date.now() },
    isActive: true
  });

  if (!user) {
    logSecurity('Invalid or expired password reset token used', { 
      token: req.params.resettoken.substring(0, 10) + '...', 
      ip: req.ip 
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired reset token'
    });
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  
  // Reset login attempts
  await user.resetLoginAttempts();
  
  await user.save();

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  logBusiness('Password reset completed', { 
    userId: user.userId, 
    email: user.email 
  });

  res.json({
    success: true,
    data: {
      user,
      token,
      refreshToken
    }
  });
}));

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token from storage
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
