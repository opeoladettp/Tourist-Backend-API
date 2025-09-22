const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const registrationController = require('../controllers/registrationController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Registration:
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
 *         tourist_id:
 *           type: string
 *         provider_id:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             provider_name:
 *               type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         notes:
 *           type: string
 *         admin_notes:
 *           type: string
 *         created_date:
 *           type: string
 *           format: date-time
 *     RegistrationRequest:
 *       type: object
 *       required:
 *         - custom_tour_id
 *       properties:
 *         custom_tour_id:
 *           type: string
 *         notes:
 *           type: string
 *     RegistrationStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [approved, rejected]
 *         admin_notes:
 *           type: string
 */

/**
 * @swagger
 * /api/registrations:
 *   get:
 *     summary: Get all registrations
 *     tags: [Registrations]
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
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: tour_id
 *         schema:
 *           type: string
 *         description: Filter by tour ID
 *     responses:
 *       200:
 *         description: Registrations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Registration'
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
  registrationController.getAllRegistrations
);

/**
 * @swagger
 * /api/registrations/my:
 *   get:
 *     summary: Get user's registrations
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: User registrations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Registration'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/my', 
  authenticate,
  authorize('tourist'),
  requireCompleteProfile,
  registrationController.getMyRegistrations
);

/**
 * @swagger
 * /api/registrations/stats:
 *   get:
 *     summary: Get registration statistics
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registration statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_registrations:
 *                   type: number
 *                 pending_registrations:
 *                   type: number
 *                 approved_registrations:
 *                   type: number
 *                 rejected_registrations:
 *                   type: number
 *                 registrations_by_month:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/stats', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  registrationController.getRegistrationStats
);

/**
 * @swagger
 * /api/registrations:
 *   post:
 *     summary: Register for a tour
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationRequest'
 *     responses:
 *       201:
 *         description: Registration submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 registration:
 *                   $ref: '#/components/schemas/Registration'
 *       400:
 *         description: Validation error or tour full
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour not found
 */
router.post('/', 
  authenticate,
  authorize('tourist'),
  requireCompleteProfile,
  validate(schemas.registration),
  registrationController.registerForTour
);

/**
 * @swagger
 * /api/registrations/{id}/status:
 *   put:
 *     summary: Update registration status
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Registration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationStatusUpdate'
 *     responses:
 *       200:
 *         description: Registration status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 registration:
 *                   $ref: '#/components/schemas/Registration'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Registration not found
 */
router.put('/:id/status', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.registrationUpdate),
  registrationController.updateRegistrationStatus
);

/**
 * @swagger
 * /api/registrations/{id}:
 *   delete:
 *     summary: Unregister from tour
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Registration ID
 *     responses:
 *       200:
 *         description: Unregistered successfully
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
 *         description: Registration not found
 */
router.delete('/:id', 
  authenticate,
  requireCompleteProfile,
  registrationController.unregisterFromTour
);

module.exports = router;