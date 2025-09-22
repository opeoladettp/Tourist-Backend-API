const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');

describe('Profile Update with New Fields', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity_test');
    }
  });

  beforeEach(async () => {
    // Clean up and create a test user
    await User.deleteMany({});
    
    const testUser = new User({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      google_id: 'test123',
      user_type: 'tourist'
    });
    
    const savedUser = await testUser.save();
    userId = savedUser._id;
    
    // Generate auth token (simplified for testing)
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: savedUser._id.toString() }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  test('should update profile with new optional fields', async () => {
    const profileData = {
      first_name: 'Updated',
      last_name: 'User',
      phone_number: '+1234567890',
      profile_picture: 'https://example.com/profile.jpg',
      date_of_birth: '1990-05-15',
      country: 'United States',
      gender: 'male',
      passport_number: 'A12345678'
    };

    const response = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(profileData)
      .expect(200);

    expect(response.body.message).toBe('Profile updated successfully');
    expect(response.body.user.profile_picture).toBe(profileData.profile_picture);
    expect(response.body.user.country).toBe(profileData.country);
    expect(response.body.user.gender).toBe(profileData.gender);
    expect(response.body.user.passport_number).toBe(profileData.passport_number);
  });

  test('should allow partial profile updates', async () => {
    const partialData = {
      profile_picture: 'https://example.com/new-profile.jpg',
      country: 'Canada'
    };

    const response = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(partialData)
      .expect(200);

    expect(response.body.user.profile_picture).toBe(partialData.profile_picture);
    expect(response.body.user.country).toBe(partialData.country);
    // Other fields should remain unchanged
    expect(response.body.user.first_name).toBe('Test');
  });

  test('should validate profile picture URL format', async () => {
    const invalidData = {
      profile_picture: 'not-a-valid-url'
    };

    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);
  });

  test('should validate gender enum values', async () => {
    const invalidData = {
      gender: 'invalid-gender'
    };

    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);
  });
});