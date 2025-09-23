const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const notificationController = require('../controllers/notificationController');

/**
 * @swagger
 * components:
 *   schemas:
 *     PushSubscription:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user_id:
 *           type: string
 *         endpoint:
 *           type: string
 *         device_type:
 *           type: string
 *           enum: [desktop, mobile, tablet, unknown]
 *         browser:
 *           type: string
 *         is_active:
 *           type: boolean
 *         last_used:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *     PushSubscriptionRequest:
 *       type: object
 *       required:
 *         - endpoint
 *         - keys
 *       properties:
 *         endpoint:
 *           type: string
 *           description: Push service endpoint URL
 *         keys:
 *           type: object
 *           required:
 *             - p256dh
 *             - auth
 *           properties:
 *             p256dh:
 *               type: string
 *               description: P256DH key for encryption
 *             auth:
 *               type: string
 *               description: Auth key for encryption
 *         userAgent:
 *           type: string
 *           description: User agent string
 *         deviceType:
 *           type: string
 *           enum: [desktop, mobile, tablet, unknown]
 *         browser:
 *           type: string
 *           description: Browser name
 *     NotificationRequest:
 *       type: object
 *       required:
 *         - title
 *         - body
 *       properties:
 *         title:
 *           type: string
 *           description: Notification title
 *         body:
 *           type: string
 *           description: Notification body
 *         type:
 *           type: string
 *           description: Notification type
 *         includeEmail:
 *           type: boolean
 *           description: Whether to send email notification
 *     BulkNotificationRequest:
 *       type: object
 *       required:
 *         - title
 *         - body
 *       properties:
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         userIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs (optional if userType provided)
 *         userType:
 *           type: string
 *           enum: [tourist, provider_admin, system_admin]
 *           description: Send to all users of this type (optional if userIds provided)
 *         type:
 *           type: string
 *         includeEmail:
 *           type: boolean
 *         emailTemplate:
 *           type: string
 *         emailTemplateData:
 *           type: object
 */

/**
 * @swagger
 * /api/notifications/vapid-key:
 *   get:
 *     summary: Get VAPID public key for push notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: VAPID public key retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicKey:
 *                   type: string
 *                 message:
 *                   type: string
 *       500:
 *         description: VAPID key not configured
 */
router.get('/vapid-key',
  notificationController.getVapidPublicKey
);

/**
 * @swagger
 * /api/notifications/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushSubscriptionRequest'
 *     responses:
 *       201:
 *         description: Push subscription created successfully
 *       200:
 *         description: Push subscription updated successfully
 *       400:
 *         description: Invalid subscription data
 *       401:
 *         description: Unauthorized
 */
router.post('/subscribe',
  authenticate,
  validate(schemas.pushSubscription),
  notificationController.subscribeToPush
);

/**
 * @swagger
 * /api/notifications/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *             properties:
 *               endpoint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
 *       400:
 *         description: Endpoint is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
router.post('/unsubscribe',
  authenticate,
  notificationController.unsubscribeFromPush
);

/**
 * @swagger
 * /api/notifications/subscriptions:
 *   get:
 *     summary: Get user's push subscriptions
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PushSubscription'
 *       401:
 *         description: Unauthorized
 */
router.get('/subscriptions',
  authenticate,
  notificationController.getUserSubscriptions
);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 default: Test Notification
 *               body:
 *                 type: string
 *                 default: This is a test notification from Tourlicity!
 *     responses:
 *       200:
 *         description: Test notifications queued successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/test',
  authenticate,
  notificationController.sendTestNotification
);

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send notification to specific user (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/NotificationRequest'
 *               - type: object
 *                 required:
 *                   - userId
 *                 properties:
 *                   userId:
 *                     type: string
 *                     description: Target user ID
 *     responses:
 *       200:
 *         description: Notification queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post('/send',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  validate(schemas.sendNotification),
  notificationController.sendNotificationToUser
);

/**
 * @swagger
 * /api/notifications/send-bulk:
 *   post:
 *     summary: Send bulk notifications (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkNotificationRequest'
 *     responses:
 *       200:
 *         description: Bulk notifications queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/send-bulk',
  authenticate,
  authorize('system_admin'),
  validate(schemas.bulkNotification),
  notificationController.sendBulkNotification
);

/**
 * @swagger
 * /api/notifications/queue-stats:
 *   get:
 *     summary: Get notification queue statistics (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: object
 *                       properties:
 *                         waiting:
 *                           type: number
 *                         active:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         failed:
 *                           type: number
 *                     push:
 *                       type: object
 *                       properties:
 *                         waiting:
 *                           type: number
 *                         active:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         failed:
 *                           type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/queue-stats',
  authenticate,
  authorize('system_admin'),
  notificationController.getQueueStats
);

/**
 * @swagger
 * /api/notifications/cleanup:
 *   post:
 *     summary: Clean up notification queues (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue cleanup completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/cleanup',
  authenticate,
  authorize('system_admin'),
  notificationController.cleanupQueues
);

/**
 * @swagger
 * /api/notifications/all-subscriptions:
 *   get:
 *     summary: Get all push subscriptions (Admin only)
 *     tags: [Notifications]
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
 *         name: user_type
 *         schema:
 *           type: string
 *           enum: [tourist, provider_admin, system_admin]
 *         description: Filter by user type
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/all-subscriptions',
  authenticate,
  authorize('system_admin'),
  notificationController.getAllSubscriptions
);

module.exports = router;