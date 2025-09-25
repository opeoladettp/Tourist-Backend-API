const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes default
  }

  /**
   * Initialize Redis client for caching
   */
  async initialize(redisClient = null) {
    try {
      if (redisClient) {
        // Use existing Redis client from server
        this.client = redisClient;
        this.isConnected = redisClient.isOpen;
      } else {
        // Create new Redis client for caching
        this.client = redis.createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          socket: {
            connectTimeout: 5000,
            lazyConnect: true
          }
        });

        this.client.on('error', (err) => {
          console.warn('Cache Redis Client Error:', err.message);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('Cache Redis Connected');
          this.isConnected = true;
        });

        this.client.on('ready', () => {
          console.log('Cache Redis Ready');
          this.isConnected = true;
        });

        this.client.on('end', () => {
          console.log('Cache Redis Disconnected');
          this.isConnected = false;
        });

        await this.client.connect();
      }

      console.log('Cache service initialized');
    } catch (error) {
      console.warn('Cache service initialization failed:', error.message);
      console.log('Continuing without cache - performance may be reduced');
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.client && this.isConnected;
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix, ...parts) {
    const key = parts.filter(part => part !== null && part !== undefined).join(':');
    return `tourlicity:${prefix}:${key}`;
  }

  /**
   * Set cache value with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isAvailable()) return false;

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async del(key) {
    if (!this.isAvailable()) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple cache keys
   */
  async delMultiple(keys) {
    if (!this.isAvailable() || !keys.length) return false;

    try {
      await this.client.del(keys);
      return true;
    } catch (error) {
      console.warn('Cache delete multiple error:', error.message);
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isAvailable()) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.warn('Cache delete pattern error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('Cache exists error:', error.message);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key, ttl) {
    if (!this.isAvailable()) return false;

    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.warn('Cache expire error:', error.message);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key) {
    if (!this.isAvailable()) return -1;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.warn('Cache TTL error:', error.message);
      return -1;
    }
  }

  /**
   * Increment counter
   */
  async incr(key, ttl = this.defaultTTL) {
    if (!this.isAvailable()) return 0;

    try {
      const value = await this.client.incr(key);
      if (value === 1) {
        // Set TTL only for new keys
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.warn('Cache increment error:', error.message);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) {
      return {
        connected: false,
        keys: 0,
        memory: '0MB',
        hits: 0,
        misses: 0
      };
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      const stats = await this.client.info('stats');

      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : '0MB';

      // Parse keyspace info
      const keyspaceMatch = keyspace.match(/keys=(\d+)/);
      const keys = keyspaceMatch ? parseInt(keyspaceMatch[1]) : 0;

      // Parse stats
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;

      return {
        connected: true,
        keys,
        memory,
        hits,
        misses,
        hitRate: hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(2) + '%' : '0%'
      };
    } catch (error) {
      console.warn('Cache stats error:', error.message);
      return {
        connected: false,
        keys: 0,
        memory: '0MB',
        hits: 0,
        misses: 0,
        hitRate: '0%'
      };
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    if (!this.isAvailable()) return false;

    try {
      await this.client.flushDb();
      console.log('Cache cleared');
      return true;
    } catch (error) {
      console.warn('Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Close cache connection
   */
  async close() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('Cache connection closed');
      } catch (error) {
        console.warn('Cache close error:', error.message);
      }
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;