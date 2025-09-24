const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const authController = require('../controllers/authController');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         user_type:
 *           type: string
 *           enum: [tourist, provider_admin, system_admin]
 *         is_active:
 *           type: boolean
 *     GoogleAuthRequest:
 *       type: object
 *       required:
 *         - google_id
 *         - email
 *         - first_name
 *         - last_name
 *       properties:
 *         google_id:
 *           type: string
 *         email:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         picture:
 *           type: string
 *           format: uri
 *           description: Google profile picture URL (optional)
 */

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google OAuth login/register
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleAuthRequest'
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 redirect:
 *                   type: string
 *       400:
 *         description: Validation error
 */
router.post('/google',
  validate(schemas.userRegistration),
  authController.googleAuth
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile',
  authenticate,
  authController.getProfile
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *                 format: uri
 *                 description: URL to profile picture
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               country:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               passport_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile',
  authenticate,
  validate(schemas.userUpdate),
  authController.updateProfile
);

/**
 * @swagger
 * /api/auth/reset-google-picture:
 *   put:
 *     summary: Reset profile picture to Google picture
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - google_picture_url
 *             properties:
 *               google_picture_url:
 *                 type: string
 *                 format: uri
 *                 description: Google profile picture URL
 *     responses:
 *       200:
 *         description: Profile picture reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid request or user not linked to Google
 *       401:
 *         description: Unauthorized
 */
router.put('/reset-google-picture',
  authenticate,
  authController.resetToGooglePicture
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/logout',
  authenticate,
  authController.logout
);

module.exports = router;