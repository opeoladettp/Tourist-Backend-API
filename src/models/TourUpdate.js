const mongoose = require('mongoose');

const tourUpdateSchema = new mongoose.Schema({
  custom_tour_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomTour',
    required: true
  },
  update_type: {
    type: String,
    enum: ['calendar_entry', 'document_upload'],
    required: true
  },
  update_summary: {
    type: String,
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

module.exports = mongoose.model('TourUpdate', tourUpdateSchema);