const mongoose = require('mongoose');
const CustomTour = require('../src/models/CustomTour');
const User = require('../src/models/User');
const Provider = require('../src/models/Provider');
const TourTemplate = require('../src/models/TourTemplate');

describe('CustomTour viewAccessibility Model', () => {
  let provider, tourTemplate, providerAdmin;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity_test');
    }

    // Create test provider
    provider = new Provider({
      provider_name: 'Test Provider',
      country: 'Test Country',
      contact_email: 'test@provider.com',
      email_address: 'test@provider.com',
      phone_number: '+1234567890',
      address: '123 Test Street, Test City'
    });
    await provider.save();

    // Create provider admin
    providerAdmin = new User({
      first_name: 'Provider',
      last_name: 'Admin',
      email: 'provider@test.com',
      user_type: 'provider_admin',
      provider_id: provider._id
    });
    await providerAdmin.save();

    // Create tour template
    tourTemplate = new TourTemplate({
      provider_id: provider._id,
      template_name: 'Test Template',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-07'),
      is_active: true,
      created_by: providerAdmin._id
    });
    await tourTemplate.save();
  });

  afterEach(async () => {
    await CustomTour.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Provider.deleteMany({});
    await TourTemplate.deleteMany({});
    await CustomTour.deleteMany({});
  });

  describe('Model Validation', () => {
    test('should create tour with default public viewAccessibility', async () => {
      const tour = new CustomTour({
        provider_id: provider._id,
        tour_template_id: tourTemplate._id,
        tour_name: 'Test Tour',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        join_code: 'TEST123',
        created_by: providerAdmin._id
      });

      await tour.save();
      expect(tour.viewAccessibility).toBe('public');
    });

    test('should create tour with specified private viewAccessibility', async () => {
      const tour = new CustomTour({
        provider_id: provider._id,
        tour_template_id: tourTemplate._id,
        tour_name: 'Private Test Tour',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        viewAccessibility: 'private',
        join_code: 'PRIV123',
        created_by: providerAdmin._id
      });

      await tour.save();
      expect(tour.viewAccessibility).toBe('private');
    });

    test('should reject invalid viewAccessibility values', async () => {
      const tour = new CustomTour({
        provider_id: provider._id,
        tour_template_id: tourTemplate._id,
        tour_name: 'Invalid Tour',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        viewAccessibility: 'invalid',
        join_code: 'INV123',
        created_by: providerAdmin._id
      });

      await expect(tour.save()).rejects.toThrow();
    });

    test('should update viewAccessibility from public to private', async () => {
      const tour = new CustomTour({
        provider_id: provider._id,
        tour_template_id: tourTemplate._id,
        tour_name: 'Update Test Tour',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        viewAccessibility: 'public',
        join_code: 'UPD123',
        created_by: providerAdmin._id
      });

      await tour.save();
      expect(tour.viewAccessibility).toBe('public');

      tour.viewAccessibility = 'private';
      await tour.save();
      expect(tour.viewAccessibility).toBe('private');
    });

    test('should find tours by viewAccessibility', async () => {
      // Create public tour
      const publicTour = new CustomTour({
        provider_id: provider._id,
        tour_template_id: tourTemplate._id,
        tour_name: 'Public Tour',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        viewAccessibility: 'public',
        join_code: 'PUB123',
        created_by: providerAdmin._id
      });
      await publicTour.save();

      // Create private tour
      const privateTour = new CustomTour({
        provider_id: provider._id,
        tour_template_id: tourTemplate._id,
        tour_name: 'Private Tour',
        start_date: new Date('2024-07-01'),
        end_date: new Date('2024-07-07'),
        viewAccessibility: 'private',
        join_code: 'PRIV456',
        created_by: providerAdmin._id
      });
      await privateTour.save();

      // Find public tours
      const publicTours = await CustomTour.find({ viewAccessibility: 'public' });
      expect(publicTours).toHaveLength(1);
      expect(publicTours[0].tour_name).toBe('Public Tour');

      // Find private tours
      const privateTours = await CustomTour.find({ viewAccessibility: 'private' });
      expect(privateTours).toHaveLength(1);
      expect(privateTours[0].tour_name).toBe('Private Tour');
    });
  });
});