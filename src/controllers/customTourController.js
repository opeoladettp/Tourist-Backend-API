const CustomTour = require('../models/CustomTour');
const TourTemplate = require('../models/TourTemplate');
const CalendarEntry = require('../models/CalendarEntry');
const Registration = require('../models/Registration');
const QRCodeService = require('../services/qrCodeService');
const NotificationService = require('../services/notificationService');
const { paginate, buildPaginationResponse, generateJoinCode, createTourUpdate } = require('../utils/helpers');

// Get all custom tours
const getAllCustomTours = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, provider_id } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query based on user role
    const query = {};
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }
    if (search) {
      query.$or = [
        { tour_name: { $regex: search, $options: 'i' } },
        { join_code: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (provider_id && req.user.user_type === 'system_admin') {
      query.provider_id = provider_id;
    }

    const tours = await CustomTour.find(query)
      .populate('provider_id', 'provider_name')
      .populate('tour_template_id', 'template_name')
      .populate('created_by', 'first_name last_name')
      .skip(skip)
      .limit(limitNum)
      .sort({ created_date: -1 });

    const total = await CustomTour.countDocuments(query);

    res.json(buildPaginationResponse(tours, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom tours' });
  }
};

// Get custom tour by ID
const getCustomTourById = async (req, res) => {
  try {
    const tour = await CustomTour.findById(req.params.id)
      .populate('provider_id')
      .populate('tour_template_id')
      .populate('created_by', 'first_name last_name');
    
    if (!tour) {
      return res.status(404).json({ error: 'Custom tour not found' });
    }

    // Check access permissions
    if (req.user.user_type === 'provider_admin' && 
        req.user.provider_id?.toString() !== tour.provider_id._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get calendar entries for this tour
    const calendarEntries = await CalendarEntry.find({ 
      custom_tour_id: req.params.id 
    }).sort({ entry_date: 1, start_time: 1 });

    // Get registrations count
    const registrationsCount = await Registration.countDocuments({
      custom_tour_id: req.params.id,
      status: 'approved'
    });

    res.json({ 
      tour,
      calendar_entries: calendarEntries,
      registrations_count: registrationsCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom tour' });
  }
};

// Create new custom tour
const createCustomTour = async (req, res) => {
  try {
    const tourData = req.body;
    
    // Set provider_id based on user role
    if (req.user.user_type === 'provider_admin') {
      tourData.provider_id = req.user.provider_id;
    }

    // Validate tour template exists and is active
    const template = await TourTemplate.findOne({
      _id: tourData.tour_template_id,
      is_active: true
    });

    if (!template) {
      return res.status(400).json({ error: 'Invalid or inactive tour template' });
    }

    // Generate unique join code
    let joinCode;
    let isUnique = false;
    while (!isUnique) {
      joinCode = generateJoinCode();
      const existing = await CustomTour.findOne({ join_code: joinCode });
      if (!existing) isUnique = true;
    }

    tourData.join_code = joinCode;
    tourData.created_by = req.user._id;

    // Get default max tourists from PaymentConfig
    const PaymentConfig = require('../models/PaymentConfig');
    const config = await PaymentConfig.findOne({ config_key: 'default' });
    if (!tourData.max_tourists) {
      tourData.max_tourists = config?.default_max_tourists || 5;
    }
    tourData.remaining_tourists = tourData.max_tourists;

    const tour = new CustomTour(tourData);
    await tour.save();

    // Copy calendar entries from template
    const templateEntries = await CalendarEntry.find({ 
      tour_template_id: tourData.tour_template_id 
    });

    const tourEntries = templateEntries.map(entry => ({
      custom_tour_id: tour._id,
      entry_date: entry.entry_date,
      activity: entry.activity,
      activity_description: entry.activity_description,
      activity_details: entry.activity_details,
      web_links: entry.web_links,
      start_time: entry.start_time,
      end_time: entry.end_time,
      created_by: req.user._id
    }));

    if (tourEntries.length > 0) {
      await CalendarEntry.insertMany(tourEntries);
    }

    const populatedTour = await CustomTour.findById(tour._id)
      .populate('provider_id', 'provider_name')
      .populate('tour_template_id', 'template_name');

    // Generate QR codes asynchronously (don't wait for completion)
    setImmediate(async () => {
      try {
        const qrCodeUrl = await QRCodeService.generateTourQRCode(populatedTour, 'custom');
        const joinQrCodeUrl = await QRCodeService.generateJoinQRCode(populatedTour);
        
        // Update tour with QR code URLs
        await CustomTour.findByIdAndUpdate(tour._id, {
          qr_code_url: qrCodeUrl,
          join_qr_code_url: joinQrCodeUrl,
          qr_code_generated_at: new Date()
        });

        // Send notification to provider admins
        await NotificationService.notifyQRCodeGenerated(populatedTour, qrCodeUrl, 'custom');
      } catch (error) {
        console.error('Error generating QR codes for new tour:', error);
      }
    });

    res.status(201).json({
      message: 'Custom tour created successfully',
      tour: populatedTour
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create custom tour' });
  }
};

// Update custom tour
const updateCustomTour = async (req, res) => {
  try {
    const tourId = req.params.id;
    const updates = req.body;

    // Get current tour
    const currentTour = await CustomTour.findById(tourId);
    if (!currentTour) {
      return res.status(404).json({ error: 'Custom tour not found' });
    }

    // Check access permissions
    if (req.user.user_type === 'provider_admin' && 
        req.user.provider_id?.toString() !== currentTour.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow updating provider_id or tour_template_id
    delete updates.provider_id;
    delete updates.tour_template_id;

    // Handle max_tourists change
    if (updates.max_tourists && updates.max_tourists !== currentTour.max_tourists) {
      const approvedRegistrations = await Registration.countDocuments({
        custom_tour_id: tourId,
        status: 'approved'
      });

      updates.remaining_tourists = updates.max_tourists - approvedRegistrations;
    }

    // Validate join_code uniqueness if being updated
    if (updates.join_code && updates.join_code !== currentTour.join_code) {
      if (currentTour.status === 'published') {
        return res.status(400).json({ 
          error: 'Cannot change join code for published tours' 
        });
      }

      const existing = await CustomTour.findOne({ 
        join_code: updates.join_code,
        _id: { $ne: tourId }
      });
      if (existing) {
        return res.status(400).json({ error: 'Join code already exists' });
      }
    }

    const tour = await CustomTour.findByIdAndUpdate(
      tourId,
      updates,
      { new: true, runValidators: true }
    )
    .populate('provider_id', 'provider_name')
    .populate('tour_template_id', 'template_name');

    res.json({
      message: 'Custom tour updated successfully',
      tour
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update custom tour' });
  }
};

// Update tour status
const updateTourStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const tourId = req.params.id;

    const tour = await CustomTour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ error: 'Custom tour not found' });
    }

    // Check access permissions
    if (req.user.user_type === 'provider_admin' && 
        req.user.provider_id?.toString() !== tour.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Handle cancelled status
    if (status === 'cancelled') {
      // Cancel all registrations
      await Registration.updateMany(
        { custom_tour_id: tourId },
        { status: 'cancelled' }
      );

      // Update remaining tourists
      tour.remaining_tourists = tour.max_tourists;
    }

    tour.status = status;
    await tour.save();

    res.json({
      message: `Tour status updated to ${status}`,
      tour
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tour status' });
  }
};

// Delete custom tour
const deleteCustomTour = async (req, res) => {
  try {
    const tourId = req.params.id;

    const tour = await CustomTour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ error: 'Custom tour not found' });
    }

    // Check access permissions
    if (req.user.user_type === 'provider_admin' && 
        req.user.provider_id?.toString() !== tour.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete tour and all associated data
    await Promise.all([
      CustomTour.findByIdAndDelete(tourId),
      CalendarEntry.deleteMany({ custom_tour_id: tourId }),
      Registration.deleteMany({ custom_tour_id: tourId }),
      // Add other cleanup operations as needed
    ]);

    res.json({ message: 'Custom tour deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete custom tour' });
  }
};

// Search tour by join code (Tourist)
const searchTourByJoinCode = async (req, res) => {
  try {
    const { join_code } = req.params;

    const tour = await CustomTour.findOne({ 
      join_code: join_code.toUpperCase(),
      status: 'published'
    })
    .populate('provider_id', 'provider_name country')
    .populate('tour_template_id', 'template_name');

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found or not available for registration' });
    }

    // Check if user is already registered
    const existingRegistration = await Registration.findOne({
      custom_tour_id: tour._id,
      tourist_id: req.user._id
    });

    res.json({ 
      tour,
      already_registered: !!existingRegistration,
      registration_status: existingRegistration?.status
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search tour' });
  }
};

module.exports = {
  getAllCustomTours,
  getCustomTourById,
  createCustomTour,
  updateCustomTour,
  updateTourStatus,
  deleteCustomTour,
  searchTourByJoinCode
};