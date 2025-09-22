const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile, checkProviderOwnership } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const customTourController = require('../controllers/customTourController');

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomTour:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         provider_id:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             provider_name:
 *               type: string
 *         tour_template_id:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             template_name:
 *               type: string
 *         tour_name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [draft, published, in_progress, completed, cancelled]
 *         join_code:
 *           type: string
 *         max_tourists:
 *           type: number
 *         remaining_tourists:
 *           type: number
 *         group_chat_link:
 *           type: string
 *         features_image:
 *           type: string
 *           format: uri
 *           description: URL to the main features image
 *         teaser_images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: Array of URLs for teaser images
 *         web_links:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *         created_date:
 *           type: string
 *           format: date-time
 *     CustomTourRequest:
 *       type: object
 *       required:
 *         - provider_id
 *         - tour_template_id
 *         - tour_name
 *         - start_date
 *         - end_date
 *         - max_tourists
 *       properties:
 *         provider_id:
 *           type: string
 *         tour_template_id:
 *           type: string
 *         tour_name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         max_tourists:
 *           type: number
 *         group_chat_link:
 *           type: string
 *         features_image:
 *           type: string
 *           format: uri
 *           description: URL to the main features image
 *         teaser_images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: Array of URLs for teaser images
 *         web_links:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 */

/**
 * @swagger
 * /api/custom-tours:
 *   get:
 *     summary: Get all custom tours
 *     tags: [Custom Tours]
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
 *         description: Search term
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Custom tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomTour'
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
  customTourController.getAllCustomTours
);

/**
 * @swagger
 * /api/custom-tours/search/{join_code}:
 *   get:
 *     summary: Search tour by join code
 *     tags: [Custom Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: join_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour join code
 *     responses:
 *       200:
 *         description: Tour found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomTour'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tour not found
 */
router.get('/search/:join_code', 
  authenticate,
  authorize('tourist'),
  requireCompleteProfile,
  customTourController.searchTourByJoinCode
);

/**
 * @swagger
 * /api/custom-tours/{id}:
 *   get:
 *     summary: Get custom tour by ID
 *     tags: [Custom Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom tour ID
 *     responses:
 *       200:
 *         description: Custom tour retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomTour'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Custom tour not found
 */
router.get('/:id', 
  authenticate,
  requireCompleteProfile,
  customTourController.getCustomTourById
);

/**
 * @swagger
 * /api/custom-tours:
 *   post:
 *     summary: Create new custom tour
 *     tags: [Custom Tours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomTourRequest'
 *     responses:
 *       201:
 *         description: Custom tour created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tour:
 *                   $ref: '#/components/schemas/CustomTour'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.customTour),
  customTourController.createCustomTour
);

/**
 * @swagger
 * /api/custom-tours/{id}:
 *   put:
 *     summary: Update custom tour
 *     tags: [Custom Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom tour ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomTourRequest'
 *     responses:
 *       200:
 *         description: Custom tour updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tour:
 *                   $ref: '#/components/schemas/CustomTour'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Custom tour not found
 */
router.put('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.customTour),
  customTourController.updateCustomTour
);

/**
 * @swagger
 * /api/custom-tours/{id}/status:
 *   patch:
 *     summary: Update tour status
 *     tags: [Custom Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom tour ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, published, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Tour status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tour:
 *                   $ref: '#/components/schemas/CustomTour'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Custom tour not found
 */
router.patch('/:id/status', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  customTourController.updateTourStatus
);

/**
 * @swagger
 * /api/custom-tours/{id}:
 *   delete:
 *     summary: Delete custom tour
 *     tags: [Custom Tours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom tour ID
 *     responses:
 *       200:
 *         description: Custom tour deleted successfully
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
 *         description: Custom tour not found
 */
router.delete('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  customTourController.deleteCustomTour
);

module.exports = router;