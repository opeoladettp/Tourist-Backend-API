const mongoose = require('mongoose');

const touristDocumentSchema = new mongoose.Schema({
  tourist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  custom_tour_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomTour',
    required: true
  },
  registration_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: true
  },
  document_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentType',
    required: true
  },
  document_type_name: String, // Denormalized
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
    ref: 'User'
  },
  notes: String,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

module.exports = mongoose.model('TouristDocument', touristDocumentSchema);