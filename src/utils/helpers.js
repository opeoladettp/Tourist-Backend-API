const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Generate unique join code
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Generate provider code
const generateProviderCode = (providerName) => {
  const cleanName = providerName.toUpperCase().replace(/\s+/g, '').substring(0, 6);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return cleanName + randomSuffix;
};

// Calculate duration in days
const calculateDurationDays = (startDate, endDate) => {
  const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Check if date is in range
const isDateInRange = (date, startDate, endDate) => {
  const checkDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return checkDate >= start && checkDate <= end;
};

// Paginate results
const paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

// Build pagination response
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current_page: parseInt(page),
      total_pages: totalPages,
      total_items: total,
      items_per_page: parseInt(limit),
      has_next: page < totalPages,
      has_prev: page > 1
    }
  };
};

// Sanitize user data for response
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.google_id;
  return userObj;
};

// Check if user is ongoing tour participant
const hasOngoingTour = (registrations) => {
  const today = new Date();
  return registrations.find(reg => 
    reg.status === 'approved' &&
    new Date(reg.custom_tour_id.start_date) <= today &&
    new Date(reg.custom_tour_id.end_date) >= today
  );
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Create tour update notification
const createTourUpdate = async (customTourId, updateType, updateSummary, updatedBy) => {
  const TourUpdate = require('../models/TourUpdate');
  
  try {
    const tourUpdate = new TourUpdate({
      custom_tour_id: customTourId,
      update_type: updateType,
      update_summary: updateSummary,
      updated_by: updatedBy,
      created_by: updatedBy
    });
    
    await tourUpdate.save();
    return tourUpdate;
  } catch (error) {
    console.error('Error creating tour update:', error);
    return null;
  }
};

// Create document activity notification
const createDocumentActivity = async (data) => {
  const DocumentActivity = require('../models/DocumentActivity');
  
  try {
    const activity = new DocumentActivity({
      ...data,
      created_by: data.uploaded_by || data.updated_by
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating document activity:', error);
    return null;
  }
};

module.exports = {
  generateToken,
  generateJoinCode,
  generateProviderCode,
  calculateDurationDays,
  isDateInRange,
  paginate,
  buildPaginationResponse,
  sanitizeUser,
  hasOngoingTour,
  formatFileSize,
  isValidObjectId,
  createTourUpdate,
  createDocumentActivity
};