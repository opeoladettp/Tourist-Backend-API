const request = require('supertest');
const app = require('../src/server');
const cacheService = require('../src/services/cacheService');
const databaseCache = require('../src/services/databaseCache');
const { CacheInvalidationStrategies } = require('../src/middleware/cacheInvalidation');
const User = require('../src/models/User');
const DefaultActivity = require('../src/models/DefaultActivity');

describe('Cache System Tests', () => {
  let adminToken;
  let testUser;
  let testActivity;

  beforeAll(async () => {
    // Create test admin user
    testUser = await User.create({
      first_name: 'Cache',
      last_name: 'Admin',
      email: 'cache.admin@test.com',
      password: 'password123',
      user_type: 'system_admin',
      is_active: true,
      email_verified: true
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'cache.admin@test.com',
        password: 'password123'
      });

    adminToken = loginResponse.body.token;

    // Create test activity
    testActivity = await DefaultActivity.create({
      activity_name: 'Cache Test Activity',
      description: 'Test activity for cache testing',
      typical_duration_hours: 2,
      category: 'test',
      created_by: testUser._id,
      is_active: true
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.findByIdAndDelete(testUser._id);
    await DefaultActivity.findByIdAndDelete(testActivity._id);
    
    // Clear cache
    await cacheService.clear();
    
    // Close cache connection
    await cacheService.close();
  });

  describe('Cache Service', () => {
    test('should set and get cache values', async () => {
      const key = 'test:key';
      const value = { message: 'Hello Cache' };
      
      await cacheService.set(key, value, 60);
      const retrieved = await cacheService.get(key);
      
      expect(retrieved).toEqual(value);
    });

    test('should handle cache expiration', async () => {
      const key = 'test:expire';
      const value = { message: 'Will Expire' };
      
      await cacheService.set(key, value, 1); // 1 second TTL
      
      // Should exist immediately
      let retrieved = await cacheService.get(key);
      expect(retrieved).toEqual(value);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be null after expiration
      retrieved = await cacheService.get(key);
      expect(retrieved).toBeNull();
    });

    test('should delete cache keys', async () => {
      const key = 'test:delete';
      const value = { message: 'To Delete' };
      
      await cacheService.set(key, value, 60);
      await cacheService.del(key);
      
      const retrieved = await cacheService.get(key);
      expect(retrieved).toBeNull();
    });

    test('should delete keys by pattern', async () => {
      const keys = ['test:pattern:1', 'test:pattern:2', 'test:other:1'];
      const value = { message: 'Pattern Test' };
      
      // Set multiple keys
      for (const key of keys) {
        await cacheService.set(key, value, 60);
      }
      
      // Delete pattern
      await cacheService.delPattern('test:pattern:*');
      
      // Check results
      expect(await cacheService.get('test:pattern:1')).toBeNull();
      expect(await cacheService.get('test:pattern:2')).toBeNull();
      expect(await cacheService.get('test:other:1')).toEqual(value);
      
      // Clean up
      await cacheService.del('test:other:1');
    });

    test('should get cache statistics', async () => {
      const stats = await cacheService.getStats();
      
      expect(stats).toHaveProperty('connected');
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });

  describe('Database Cache', () => {
    test('should cache database queries', async () => {
      // First query - should be cache miss
      const result1 = await databaseCache.find(DefaultActivity, { is_active: true }, {}, 60);
      
      // Second query - should be cache hit
      const result2 = await databaseCache.find(DefaultActivity, { is_active: true }, {}, 60);
      
      expect(result1).toEqual(result2);
      expect(Array.isArray(result1)).toBe(true);
    });

    test('should cache findById queries', async () => {
      const result1 = await databaseCache.findById(DefaultActivity, testActivity._id, {}, 60);
      const result2 = await databaseCache.findById(DefaultActivity, testActivity._id, {}, 60);
      
      expect(result1).toEqual(result2);
      expect(result1.activity_name).toBe('Cache Test Activity');
    });

    test('should cache count queries', async () => {
      const count1 = await databaseCache.countDocuments(DefaultActivity, { is_active: true }, 60);
      const count2 = await databaseCache.countDocuments(DefaultActivity, { is_active: true }, 60);
      
      expect(count1).toBe(count2);
      expect(typeof count1).toBe('number');
    });

    test('should invalidate model cache', async () => {
      // Cache a query
      await databaseCache.find(DefaultActivity, { is_active: true }, {}, 60);
      
      // Invalidate cache
      await databaseCache.invalidateModel('DefaultActivity');
      
      // Query should work but be a cache miss
      const result = await databaseCache.find(DefaultActivity, { is_active: true }, {}, 60);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('API Response Caching', () => {
    test('should cache GET requests', async () => {
      // First request - cache miss
      const response1 = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second request - cache hit
      const response2 = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response1.body).toEqual(response2.body);
    });

    test('should vary cache by query parameters', async () => {
      // Request with different parameters should be different cache entries
      const response1 = await request(app)
        .get('/api/activities?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response2 = await request(app)
        .get('/api/activities?page=2&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Both should be cache misses initially
      expect(response1.headers['x-cache']).toBe('MISS');
      expect(response2.headers['x-cache']).toBe('MISS');

      // Repeat first request - should be cache hit
      const response3 = await request(app)
        .get('/api/activities?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response3.headers['x-cache']).toBe('HIT');
    });

    test('should not cache non-GET requests', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activity_name: 'No Cache Activity',
          description: 'This should not be cached',
          typical_duration_hours: 1,
          category: 'test'
        })
        .expect(201);

      expect(response.headers['x-cache']).toBeUndefined();
      
      // Clean up
      await DefaultActivity.findByIdAndDelete(response.body.activity._id);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate user cache', async () => {
      await CacheInvalidationStrategies.invalidateUserCache(testUser._id, 'test');
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    test('should invalidate activity cache', async () => {
      await CacheInvalidationStrategies.invalidateActivityCache(testActivity._id, 'test');
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    test('should invalidate by model name', async () => {
      await CacheInvalidationStrategies.invalidateByModel('DefaultActivity', testActivity._id, 'test');
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    test('should invalidate cache after write operations', async () => {
      // First, cache a GET request
      await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Create new activity (should invalidate cache)
      const createResponse = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activity_name: 'Invalidation Test Activity',
          description: 'This should invalidate cache',
          typical_duration_hours: 1,
          category: 'test'
        })
        .expect(201);

      // Next GET request should be cache miss due to invalidation
      const getResponse = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.headers['x-cache']).toBe('MISS');
      
      // Clean up
      await DefaultActivity.findByIdAndDelete(createResponse.body.activity._id);
    });
  });

  describe('Cache Management API', () => {
    test('should get cache statistics', async () => {
      const response = await request(app)
        .get('/api/cache/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('connected');
      expect(response.body).toHaveProperty('keys');
      expect(response.body).toHaveProperty('memory');
    });

    test('should clear cache', async () => {
      // Set some cache data first
      await cacheService.set('test:clear', { data: 'test' }, 60);
      
      const response = await request(app)
        .delete('/api/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('cleared');
      
      // Verify cache is cleared
      const value = await cacheService.get('test:clear');
      expect(value).toBeNull();
    });

    test('should invalidate cache by pattern', async () => {
      // Set some cache data
      await cacheService.set('test:pattern:api:1', { data: 'test1' }, 60);
      await cacheService.set('test:pattern:api:2', { data: 'test2' }, 60);
      
      const response = await request(app)
        .delete('/api/cache/invalidate/pattern')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ pattern: 'test:pattern:*' })
        .expect(200);

      expect(response.body.message).toContain('invalidated');
    });

    test('should require admin role for cache management', async () => {
      // Create regular user
      const regularUser = await User.create({
        first_name: 'Regular',
        last_name: 'User',
        email: 'regular@test.com',
        password: 'password123',
        user_type: 'tourist',
        is_active: true,
        email_verified: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'regular@test.com',
          password: 'password123'
        });

      const regularToken = loginResponse.body.token;

      // Should be forbidden
      await request(app)
        .get('/api/cache/stats')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      // Clean up
      await User.findByIdAndDelete(regularUser._id);
    });
  });

  describe('Health Check with Cache', () => {
    test('should include cache stats in health check', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('cache');
      expect(response.body.cache).toHaveProperty('connected');
    });
  });
});