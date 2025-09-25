const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const broadcastController = require('../controllers/broadcastController');
const { cacheMiddleware } = require('../middleware/cache');
const { createInvalidationMiddleware } = require('../middleware/cacheInvalidation');

/**
 * @swagger
 * components:
 *   schemas:
 *     Broadcast:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         custom_tour_id:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             tour_name:
 *               type: string
 *             start_date:
 *               type: string
 *               format: date
 *             end_date:
 *               type: string
 *               format: date
 *             join_code:
 *               type: string
 *         provider_id:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             provider_name:
 *               type: string
 *         message:
 *           type: string
 *           maxLength: 150
 *         status:
 *           type: string
 *           enum: [draft, published]
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
 *     BroadcastRequest:
 *       type: object
 *       required:
 *         - custom_tour_id
 *         - message
 *       properties:
 *         custom_tour_id:
 *           type: string
 *           description: ID of the custom tour
 *         message:
 *           type: string
 *           maxLength: 150
 *           description: Broadcast message (max 150 characters)
 *         status:
 *           type: string
 *           enum: [draft, published]
 *           default: draft
 *           description: Broadcast status
 */

/**
 * @swagger
 * /api/broadcasts:
 *   get:
 *     summary: Get all broadcasts
 *     tags: [Broadcasts]
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
 *         description: Search in broadcast messages
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published]
 *         description: Filter by status
 *       - in: query
 *         name: custom_tour_id
 *         schema:
 *           type: string
 *         description: Filter by tour ID
 *     responses:
 *       200:
 *         description: Broadcasts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Broadcast'
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
  requireCompleteProfile,
  broadcastController.getAllBroadcasts
);

/**
 * @swagger
 * /api/broadcasts/tour/{tourId}:
 *   get:
 *     summary: Get broadcasts for a specific tour
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Tour broadcasts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Broadcast'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not registered for this tour
 *       404:
 *         description: Tour not found
 */
router.get('/tour/:tourId', 
  authenticate,
  requireCompleteProfile,
  broadcastController.getBroadcastsByTour
);

/**
 * @swagger
 * /api/broadcasts/{id}:
 *   get:
 *     summary: Get broadcast by ID
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Broadcast ID
 *     responses:
 *       200:
 *         description: Broadcast retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 broadcast:
 *                   $ref: '#/components/schemas/Broadcast'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Broadcast not found
 */
router.get('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  broadcastController.getBroadcastById
);

/**
 * @swagger
 * /api/broadcasts:
 *   post:
 *     summary: Create new broadcast
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BroadcastRequest'
 *     responses:
 *       201:
 *         description: Broadcast created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 broadcast:
 *                   $ref: '#/components/schemas/Broadcast'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour not found
 */
router.post('/', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.broadcast),
  broadcastController.createBroadcast
);

/**
 * @swagger
 * /api/broadcasts/{id}:
 *   put:
 *     summary: Update broadcast
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Broadcast ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BroadcastRequest'
 *     responses:
 *       200:
 *         description: Broadcast updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 broadcast:
 *                   $ref: '#/components/schemas/Broadcast'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Broadcast not found
 */
router.put('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.broadcast),
  broadcastController.updateBroadcast
);

/**
 * @swagger
 * /api/broadcasts/{id}/publish:
 *   patch:
 *     summary: Publish broadcast (send to tourists)
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Broadcast ID
 *     responses:
 *       200:
 *         description: Broadcast published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 broadcast:
 *                   $ref: '#/components/schemas/Broadcast'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Broadcast not found
 */
router.patch('/:id/publish', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  broadcastController.publishBroadcast
);

/**
 * @swagger
 * /api/broadcasts/{id}:
 *   delete:
 *     summary: Delete broadcast
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Broadcast ID
 *     responses:
 *       200:
 *         description: Broadcast deleted successfully
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
 *         description: Broadcast not found
 */
router.delete('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  broadcastController.deleteBroadcast
);

module.exports = router;