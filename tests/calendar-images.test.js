const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Provider = require('../src/models/Provider');
const CustomTour = require('../src/models/CustomTour');
const TourTemplate = require('../src/models/TourTemplate');
const CalendarEntry = require('../src/models/CalendarEntry');
const path = require('path');

// Mock the image upload service to avoid actual S3 operations in tests
jest.mock('../src/services/imageUploadService', () => ({
  createUploadMiddleware: jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => {
      // Mock multer middleware
      req.file = {
        location: 'https://s3.example.com/calendar-images/test-image.jpg',
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024000
      };
      next();
    })
  })),
  validateImage: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  deleteImage: jest.fn().mockResolvedValue(true),
  generatePresignedUrl: jest.fn().mockResolvedValue({
    presignedUrl: 'https://s3.example.com/presigned-url',
    publicUrl: 'https://s3.example.com/calendar-images/test-image.jpg',
    key: 'calendar-images/test-image.jpg',
    expiresIn: 3600
  })
}));

describe('Calendar Entry Featured Images', () => {
  let providerAdminToken;
  let systemAdminToken;
  let providerId;
  let tourId;
  let templateId;
  let calendarEntryId;

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
    await CalendarEntry.deleteMany({});
    
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
    
    // Create calendar entry
    const calendarEntry = new CalendarEntry({
      custom_tour_id: tourId,
      entry_date: new Date('2024-06-02'),
      activity: 'Test Activity',
      activity_description: 'Test activity description',
      created_by: savedProviderAdmin._id
    });
    const savedEntry = await calendarEntry.save();
    calendarEntryId = savedEntry._id;
    
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
    await CalendarEntry.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/calendar/:id/featured-image', () => {
    test('should upload featured image for calendar entry', async () => {
      const response = await request(app)
        .post(`/api/calendar/${calendarEntryId}/featured-image`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .attach('featured_image', Buffer.from('fake image data'), 'test-image.jpg')
        .expect(200);

      expect(response.body.message).toBe('Featured image uploaded successfully');
      expect(response.body.featured_image).toBe('https://s3.example.com/calendar-images/test-image.jpg');
      expect(response.body.uploaded_at).toBeDefined();

      // Verify database update
      const updatedEntry = await CalendarEntry.findById(calendarEntryId);
      expect(updatedEntry.featured_image).toBe('https://s3.example.com/calendar-images/test-image.jpg');
      expect(updatedEntry.featured_image_uploaded_at).toBeDefined();
    });

    test('should reject upload without file', async () => {
      await request(app)
        .post(`/api/calendar/${calendarEntryId}/featured-image`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(400);
    });

    test('should reject unauthorized access', async () => {
      await request(app)
        .post(`/api/calendar/${calendarEntryId}/featured-image`)
        .attach('featured_image', Buffer.from('fake image data'), 'test-image.jpg')
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
        .post(`/api/calendar/${calendarEntryId}/featured-image`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .attach('featured_image', Buffer.from('fake image data'), 'test-image.jpg')
        .expect(403);
    });

    test('should replace existing featured image', async () => {
      // First upload
      await CalendarEntry.findByIdAndUpdate(calendarEntryId, {
        featured_image: 'https://s3.example.com/old-image.jpg',
        featured_image_uploaded_at: new Date()
      });

      const response = await request(app)
        .post(`/api/calendar/${calendarEntryId}/featured-image`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .attach('featured_image', Buffer.from('fake image data'), 'new-image.jpg')
        .expect(200);

      expect(response.body.featured_image).toBe('https://s3.example.com/calendar-images/test-image.jpg');
    });
  });

  describe('DELETE /api/calendar/:id/featured-image', () => {
    beforeEach(async () => {
      // Add featured image to calendar entry
      await CalendarEntry.findByIdAndUpdate(calendarEntryId, {
        featured_image: 'https://s3.example.com/test-image.jpg',
        featured_image_uploaded_at: new Date()
      });
    });

    test('should delete featured image', async () => {
      const response = await request(app)
        .delete(`/api/calendar/${calendarEntryId}/featured-image`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Featured image deleted successfully');

      // Verify database update
      const updatedEntry = await CalendarEntry.findById(calendarEntryId);
      expect(updatedEntry.featured_image).toBeNull();
      expect(updatedEntry.featured_image_uploaded_at).toBeNull();
    });

    test('should return error when no image to delete', async () => {
      // Remove image first
      await CalendarEntry.findByIdAndUpdate(calendarEntryId, {
        featured_image: null,
        featured_image_uploaded_at: null
      });

      await request(app)
        .delete(`/api/calendar/${calendarEntryId}/featured-image`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(400);
    });

    test('should reject unauthorized access', async () => {
      await request(app)
        .delete(`/api/calendar/${calendarEntryId}/featured-image`)
        .expect(401);
    });
  });

  describe('POST /api/calendar/presigned-url', () => {
    test('should generate presigned URL', async () => {
      const response = await request(app)
        .post('/api/calendar/presigned-url')
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({
          fileName: 'test-image.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body.message).toBe('Presigned URL generated successfully');
      expect(response.body.presignedUrl).toBe('https://s3.example.com/presigned-url');
      expect(response.body.publicUrl).toBe('https://s3.example.com/calendar-images/test-image.jpg');
      expect(response.body.key).toBe('calendar-images/test-image.jpg');
      expect(response.body.expiresIn).toBe(3600);
    });

    test('should require fileName', async () => {
      await request(app)
        .post('/api/calendar/presigned-url')
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({
          contentType: 'image/jpeg'
        })
        .expect(400);
    });

    test('should reject unauthorized access', async () => {
      await request(app)
        .post('/api/calendar/presigned-url')
        .send({
          fileName: 'test-image.jpg'
        })
        .expect(401);
    });
  });

  describe('PUT /api/calendar/:id/presigned-image', () => {
    test('should update calendar entry with presigned image', async () => {
      const imageUrl = 'https://s3.example.com/calendar-images/presigned-image.jpg';

      const response = await request(app)
        .put(`/api/calendar/${calendarEntryId}/presigned-image`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({ imageUrl })
        .expect(200);

      expect(response.body.message).toBe('Featured image updated successfully');
      expect(response.body.featured_image).toBe(imageUrl);
      expect(response.body.uploaded_at).toBeDefined();

      // Verify database update
      const updatedEntry = await CalendarEntry.findById(calendarEntryId);
      expect(updatedEntry.featured_image).toBe(imageUrl);
    });

    test('should require imageUrl', async () => {
      await request(app)
        .put(`/api/calendar/${calendarEntryId}/presigned-image`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send({})
        .expect(400);
    });

    test('should reject unauthorized access', async () => {
      await request(app)
        .put(`/api/calendar/${calendarEntryId}/presigned-image`)
        .send({ imageUrl: 'https://s3.example.com/test.jpg' })
        .expect(401);
    });
  });

  describe('Calendar entry with featured image in responses', () => {
    test('should include featured image in calendar entry response', async () => {
      // Add featured image
      await CalendarEntry.findByIdAndUpdate(calendarEntryId, {
        featured_image: 'https://s3.example.com/test-image.jpg',
        featured_image_uploaded_at: new Date()
      });

      const response = await request(app)
        .get(`/api/calendar/${calendarEntryId}`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(200);

      expect(response.body.calendar_entry.featured_image).toBe('https://s3.example.com/test-image.jpg');
      expect(response.body.calendar_entry.featured_image_uploaded_at).toBeDefined();
    });

    test('should include featured image in calendar entries list', async () => {
      // Add featured image
      await CalendarEntry.findByIdAndUpdate(calendarEntryId, {
        featured_image: 'https://s3.example.com/test-image.jpg',
        featured_image_uploaded_at: new Date()
      });

      const response = await request(app)
        .get(`/api/calendar?custom_tour_id=${tourId}`)
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(200);

      expect(response.body.calendar_entries).toHaveLength(1);
      expect(response.body.calendar_entries[0].featured_image).toBe('https://s3.example.com/test-image.jpg');
    });
  });
});