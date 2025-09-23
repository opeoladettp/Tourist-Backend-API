const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const ImageUploadService = require('../services/imageUploadService');
const calendarController = require('../controllers/calendarController');

// Create multer middleware for calendar image uploads
const uploadMiddleware = ImageUploadService.createUploadMiddleware('calendar-images');

/**
 * @swagger
 * components:
 *   schemas:
 *     CalendarEntry:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         tour_template_id:
 *           type: string
 *         custom_tour_id:
 *           type: string
 *         entry_date:
 *           type: string
 *           format: date
 *         activity:
 *           type: string
 *         activity_description:
 *           type: string
 *         activity_details:
 *           type: string
 *         featured_image:
 *           type: string
 *           format: uri
 *           description: URL to featured image in S3
 *         featured_image_uploaded_at:
 *           type: string
 *           format: date-time
 *         web_links:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *         start_time:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         end_time:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *         created_date:
 *           type: string
 *           format: date-time
 */

// @route   GET /api/calendar
// @desc    Get calendar entries for tour template or custom tour
// @access  Private (System Admin, Provider Admin, Tourist for registered tours)
router.get('/', 
  authenticate,
  requireCompleteProfile,
  calendarController.getCalendarEntries
);

// @route   GET /api/calendar/default-activities
// @desc    Get default activities for selection
// @access  Private (System Admin, Provider Admin)
router.get('/default-activities', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  calendarController.getDefaultActivities
);

// @route   GET /api/calendar/:id
// @desc    Get calendar entry by ID
// @access  Private (System Admin, Provider Admin, Tourist for registered tours)
router.get('/:id', 
  authenticate,
  requireCompleteProfile,
  calendarController.getCalendarEntryById
);

// @route   POST /api/calendar
// @desc    Create calendar entry
// @access  Private (System Admin, Provider Admin)
router.post('/', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.calendarEntry),
  calendarController.createCalendarEntry
);

// @route   PUT /api/calendar/:id
// @desc    Update calendar entry
// @access  Private (System Admin, Provider Admin)
router.put('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  validate(schemas.calendarEntry),
  calendarController.updateCalendarEntry
);

// @route   DELETE /api/calendar/:id
// @desc    Delete calendar entry
// @access  Private (System Admin, Provider Admin)
router.delete('/:id', 
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  calendarController.deleteCalendarEntry
);

/**
 * @swagger
 * /api/calendar/{id}/featured-image:
 *   post:
 *     summary: Upload featured image for calendar entry
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               featured_image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, JPG, GIF - max 5MB)
 *     responses:
 *       200:
 *         description: Featured image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 featured_image:
 *                   type: string
 *                   format: uri
 *                 uploaded_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid image file or no file provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Calendar entry not found
 */
router.post('/:id/featured-image',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  uploadMiddleware.single('featured_image'),
  calendarController.uploadFeaturedImage
);

/**
 * @swagger
 * /api/calendar/{id}/featured-image:
 *   delete:
 *     summary: Delete featured image for calendar entry
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar entry ID
 *     responses:
 *       200:
 *         description: Featured image deleted successfully
 *       400:
 *         description: No featured image to delete
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Calendar entry not found
 */
router.delete('/:id/featured-image',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  calendarController.deleteFeaturedImage
);

/**
 * @swagger
 * /api/calendar/presigned-url:
 *   post:
 *     summary: Get presigned URL for direct image upload to S3
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the file to upload
 *               contentType:
 *                 type: string
 *                 default: image/jpeg
 *                 description: MIME type of the file
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 presignedUrl:
 *                   type: string
 *                   description: URL for direct upload to S3
 *                 publicUrl:
 *                   type: string
 *                   description: Public URL of the uploaded file
 *                 key:
 *                   type: string
 *                   description: S3 object key
 *                 expiresIn:
 *                   type: number
 *                   description: URL expiration time in seconds
 *       400:
 *         description: fileName is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/presigned-url',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  calendarController.getPresignedUrl
);

// @route   PUT /api/calendar/:id/presigned-image
// @desc    Update calendar entry with presigned uploaded image
// @access  Private (System Admin, Provider Admin)
router.put('/:id/presigned-image',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  requireCompleteProfile,
  calendarController.updateWithPresignedImage
);

module.exports = router;