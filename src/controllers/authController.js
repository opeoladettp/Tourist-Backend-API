const User = require('../models/User');
const { generateToken, sanitizeUser } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');

// Google OAuth login/register
const googleAuth = async (req, res) => {
  try {
    const { google_id, email, first_name, last_name } = req.body;

    // Check if user exists
    let user = await User.findOne({ 
      $or: [{ google_id }, { email }] 
    }).populate('provider_id');

    if (user) {
      // Update Google ID if not set
      if (!user.google_id && google_id) {
        user.google_id = google_id;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        google_id,
        email,
        first_name,
        last_name,
        user_type: 'tourist'
      });
      await user.save();
    }

    const token = generateToken(user._id);
    
    res.json({
      message: 'Authentication successful',
      token,
      user: sanitizeUser(user),
      redirect: getRedirectUrl(user)
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('provider_id');
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.email; // Email cannot be updated
    delete updates.google_id; // Google ID cannot be updated
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('provider_id');

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Helper function to determine redirect URL based on user type
const getRedirectUrl = (user) => {
  // Check if profile is incomplete
  if (!user.first_name || !user.last_name) {
    return '/profile';
  }

  switch (user.user_type) {
    case 'system_admin':
      return '/admin/dashboard';
    case 'provider_admin':
      return '/provider/dashboard';
    case 'tourist':
    default:
      return '/my-tours';
  }
};

// Logout (client-side token removal)
const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  googleAuth,
  getProfile,
  updateProfile,
  logout
};