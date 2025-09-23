const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Provider = require('../src/models/Provider');
const RoleChangeRequest = require('../src/models/RoleChangeRequest');

describe('Role Change Requests', () => {
  let touristToken;
  let adminToken;
  let touristId;
  let providerId;

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
    await RoleChangeRequest.deleteMany({});
    
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
    
    // Create test tourist
    const tourist = new User({
      email: 'tourist@example.com',
      first_name: 'Tourist',
      last_name: 'User',
      google_id: 'tourist123',
      user_type: 'tourist'
    });
    const savedTourist = await tourist.save();
    touristId = savedTourist._id;
    
    // Create test admin
    const admin = new User({
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      google_id: 'admin123',
      user_type: 'system_admin'
    });
    const savedAdmin = await admin.save();
    
    // Generate auth tokens
    const jwt = require('jsonwebtoken');
    touristToken = jwt.sign({ userId: savedTourist._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    adminToken = jwt.sign({ userId: savedAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Provider.deleteMany({});
    await RoleChangeRequest.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/role-change-requests', () => {
    test('should submit request to become new provider', async () => {
      const requestData = {
        request_type: 'become_new_provider',
        proposed_provider_data: {
          provider_name: 'New Adventure Co',
          country: 'United States',
          address: '123 Adventure St',
          phone_number: '+1555123456',
          email_address: 'contact@newadventure.com',
          company_description: 'Adventure tourism company'
        },
        request_message: 'I want to start my own tour company'
      };

      const response = await request(app)
        .post('/api/role-change-requests')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.message).toBe('Role change request submitted successfully');
      expect(response.body.request.request_type).toBe('become_new_provider');
      expect(response.body.request.status).toBe('pending');
    });

    test('should submit request to join existing provider', async () => {
      const requestData = {
        request_type: 'join_existing_provider',
        provider_id: providerId.toString(),
        request_message: 'I want to join your team'
      };

      const response = await request(app)
        .post('/api/role-change-requests')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.message).toBe('Role change request submitted successfully');
      expect(response.body.request.request_type).toBe('join_existing_provider');
      expect(response.body.request.status).toBe('pending');
    });

    test('should reject duplicate pending requests', async () => {
      // Submit first request
      const requestData = {
        request_type: 'become_new_provider',
        proposed_provider_data: {
          provider_name: 'New Adventure Co',
          country: 'United States',
          address: '123 Adventure St',
          phone_number: '+1555123456',
          email_address: 'contact@newadventure.com'
        }
      };

      await request(app)
        .post('/api/role-change-requests')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(requestData)
        .expect(201);

      // Try to submit second request
      await request(app)
        .post('/api/role-change-requests')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(requestData)
        .expect(400);
    });

    test('should validate required fields for new provider request', async () => {
      const invalidData = {
        request_type: 'become_new_provider',
        proposed_provider_data: {
          provider_name: 'New Adventure Co'
          // Missing required fields
        }
      };

      await request(app)
        .post('/api/role-change-requests')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/role-change-requests/my', () => {
    test('should get user\'s own role change requests', async () => {
      // Create a request first
      const roleChangeRequest = new RoleChangeRequest({
        tourist_id: touristId,
        request_type: 'become_new_provider',
        proposed_provider_data: {
          provider_name: 'Test Provider',
          country: 'US',
          address: 'Test Address',
          phone_number: '+1234567890',
          email_address: 'test@test.com'
        },
        tourist_name: 'Tourist User',
        tourist_email: 'tourist@example.com',
        created_by: touristId
      });
      await roleChangeRequest.save();

      const response = await request(app)
        .get('/api/role-change-requests/my')
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(200);

      expect(response.body.requests).toHaveLength(1);
      expect(response.body.requests[0].request_type).toBe('become_new_provider');
    });
  });

  describe('PUT /api/role-change-requests/:id/process', () => {
    test('should approve new provider request and create provider', async () => {
      // Create a request first
      const roleChangeRequest = new RoleChangeRequest({
        tourist_id: touristId,
        request_type: 'become_new_provider',
        proposed_provider_data: {
          provider_name: 'Test New Provider',
          country: 'US',
          address: 'Test Address',
          phone_number: '+1234567890',
          email_address: 'test@newprovider.com'
        },
        tourist_name: 'Tourist User',
        tourist_email: 'tourist@example.com',
        created_by: touristId
      });
      const savedRequest = await roleChangeRequest.save();

      const response = await request(app)
        .put(`/api/role-change-requests/${savedRequest._id}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          admin_notes: 'Approved!'
        })
        .expect(200);

      expect(response.body.message).toBe('Role change request approved successfully');
      
      // Check if user role was updated
      const updatedUser = await User.findById(touristId);
      expect(updatedUser.user_type).toBe('provider_admin');
      expect(updatedUser.provider_id).toBeDefined();

      // Check if new provider was created
      const newProvider = await Provider.findById(updatedUser.provider_id);
      expect(newProvider.provider_name).toBe('Test New Provider');
    });

    test('should reject role change request', async () => {
      // Create a request first
      const roleChangeRequest = new RoleChangeRequest({
        tourist_id: touristId,
        request_type: 'become_new_provider',
        proposed_provider_data: {
          provider_name: 'Test Provider',
          country: 'US',
          address: 'Test Address',
          phone_number: '+1234567890',
          email_address: 'test@test.com'
        },
        tourist_name: 'Tourist User',
        tourist_email: 'tourist@example.com',
        created_by: touristId
      });
      const savedRequest = await roleChangeRequest.save();

      const response = await request(app)
        .put(`/api/role-change-requests/${savedRequest._id}/process`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          admin_notes: 'Not qualified'
        })
        .expect(200);

      expect(response.body.message).toBe('Role change request rejected successfully');
      
      // Check if user role was NOT updated
      const updatedUser = await User.findById(touristId);
      expect(updatedUser.user_type).toBe('tourist');
    });
  });
});