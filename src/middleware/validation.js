const Joi = require('joi');

// Validation schemas
const schemas = {
  // User schemas
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    first_name: Joi.string().min(1).max(50).required(),
    last_name: Joi.string().min(1).max(50).required(),
    country: Joi.string().max(100),
    passport_number: Joi.string().max(50),
    date_of_birth: Joi.date(),
    gender: Joi.string().valid('male', 'female', 'other'),
    phone_number: Joi.string().max(20),
    google_id: Joi.string()
  }),

  userUpdate: Joi.object({
    first_name: Joi.string().min(1).max(50),
    last_name: Joi.string().min(1).max(50),
    country: Joi.string().max(100),
    passport_number: Joi.string().max(50),
    date_of_birth: Joi.date(),
    gender: Joi.string().valid('male', 'female', 'other'),
    phone_number: Joi.string().max(20),
    profile_picture: Joi.string().uri().allow(null, ''),
    user_type: Joi.string().valid('system_admin', 'provider_admin', 'tourist'),
    provider_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
  }),

  // Provider schemas
  provider: Joi.object({
    country: Joi.string().required(),
    provider_name: Joi.string().required(),
    logo_url: Joi.string().uri(),
    address: Joi.string().required(),
    phone_number: Joi.string().required(),
    email_address: Joi.string().email().required(),
    corporate_tax_id: Joi.string(),
    company_description: Joi.string(),
    is_active: Joi.boolean()
  }),

  // Tour Template schemas
  tourTemplate: Joi.object({
    template_name: Joi.string().required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    description: Joi.string(),
    is_active: Joi.boolean(),
    features_image: Joi.string().uri().allow(null, ''),
    teaser_images: Joi.array().items(Joi.string().uri()),
    web_links: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      description: Joi.string().max(24)
    }))
  }),

  // Custom Tour schemas
  customTour: Joi.object({
    provider_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    tour_template_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    tour_name: Joi.string().required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    status: Joi.string().valid('draft', 'published', 'completed', 'cancelled'),
    join_code: Joi.string().max(10),
    max_tourists: Joi.number().min(1),
    group_chat_link: Joi.string().uri(),
    features_image: Joi.string().uri().allow(null, ''),
    teaser_images: Joi.array().items(Joi.string().uri()),
    web_links: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      description: Joi.string().max(24)
    }))
  }),

  // Calendar Entry schemas
  calendarEntry: Joi.object({
    tour_template_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    custom_tour_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    entry_date: Joi.date().required(),
    activity: Joi.string().required(),
    activity_description: Joi.string(),
    activity_details: Joi.string(),
    featured_image: Joi.string().uri().allow(null, ''),
    web_links: Joi.array().items(Joi.string().uri()),
    start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }),

  // Registration schemas
  registration: Joi.object({
    custom_tour_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    notes: Joi.string()
  }),

  registrationUpdate: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').required(),
    notes: Joi.string()
  }),

  // Default Activity schemas
  defaultActivity: Joi.object({
    activity_name: Joi.string().required(),
    description: Joi.string(),
    typical_duration_hours: Joi.number().min(0),
    category: Joi.string().valid(
      'sightseeing', 'cultural', 'adventure', 'dining',
      'transportation', 'accommodation', 'entertainment',
      'shopping', 'educational', 'religious', 'nature', 'other'
    ).required(),
    is_active: Joi.boolean()
  }),

  // Document Type schemas
  documentType: Joi.object({
    document_type_name: Joi.string().required(),
    description: Joi.string(),
    is_required: Joi.boolean(),
    is_active: Joi.boolean()
  }),

  // Broadcast schemas
  broadcast: Joi.object({
    custom_tour_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    message: Joi.string().max(150).required(),
    status: Joi.string().valid('draft', 'published')
  }),

  // Role Change Request schemas
  roleChangeRequest: Joi.object({
    request_type: Joi.string().valid('join_existing_provider', 'become_new_provider').required(),
    provider_id: Joi.when('request_type', {
      is: 'join_existing_provider',
      then: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      otherwise: Joi.forbidden()
    }),
    proposed_provider_data: Joi.when('request_type', {
      is: 'become_new_provider',
      then: Joi.object({
        provider_name: Joi.string().required(),
        country: Joi.string().required(),
        address: Joi.string().required(),
        phone_number: Joi.string().required(),
        email_address: Joi.string().email().required(),
        corporate_tax_id: Joi.string(),
        company_description: Joi.string(),
        logo_url: Joi.string().uri()
      }).required(),
      otherwise: Joi.forbidden()
    }),
    request_message: Joi.string()
  }),

  roleChangeDecision: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    admin_notes: Joi.string()
  }),

  // QR Code schemas
  qrCodeShare: Joi.object({
    recipients: Joi.array().items(Joi.string().email()).min(1).required(),
    message: Joi.string().max(500),
    bulk: Joi.boolean()
  }),

  // Notification schemas
  pushSubscription: Joi.object({
    endpoint: Joi.string().uri().required(),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required()
    }).required(),
    userAgent: Joi.string(),
    deviceType: Joi.string().valid('desktop', 'mobile', 'tablet', 'unknown'),
    browser: Joi.string()
  }),

  sendNotification: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    title: Joi.string().max(100).required(),
    body: Joi.string().max(500).required(),
    type: Joi.string().max(50),
    includeEmail: Joi.boolean()
  }),

  bulkNotification: Joi.object({
    title: Joi.string().max(100).required(),
    body: Joi.string().max(500).required(),
    userIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
    userType: Joi.string().valid('tourist', 'provider_admin', 'system_admin'),
    type: Joi.string().max(50),
    includeEmail: Joi.boolean(),
    emailTemplate: Joi.string(),
    emailTemplateData: Joi.object()
  }).or('userIds', 'userType'),

  // Payment Config schemas
  paymentConfig: Joi.object({
    charge_per_tourist: Joi.number().min(0),
    default_max_tourists: Joi.number().min(1),
    max_provider_admins: Joi.number().min(1),
    product_overview: Joi.string(),
    mission_statement: Joi.string(),
    vision: Joi.string()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = { schemas, validate };