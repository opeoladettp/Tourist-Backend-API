const Registration = require('../models/Registration');
const CustomTour = require('../models/CustomTour');
const User = require('../models/User');
const { paginate, buildPaginationResponse } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');

// Get all registrations
const getAllRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, provider_id, custom_tour_id } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query based on user role
    const query = {};
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }
    if (status) query.status = status;
    if (provider_id && req.user.user_type === 'system_admin') {
      query.provider_id = provider_id;
    }
    if (custom_tour_id) query.custom_tour_id = custom_tour_id;

    const registrations = await Registration.find(query)
      .populate('custom_tour_id', 'tour_name start_date end_date')
      .populate('tourist_id', 'first_name last_name email')
      .populate('provider_id', 'provider_name')
      .skip(skip)
      .limit(limitNum)
      .sort({ created_date: -1 });

    const total = await Registration.countDocuments(query);

    res.json(buildPaginationResponse(registrations, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
};

// Get user's registrations (Tourist)
const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ 
      tourist_id: req.user._id 
    })
    .populate('custom_tour_id')
    .populate('provider_id', 'provider_name')
    .sort({ created_date: -1 });

    res.json({ registrations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
};

// Register for a tour (Tourist)
const registerForTour = async (req, res) => {
  try {
    const { custom_tour_id, notes } = req.body;

    // Check if tour exists and is published
    const tour = await CustomTour.findOne({
      _id: custom_tour_id,
      status: 'published'
    }).populate('provider_id');

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found or not available for registration' });
    }

    // Check if user is already registered
    const existingRegistration = await Registration.findOne({
      custom_tour_id,
      tourist_id: req.user._id
    });

    if (existingRegistration) {
      return res.status(400).json({ 
        error: 'You are already registered for this tour',
        registration_status: existingRegistration.status
      });
    }

    // Create registration
    const registration = new Registration({
      custom_tour_id,
      tourist_id: req.user._id,
      provider_id: tour.provider_id._id,
      notes,
      // Denormalized fields
      tourist_first_name: req.user.first_name,
      tourist_last_name: req.user.last_name,
      tourist_email: req.user.email,
      tour_name: tour.tour_name,
      created_by: req.user._id
    });

    await registration.save();

    // Send email notification to provider admins
    const providerAdmins = await User.find({
      provider_id: tour.provider_id._id,
      user_type: 'provider_admin',
      is_active: true
    });

    for (const admin of providerAdmins) {
      await sendEmail(
        admin.email,
        'registrationSubmitted',
        admin.first_name,
        tour.tour_name,
        req.user.first_name + ' ' + req.user.last_name
      );
    }

    const populatedRegistration = await Registration.findById(registration._id)
      .populate('custom_tour_id')
      .populate('provider_id', 'provider_name');

    res.status(201).json({
      message: 'Registration submitted successfully',
      registration: populatedRegistration
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You are already registered for this tour' });
    }
    res.status(500).json({ error: 'Failed to register for tour' });
  }
};

// Update registration status (Provider Admin, System Admin)
const updateRegistrationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const registrationId = req.params.id;

    const registration = await Registration.findById(registrationId)
      .populate('custom_tour_id')
      .populate('tourist_id');

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // Check access permissions
    if (req.user.user_type === 'provider_admin' && 
        req.user.provider_id?.toString() !== registration.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if tour has remaining spots for approval
    if (status === 'approved') {
      const tour = await CustomTour.findById(registration.custom_tour_id._id);
      if (tour.remaining_tourists <= 0) {
        return res.status(400).json({ error: 'No remaining spots available for this tour' });
      }

      // Update remaining tourists
      tour.remaining_tourists -= 1;
      await tour.save();
    }

    // If changing from approved to rejected/cancelled, free up the spot
    if (registration.status === 'approved' && ['rejected', 'cancelled'].includes(status)) {
      const tour = await CustomTour.findById(registration.custom_tour_id._id);
      tour.remaining_tourists += 1;
      await tour.save();
    }

    registration.status = status;
    if (notes) registration.notes = notes;
    await registration.save();

    // Send email notification to tourist
    await sendEmail(
      registration.tourist_id.email,
      'registrationStatusUpdate',
      registration.tourist_id.first_name,
      registration.custom_tour_id.tour_name,
      status
    );

    res.json({
      message: `Registration ${status} successfully`,
      registration
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update registration status' });
  }
};

// Unregister from tour (Tourist, System Admin)
const unregisterFromTour = async (req, res) => {
  try {
    const registrationId = req.params.id;

    const registration = await Registration.findById(registrationId)
      .populate('custom_tour_id')
      .populate('provider_id');

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    // Check access permissions
    if (req.user.user_type === 'tourist' && 
        registration.tourist_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Free up the spot if registration was approved
    if (registration.status === 'approved') {
      const tour = await CustomTour.findById(registration.custom_tour_id._id);
      tour.remaining_tourists += 1;
      await tour.save();
    }

    registration.status = 'cancelled';
    await registration.save();

    // Send email notifications
    if (req.user.user_type === 'system_admin') {
      // Notify tourist
      const tourist = await User.findById(registration.tourist_id);
      await sendEmail(
        tourist.email,
        'registrationStatusUpdate',
        tourist.first_name,
        registration.custom_tour_id.tour_name,
        'cancelled'
      );
    } else {
      // Notify provider admins
      const providerAdmins = await User.find({
        provider_id: registration.provider_id._id,
        user_type: 'provider_admin',
        is_active: true
      });

      for (const admin of providerAdmins) {
        // You can create a specific email template for unregistration
        await sendEmail(
          admin.email,
          'registrationStatusUpdate',
          admin.first_name,
          registration.custom_tour_id.tour_name,
          'cancelled by tourist'
        );
      }
    }

    res.json({
      message: 'Unregistered successfully',
      registration
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unregister from tour' });
  }
};

// Get registration statistics
const getRegistrationStats = async (req, res) => {
  try {
    const query = {};
    if (req.user.user_type === 'provider_admin') {
      query.provider_id = req.user.provider_id;
    }

    const [
      totalRegistrations,
      pendingRegistrations,
      approvedRegistrations,
      rejectedRegistrations
    ] = await Promise.all([
      Registration.countDocuments(query),
      Registration.countDocuments({ ...query, status: 'pending' }),
      Registration.countDocuments({ ...query, status: 'approved' }),
      Registration.countDocuments({ ...query, status: 'rejected' })
    ]);

    res.json({
      stats: {
        total: totalRegistrations,
        pending: pendingRegistrations,
        approved: approvedRegistrations,
        rejected: rejectedRegistrations
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch registration statistics' });
  }
};

module.exports = {
  getAllRegistrations,
  getMyRegistrations,
  registerForTour,
  updateRegistrationStatus,
  unregisterFromTour,
  getRegistrationStats
};