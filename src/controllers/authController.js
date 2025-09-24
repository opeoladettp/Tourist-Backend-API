const User = require('../models/User');
const { generateToken, sanitizeUser } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');

// Helper function to check if profile picture is from Google
const isGoogleProfilePicture = (url) => {
  if (!url) return false;
  return url.includes('googleusercontent.com') || url.includes('google.com');
};

// Google OAuth login/register
const googleAuth = async (req, res) => {
  try {
    const { google_id, email, first_name, last_name, picture } = req.body;

    // Check if user exists
    let user = await User.findOne({ 
      $or: [{ google_id }, { email }] 
    }).populate('provider_id');

    if (user) {
      // Update Google ID and profile picture if not set or if Google picture is provided
      let needsUpdate = false;
      
      if (!user.google_id && google_id) {
        user.google_id = google_id;
        needsUpdate = true;
      }
      
      // Update profile picture from Google if:
      // 1. User doesn't have a profile picture, OR
      // 2. User has an existing Google profile picture (allow Google to update it)
      // Note: We don't overwrite custom profile pictures with Google pictures
      if (picture && (!user.profile_picture || isGoogleProfilePicture(user.profile_picture))) {
        user.profile_picture = picture;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await user.save();
      }
    } else {
      // Create new user with Google profile picture
      user = new User({
        google_id,
        email,
        first_name,
        last_name,
        profile_picture: picture || null, // Set Google profile picture if provided
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

// Reset profile picture to Google picture
const resetToGooglePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.google_id) {
      return res.status(400).json({ error: 'User is not linked to Google account' });
    }

    // For now, we'll need the frontend to provide the Google picture URL
    // In a real implementation, you might fetch this from Google's API
    const { google_picture_url } = req.body;
    
    if (!google_picture_url) {
      return res.status(400).json({ error: 'Google picture URL is required' });
    }

    if (!isGoogleProfilePicture(google_picture_url)) {
      return res.status(400).json({ error: 'Invalid Google picture URL' });
    }

    user.profile_picture = google_picture_url;
    await user.save();

    const updatedUser = await User.findById(user._id).populate('provider_id');

    res.json({
      message: 'Profile picture reset to Google picture successfully',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error('Reset to Google picture error:', error);
    res.status(500).json({ error: 'Failed to reset profile picture' });
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
  resetToGooglePicture,
  logout
};