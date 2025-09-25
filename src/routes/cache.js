const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const databaseCache = require('../services/databaseCache');
const { CacheInvalidationStrategies } = require('../middleware/cacheInvalidation');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     CacheStats:
 *       type: object
 *       properties:
 *         connected:
 *           type: boolean
 *         keys:
 *           type: number
 *         memory:
 *           type: string
 *         hits:
 *           type: number
 *         misses:
 *           type: number
 *         hitRate:
 *           type: string
 */

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CacheStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/stats', authenticate, authorize('system_admin'), async (req, res) => {
    try {
        const stats = await cacheService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Cache stats error:', error);
        res.status(500).json({ error: 'Failed to get cache statistics' });
    }
});

/**
 * @swagger
 * /api/cache/clear:
 *   delete:
 *     summary: Clear all cache
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Failed to clear cache
 */
router.delete('/clear', authenticate, authorize('system_admin'), async (req, res) => {
    try {
        const success = await cacheService.clear();
        if (success) {
            res.json({ message: 'Cache cleared successfully' });
        } else {
            res.status(500).json({ error: 'Failed to clear cache' });
        }
    } catch (error) {
        console.error('Cache clear error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

/**
 * @swagger
 * /api/cache/invalidate/pattern:
 *   delete:
 *     summary: Invalidate cache by pattern
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pattern
 *             properties:
 *               pattern:
 *                 type: string
 *                 description: Cache key pattern to invalidate
 *     responses:
 *       200:
 *         description: Cache pattern invalidated successfully
 *       400:
 *         description: Invalid pattern
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/invalidate/pattern', authenticate, authorize('system_admin'), async (req, res) => {
    try {
        const { pattern } = req.body;

        if (!pattern) {
            return res.status(400).json({ error: 'Pattern is required' });
        }

        const success = await cacheService.delPattern(pattern);
        if (success) {
            res.json({ message: `Cache pattern '${pattern}' invalidated successfully` });
        } else {
            res.status(500).json({ error: 'Failed to invalidate cache pattern' });
        }
    } catch (error) {
        console.error('Cache pattern invalidation error:', error);
        res.status(500).json({ error: 'Failed to invalidate cache pattern' });
    }
});

/**
 * @swagger
 * /api/cache/invalidate/model/{modelName}:
 *   delete:
 *     summary: Invalidate cache for a specific model
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Model name to invalidate cache for
 *         example: User
 *     responses:
 *       200:
 *         description: Model cache invalidated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/invalidate/model/:modelName', authenticate, authorize('system_admin'), async (req, res) => {
    try {
        const { modelName } = req.params;

        await CacheInvalidationStrategies.invalidateByModel(modelName, null, 'manual');
        res.json({ message: `Cache for model '${modelName}' invalidated successfully` });
    } catch (error) {
        console.error('Model cache invalidation error:', error);
        res.status(500).json({ error: 'Failed to invalidate model cache' });
    }
});

/**
 * @swagger
 * /api/cache/invalidate/user/{userId}:
 *   delete:
 *     summary: Invalidate cache for a specific user
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to invalidate cache for
 *     responses:
 *       200:
 *         description: User cache invalidated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/invalidate/user/:userId', authenticate, authorize('system_admin', 'provider_admin'), async (req, res) => {
    try {
        const { userId } = req.params;

        // Provider admins can only invalidate their own cache
        if (req.user.user_type === 'provider_admin' && req.user._id.toString() !== userId) {
            return res.status(403).json({ error: 'Can only invalidate your own cache' });
        }

        await CacheInvalidationStrategies.invalidateUserCache(userId, 'manual');
        res.json({ message: `Cache for user '${userId}' invalidated successfully` });
    } catch (error) {
        console.error('User cache invalidation error:', error);
        res.status(500).json({ error: 'Failed to invalidate user cache' });
    }
});

/**
 * @swagger
 * /api/cache/key/{key}:
 *   get:
 *     summary: Get cache value by key
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Cache key to retrieve
 *     responses:
 *       200:
 *         description: Cache value retrieved successfully
 *       404:
 *         description: Cache key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/key/:key', authenticate, authorize('system_admin'), async (req, res) => {
    try {
        const { key } = req.params;
        const value = await cacheService.get(key);

        if (value === null) {
            return res.status(404).json({ error: 'Cache key not found' });
        }

        const ttl = await cacheService.ttl(key);
        res.json({
            key,
            value,
            ttl: ttl > 0 ? ttl : 'no expiration',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cache get error:', error);
        res.status(500).json({ error: 'Failed to get cache value' });
    }
});

/**
 * @swagger
 * /api/cache/key/{key}:
 *   delete:
 *     summary: Delete cache key
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Cache key to delete
 *     responses:
 *       200:
 *         description: Cache key deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/key/:key', authenticate, authorize('system_admin'), async (req, res) => {
    try {
        const { key } = req.params;
        const success = await cacheService.del(key);

        if (success) {
            res.json({ message: `Cache key '${key}' deleted successfully` });
        } else {
            res.status(500).json({ error: 'Failed to delete cache key' });
        }
    } catch (error) {
        console.error('Cache delete error:', error);
        res.status(500).json({ error: 'Failed to delete cache key' });
    }
});

/**
 * @swagger
 * /api/cache/warmup:
 *   post:
 *     summary: Warm up cache with common queries
 *     tags: [Cache Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache warmup completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/warmup', authenticate, authorize('system_admin'), async (req, res) => {
    try {
        // Warm up common queries
        const User = require('../models/User');
        const TourTemplate = require('../models/TourTemplate');
        const DefaultActivity = require('../models/DefaultActivity');

        const warmupPromises = [
            // Warm up user queries
            databaseCache.find(User, { is_active: true }, { limit: 50 }),
            databaseCache.countDocuments(User, { is_active: true }),

            // Warm up tour template queries
            databaseCache.find(TourTemplate, { is_active: true }, { limit: 20 }),
            databaseCache.countDocuments(TourTemplate, { is_active: true }),

            // Warm up activity queries
            databaseCache.find(DefaultActivity, { is_active: true }, { limit: 30 }),
            databaseCache.countDocuments(DefaultActivity, { is_active: true })
        ];

        await Promise.all(warmupPromises);

        res.json({
            message: 'Cache warmup completed successfully',
            warmedQueries: warmupPromises.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cache warmup error:', error);
        res.status(500).json({ error: 'Failed to warm up cache' });
    }
});

module.exports = router;