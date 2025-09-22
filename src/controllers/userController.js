const User = require('../models/User');
const Registration = require('../models/Registration');
const { paginate, buildPaginationResponse, sanitizeUser, hasOngoingTour } = require('../utils/helpers');

// Get all users (System Admin only)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, user_type, provider_id } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (user_type) query.user_type = user_type;
    if (provider_id) query.provider_id = provider_id;

    const users = await User.find(query)
      .populate('provider_id', 'provider_name')
      .skip(skip)
      .limit(limitNum)
      .sort({ created_date: -1 });

    const total = await User.countDocuments(query);

    const sanitizedUsers = users.map(sanitizeUser);

    res.json(buildPaginationResponse(sanitizedUsers, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID (System Admin only)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('provider_id');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Update user (System Admin only)
const updateUser = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.email; // Email cannot be updated
    delete updates.google_id; // Google ID cannot be updated

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('provider_id');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user (System Admin only)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete user and all associated data
    await Promise.all([
      User.findByIdAndDelete(userId),
      Registration.deleteMany({ tourist_id: userId }),
      // Add other cleanup operations as needed
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get user dashboard data
const getDashboardData = async (req, res) => {
  try {
    const user = req.user;

    switch (user.user_type) {
      case 'system_admin':
        return getSystemAdminDashboard(req, res);
      case 'provider_admin':
        return getProviderAdminDashboard(req, res);
      case 'tourist':
        return getTouristDashboard(req, res);
      default:
        return res.status(400).json({ error: 'Invalid user type' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// System Admin Dashboard
const getSystemAdminDashboard = async (req, res) => {
  try {
    const Provider = require('../models/Provider');
    const TourTemplate = require('../models/TourTemplate');
    const CustomTour = require('../models/CustomTour');
    const DefaultActivity = require('../models/DefaultActivity');

    const [
      totalProviders,
      totalUsers,
      totalTemplates,
      totalActivities,
      recentProviders
    ] = await Promise.all([
      Provider.countDocuments(),
      User.countDocuments(),
      TourTemplate.countDocuments(),
      DefaultActivity.countDocuments(),
      Provider.find().sort({ created_date: -1 }).limit(5)
    ]);

    res.json({
      stats: {
        total_providers: totalProviders,
        total_users: totalUsers,
        total_templates: totalTemplates,
        total_activities: totalActivities
      },
      recent_providers: recentProviders
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system admin dashboard' });
  }
};

// Provider Admin Dashboard
const getProviderAdminDashboard = async (req, res) => {
  try {
    const CustomTour = require('../models/CustomTour');

    const [
      activeTours,
      totalRegistrations,
      pendingApprovals
    ] = await Promise.all([
      CustomTour.countDocuments({ 
        provider_id: req.user.provider_id,
        status: { $in: ['draft', 'published'] }
      }),
      Registration.countDocuments({ 
        provider_id: req.user.provider_id,
        status: 'approved'
      }),
      Registration.countDocuments({ 
        provider_id: req.user.provider_id,
        status: 'pending'
      })
    ]);

    res.json({
      stats: {
        active_tours: activeTours,
        total_registrations: totalRegistrations,
        pending_approvals: pendingApprovals
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch provider admin dashboard' });
  }
};

// Tourist Dashboard
const getTouristDashboard = async (req, res) => {
  try {
    const registrations = await Registration.find({ 
      tourist_id: req.user._id 
    })
    .populate('custom_tour_id')
    .populate('provider_id', 'provider_name')
    .sort({ created_date: -1 });

    // Check for ongoing tour
    const ongoingTour = hasOngoingTour(registrations);

    res.json({
      registrations,
      ongoing_tour: ongoingTour,
      redirect: ongoingTour ? `/tours/${ongoingTour.custom_tour_id._id}/itinerary` : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tourist dashboard' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDashboardData
};