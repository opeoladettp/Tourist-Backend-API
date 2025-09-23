const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  p256dh_key: {
    type: String,
    required: true
  },
  auth_key: {
    type: String,
    required: true
  },
  user_agent: {
    type: String,
    default: null
  },
  device_type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  browser: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_used: {
    type: Date,
    default: Date.now
  },
  last_error: {
    type: String,
    default: null
  },
  subscription_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
pushSubscriptionSchema.index({ user_id: 1, is_active: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ created_at: -1 });

// Methods
pushSubscriptionSchema.methods.updateLastUsed = function() {
  this.last_used = new Date();
  return this.save();
};

pushSubscriptionSchema.methods.markAsInactive = function(error = null) {
  this.is_active = false;
  if (error) {
    this.last_error = error;
  }
  return this.save();
};

// Static methods
pushSubscriptionSchema.statics.findActiveByUser = function(userId) {
  return this.find({ user_id: userId, is_active: true });
};

pushSubscriptionSchema.statics.cleanupInactive = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    is_active: false,
    updated_at: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);