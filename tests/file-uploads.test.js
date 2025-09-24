const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = require('../src/server');
const User = require('../src/models/User');

describe('File Upload Endpoints', () => {
  let authToken;
  let userId;
  let adminToken;
  let adminId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity_test');
    }
  });

  beforeEach(async () => {
    // Clean up users
    await User.deleteMany({});
    
    // Create test tourist user
    const testUser = new User({
      email: 'tourist@example.com',
      first_name: 'Test',
      last_name: 'Tourist',
      google_id: 'tourist123',
      user_type: 'tourist'
    });
    const savedUser = await testUser.save();
    userId = savedUser._id;
    
    // Create test admin user
    const adminUser = new User({
      email: 'admin@example.com',
      first_name: 'Test',
      last_name: 'Admin',
      google_id: 'admin123',
      user_type: 'system_admin'
    });
    const savedAdmin = await adminUser.save();
    adminId = savedAdmin._id;
    
    // Generate auth tokens
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: savedUser._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    adminToken = jwt.sign({ userId: savedAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/uploads/profile-picture', () => {
    test('should upload profile picture successfully', async () => {
      // Create a test image buffer
      const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
      
      // Create test image if it doesn't exist
      if (!fs.existsSync(path.dirname(testImagePath))) {
        fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
      }
      
      if (!fs.existsSync(testImagePath)) {
        // Create a minimal JPEG file for testing
        const minimalJpeg = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
          0x00, 0xFF, 0xD9
        ]);
        fs.writeFileSync(testImagePath, minimalJpeg);
      }

      const response = await request(app)
        .post('/api/uploads/profile-picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profile_picture', testImagePath)
        .expect(200);

      expect(response.body.message).toBe('Profile picture uploaded successfully');
      expect(response.body.fileUrl).toBeDefined();
      expect(response.body.fileName).toBe('test-image.jpg');
      expect(response.body.user.profile_picture).toBeDefined();
    });

    test('should fail without file', async () => {
      await request(app)
        .post('/api/uploads/profile-picture')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .post('/api/uploads/profile-picture')
        .expect(401);
    });
  });

  describe('POST /api/uploads/tour-image', () => {
    test('should upload tour image successfully for admin', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'tour-image.jpg');
      
      // Create test image if it doesn't exist
      if (!fs.existsSync(testImagePath)) {
        const minimalJpeg = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
          0x00, 0xFF, 0xD9
        ]);
        fs.writeFileSync(testImagePath, minimalJpeg);
      }

      const response = await request(app)
        .post('/api/uploads/tour-image')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('image_type', 'features')
        .attach('tour_image', testImagePath)
        .expect(200);

      expect(response.body.message).toBe('Tour features uploaded successfully');
      expect(response.body.fileUrl).toBeDefined();
      expect(response.body.imageType).toBe('features');
    });

    test('should fail for non-admin users', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'tour-image.jpg');

      await request(app)
        .post('/api/uploads/tour-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('tour_image', testImagePath)
        .expect(403);
    });
  });

  describe('POST /api/uploads/general', () => {
    test('should upload general file successfully', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test-document.txt');
      
      // Create test document if it doesn't exist
      if (!fs.existsSync(testFilePath)) {
        fs.writeFileSync(testFilePath, 'This is a test document for upload testing.');
      }

      const response = await request(app)
        .post('/api/uploads/general')
        .set('Authorization', `Bearer ${authToken}`)
        .field('category', 'document')
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body.message).toBe('File uploaded successfully');
      expect(response.body.fileUrl).toBeDefined();
      expect(response.body.category).toBe('document');
    });
  });

  describe('POST /api/uploads/presigned-url', () => {
    test('should generate presigned URL successfully', async () => {
      const response = await request(app)
        .post('/api/uploads/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'test-upload.jpg',
          fileType: 'profile-picture',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.message).toBe('Presigned URL generated successfully');
      expect(response.body.presignedUrl).toBeDefined();
      expect(response.body.publicUrl).toBeDefined();
      expect(response.body.key).toBeDefined();
      expect(response.body.expiresIn).toBe(3600);
    });

    test('should fail with invalid file type', async () => {
      await request(app)
        .post('/api/uploads/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'test-upload.jpg',
          fileType: 'invalid-type',
          contentType: 'image/jpeg'
        })
        .expect(400);
    });

    test('should fail without required fields', async () => {
      await request(app)
        .post('/api/uploads/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileName: 'test-upload.jpg'
          // Missing fileType
        })
        .expect(400);
    });
  });

  describe('DELETE /api/uploads/delete', () => {
    test('should delete file successfully', async () => {
      const response = await request(app)
        .delete('/api/uploads/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileUrl: 'https://s3.amazonaws.com/test-bucket/test-folder/test-file.jpg'
        })
        .expect(200);

      expect(response.body.message).toBe('File deleted successfully');
    });

    test('should fail without fileUrl', async () => {
      await request(app)
        .delete('/api/uploads/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    test('should fail with invalid URL format', async () => {
      await request(app)
        .delete('/api/uploads/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fileUrl: 'invalid-url'
        })
        .expect(400);
    });
  });
});