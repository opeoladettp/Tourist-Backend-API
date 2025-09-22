const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  custom_tour_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomTour',
    required: true
  },
  tourist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  // Denormalized fields for display
  tourist_first_name: String,
  tourist_last_name: String,
  tourist_email: String,
  tour_name: String,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

// Compound index to prevent duplicate registrations
registrationSchema.index({ custom_tour_id: 1, tourist_id: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);