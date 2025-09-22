const mongoose = require('mongoose');

const documentTypeSchema = new mongoose.Schema({
  document_type_name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  is_required: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('DocumentType', documentTypeSchema);