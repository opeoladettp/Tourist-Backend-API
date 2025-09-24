const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Provider = require('../src/models/Provider');
const CustomTour = require('../src/models/CustomTour');
const TourTemplate = require('../src/models/TourTemplate');
const Broadcast = require('../src/models/Broadcast');
const Registration = require('../src/models/Registration');

describe('Broadcasts API', () => {
  let adminToken;
  let providerToken;
  let touristToken;
  let adminId;
  let providerId;
  let touristId;
  let customTourId;
  let broadcastId;

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
    await CustomTour.deleteMany({});
    await TourTemplate.deleteMany({});
    await Broadcast.deleteMany({});
    await Registration.deleteMany({});
    
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
    
    // Create test users
    const adminUser = new User({
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      google_id: 'admin123',
      user_type: 'system_admin'
    });
    const savedAdmin = await adminUser.save();
    adminId = savedAdmin._id;
    
    const providerUser = new User({
      email: 'provider@example.com',
      first_name: 'Provider',
      last_name: 'Admin',
      google_id: 'provider123',
      user_type: 'provider_admin',
      provider_id: providerId
    });
    await providerUser.save();
    
    const touristUser = new User({
      email: 'tourist@example.com',
      first_name: 'Tourist',
      last_name: 'User',
      google_id: 'tourist123',
      user_type: 'tourist'
    });
    const savedTourist = await touristUser.save();
    touristId = savedTourist._id;
    
    // Generate auth tokens
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ userId: savedAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    providerToken = jwt.sign({ userId: providerUser._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    touristToken = jwt.sign({ userId: savedTourist._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    
    // Create test tour template
    const tourTemplate = new TourTemplate({
      template_name: 'Test Template',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-07')
    });
    const savedTemplate = await tourTemplate.save();
    
    // Create test custom tour
    const customTour = new CustomTour({
      provider_id: providerId,
      tour_template_id: savedTemplate._id,
      tour_name: 'Test Tour',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-07'),
      join_code: 'TEST123',
      max_tourists: 5
    });
    const savedTour = await customTour.save();
    customTourId = savedTour._id;
    
    // Create test broadcast
    const testBroadcast = new Broadcast({
      custom_tour_id: customTourId,
      provider_id: providerId,
      message: 'Test broadcast message',
      status: 'draft',
      created_by: adminId
    });
    const savedBroadcast = await testBroadcast.save();
    broadcastId = savedBroadcast._id;
    
    // Create test registration
    const registration = new Registration({
      custom_tour_id: customTourId,
      tourist_id: touristId,
      provider_id: providerId,
      status: 'approved'
    });
    await registration.save();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Provider.deleteMany({});
    await CustomTour.deleteMany({});
    await TourTemplate.deleteMany({});
    await Broadcast.deleteMany({});
    await Registration.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/broadcasts', () => {
    test('should get all broadcasts for admin', async () => {
      const response = await request(app)
        .get('/api/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    test('should get provider broadcasts for provider admin', async () => {
      const response = await request(app)
        .get('/api/broadcasts')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    test('should deny access to tourists', async () => {
      await request(app)
        .get('/api/broadcasts')
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(403);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/broadcasts?status=draft')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach(broadcast => {
        expect(broadcast.status).toBe('draft');
      });
    });

    test('should search broadcasts', async () => {
      const response = await request(app)
        .get('/api/broadcasts?search=test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/broadcasts/tour/:tourId', () => {
    test('should get tour broadcasts for registered tourist', async () => {
      // First publish the broadcast
      await Broadcast.findByIdAndUpdate(broadcastId, { status: 'published' });

      const response = await request(app)
        .get(`/api/broadcasts/tour/${customTourId}`)
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should deny access to non-registered tourist', async () => {
      // Create another tourist not registered for the tour
      const anotherTourist = new User({
        email: 'another@example.com',
        first_name: 'Another',
        last_name: 'Tourist',
        google_id: 'another123',
        user_type: 'tourist'
      });
      await anotherTourist.save();

      const jwt = require('jsonwebtoken');
      const anotherToken = jwt.sign({ userId: anotherTourist._id.toString() }, process.env.JWT_SECRET || 'test-secret');

      await request(app)
        .get(`/api/broadcasts/tour/${customTourId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(403);
    });

    test('should get tour broadcasts for provider admin', async () => {
      const response = await request(app)
        .get(`/api/broadcasts/tour/${customTourId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/broadcasts/:id', () => {
    test('should get broadcast by ID', async () => {
      const response = await request(app)
        .get(`/api/broadcasts/${broadcastId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.broadcast).toBeDefined();
      expect(response.body.broadcast._id).toBe(broadcastId.toString());
      expect(response.body.broadcast.message).toBe('Test broadcast message');
    });

    test('should return 404 for non-existent broadcast', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/broadcasts/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/broadcasts', () => {
    test('should create new broadcast as admin', async () => {
      const broadcastData = {
        custom_tour_id: customTourId,
        message: 'New test broadcast message',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(broadcastData)
        .expect(201);

      expect(response.body.message).toBe('Broadcast created successfully');
      expect(response.body.broadcast.message).toBe(broadcastData.message);
      expect(response.body.broadcast.created_by._id).toBe(adminId.toString());
    });

    test('should create and publish broadcast', async () => {
      const broadcastData = {
        custom_tour_id: customTourId,
        message: 'Published broadcast message',
        status: 'published'
      };

      const response = await request(app)
        .post('/api/broadcasts')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(broadcastData)
        .expect(201);

      expect(response.body.broadcast.status).toBe('published');
    });

    test('should validate required fields', async () => {
      const invalidData = {
        message: 'Missing tour ID'
      };

      await request(app)
        .post('/api/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should validate message length', async () => {
      const invalidData = {
        custom_tour_id: customTourId,
        message: 'A'.repeat(151) // Exceeds 150 character limit
      };

      await request(app)
        .post('/api/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should deny creation to tourists', async () => {
      const broadcastData = {
        custom_tour_id: customTourId,
        message: 'Tourist broadcast'
      };

      await request(app)
        .post('/api/broadcasts')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(broadcastData)
        .expect(403);
    });
  });

  describe('PUT /api/broadcasts/:id', () => {
    test('should update broadcast as admin', async () => {
      const updateData = {
        custom_tour_id: customTourId,
        message: 'Updated broadcast message',
        status: 'draft'
      };

      const response = await request(app)
        .put(`/api/broadcasts/${broadcastId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Broadcast updated successfully');
      expect(response.body.broadcast.message).toBe(updateData.message);
    });

    test('should deny update to non-owner provider', async () => {
      // Create another provider
      const anotherProvider = new Provider({
        country: 'Another Country',
        provider_name: 'Another Provider',
        address: 'Another Address',
        phone_number: '+9876543210',
        email_address: 'another@test.com'
      });
      await anotherProvider.save();

      const anotherProviderUser = new User({
        email: 'anotherprovider@example.com',
        first_name: 'Another',
        last_name: 'Provider',
        google_id: 'anotherprovider123',
        user_type: 'provider_admin',
        provider_id: anotherProvider._id
      });
      await anotherProviderUser.save();

      const jwt = require('jsonwebtoken');
      const anotherProviderToken = jwt.sign({ userId: anotherProviderUser._id.toString() }, process.env.JWT_SECRET || 'test-secret');

      const updateData = {
        custom_tour_id: customTourId,
        message: 'Unauthorized update'
      };

      await request(app)
        .put(`/api/broadcasts/${broadcastId}`)
        .set('Authorization', `Bearer ${anotherProviderToken}`)
        .send(updateData)
        .expect(404); // Should not find broadcast due to provider restriction
    });
  });

  describe('PATCH /api/broadcasts/:id/publish', () => {
    test('should publish broadcast', async () => {
      const response = await request(app)
        .patch(`/api/broadcasts/${broadcastId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Broadcast published successfully');
      expect(response.body.broadcast.status).toBe('published');
    });
  });

  describe('DELETE /api/broadcasts/:id', () => {
    test('should delete broadcast as admin', async () => {
      const response = await request(app)
        .delete(`/api/broadcasts/${broadcastId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Broadcast deleted successfully');
      
      // Verify deletion
      await request(app)
        .get(`/api/broadcasts/${broadcastId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should deny deletion to tourists', async () => {
      await request(app)
        .delete(`/api/broadcasts/${broadcastId}`)
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(403);
    });
  });
});