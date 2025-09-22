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

const tourTemplateSchema = new mongoose.Schema({
  template_name: {
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
  description: String,
  is_active: {
    type: Boolean,
    default: true
  },
  duration_days: Number,
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

// Calculate duration_days automatically
tourTemplateSchema.pre('save', function(next) {
  if (this.start_date && this.end_date) {
    const diffTime = Math.abs(this.end_date - this.start_date);
    this.duration_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

module.exports = mongoose.model('TourTemplate', tourTemplateSchema);