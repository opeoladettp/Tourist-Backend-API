const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');

describe('Google OAuth Profile Picture Handling', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity_test');
    }
  });

  beforeEach(async () => {
    // Clean up users
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  test('should create new user with Google profile picture', async () => {
    const googleAuthData = {
      google_id: 'google123',
      email: 'newuser@example.com',
      first_name: 'New',
      last_name: 'User',
      picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(googleAuthData)
      .expect(200);

    expect(response.body.message).toBe('Authentication successful');
    expect(response.body.user.profile_picture).toBe(googleAuthData.picture);
    expect(response.body.user.email).toBe(googleAuthData.email);
    expect(response.body.user.first_name).toBe(googleAuthData.first_name);
    expect(response.body.user.last_name).toBe(googleAuthData.last_name);
  });

  test('should update existing user with Google profile picture if none exists', async () => {
    // Create user without profile picture
    const existingUser = new User({
      google_id: 'google456',
      email: 'existing@example.com',
      first_name: 'Existing',
      last_name: 'User',
      user_type: 'tourist'
    });
    await existingUser.save();

    const googleAuthData = {
      google_id: 'google456',
      email: 'existing@example.com',
      first_name: 'Existing',
      last_name: 'User',
      picture: 'https://lh3.googleusercontent.com/a/updated-user=s96-c'
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(googleAuthData)
      .expect(200);

    expect(response.body.user.profile_picture).toBe(googleAuthData.picture);
  });

  test('should update Google profile picture if user has existing Google picture', async () => {
    // Create user with existing Google profile picture
    const existingUser = new User({
      google_id: 'google789',
      email: 'googleuser@example.com',
      first_name: 'Google',
      last_name: 'User',
      profile_picture: 'https://lh3.googleusercontent.com/a/old-user=s96-c',
      user_type: 'tourist'
    });
    await existingUser.save();

    const googleAuthData = {
      google_id: 'google789',
      email: 'googleuser@example.com',
      first_name: 'Google',
      last_name: 'User',
      picture: 'https://lh3.googleusercontent.com/a/new-user=s96-c'
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(googleAuthData)
      .expect(200);

    expect(response.body.user.profile_picture).toBe(googleAuthData.picture);
  });

  test('should NOT overwrite custom profile picture with Google picture', async () => {
    const customPicture = 'https://example.com/custom-profile.jpg';
    
    // Create user with custom profile picture
    const existingUser = new User({
      google_id: 'google101',
      email: 'customuser@example.com',
      first_name: 'Custom',
      last_name: 'User',
      profile_picture: customPicture,
      user_type: 'tourist'
    });
    await existingUser.save();

    const googleAuthData = {
      google_id: 'google101',
      email: 'customuser@example.com',
      first_name: 'Custom',
      last_name: 'User',
      picture: 'https://lh3.googleusercontent.com/a/google-user=s96-c'
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(googleAuthData)
      .expect(200);

    // Should keep the custom picture, not overwrite with Google picture
    expect(response.body.user.profile_picture).toBe(customPicture);
  });

  test('should allow updating to custom profile picture after Google OAuth', async () => {
    // First, authenticate with Google
    const googleAuthData = {
      google_id: 'google202',
      email: 'updateuser@example.com',
      first_name: 'Update',
      last_name: 'User',
      picture: 'https://lh3.googleusercontent.com/a/google-user=s96-c'
    };

    const authResponse = await request(app)
      .post('/api/auth/google')
      .send(googleAuthData)
      .expect(200);

    const token = authResponse.body.token;

    // Then update profile with custom picture
    const customPicture = 'https://example.com/my-custom-avatar.jpg';
    const updateResponse = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ profile_picture: customPicture })
      .expect(200);

    expect(updateResponse.body.user.profile_picture).toBe(customPicture);
  });

  test('should handle Google OAuth without picture field', async () => {
    const googleAuthData = {
      google_id: 'google303',
      email: 'nopicture@example.com',
      first_name: 'No',
      last_name: 'Picture'
      // No picture field
    };

    const response = await request(app)
      .post('/api/auth/google')
      .send(googleAuthData)
      .expect(200);

    expect(response.body.user.profile_picture).toBeNull();
  });

  test('should validate picture URL format', async () => {
    const googleAuthData = {
      google_id: 'google404',
      email: 'invalid@example.com',
      first_name: 'Invalid',
      last_name: 'Picture',
      picture: 'not-a-valid-url'
    };

    await request(app)
      .post('/api/auth/google')
      .send(googleAuthData)
      .expect(400);
  });
});