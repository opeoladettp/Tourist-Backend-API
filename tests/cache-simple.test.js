const cacheService = require('../src/services/cacheService');

describe('Simple Cache Tests', () => {
  beforeAll(async () => {
    // Initialize cache service
    await cacheService.initialize();
  });

  afterAll(async () => {
    // Close cache connection
    await cacheService.close();
  });

  test('should set and get cache values', async () => {
    if (!cacheService.isAvailable()) {
      console.log('Redis not available, skipping cache tests');
      return;
    }

    const key = 'test:simple';
    const value = { message: 'Hello Cache' };
    
    await cacheService.set(key, value, 60);
    const retrieved = await cacheService.get(key);
    
    expect(retrieved).toEqual(value);
    
    // Clean up
    await cacheService.del(key);
  });

  test('should handle cache miss', async () => {
    if (!cacheService.isAvailable()) {
      console.log('Redis not available, skipping cache tests');
      return;
    }

    const value = await cacheService.get('nonexistent:key');
    expect(value).toBeNull();
  });

  test('should get cache statistics', async () => {
    const stats = await cacheService.getStats();
    
    expect(stats).toHaveProperty('connected');
    expect(typeof stats.connected).toBe('boolean');
  });
});