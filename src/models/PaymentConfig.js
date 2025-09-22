const mongoose = require('mongoose');

const paymentConfigSchema = new mongoose.Schema({
  charge_per_tourist: {
    type: Number,
    default: 0
  },
  default_max_tourists: {
    type: Number,
    default: 5
  },
  max_provider_admins: {
    type: Number,
    default: 2
  },
  config_key: {
    type: String,
    default: 'default',
    unique: true
  },
  product_overview: String,
  mission_statement: String,
  vision: String,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

module.exports = mongoose.model('PaymentConfig', paymentConfigSchema);