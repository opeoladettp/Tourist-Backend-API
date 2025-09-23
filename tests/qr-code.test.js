const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Provider = require('../src/models/Provider');
const CustomTour = require('../src/models/CustomTour');
const TourTemplate = require('../src/models/TourTemplate');

// Mock the QR code service to avoid actual S3 operations in tests
jest.mock('../src/services/qrCodeService', () => ({
  generateTourQRCode: jest.fn().mockResolvedValue('https://s3.example.com/qr-code.png'),
  generateJoinQRCode: jest.fn().mockResolvedValue('https://s3.example.com/join-qr-code.png'),
  regenerateQRCode: jest.fn().mockResolvedValue('https://s3.example.com/new-qr-code.png'),
  deleteQRCode: jest.fn().mockResolvedValue(true)
}));

// Mock the notification service
jest.mock('../src/services/notificationService', () => ({
  notifyQRCodeGenerated: jest.fn().mockResolvedValue(true),
  sendQRCodeToTourists: jest.fn().mockResolvedValue(true),
  sendSharedQRCode: jest.fn().mockResolvedValue(true),
  sendBulkQRCode: jest.fn().mockResolvedValue(true)
}));

describe('QR Code Functionality', () => {
  let providerAdminToken;
  let systemAdminToken;
  let providerId;
  let tourId;
  let templateId;

  beforeAll(async () => {
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
    
    // Create provider admin
    const providerAdmin = new User({
      email: 'provider@example.com',
      first_name: 'Provider',
      last_name: 'Admin',
      google_id: 'provider123',
      user_type: 'provider_admin',
      provider_id: providerId
    });
    const savedProviderAdmin = await providerAdmin.save();
    
    // Create system admin
    const systemAdmin = new User({
      email: 'admin@example.com',
      first_name: 'System',
      last_name: 'Admin',
      google_id: 'admin123',
      user_type: 'system_admin'
    });
    const savedSystemAdmin = await systemAdmin.save();
    
    // Create tour template
    const template = new TourTemplate({
      template_name: 'Test Template',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-07'),
      created_by: savedSystemAdmin._id
    });
    const savedTemplate = await template.save();
    templateId = savedTemplate._id;
    
    // Create custom tour
    const tour = new CustomTour({
      provider_id: providerId,
      tour_template_id: templateId,
      tour_name: 'Test Tour',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-07'),
      join_code: 'TEST123',
      created_by: savedProviderAdmin._id
    });
    const savedTour = await tour.save();
    tourId = savedTour._id;
    
    // Generate auth tokens
    const jwt = require('jsonwebtoken');
    providerAdminToken = jwt.sign({ userId: savedProviderAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    systemAdminToken = jwt.sign({ userId: savedSystemAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Provider.deleteMany({});
    await CustomTour.deleteMany({});
    await TourTemplate.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/qr-codes/tours/:id/generate', () => {
    test('should generate QR code for custom tour', async () => {
      const response = await request(app)
        .post(`/api/qr-codes/tours/${tourId}/generate`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({
          generateJoinCode: true,
          notify: true
        })
        .expect(200);

      expect(response.body.message).toBe('QR code generated successfully');
      expect(response.body.qr_code_url).toBe('https://s3.example.com/qr-code.png');
      expect(response.body.join_qr_code_url).toBe('https://s3.example.com/join-qr-code.png');
      expect(response.body.generated_at).toBeDefined();
    });

    test('should generate QR code without join code', async () => {
      const response = await request(app)
        .post(`/api/qr-codes/tours/${tourId}/generate`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({
          generateJoinCode: false,
          notify: false
        })
        .expect(200);

      expect(response.body.qr_code_url).toBe('https://s3.example.com/qr-code.png');
      expect(response.body.join_qr_code_url).toBeNull();
    });

    test('should reject unauthorized access', async () => {
      await request(app)
        .post(`/api/qr-codes/tours/${tourId}/generate`)
        .send({ generateJoinCode: true })
        .expect(401);
    });

    test('should reject access from wrong provider', async () => {
      // Create another provider admin
      const anotherProvider = new Provider({
        country: 'Another Country',
        provider_name: 'Another Provider',
        address: 'Another Address',
        phone_number: '+9876543210',
        email_address: 'another@test.com'
      });
      await anotherProvider.save();

      const anotherAdmin = new User({
        email: 'another@example.com',
        first_name: 'Another',
        last_name: 'Admin',
        google_id: 'another123',
        user_type: 'provider_admin',
        provider_id: anotherProvider._id
      });
      await anotherAdmin.save();

      const jwt = require('jsonwebtoken');
      const anotherToken = jwt.sign({ userId: anotherAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');

      await request(app)
        .post(`/api/qr-codes/tours/${tourId}/generate`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ generateJoinCode: true })
        .expect(403);
    });
  });

  describe('POST /api/qr-codes/templates/:id/generate', () => {
    test('should generate QR code for template (system admin only)', async () => {
      const response = await request(app)
        .post(`/api/qr-codes/templates/${templateId}/generate`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({ notify: true })
        .expect(200);

      expect(response.body.message).toBe('QR code generated successfully');
      expect(response.body.qr_code_url).toBe('https://s3.example.com/qr-code.png');
    });

    test('should reject provider admin access to template generation', async () => {
      await request(app)
        .post(`/api/qr-codes/templates/${templateId}/generate`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({ notify: true })
        .expect(403);
    });
  });

  describe('POST /api/qr-codes/tours/:id/share', () => {
    beforeEach(async () => {
      // Add QR code to tour
      await CustomTour.findByIdAndUpdate(tourId, {
        qr_code_url: 'https://s3.example.com/existing-qr-code.png'
      });
    });

    test('should share QR code via email', async () => {
      const response = await request(app)
        .post(`/api/qr-codes/tours/${tourId}/share`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({
          recipients: ['friend1@example.com', 'friend2@example.com'],
          message: 'Check out this tour!',
          bulk: false
        })
        .expect(200);

      expect(response.body.message).toBe('QR code shared successfully to 2 recipient(s)');
      expect(response.body.recipients_count).toBe(2);
    });

    test('should validate recipients array', async () => {
      await request(app)
        .post(`/api/qr-codes/tours/${tourId}/share`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({
          recipients: [],
          message: 'Test message'
        })
        .expect(400);
    });

    test('should reject sharing when QR code not generated', async () => {
      // Remove QR code
      await CustomTour.findByIdAndUpdate(tourId, {
        qr_code_url: null
      });

      await request(app)
        .post(`/api/qr-codes/tours/${tourId}/share`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({
          recipients: ['test@example.com']
        })
        .expect(400);
    });
  });

  describe('GET /api/qr-codes/tours/:id', () => {
    test('should get QR code information', async () => {
      // Add QR codes to tour
      await CustomTour.findByIdAndUpdate(tourId, {
        qr_code_url: 'https://s3.example.com/qr-code.png',
        join_qr_code_url: 'https://s3.example.com/join-qr-code.png',
        qr_code_generated_at: new Date()
      });

      const response = await request(app)
        .get(`/api/qr-codes/tours/${tourId}?type=custom`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(200);

      expect(response.body.has_qr_code).toBe(true);
      expect(response.body.qr_code_url).toBe('https://s3.example.com/qr-code.png');
      expect(response.body.has_join_qr_code).toBe(true);
      expect(response.body.join_qr_code_url).toBe('https://s3.example.com/join-qr-code.png');
      expect(response.body.tour_name).toBe('Test Tour');
      expect(response.body.join_code).toBe('TEST123');
    });

    test('should return false when no QR code exists', async () => {
      const response = await request(app)
        .get(`/api/qr-codes/tours/${tourId}?type=custom`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(200);

      expect(response.body.has_qr_code).toBe(false);
      expect(response.body.qr_code_url).toBeNull();
    });
  });

  describe('PUT /api/qr-codes/tours/:id/regenerate', () => {
    test('should regenerate QR code', async () => {
      // Add existing QR code
      await CustomTour.findByIdAndUpdate(tourId, {
        qr_code_url: 'https://s3.example.com/old-qr-code.png'
      });

      const response = await request(app)
        .put(`/api/qr-codes/tours/${tourId}/regenerate`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({ notify: true })
        .expect(200);

      expect(response.body.message).toBe('QR code regenerated successfully');
      expect(response.body.qr_code_url).toBe('https://s3.example.com/new-qr-code.png');
    });
  });

  describe('DELETE /api/qr-codes/tours/:id', () => {
    test('should delete QR code', async () => {
      // Add QR code to tour
      await CustomTour.findByIdAndUpdate(tourId, {
        qr_code_url: 'https://s3.example.com/qr-code.png'
      });

      const response = await request(app)
        .delete(`/api/qr-codes/tours/${tourId}`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({ type: 'custom' })
        .expect(200);

      expect(response.body.message).toBe('QR code deleted successfully');
    });
  });
});