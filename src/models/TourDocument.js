const mongoose = require('mongoose');

const tourDocumentSchema = new mongoose.Schema({
  custom_tour_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomTour',
    required: true
  },
  document_name: {
    type: String,
    required: true
  },
  description: String,
  file_name: {
    type: String,
    required: true
  },
  file_url: {
    type: String,
    required: true
  },
  file_size: Number,
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  is_visible_to_tourists: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

module.exports = mongoose.model('TourDocument', tourDocumentSchema);