const mongoose = require('mongoose');

const documentActivitySchema = new mongoose.Schema({
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
  activity_type: {
    type: String,
    enum: ['tourist_upload', 'tourist_delete', 'provider_upload', 'provider_delete'],
    required: true
  },
  document_name: {
    type: String,
    required: true
  },
  document_type: {
    type: String,
    enum: ['tourist_document', 'tour_document'],
    required: true
  },
  tourist_name: String, // Denormalized
  tour_name: String,    // Denormalized
  is_viewed_by_provider: {
    type: Boolean,
    default: false
  },
  is_viewed_by_tourist: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

module.exports = mongoose.model('DocumentActivity', documentActivitySchema);