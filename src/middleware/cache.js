const cacheService = require('../services/cacheService');

/**
 * Cache middleware for API responses
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {string} options.prefix - Cache key prefix (default: 'api')
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.condition - Condition function to determine if response should be cached
 * @param {Array} options.varyBy - Array of request properties to vary cache by
 * @param {boolean} options.skipCache - Skip cache for this request
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    prefix = 'api',
    keyGenerator = null,
    condition = null,
    varyBy = [],
    skipCache = false
  } = options;

  return async (req, res, next) => {
    // Skip cache if disabled or not available
    if (skipCache || !cacheService.isAvailable()) {
      return next();
    }

    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        const keyParts = [req.originalUrl || req.url];
        
        // Add vary by parameters
        varyBy.forEach(param => {
          if (req.query[param]) {
            keyParts.push(`${param}:${req.query[param]}`);
          }
          if (req.headers[param]) {
            keyParts.push(`${param}:${req.headers[param]}`);
          }
          if (req.user && req.user[param]) {
            keyParts.push(`${param}:${req.user[param]}`);
          }
        });

        // Add user context if authenticated
        if (req.user && req.user._id) {
          keyParts.push(`user:${req.user._id}`);
        }

        cacheKey = cacheService.generateKey(prefix, ...keyParts);
      }

      // Try to get from cache
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });

        // Return cached response
        return res.status(cachedResponse.statusCode || 200).json(cachedResponse.data);
      }

      // Cache miss - continue to route handler
      res.set('X-Cache', 'MISS');

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Check condition before caching
        if (condition && typeof condition === 'function') {
          if (!condition(req, res, data)) {
            return originalJson.call(this, data);
          }
        }

        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseToCache = {
            statusCode: res.statusCode,
            data: data,
            timestamp: new Date().toISOString()
          };

          // Cache the response (don't wait for it)
          cacheService.set(cacheKey, responseToCache, ttl).catch(error => {
            console.warn('Failed to cache response:', error.message);
          });

          // Add cache headers
          res.set({
            'X-Cache-Key': cacheKey,
            'Cache-Control': `public, max-age=${ttl}`
          });
        }

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.warn('Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache patterns after successful write operations
 */
const cacheInvalidation = (patterns = []) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to invalidate cache after successful operations
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            let resolvedPattern;
            
            if (typeof pattern === 'function') {
              resolvedPattern = pattern(req, res);
            } else {
              // Replace placeholders in pattern
              resolvedPattern = pattern
                .replace(':userId', req.user?._id || '*')
                .replace(':id', req.params?.id || '*')
                .replace(':tourId', req.params?.tourId || '*');
            }

            await cacheService.delPattern(resolvedPattern);
            console.log(`Cache invalidated for pattern: ${resolvedPattern}`);
          }
        } catch (error) {
          console.warn('Cache invalidation error:', error.message);
        }
      }
    };

    res.json = function(data) {
      invalidateCache();
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      invalidateCache();
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Rate limiting with cache
 */
const rateLimitCache = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (req, res, next) => {
    if (!cacheService.isAvailable()) {
      return next();
    }

    try {
      const key = cacheService.generateKey('ratelimit', keyGenerator(req));
      const windowSeconds = Math.floor(windowMs / 1000);
      
      const current = await cacheService.incr(key, windowSeconds);
      
      if (current > max) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: await cacheService.ttl(key)
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - current),
        'X-RateLimit-Reset': new Date(Date.now() + (await cacheService.ttl(key)) * 1000).toISOString()
      });

      next();
    } catch (error) {
      console.warn('Rate limit cache error:', error.message);
      next();
    }
  };
};

/**
 * Session cache middleware
 */
const sessionCache = (options = {}) => {
  const {
    ttl = 24 * 60 * 60, // 24 hours
    prefix = 'session'
  } = options;

  return {
    // Get session data
    get: async (sessionId) => {
      if (!cacheService.isAvailable()) return null;
      
      const key = cacheService.generateKey(prefix, sessionId);
      return await cacheService.get(key);
    },

    // Set session data
    set: async (sessionId, data, customTtl = ttl) => {
      if (!cacheService.isAvailable()) return false;
      
      const key = cacheService.generateKey(prefix, sessionId);
      return await cacheService.set(key, data, customTtl);
    },

    // Delete session
    destroy: async (sessionId) => {
      if (!cacheService.isAvailable()) return false;
      
      const key = cacheService.generateKey(prefix, sessionId);
      return await cacheService.del(key);
    },

    // Touch session (extend TTL)
    touch: async (sessionId, customTtl = ttl) => {
      if (!cacheService.isAvailable()) return false;
      
      const key = cacheService.generateKey(prefix, sessionId);
      return await cacheService.expire(key, customTtl);
    }
  };
};

module.exports = {
  cacheMiddleware,
  cacheInvalidation,
  rateLimitCache,
  sessionCache
};