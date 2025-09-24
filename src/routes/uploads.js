const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ImageUploadService = require('../services/imageUploadService');
const uploadController = require('../controllers/uploadController');

// Create multer middleware for different upload types
const profileUploadMiddleware = ImageUploadService.createUploadMiddleware('profile-pictures');
const tourUploadMiddleware = ImageUploadService.createUploadMiddleware('tour-images');
const generalUploadMiddleware = ImageUploadService.createUploadMiddleware('general-uploads');

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         fileUrl:
 *           type: string
 *           format: uri
 *         fileName:
 *           type: string
 *         fileSize:
 *           type: number
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *     PresignedUrlResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         presignedUrl:
 *           type: string
 *           format: uri
 *         publicUrl:
 *           type: string
 *           format: uri
 *         key:
 *           type: string
 *         expiresIn:
 *           type: number
 */

/**
 * @swagger
 * /api/uploads/profile-picture:
 *   post:
 *     summary: Upload profile picture
 *     tags: [File Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profile_picture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file (JPEG, PNG, JPG, GIF - max 5MB)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Invalid file or no file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/profile-picture',
  authenticate,
  profileUploadMiddleware.single('profile_picture'),
  uploadController.uploadProfilePicture
);

/**
 * @swagger
 * /api/uploads/tour-image:
 *   post:
 *     summary: Upload tour image (features or teaser)
 *     tags: [File Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               tour_image:
 *                 type: string
 *                 format: binary
 *                 description: Tour image file (JPEG, PNG, JPG, GIF - max 10MB)
 *               image_type:
 *                 type: string
 *                 enum: [features, teaser]
 *                 description: Type of tour image
 *     responses:
 *       200:
 *         description: Tour image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Invalid file or no file provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/tour-image',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  tourUploadMiddleware.single('tour_image'),
  uploadController.uploadTourImage
);

/**
 * @swagger
 * /api/uploads/multiple-tour-images:
 *   post:
 *     summary: Upload multiple tour images (for teaser gallery)
 *     tags: [File Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               tour_images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple tour image files (max 5 files, 10MB each)
 *     responses:
 *       200:
 *         description: Tour images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 uploadedFiles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Invalid files or no files provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/multiple-tour-images',
  authenticate,
  authorize('system_admin', 'provider_admin'),
  tourUploadMiddleware.array('tour_images', 5), // Max 5 files
  uploadController.uploadMultipleTourImages
);

/**
 * @swagger
 * /api/uploads/general:
 *   post:
 *     summary: Upload general file (documents, images, etc.)
 *     tags: [File Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: General file (max 20MB)
 *               category:
 *                 type: string
 *                 enum: [document, image, other]
 *                 description: File category for organization
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Invalid file or no file provided
 *       401:
 *         description: Unauthorized
 */
router.post('/general',
  authenticate,
  generalUploadMiddleware.single('file'),
  uploadController.uploadGeneralFile
);

/**
 * @swagger
 * /api/uploads/presigned-url:
 *   post:
 *     summary: Get presigned URL for direct S3 upload
 *     tags: [File Uploads]
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
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the file to upload
 *               fileType:
 *                 type: string
 *                 enum: [profile-picture, tour-image, calendar-image, document, general]
 *                 description: Type of file for proper S3 folder organization
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
 *               $ref: '#/components/schemas/PresignedUrlResponse'
 *       400:
 *         description: fileName and fileType are required
 *       401:
 *         description: Unauthorized
 */
router.post('/presigned-url',
  authenticate,
  uploadController.getPresignedUrl
);

/**
 * @swagger
 * /api/uploads/delete:
 *   delete:
 *     summary: Delete uploaded file from S3
 *     tags: [File Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileUrl
 *             properties:
 *               fileUrl:
 *                 type: string
 *                 format: uri
 *                 description: Full URL of the file to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: fileUrl is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.delete('/delete',
  authenticate,
  uploadController.deleteFile
);

module.exports = router;