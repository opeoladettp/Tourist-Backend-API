const cacheService = require('./cacheService');

/**
 * Database query result caching service
 */
class DatabaseCache {
  constructor() {
    this.defaultTTL = 600; // 10 minutes default for DB queries
  }

  /**
   * Generate cache key for database queries
   */
  generateQueryKey(model, method, query = {}, options = {}) {
    const queryString = JSON.stringify({
      model: model.modelName,
      method,
      query,
      options: {
        sort: options.sort,
        limit: options.limit,
        skip: options.skip,
        select: options.select,
        populate: options.populate
      }
    });

    // Create hash of query string for consistent key length
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(queryString).digest('hex');
    
    return cacheService.generateKey('db', model.modelName.toLowerCase(), method, hash);
  }

  /**
   * Cache wrapper for Mongoose find operations
   */
  async find(model, query = {}, options = {}, ttl = this.defaultTTL) {
    const cacheKey = this.generateQueryKey(model, 'find', query, options);
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`DB Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Execute query
    console.log(`DB Cache MISS: ${cacheKey}`);
    let queryBuilder = model.find(query);
    
    if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
    if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
    if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
    if (options.select) queryBuilder = queryBuilder.select(options.select);
    if (options.populate) queryBuilder = queryBuilder.populate(options.populate);

    const result = await queryBuilder.exec();
    
    // Cache the result
    await cacheService.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Cache wrapper for Mongoose findOne operations
   */
  async findOne(model, query = {}, options = {}, ttl = this.defaultTTL) {
    const cacheKey = this.generateQueryKey(model, 'findOne', query, options);
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`DB Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Execute query
    console.log(`DB Cache MISS: ${cacheKey}`);
    let queryBuilder = model.findOne(query);
    
    if (options.select) queryBuilder = queryBuilder.select(options.select);
    if (options.populate) queryBuilder = queryBuilder.populate(options.populate);

    const result = await queryBuilder.exec();
    
    // Cache the result
    await cacheService.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Cache wrapper for Mongoose findById operations
   */
  async findById(model, id, options = {}, ttl = this.defaultTTL) {
    const cacheKey = this.generateQueryKey(model, 'findById', { _id: id }, options);
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`DB Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Execute query
    console.log(`DB Cache MISS: ${cacheKey}`);
    let queryBuilder = model.findById(id);
    
    if (options.select) queryBuilder = queryBuilder.select(options.select);
    if (options.populate) queryBuilder = queryBuilder.populate(options.populate);

    const result = await queryBuilder.exec();
    
    // Cache the result
    await cacheService.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Cache wrapper for Mongoose count operations
   */
  async countDocuments(model, query = {}, ttl = this.defaultTTL) {
    const cacheKey = this.generateQueryKey(model, 'countDocuments', query);
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      console.log(`DB Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Execute query
    console.log(`DB Cache MISS: ${cacheKey}`);
    const result = await model.countDocuments(query);
    
    // Cache the result
    await cacheService.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Cache wrapper for Mongoose aggregate operations
   */
  async aggregate(model, pipeline = [], ttl = this.defaultTTL) {
    const cacheKey = this.generateQueryKey(model, 'aggregate', { pipeline });
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`DB Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Execute query
    console.log(`DB Cache MISS: ${cacheKey}`);
    const result = await model.aggregate(pipeline);
    
    // Cache the result
    await cacheService.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Invalidate cache for a specific model
   */
  async invalidateModel(modelName) {
    const pattern = cacheService.generateKey('db', modelName.toLowerCase(), '*');
    await cacheService.delPattern(pattern);
    console.log(`Cache invalidated for model: ${modelName}`);
  }

  /**
   * Invalidate cache for specific query patterns
   */
  async invalidateQueries(modelName, patterns = []) {
    const promises = patterns.map(pattern => {
      const fullPattern = cacheService.generateKey('db', modelName.toLowerCase(), pattern);
      return cacheService.delPattern(fullPattern);
    });
    
    await Promise.all(promises);
    console.log(`Cache invalidated for ${modelName} patterns:`, patterns);
  }

  /**
   * Invalidate related caches when a document is modified
   */
  async invalidateRelated(modelName, documentId, relatedModels = []) {
    // Invalidate main model cache
    await this.invalidateModel(modelName);
    
    // Invalidate related model caches
    for (const relatedModel of relatedModels) {
      await this.invalidateModel(relatedModel);
    }
    
    console.log(`Related cache invalidated for ${modelName}:${documentId}`);
  }

  /**
   * Create cached version of a Mongoose model
   */
  createCachedModel(model, options = {}) {
    const {
      defaultTTL = this.defaultTTL,
      autoInvalidate = true
    } = options;

    const cachedModel = {
      // Original model reference
      _model: model,
      
      // Cached query methods
      find: (query, options, ttl) => this.find(model, query, options, ttl || defaultTTL),
      findOne: (query, options, ttl) => this.findOne(model, query, options, ttl || defaultTTL),
      findById: (id, options, ttl) => this.findById(model, id, options, ttl || defaultTTL),
      countDocuments: (query, ttl) => this.countDocuments(model, query, ttl || defaultTTL),
      aggregate: (pipeline, ttl) => this.aggregate(model, pipeline, ttl || defaultTTL),
      
      // Cache management methods
      invalidateCache: () => this.invalidateModel(model.modelName),
      invalidateQueries: (patterns) => this.invalidateQueries(model.modelName, patterns),
      
      // Pass-through methods that invalidate cache
      create: async (...args) => {
        const result = await model.create(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      findByIdAndUpdate: async (...args) => {
        const result = await model.findByIdAndUpdate(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      findOneAndUpdate: async (...args) => {
        const result = await model.findOneAndUpdate(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      updateOne: async (...args) => {
        const result = await model.updateOne(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      updateMany: async (...args) => {
        const result = await model.updateMany(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      findByIdAndDelete: async (...args) => {
        const result = await model.findByIdAndDelete(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      findOneAndDelete: async (...args) => {
        const result = await model.findOneAndDelete(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      deleteOne: async (...args) => {
        const result = await model.deleteOne(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      },
      
      deleteMany: async (...args) => {
        const result = await model.deleteMany(...args);
        if (autoInvalidate) {
          await this.invalidateModel(model.modelName);
        }
        return result;
      }
    };

    return cachedModel;
  }
}

// Create singleton instance
const databaseCache = new DatabaseCache();

module.exports = databaseCache;