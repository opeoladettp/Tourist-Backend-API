const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const qrCodeController = require('../controllers/qrCodeController');

/**
 * @swagger
 * components:
 *   schemas:
 *     QRCodeGeneration:
 *       type: object
 *       properties:
 *         generateJoinCode:
 *           type: boolean
 *           description: Whether to generate join QR code
 *         notify:
 *           type: boolean
 *           description: Whether to send notifications
 *     QRCodeShare:
 *       type: object
 *       required:
 *         - recipients
 *       properties:
 *         recipients:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *           description: Array of email addresses
 *         message:
 *           type: string
 *           description: Optional message to include
 *         bulk:
 *           type: boolean
 *           description: Whether to send as bulk email
 *     QRCodeInfo:
 *       type: object
 *       properties:
 *         has_qr_code:
 *           type: boolean
 *         qr_code_url:
 *           type: string
 *         has_join_qr_code:
 *           type: boolean
 *         join_qr_code_url:
 *           type: string
 *         generated_at:
 *           type: string
 *           format: date-time
 *         tour_name:
 *           type: string
 *         join_code:
 *           type: string
 */

/**
 * @swagger
 * /api/qr-codes/tours/{id}/generate:
 *   post:
 *     summary: Generate QR code for custom tour
 *     tags: [QR Codes]
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
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QRCodeGeneration'
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 qr_code_url:
 *                   type: string
 *                 join_qr_code_url:
 *                   type: string
 *                 generated_at:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour not found
 */
router.post('/tours/:id/generate',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  qrCodeController.generateCustomTourQRCode
);

/**
 * @swagger
 * /api/qr-codes/templates/{id}/generate:
 *   post:
 *     summary: Generate QR code for tour template
 *     tags: [QR Codes]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notify:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Template not found
 */
router.post('/templates/:id/generate',
  authenticate,
  authorize('system_admin'),
  qrCodeController.generateTemplateQRCode
);

/**
 * @swagger
 * /api/qr-codes/tours/{id}/regenerate:
 *   put:
 *     summary: Regenerate QR code for custom tour
 *     tags: [QR Codes]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notify:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: QR code regenerated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour not found
 */
router.put('/tours/:id/regenerate',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  qrCodeController.regenerateCustomTourQRCode
);

/**
 * @swagger
 * /api/qr-codes/tours/{id}/share:
 *   post:
 *     summary: Share QR code via email
 *     tags: [QR Codes]
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
 *             $ref: '#/components/schemas/QRCodeShare'
 *     responses:
 *       200:
 *         description: QR code shared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 recipients_count:
 *                   type: number
 *       400:
 *         description: Validation error or QR code not generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour not found
 */
router.post('/tours/:id/share',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.qrCodeShare),
  qrCodeController.shareQRCode
);

/**
 * @swagger
 * /api/qr-codes/tours/{id}:
 *   get:
 *     summary: Get QR code information
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [custom, template]
 *         description: Tour type
 *     responses:
 *       200:
 *         description: QR code information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QRCodeInfo'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour not found
 */
router.get('/tours/:id',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  qrCodeController.getQRCodeInfo
);

/**
 * @swagger
 * /api/qr-codes/tours/{id}:
 *   delete:
 *     summary: Delete QR code
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [custom, template]
 *     responses:
 *       200:
 *         description: QR code deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tour not found
 */
router.delete('/tours/:id',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  qrCodeController.deleteQRCode
);

module.exports = router;