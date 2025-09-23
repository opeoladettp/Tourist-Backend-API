const mongoose = require('mongoose');

const roleChangeRequestSchema = new mongoose.Schema({
  tourist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  request_type: {
    type: String,
    enum: ['join_existing_provider', 'become_new_provider'],
    required: true
  },
  // For joining existing provider
  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: function() {
      return this.request_type === 'join_existing_provider';
    }
  },
  // For becoming new provider
  proposed_provider_data: {
    provider_name: {
      type: String,
      required: function() {
        return this.request_type === 'become_new_provider';
      }
    },
    country: {
      type: String,
      required: function() {
        return this.request_type === 'become_new_provider';
      }
    },
    address: {
      type: String,
      required: function() {
        return this.request_type === 'become_new_provider';
      }
    },
    phone_number: {
      type: String,
      required: function() {
        return this.request_type === 'become_new_provider';
      }
    },
    email_address: {
      type: String,
      required: function() {
        return this.request_type === 'become_new_provider';
      }
    },
    corporate_tax_id: String,
    company_description: String,
    logo_url: String
  },
  // Denormalized fields
  tourist_name: String,
  tourist_email: String,
  provider_name: String, // For existing provider requests
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