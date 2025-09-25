const DefaultActivity = require('../models/DefaultActivity');
const { paginate, buildPaginationResponse } = require('../utils/helpers');
const databaseCache = require('../services/databaseCache');

// Get all default activities
const getAllDefaultActivities = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, is_active } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { activity_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const activities = await databaseCache.find(
      DefaultActivity, 
      query, 
      {
        populate: 'created_by',
        skip,
        limit: limitNum,
        sort: { activity_name: 1 }
      },
      600 // 10 minutes cache
    );

    const total = await databaseCache.countDocuments(DefaultActivity, query, 600);

    res.json(buildPaginationResponse(activities, total, page, limit));
  } catch (error) {
    console.error('Get default activities error:', error);
    res.status(500).json({ error: 'Failed to fetch default activities' });
  }
};

// Get default activity by ID
const getDefaultActivityById = async (req, res) => {
  try {
    const activity = await databaseCache.findById(
      DefaultActivity, 
      req.params.id, 
      { populate: 'created_by' },
      1200 // 20 minutes cache
    );
    
    if (!activity) {
      return res.status(404).json({ error: 'Default activity not found' });
    }

    res.json({ activity });
  } catch (error) {
    console.error('Get default activity error:', error);
    res.status(500).json({ error: 'Failed to fetch default activity' });
  }
};

// Create new default activity
const createDefaultActivity = async (req, res) => {
  try {
    const activityData = {
      ...req.body,
      created_by: req.user._id
    };

    const activity = new DefaultActivity(activityData);
    await activity.save();

    const populatedActivity = await DefaultActivity.findById(activity._id)
      .populate('created_by', 'first_name last_name email');

    res.status(201).json({
      message: 'Default activity created successfully',
      activity: populatedActivity
    });
  } catch (error) {
    console.error('Create default activity error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create default activity' });
  }
};

// Update default activity
const updateDefaultActivity = async (req, res) => {
  try {
    const activity = await DefaultActivity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('created_by', 'first_name last_name email');

    if (!activity) {
      return res.status(404).json({ error: 'Default activity not found' });
    }

    res.json({
      message: 'Default activity updated successfully',
      activity
    });
  } catch (error) {
    console.error('Update default activity error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update default activity' });
  }
};

// Toggle default activity status
const toggleActivityStatus = async (req, res) => {
  try {
    const activity = await DefaultActivity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Default activity not found' });
    }

    activity.is_active = !activity.is_active;
    await activity.save();

    const populatedActivity = await DefaultActivity.findById(activity._id)
      .populate('created_by', 'first_name last_name email');

    res.json({
      message: `Default activity ${activity.is_active ? 'activated' : 'deactivated'} successfully`,
      activity: populatedActivity
    });
  } catch (error) {
    console.error('Toggle activity status error:', error);
    res.status(500).json({ error: 'Failed to update activity status' });
  }
};

// Delete default activity
const deleteDefaultActivity = async (req, res) => {
  try {
    const activity = await DefaultActivity.findByIdAndDelete(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Default activity not found' });
    }

    res.json({ message: 'Default activity deleted successfully' });
  } catch (error) {
    console.error('Delete default activity error:', error);
    res.status(500).json({ error: 'Failed to delete default activity' });
  }
};

// Get activity categories
const getActivityCategories = async (req, res) => {
  try {
    const categories = [
      'sightseeing', 'cultural', 'adventure', 'dining', 
      'transportation', 'accommodation', 'entertainment', 
      'shopping', 'educational', 'religious', 'nature', 'other'
    ];

    // Get count for each category
    const categoryCounts = await DefaultActivity.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categoriesWithCounts = categories.map(category => {
      const categoryData = categoryCounts.find(c => c._id === category);
      return {
        name: category,
        count: categoryData ? categoryData.count : 0
      };
    });

    res.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error('Get activity categories error:', error);
    res.status(500).json({ error: 'Failed to fetch activity categories' });
  }
};

// Get activities for selection (simplified response)
const getActivitiesForSelection = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const query = { is_active: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { activity_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const activities = await databaseCache.find(
      DefaultActivity, 
      query, 
      {
        select: 'activity_name description typical_duration_hours category',
        sort: { activity_name: 1 }
      },
      900 // 15 minutes cache for selection
    )
      .limit(50); // Limit for selection dropdown

    res.json({ activities });
  } catch (error) {
    console.error('Get activities for selection error:', error);
    res.status(500).json({ error: 'Failed to fetch activities for selection' });
  }
};

module.exports = {
  getAllDefaultActivities,
  getDefaultActivityById,
  createDefaultActivity,
  updateDefaultActivity,
  toggleActivityStatus,
  deleteDefaultActivity,
  getActivityCategories,
  getActivitiesForSelection
};