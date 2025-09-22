const mongoose = require('mongoose');

const userTourUpdateViewSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tour_update_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourUpdate',
    required: true
  },
  custom_tour_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomTour',
    required: true
  },
  viewed_at: {
    type: Date,
    default: Date.now
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

// Compound index to prevent duplicate views
userTourUpdateViewSchema.index({ user_id: 1, tour_update_id: 1 }, { unique: true });

module.exports = mongoose.model('UserTourUpdateView', userTourUpdateViewSchema);