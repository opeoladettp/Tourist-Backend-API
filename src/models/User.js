const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Built-in fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  
  // Custom fields from spec
  user_type: {
    type: String,
    enum: ['system_admin', 'provider_admin', 'tourist'],
    default: 'tourist'
  },
  first_name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    required: true
  },
  country: String,
  passport_number: String,
  date_of_birth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  phone_number: String,
  profile_picture: {
    type: String, // URL to the profile picture
    default: null
  },
  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Authentication fields
  google_id: String,
  password: String, // For non-Google auth if needed
  
}, {
  timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

// Virtual for full name
userSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);