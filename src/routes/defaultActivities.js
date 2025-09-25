const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const defaultActivityController = require('../controllers/defaultActivityController');
const { cacheMiddleware } = require('../middleware/cache');
const { createInvalidationMiddleware } = require('../middleware/cacheInvalidation');

/**
 * @swagger
 * components:
 *   schemas:
 *     DefaultActivity:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         activity_name:
 *           type: string
 *         description:
 *           type: string
 *         typical_duration_hours:
 *           type: number
 *         category:
 *           type: string
 *           enum: [sightseeing, cultural, adventure, dining, transportation, accommodation, entertainment, shopping, educational, religious, nature, other]
 *         is_active:
 *           type: boolean
 *         created_by:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             first_name:
 *               type: string
 *             last_name:
 *               type: string
 *             email:
 *               type: string
 *         created_date:
 *           type: string
 *           format: date-time
 *         updated_date:
 *           type: string
 *           format: date-time
 *     DefaultActivityRequest:
 *       type: object
 *       required:
 *         - activity_name
 *         - category
 *       properties:
 *         activity_name:
 *           type: string
 *           description: Name of the activity
 *         description:
 *           type: string
 *           description: Description of the activity
 *         typical_duration_hours:
 *           type: number
 *           minimum: 0
 *           description: Typical duration in hours
 *         category:
 *           type: string
 *           enum: [sightseeing, cultural, adventure, dining, transportation, accommodation, entertainment, shopping, educational, religious, nature, other]
 *           description: Activity category
 *         is_active:
 *           type: boolean
 *           default: true
 *           description: Whether the activity is active
 */

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: Get all default activities
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for activity name or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Default activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DefaultActivity'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  cacheMiddleware({ 
    ttl: 600, // 10 minutes
    prefix: 'activities',
    varyBy: ['page', 'limit', 'category', 'search']
  }),
  defaultActivityController.getAllDefaultActivities
);

/**
 * @swagger
 * /api/activities/selection:
 *   get:
 *     summary: Get activities for selection (simplified response)
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Activities for selection retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       activity_name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       typical_duration_hours:
 *                         type: number
 *                       category:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/selection', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  cacheMiddleware({ 
    ttl: 900, // 15 minutes
    prefix: 'activities-selection'
  }),
  defaultActivityController.getActivitiesForSelection
);

/**
 * @swagger
 * /api/activities/categories:
 *   get:
 *     summary: Get activity categories with counts
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/categories', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  cacheMiddleware({ 
    ttl: 1800, // 30 minutes - categories change rarely
    prefix: 'activity-categories'
  }),
  defaultActivityController.getActivityCategories
);

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     summary: Get default activity by ID
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Default activity ID
 *     responses:
 *       200:
 *         description: Default activity retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   $ref: '#/components/schemas/DefaultActivity'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Default activity not found
 */
router.get('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  cacheMiddleware({ 
    ttl: 1200, // 20 minutes
    prefix: 'activity-detail'
  }),
  defaultActivityController.getDefaultActivityById
);

/**
 * @swagger
 * /api/activities:
 *   post:
 *     summary: Create new default activity
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DefaultActivityRequest'
 *     responses:
 *       201:
 *         description: Default activity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activity:
 *                   $ref: '#/components/schemas/DefaultActivity'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', 
  authenticate,
  authorize('system_admin'),
  validate(schemas.defaultActivity),
  createInvalidationMiddleware('DefaultActivity', { operation: 'create' }),
  defaultActivityController.createDefaultActivity
);

/**
 * @swagger
 * /api/activities/{id}:
 *   put:
 *     summary: Update default activity
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Default activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DefaultActivityRequest'
 *     responses:
 *       200:
 *         description: Default activity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activity:
 *                   $ref: '#/components/schemas/DefaultActivity'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Default activity not found
 */
router.put('/:id', 
  authenticate,
  authorize('system_admin'),
  validate(schemas.defaultActivity),
  createInvalidationMiddleware('DefaultActivity', { operation: 'update' }),
  defaultActivityController.updateDefaultActivity
);

/**
 * @swagger
 * /api/activities/{id}/status:
 *   patch:
 *     summary: Toggle default activity status
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Default activity ID
 *     responses:
 *       200:
 *         description: Activity status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activity:
 *                   $ref: '#/components/schemas/DefaultActivity'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Default activity not found
 */
router.patch('/:id/status', 
  authenticate,
  authorize('system_admin'),
  defaultActivityController.toggleActivityStatus
);

/**
 * @swagger
 * /api/activities/{id}:
 *   delete:
 *     summary: Delete default activity
 *     tags: [Default Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Default activity ID
 *     responses:
 *       200:
 *         description: Default activity deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Default activity not found
 */
router.delete('/:id', 
  authenticate,
  authorize('system_admin'),
  createInvalidationMiddleware('DefaultActivity', { operation: 'delete' }),
  defaultActivityController.deleteDefaultActivity
);

module.exports = router;