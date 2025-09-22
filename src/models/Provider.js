const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true
  },
  provider_name: {
    type: String,
    required: true,
    unique: true
  },
  logo_url: String,
  address: {
    type: String,
    required: true
  },
  phone_number: {
    type: String,
    required: true,
    unique: true
  },
  email_address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  corporate_tax_id: {
    type: String,
    unique: true,
    sparse: true
  },
  company_description: String,
  is_active: {
    type: Boolean,
    default: true
  },
  provider_code: {
    type: String,
    unique: true
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

// Auto-generate provider code before saving
providerSchema.pre('save', function(next) {
  if (!this.provider_code) {
    this.provider_code = this.provider_name.toUpperCase().replace(/\s+/g, '').substring(0, 6) + 
                        Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Provider', providerSchema);