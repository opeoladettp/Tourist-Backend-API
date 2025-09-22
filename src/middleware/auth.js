const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('provider_id');
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid token or inactive user.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Middleware to check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. User not authenticated.' });
    }

    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

// Middleware to check if user profile is complete
const requireCompleteProfile = (req, res, next) => {
  if (!req.user.first_name || !req.user.last_name) {
    return res.status(400).json({ 
      error: 'Profile incomplete. Please complete your first name and last name.',
      redirect: '/profile'
    });
  }
  next();
};

// Middleware to check provider ownership
const checkProviderOwnership = async (req, res, next) => {
  try {
    if (req.user.user_type === 'system_admin') {
      return next(); // System admins can access everything
    }

    if (req.user.user_type === 'provider_admin') {
      // Check if the resource belongs to the user's provider
      const providerId = req.params.providerId || req.body.provider_id;
      if (providerId && providerId !== req.user.provider_id?.toString()) {
        return res.status(403).json({ error: 'Access denied. Resource belongs to different provider.' });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error during authorization check.' });
  }
};

module.exports = {
  authenticate,
  authorize,
  requireCompleteProfile,
  checkProviderOwnership
};