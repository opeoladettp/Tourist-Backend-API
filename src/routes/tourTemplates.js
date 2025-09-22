const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const tourTemplateController = require('../controllers/tourTemplateController');

/**
 * @swagger
 * components:
 *   schemas:
 *     TourTemplate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         template_name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         description:
 *           type: string
 *         duration_days:
 *           type: number
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
 *         is_active:
 *           type: boolean
 *         created_date:
 *           type: string
 *           format: date-time
 *     TourTemplateRequest:
 *       type: object
 *       required:
 *         - template_name
 *         - start_date
 *         - end_date
 *       properties:
 *         template_name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         description:
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
 *         is_active:
 *           type: boolean
 */

/**
 * @swagger
 * /api/tour-templates:
 *   get:
 *     summary: Get all tour templates
 *     tags: [Tour Templates]
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
 *     responses:
 *       200:
 *         description: Tour templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TourTemplate'
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
  tourTemplateController.getAllTourTemplates
);

/**
 * @swagger
 * /api/tour-templates/active:
 *   get:
 *     summary: Get active tour templates for selection
 *     tags: [Tour Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active tour templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TourTemplate'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/active', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  tourTemplateController.getActiveTemplates
);

/**
 * @swagger
 * /api/tour-templates/{id}:
 *   get:
 *     summary: Get tour template by ID
 *     tags: [Tour Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour template ID
 *     responses:
 *       200:
 *         description: Tour template retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TourTemplate'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour template not found
 */
router.get('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  tourTemplateController.getTourTemplateById
);

/**
 * @swagger
 * /api/tour-templates:
 *   post:
 *     summary: Create new tour template
 *     tags: [Tour Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TourTemplateRequest'
 *     responses:
 *       201:
 *         description: Tour template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 template:
 *                   $ref: '#/components/schemas/TourTemplate'
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
  validate(schemas.tourTemplate),
  tourTemplateController.createTourTemplate
);

/**
 * @swagger
 * /api/tour-templates/{id}:
 *   put:
 *     summary: Update tour template
 *     tags: [Tour Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TourTemplateRequest'
 *     responses:
 *       200:
 *         description: Tour template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 template:
 *                   $ref: '#/components/schemas/TourTemplate'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour template not found
 */
router.put('/:id', 
  authenticate,
  authorize('system_admin'),
  validate(schemas.tourTemplate),
  tourTemplateController.updateTourTemplate
);

/**
 * @swagger
 * /api/tour-templates/{id}/status:
 *   patch:
 *     summary: Toggle tour template status
 *     tags: [Tour Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour template ID
 *     responses:
 *       200:
 *         description: Tour template status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 template:
 *                   $ref: '#/components/schemas/TourTemplate'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour template not found
 */
router.patch('/:id/status', 
  authenticate,
  authorize('system_admin'),
  tourTemplateController.toggleTemplateStatus
);

/**
 * @swagger
 * /api/tour-templates/{id}:
 *   delete:
 *     summary: Delete tour template
 *     tags: [Tour Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour template ID
 *     responses:
 *       200:
 *         description: Tour template deleted successfully
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
 *         description: Tour template not found
 */
router.delete('/:id', 
  authenticate,
  authorize('system_admin'),
  tourTemplateController.deleteTourTemplate
);

module.exports = router;