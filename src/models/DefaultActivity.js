const mongoose = require('mongoose');

const defaultActivitySchema = new mongoose.Schema({
  activity_name: {
    type: String,
    required: true
  },
  description: String,
  typical_duration_hours: Number,
  category: {
    type: String,
    enum: [
      'sightseeing', 'cultural', 'adventure', 'dining', 
      'transportation', 'accommodation', 'entertainment', 
      'shopping', 'educational', 'religious', 'nature', 'other'
    ],
    required: true
  },
  is_active: {
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

module.exports = mongoose.model('DefaultActivity', defaultActivitySchema);