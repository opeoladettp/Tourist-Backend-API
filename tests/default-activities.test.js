const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const DefaultActivity = require('../src/models/DefaultActivity');

describe('Default Activities API', () => {
  let adminToken;
  let providerToken;
  let touristToken;
  let adminId;
  let activityId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity_test');
    }
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await DefaultActivity.deleteMany({});
    
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
      user_type: 'provider_admin'
    });
    await providerUser.save();
    
    const touristUser = new User({
      email: 'tourist@example.com',
      first_name: 'Tourist',
      last_name: 'User',
      google_id: 'tourist123',
      user_type: 'tourist'
    });
    await touristUser.save();
    
    // Generate auth tokens
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ userId: savedAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    providerToken = jwt.sign({ userId: providerUser._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    touristToken = jwt.sign({ userId: touristUser._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    
    // Create test activity
    const testActivity = new DefaultActivity({
      activity_name: 'Test Sightseeing Activity',
      description: 'A test activity for sightseeing',
      typical_duration_hours: 2,
      category: 'sightseeing',
      is_active: true,
      created_by: adminId
    });
    const savedActivity = await testActivity.save();
    activityId = savedActivity._id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await DefaultActivity.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/activities', () => {
    test('should get all activities for admin', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    test('should get all activities for provider admin', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    test('should deny access to tourists', async () => {
      await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(403);
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/activities?category=sightseeing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach(activity => {
        expect(activity.category).toBe('sightseeing');
      });
    });

    test('should search activities', async () => {
      const response = await request(app)
        .get('/api/activities?search=test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/activities/selection', () => {
    test('should get activities for selection', async () => {
      const response = await request(app)
        .get('/api/activities/selection')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activities).toBeDefined();
      expect(Array.isArray(response.body.activities)).toBe(true);
    });

    test('should filter selection by category', async () => {
      const response = await request(app)
        .get('/api/activities/selection?category=sightseeing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activities).toBeDefined();
      response.body.activities.forEach(activity => {
        expect(activity.category).toBe('sightseeing');
      });
    });
  });

  describe('GET /api/activities/categories', () => {
    test('should get activity categories with counts', async () => {
      const response = await request(app)
        .get('/api/activities/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.categories).toBeDefined();
      expect(Array.isArray(response.body.categories)).toBe(true);
      
      const sightseeingCategory = response.body.categories.find(c => c.name === 'sightseeing');
      expect(sightseeingCategory).toBeDefined();
      expect(sightseeingCategory.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/activities/:id', () => {
    test('should get activity by ID', async () => {
      const response = await request(app)
        .get(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.activity).toBeDefined();
      expect(response.body.activity._id).toBe(activityId.toString());
      expect(response.body.activity.activity_name).toBe('Test Sightseeing Activity');
    });

    test('should return 404 for non-existent activity', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/activities/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/activities', () => {
    test('should create new activity as admin', async () => {
      const activityData = {
        activity_name: 'New Test Activity',
        description: 'A new test activity',
        typical_duration_hours: 3,
        category: 'cultural',
        is_active: true
      };

      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(activityData)
        .expect(201);

      expect(response.body.message).toBe('Default activity created successfully');
      expect(response.body.activity.activity_name).toBe(activityData.activity_name);
      expect(response.body.activity.created_by._id).toBe(adminId.toString());
    });

    test('should deny creation to provider admin', async () => {
      const activityData = {
        activity_name: 'Provider Activity',
        category: 'dining'
      };

      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${providerToken}`)
        .send(activityData)
        .expect(403);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing required fields'
      };

      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should validate category enum', async () => {
      const invalidData = {
        activity_name: 'Invalid Category Activity',
        category: 'invalid_category'
      };

      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('PUT /api/activities/:id', () => {
    test('should update activity as admin', async () => {
      const updateData = {
        activity_name: 'Updated Activity Name',
        description: 'Updated description',
        typical_duration_hours: 4,
        category: 'adventure'
      };

      const response = await request(app)
        .put(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Default activity updated successfully');
      expect(response.body.activity.activity_name).toBe(updateData.activity_name);
      expect(response.body.activity.category).toBe(updateData.category);
    });

    test('should deny update to provider admin', async () => {
      const updateData = {
        activity_name: 'Provider Update'
      };

      await request(app)
        .put(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('PATCH /api/activities/:id/status', () => {
    test('should toggle activity status', async () => {
      const response = await request(app)
        .patch(`/api/activities/${activityId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('deactivated');
      expect(response.body.activity.is_active).toBe(false);
    });
  });

  describe('DELETE /api/activities/:id', () => {
    test('should delete activity as admin', async () => {
      const response = await request(app)
        .delete(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Default activity deleted successfully');
      
      // Verify deletion
      await request(app)
        .get(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should deny deletion to provider admin', async () => {
      await request(app)
        .delete(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
    });
  });
});