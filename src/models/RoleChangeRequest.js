const mongoose = require('mongoose');

const roleChangeRequestSchema = new mongoose.Schema({
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
  tourist_name: String,    // Denormalized
  tourist_email: String,   // Denormalized
  provider_name: String,   // Denormalized
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  request_message: String,
  admin_notes: String,
  processed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processed_date: Date,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

module.exports = mongoose.model('RoleChangeRequest', roleChangeRequestSchema);