const cacheService = require('../services/cacheService');
const databaseCache = require('../services/databaseCache');

/**
 * Cache invalidation strategies for different models and operations
 */
class CacheInvalidationStrategies {
  
  /**
   * User-related cache invalidation
   */
  static async invalidateUserCache(userId, operation = 'update') {
    const patterns = [
      `tourlicity:api:*/users*`,
      `tourlicity:api:*/auth*`,
      `tourlicity:db:user:*`,
      `tourlicity:session:${userId}*`
    ];

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log(`User cache invalidated for user ${userId} (${operation})`);
  }

  /**
   * Tour-related cache invalidation
   */
  static async invalidateTourCache(tourId, operation = 'update') {
    const patterns = [
      `tourlicity:api:*/tour*`,
      `tourlicity:api:*/custom-tours*`,
      `tourlicity:api:*/calendar*`,
      `tourlicity:db:tourtemplate:*`,
      `tourlicity:db:customtour:*`,
      `tourlicity:db:calendarentry:*`
    ];

    if (tourId) {
      patterns.push(`tourlicity:api:*/tours/${tourId}*`);
      patterns.push(`tourlicity:api:*/custom-tours/${tourId}*`);
    }

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log(`Tour cache invalidated for tour ${tourId} (${operation})`);
  }

  /**
   * Activity-related cache invalidation
   */
  static async invalidateActivityCache(activityId, operation = 'update') {
    const patterns = [
      `tourlicity:api:*/activities*`,
      `tourlicity:api:*/default-activities*`,
      `tourlicity:db:defaultactivity:*`
    ];

    if (activityId) {
      patterns.push(`tourlicity:api:*/activities/${activityId}*`);
    }

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log(`Activity cache invalidated for activity ${activityId} (${operation})`);
  }

  /**
   * Broadcast-related cache invalidation
   */
  static async invalidateBroadcastCache(broadcastId, operation = 'update') {
    const patterns = [
      `tourlicity:api:*/broadcasts*`,
      `tourlicity:db:broadcast:*`
    ];

    if (broadcastId) {
      patterns.push(`tourlicity:api:*/broadcasts/${broadcastId}*`);
    }

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log(`Broadcast cache invalidated for broadcast ${broadcastId} (${operation})`);
  }

  /**
   * Notification-related cache invalidation
   */
  static async invalidateNotificationCache(userId, operation = 'update') {
    const patterns = [
      `tourlicity:api:*/notifications*`,
      `tourlicity:db:pushsubscription:*`
    ];

    if (userId) {
      patterns.push(`tourlicity:api:*/notifications*user:${userId}*`);
    }

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log(`Notification cache invalidated for user ${userId} (${operation})`);
  }

  /**
   * QR Code-related cache invalidation
   */
  static async invalidateQRCache(qrId, operation = 'update') {
    const patterns = [
      `tourlicity:api:*/qr-codes*`,
      `tourlicity:db:qrcode:*`
    ];

    if (qrId) {
      patterns.push(`tourlicity:api:*/qr-codes/${qrId}*`);
    }

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log(`QR cache invalidated for QR ${qrId} (${operation})`);
  }

  /**
   * Role change request cache invalidation
   */
  static async invalidateRoleChangeCache(requestId, operation = 'update') {
    const patterns = [
      `tourlicity:api:*/role-change-requests*`,
      `tourlicity:db:rolechangerequest:*`
    ];

    if (requestId) {
      patterns.push(`tourlicity:api:*/role-change-requests/${requestId}*`);
    }

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log(`Role change cache invalidated for request ${requestId} (${operation})`);
  }

  /**
   * Global cache invalidation for admin operations
   */
  static async invalidateGlobalCache() {
    const patterns = [
      `tourlicity:api:*`,
      `tourlicity:db:*`
    ];

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    console.log('Global cache invalidated');
  }

  /**
   * Invalidate cache based on model name and operation
   */
  static async invalidateByModel(modelName, documentId, operation = 'update') {
    const modelLower = modelName.toLowerCase();
    
    switch (modelLower) {
      case 'user':
        await this.invalidateUserCache(documentId, operation);
        break;
      case 'tourtemplate':
      case 'customtour':
      case 'calendarentry':
        await this.invalidateTourCache(documentId, operation);
        break;
      case 'defaultactivity':
        await this.invalidateActivityCache(documentId, operation);
        break;
      case 'broadcast':
        await this.invalidateBroadcastCache(documentId, operation);
        break;
      case 'pushsubscription':
        await this.invalidateNotificationCache(documentId, operation);
        break;
      case 'qrcode':
        await this.invalidateQRCache(documentId, operation);
        break;
      case 'rolechangerequest':
        await this.invalidateRoleChangeCache(documentId, operation);
        break;
      default:
        // Generic invalidation
        await databaseCache.invalidateModel(modelName);
        await cacheService.delPattern(`tourlicity:api:*${modelLower}*`);
        console.log(`Generic cache invalidated for model ${modelName}`);
    }
  }
}

/**
 * Middleware factory for automatic cache invalidation
 */
const createInvalidationMiddleware = (modelName, options = {}) => {
  const {
    getDocumentId = (req) => req.params.id,
    operation = 'update',
    customInvalidation = null
  } = options;

  return async (req, res, next) => {
    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to trigger invalidation
    const triggerInvalidation = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          if (customInvalidation && typeof customInvalidation === 'function') {
            await customInvalidation(req, res);
          } else {
            const documentId = getDocumentId(req);
            await CacheInvalidationStrategies.invalidateByModel(modelName, documentId, operation);
          }
        } catch (error) {
          console.warn('Cache invalidation error:', error.message);
        }
      }
    };

    res.json = function(data) {
      triggerInvalidation();
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      triggerInvalidation();
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Mongoose middleware for automatic cache invalidation
 */
const setupMongooseInvalidation = (schema, modelName) => {
  // Post-save middleware
  schema.post('save', async function(doc) {
    try {
      await CacheInvalidationStrategies.invalidateByModel(modelName, doc._id, 'create');
    } catch (error) {
      console.warn('Mongoose save cache invalidation error:', error.message);
    }
  });

  // Post-update middleware
  schema.post(['updateOne', 'updateMany', 'findOneAndUpdate'], async function(result) {
    try {
      await CacheInvalidationStrategies.invalidateByModel(modelName, null, 'update');
    } catch (error) {
      console.warn('Mongoose update cache invalidation error:', error.message);
    }
  });

  // Post-delete middleware
  schema.post(['deleteOne', 'deleteMany', 'findOneAndDelete'], async function(result) {
    try {
      await CacheInvalidationStrategies.invalidateByModel(modelName, null, 'delete');
    } catch (error) {
      console.warn('Mongoose delete cache invalidation error:', error.message);
    }
  });
};

module.exports = {
  CacheInvalidationStrategies,
  createInvalidationMiddleware,
  setupMongooseInvalidation
};