const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Provider = require('../src/models/Provider');
const TourTemplate = require('../src/models/TourTemplate');
const CustomTour = require('../src/models/CustomTour');

describe('Tour Image Fields', () => {
  let authToken;
  let providerId;
  let templateId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity_test');
    }
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Provider.deleteMany({});
    await TourTemplate.deleteMany({});
    await CustomTour.deleteMany({});
    
    // Create test provider
    const provider = new Provider({
      country: 'Test Country',
      provider_name: 'Test Provider',
      address: 'Test Address',
      phone_number: '+1234567890',
      email_address: 'provider@test.com'
    });
    const savedProvider = await provider.save();
    providerId = savedProvider._id;
    
    // Create test user (system admin)
    const testUser = new User({
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      google_id: 'admin123',
      user_type: 'system_admin'
    });
    const savedUser = await testUser.save();
    
    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: savedUser._id.toString() }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Provider.deleteMany({});
    await TourTemplate.deleteMany({});
    await CustomTour.deleteMany({});
    await mongoose.connection.close();
  });

  test('should create tour template with image fields', async () => {
    const templateData = {
      template_name: 'Paris Adventure',
      start_date: '2024-06-01',
      end_date: '2024-06-07',
      description: 'Amazing Paris tour',
      features_image: 'https://example.com/paris-main.jpg',
      teaser_images: [
        'https://example.com/eiffel.jpg',
        'https://example.com/louvre.jpg'
      ],
      web_links: [{
        url: 'https://paristourism.com',
        description: 'Paris Tourism'
      }]
    };

    const response = await request(app)
      .post('/api/tour-templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send(templateData)
      .expect(201);

    expect(response.body.template.features_image).toBe(templateData.features_image);
    expect(response.body.template.teaser_images).toEqual(templateData.teaser_images);
    
    templateId = response.body.template._id;
  });

  test('should create custom tour with image fields', async () => {
    // First create a template
    const template = new TourTemplate({
      template_name: 'Test Template',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-07')
    });
    const savedTemplate = await template.save();

    const tourData = {
      provider_id: providerId,
      tour_template_id: savedTemplate._id,
      tour_name: 'Custom Paris Tour',
      start_date: '2024-06-01',
      end_date: '2024-06-07',
      max_tourists: 8,
      features_image: 'https://example.com/custom-paris.jpg',
      teaser_images: [
        'https://example.com/teaser1.jpg',
        'https://example.com/teaser2.jpg',
        'https://example.com/teaser3.jpg'
      ]
    };

    const response = await request(app)
      .post('/api/custom-tours')
      .set('Authorization', `Bearer ${authToken}`)
      .send(tourData)
      .expect(201);

    expect(response.body.tour.features_image).toBe(tourData.features_image);
    expect(response.body.tour.teaser_images).toEqual(tourData.teaser_images);
  });

  test('should validate image URL formats', async () => {
    const invalidTemplateData = {
      template_name: 'Invalid Template',
      start_date: '2024-06-01',
      end_date: '2024-06-07',
      features_image: 'not-a-valid-url',
      teaser_images: ['also-not-valid']
    };

    await request(app)
      .post('/api/tour-templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidTemplateData)
      .expect(400);
  });

  test('should allow empty image fields', async () => {
    const templateData = {
      template_name: 'Simple Template',
      start_date: '2024-06-01',
      end_date: '2024-06-07',
      description: 'Simple tour without images'
    };

    const response = await request(app)
      .post('/api/tour-templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send(templateData)
      .expect(201);

    expect(response.body.template.features_image).toBeNull();
    expect(response.body.template.teaser_images).toEqual([]);
  });
});