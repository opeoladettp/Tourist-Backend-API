const mongoose = require('mongoose');

const webLinkSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  description: {
    type: String,
    maxlength: 24
  }
}, { _id: false });

const customTourSchema = new mongoose.Schema({
  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  tour_template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourTemplate',
    required: true
  },
  tour_name: {
    type: String,
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'completed', 'cancelled'],
    default: 'draft'
  },
  join_code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    maxlength: 10
  },
  max_tourists: {
    type: Number,
    default: 5
  },
  remaining_tourists: {
    type: Number,
    default: 5
  },
  group_chat_link: String,
  features_image: {
    type: String, // URL to the main features image
    default: null
  },
  teaser_images: [{
    type: String // Array of URLs for teaser images
  }],
  web_links: [webLinkSchema],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

// Auto-generate join code
customTourSchema.pre('save', function(next) {
  if (!this.join_code) {
    this.join_code = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  // Update remaining_tourists when max_tourists changes
  if (this.isModified('max_tourists') && !this.isNew) {
    // This will be handled in the route logic to account for existing registrations
  }
  
  next();
});

module.exports = mongoose.model('CustomTour', customTourSchema);