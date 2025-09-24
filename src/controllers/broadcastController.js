const Broadcast = require('../models/Broadcast');
const CustomTour = require('../models/CustomTour');
const Registration = require('../models/Registration');
const { paginate, buildPaginationResponse } = require('../utils/helpers');
const { sendNotificationToUsers } = require('../services/notificationService');

// Get all broadcasts
const getAllBroadcasts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, custom_tour_id } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query based on user role
    const query = {};
    
    // If user is provider admin, only show their broadcasts
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }
    
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (custom_tour_id) {
      query.custom_tour_id = custom_tour_id;
    }

    const broadcasts = await Broadcast.find(query)
      .populate('custom_tour_id', 'tour_name start_date end_date')
      .populate('provider_id', 'provider_name')
      .populate('created_by', 'first_name last_name email')
      .skip(skip)
      .limit(limitNum)
      .sort({ created_date: -1 });

    const total = await Broadcast.countDocuments(query);

    res.json(buildPaginationResponse(broadcasts, total, page, limit));
  } catch (error) {
    console.error('Get broadcasts error:', error);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
};

// Get broadcast by ID
const getBroadcastById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // If user is provider admin, only show their broadcasts
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }

    const broadcast = await Broadcast.findOne(query)
      .populate('custom_tour_id', 'tour_name start_date end_date join_code')
      .populate('provider_id', 'provider_name')
      .populate('created_by', 'first_name last_name email');
    
    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }

    res.json({ broadcast });
  } catch (error) {
    console.error('Get broadcast error:', error);
    res.status(500).json({ error: 'Failed to fetch broadcast' });
  }
};

// Create new broadcast
const createBroadcast = async (req, res) => {
  try {
    const { custom_tour_id, message, status = 'draft' } = req.body;

    // Verify the tour exists and user has access to it
    const tourQuery = { _id: custom_tour_id };
    if (req.user.user_type === 'provider_admin') {
      tourQuery.provider_id = req.user.provider_id;
    }

    const tour = await CustomTour.findOne(tourQuery);
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found or access denied' });
    }

    const broadcastData = {
      custom_tour_id,
      provider_id: tour.provider_id,
      message,
      status,
      created_by: req.user._id
    };

    const broadcast = new Broadcast(broadcastData);
    await broadcast.save();

    const populatedBroadcast = await Broadcast.findById(broadcast._id)
      .populate('custom_tour_id', 'tour_name start_date end_date join_code')
      .populate('provider_id', 'provider_name')
      .populate('created_by', 'first_name last_name email');

    // If broadcast is published, send notifications to registered tourists
    if (status === 'published') {
      await sendBroadcastNotifications(populatedBroadcast);
    }

    res.status(201).json({
      message: 'Broadcast created successfully',
      broadcast: populatedBroadcast
    });
  } catch (error) {
    console.error('Create broadcast error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
};

// Update broadcast
const updateBroadcast = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // If user is provider admin, only allow updating their broadcasts
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }

    const existingBroadcast = await Broadcast.findOne(query);
    if (!existingBroadcast) {
      return res.status(404).json({ error: 'Broadcast not found or access denied' });
    }

    const wasPublished = existingBroadcast.status === 'published';
    const willBePublished = req.body.status === 'published';

    const broadcast = await Broadcast.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('custom_tour_id', 'tour_name start_date end_date join_code')
      .populate('provider_id', 'provider_name')
      .populate('created_by', 'first_name last_name email');

    // If broadcast is being published for the first time, send notifications
    if (!wasPublished && willBePublished) {
      await sendBroadcastNotifications(broadcast);
    }

    res.json({
      message: 'Broadcast updated successfully',
      broadcast
    });
  } catch (error) {
    console.error('Update broadcast error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update broadcast' });
  }
};

// Publish broadcast
const publishBroadcast = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // If user is provider admin, only allow publishing their broadcasts
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }

    const broadcast = await Broadcast.findOneAndUpdate(
      query,
      { status: 'published' },
      { new: true }
    )
      .populate('custom_tour_id', 'tour_name start_date end_date join_code')
      .populate('provider_id', 'provider_name')
      .populate('created_by', 'first_name last_name email');

    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast not found or access denied' });
    }

    // Send notifications to registered tourists
    await sendBroadcastNotifications(broadcast);

    res.json({
      message: 'Broadcast published successfully',
      broadcast
    });
  } catch (error) {
    console.error('Publish broadcast error:', error);
    res.status(500).json({ error: 'Failed to publish broadcast' });
  }
};

// Delete broadcast
const deleteBroadcast = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // If user is provider admin, only allow deleting their broadcasts
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }

    const broadcast = await Broadcast.findOneAndDelete(query);
    
    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast not found or access denied' });
    }

    res.json({ message: 'Broadcast deleted successfully' });
  } catch (error) {
    console.error('Delete broadcast error:', error);
    res.status(500).json({ error: 'Failed to delete broadcast' });
  }
};

// Get broadcasts for a specific tour
const getBroadcastsByTour = async (req, res) => {
  try {
    const { tourId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query
    const query = { custom_tour_id: tourId };
    
    // If user is provider admin, only show their broadcasts
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }
    
    // For tourists, only show published broadcasts for tours they're registered for
    if (req.user.user_type === 'tourist') {
      // Check if user is registered for this tour
      const registration = await Registration.findOne({
        custom_tour_id: tourId,
        tourist_id: req.user._id,
        status: 'approved'
      });
      
      if (!registration) {
        return res.status(403).json({ error: 'Access denied. Not registered for this tour.' });
      }
      
      query.status = 'published';
    }
    
    if (status) {
      query.status = status;
    }

    const broadcasts = await Broadcast.find(query)
      .populate('custom_tour_id', 'tour_name start_date end_date')
      .populate('provider_id', 'provider_name')
      .populate('created_by', 'first_name last_name')
      .skip(skip)
      .limit(limitNum)
      .sort({ created_date: -1 });

    const total = await Broadcast.countDocuments(query);

    res.json(buildPaginationResponse(broadcasts, total, page, limit));
  } catch (error) {
    console.error('Get broadcasts by tour error:', error);
    res.status(500).json({ error: 'Failed to fetch tour broadcasts' });
  }
};

// Helper function to send notifications for broadcasts
const sendBroadcastNotifications = async (broadcast) => {
  try {
    // Get all approved registrations for this tour
    const registrations = await Registration.find({
      custom_tour_id: broadcast.custom_tour_id._id,
      status: 'approved'
    }).populate('tourist_id', '_id');

    if (registrations.length === 0) {
      console.log('No registered tourists found for broadcast notification');
      return;
    }

    const touristIds = registrations.map(reg => reg.tourist_id._id);
    
    const notificationData = {
      title: `New message for ${broadcast.custom_tour_id.tour_name}`,
      message: broadcast.message,
      type: 'broadcast',
      data: {
        broadcast_id: broadcast._id,
        custom_tour_id: broadcast.custom_tour_id._id,
        tour_name: broadcast.custom_tour_id.tour_name
      }
    };

    // Send notifications to all registered tourists
    await sendNotificationToUsers(touristIds, notificationData);
    
    console.log(`Broadcast notifications sent to ${touristIds.length} tourists`);
  } catch (error) {
    console.error('Error sending broadcast notifications:', error);
    // Don't throw error - broadcast creation should still succeed
  }
};

module.exports = {
  getAllBroadcasts,
  getBroadcastById,
  createBroadcast,
  updateBroadcast,
  publishBroadcast,
  deleteBroadcast,
  getBroadcastsByTour
};