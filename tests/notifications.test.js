const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const PushSubscription = require('../src/models/PushSubscription');

// Mock the notification queue service
jest.mock('../src/services/notificationQueueService', () => ({
  initializeQueues: jest.fn(),
  queueEmail: jest.fn().mockResolvedValue({ id: 'email-job-1' }),
  queueEmailTemplate: jest.fn().mockResolvedValue({ id: 'email-template-job-1' }),
  queuePushNotification: jest.fn().mockResolvedValue({ id: 'push-job-1' }),
  queueBulkPushNotification: jest.fn().mockResolvedValue([{ id: 'bulk-push-job-1' }]),
  queueBulkEmail: jest.fn().mockResolvedValue({ id: 'bulk-email-job-1' }),
  getQueueStats: jest.fn().mockResolvedValue({
    email: { waiting: 5, active: 2, completed: 100, failed: 1 },
    push: { waiting: 3, active: 1, completed: 50, failed: 0 }
  }),
  cleanupQueues: jest.fn().mockResolvedValue(true)
}));

describe('Notification System', () => {
  let touristToken;
  let providerAdminToken;
  let systemAdminToken;
  let touristId;
  let providerAdminId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tourlicity_test');
    }
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await PushSubscription.deleteMany({});
    
    // Create test users
    const tourist = new User({
      email: 'tourist@example.com',
      first_name: 'Tourist',
      last_name: 'User',
      google_id: 'tourist123',
      user_type: 'tourist'
    });
    const savedTourist = await tourist.save();
    touristId = savedTourist._id;
    
    const providerAdmin = new User({
      email: 'provider@example.com',
      first_name: 'Provider',
      last_name: 'Admin',
      google_id: 'provider123',
      user_type: 'provider_admin'
    });
    const savedProviderAdmin = await providerAdmin.save();
    providerAdminId = savedProviderAdmin._id;
    
    const systemAdmin = new User({
      email: 'admin@example.com',
      first_name: 'System',
      last_name: 'Admin',
      google_id: 'admin123',
      user_type: 'system_admin'
    });
    const savedSystemAdmin = await systemAdmin.save();
    
    // Generate auth tokens
    const jwt = require('jsonwebtoken');
    touristToken = jwt.sign({ userId: savedTourist._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    providerAdminToken = jwt.sign({ userId: savedProviderAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
    systemAdminToken = jwt.sign({ userId: savedSystemAdmin._id.toString() }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await PushSubscription.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/notifications/vapid-key', () => {
    test('should return VAPID public key', async () => {
      // Set environment variable for test
      process.env.VAPID_PUBLIC_KEY = 'test-vapid-key';

      const response = await request(app)
        .get('/api/notifications/vapid-key')
        .expect(200);

      expect(response.body.publicKey).toBe('test-vapid-key');
      expect(response.body.message).toBe('VAPID public key retrieved successfully');
    });

    test('should return error when VAPID key not configured', async () => {
      delete process.env.VAPID_PUBLIC_KEY;

      await request(app)
        .get('/api/notifications/vapid-key')
        .expect(500);
    });
  });

  describe('POST /api/notifications/subscribe', () => {
    test('should create new push subscription', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        },
        userAgent: 'Mozilla/5.0 Test Browser',
        deviceType: 'desktop',
        browser: 'Chrome'
      };

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(response.body.message).toBe('Push subscription created successfully');
      expect(response.body.subscription_id).toBeDefined();

      // Verify database entry
      const subscription = await PushSubscription.findById(response.body.subscription_id);
      expect(subscription.user_id.toString()).toBe(touristId.toString());
      expect(subscription.endpoint).toBe(subscriptionData.endpoint);
      expect(subscription.is_active).toBe(true);
    });

    test('should update existing subscription', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/existing-endpoint';
      
      // Create existing subscription
      const existingSubscription = new PushSubscription({
        user_id: providerAdminId,
        endpoint,
        p256dh_key: 'old-p256dh-key',
        auth_key: 'old-auth-key'
      });
      await existingSubscription.save();

      const subscriptionData = {
        endpoint,
        keys: {
          p256dh: 'new-p256dh-key',
          auth: 'new-auth-key'
        }
      };

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(subscriptionData)
        .expect(200);

      expect(response.body.message).toBe('Push subscription updated successfully');

      // Verify update
      const updatedSubscription = await PushSubscription.findOne({ endpoint });
      expect(updatedSubscription.user_id.toString()).toBe(touristId.toString());
      expect(updatedSubscription.p256dh_key).toBe('new-p256dh-key');
    });

    test('should validate subscription data', async () => {
      const invalidData = {
        endpoint: 'invalid-url',
        keys: {
          p256dh: 'test-key'
          // Missing auth key
        }
      };

      await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should require authentication', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-p256dh',
          auth: 'test-auth'
        }
      };

      await request(app)
        .post('/api/notifications/subscribe')
        .send(subscriptionData)
        .expect(401);
    });
  });

  describe('POST /api/notifications/unsubscribe', () => {
    beforeEach(async () => {
      // Create test subscription
      const subscription = new PushSubscription({
        user_id: touristId,
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-unsubscribe',
        p256dh_key: 'test-p256dh',
        auth_key: 'test-auth'
      });
      await subscription.save();
    });

    test('should unsubscribe from push notifications', async () => {
      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-unsubscribe'
        })
        .expect(200);

      expect(response.body.message).toBe('Successfully unsubscribed from push notifications');

      // Verify subscription is marked inactive
      const subscription = await PushSubscription.findOne({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-unsubscribe'
      });
      expect(subscription.is_active).toBe(false);
    });

    test('should return error for non-existent subscription', async () => {
      await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/non-existent'
        })
        .expect(404);
    });
  });

  describe('GET /api/notifications/subscriptions', () => {
    beforeEach(async () => {
      // Create test subscriptions
      const subscriptions = [
        {
          user_id: touristId,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
          p256dh_key: 'test-p256dh-1',
          auth_key: 'test-auth-1',
          device_type: 'desktop',
          browser: 'Chrome'
        },
        {
          user_id: touristId,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dh_key: 'test-p256dh-2',
          auth_key: 'test-auth-2',
          device_type: 'mobile',
          browser: 'Safari',
          is_active: false
        }
      ];

      await PushSubscription.insertMany(subscriptions);
    });

    test('should get user subscriptions', async () => {
      const response = await request(app)
        .get('/api/notifications/subscriptions')
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(200);

      expect(response.body.subscriptions).toHaveLength(2);
      expect(response.body.subscriptions[0].device_type).toBeDefined();
      expect(response.body.subscriptions[0].browser).toBeDefined();
    });
  });

  describe('POST /api/notifications/test', () => {
    test('should send test notification', async () => {
      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          title: 'Custom Test',
          body: 'Custom test message'
        })
        .expect(200);

      expect(response.body.message).toBe('Test notifications queued successfully');
      expect(response.body.email_job_id).toBe('email-job-1');
      expect(response.body.push_job_id).toBe('push-job-1');
    });

    test('should use default test message', async () => {
      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(200);

      expect(response.body.message).toBe('Test notifications queued successfully');
    });
  });

  describe('POST /api/notifications/send', () => {
    test('should send notification to specific user (provider admin)', async () => {
      const notificationData = {
        userId: touristId.toString(),
        title: 'Tour Update',
        body: 'Your tour has been updated',
        type: 'tour_update',
        includeEmail: true
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body.message).toBe('Notification queued successfully');
      expect(response.body.recipient.id).toBe(touristId.toString());
      expect(response.body.jobs).toHaveLength(2); // push and email
    });

    test('should send notification without email', async () => {
      const notificationData = {
        userId: touristId.toString(),
        title: 'Quick Update',
        body: 'Just a quick update',
        includeEmail: false
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body.jobs).toHaveLength(1); // push only
    });

    test('should reject invalid user ID', async () => {
      const notificationData = {
        userId: 'invalid-user-id',
        title: 'Test',
        body: 'Test message'
      };

      await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(notificationData)
        .expect(400);
    });

    test('should reject tourist access', async () => {
      const notificationData = {
        userId: providerAdminId.toString(),
        title: 'Test',
        body: 'Test message'
      };

      await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${touristToken}`)
        .send(notificationData)
        .expect(403);
    });
  });

  describe('POST /api/notifications/send-bulk', () => {
    test('should send bulk notification by user type (system admin only)', async () => {
      const bulkData = {
        userType: 'tourist',
        title: 'System Announcement',
        body: 'Important system update',
        includeEmail: true
      };

      const response = await request(app)
        .post('/api/notifications/send-bulk')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.message).toBe('Bulk notifications queued successfully');
      expect(response.body.recipient_count).toBeGreaterThan(0);
    });

    test('should send bulk notification to specific users', async () => {
      const bulkData = {
        userIds: [touristId.toString(), providerAdminId.toString()],
        title: 'Specific Update',
        body: 'Update for specific users',
        includeEmail: false
      };

      const response = await request(app)
        .post('/api/notifications/send-bulk')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.recipient_count).toBe(2);
    });

    test('should reject provider admin access', async () => {
      const bulkData = {
        userType: 'tourist',
        title: 'Test',
        body: 'Test message'
      };

      await request(app)
        .post('/api/notifications/send-bulk')
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .send(bulkData)
        .expect(403);
    });
  });

  describe('GET /api/notifications/queue-stats', () => {
    test('should get queue statistics (system admin only)', async () => {
      const response = await request(app)
        .get('/api/notifications/queue-stats')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Queue statistics retrieved successfully');
      expect(response.body.stats.email).toBeDefined();
      expect(response.body.stats.push).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should reject non-admin access', async () => {
      await request(app)
        .get('/api/notifications/queue-stats')
        .set('Authorization', `Bearer ${touristToken}`)
        .expect(403);
    });
  });

  describe('POST /api/notifications/cleanup', () => {
    test('should cleanup queues (system admin only)', async () => {
      const response = await request(app)
        .post('/api/notifications/cleanup')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Queue cleanup completed successfully');
    });

    test('should reject non-admin access', async () => {
      await request(app)
        .post('/api/notifications/cleanup')
        .set('Authorization', `Bearer ${providerAdminToken}`)
        .expect(403);
    });
  });
});