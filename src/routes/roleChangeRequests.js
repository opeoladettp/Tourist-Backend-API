const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const roleChangeController = require('../controllers/roleChangeController');

/**
 * @swagger
 * components:
 *   schemas:
 *     RoleChangeRequest:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         tourist_id:
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
 *         request_type:
 *           type: string
 *           enum: [join_existing_provider, become_new_provider]
 *         provider_id:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             provider_name:
 *               type: string
 *         proposed_provider_data:
 *           type: object
 *           properties:
 *             provider_name:
 *               type: string
 *             country:
 *               type: string
 *             address:
 *               type: string
 *             phone_number:
 *               type: string
 *             email_address:
 *               type: string
 *             corporate_tax_id:
 *               type: string
 *             company_description:
 *               type: string
 *             logo_url:
 *               type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         request_message:
 *           type: string
 *         admin_notes:
 *           type: string
 *         created_date:
 *           type: string
 *           format: date-time
 *     RoleChangeRequestSubmission:
 *       type: object
 *       required:
 *         - request_type
 *       properties:
 *         request_type:
 *           type: string
 *           enum: [join_existing_provider, become_new_provider]
 *         provider_id:
 *           type: string
 *           description: Required when request_type is join_existing_provider
 *         proposed_provider_data:
 *           type: object
 *           description: Required when request_type is become_new_provider
 *           properties:
 *             provider_name:
 *               type: string
 *             country:
 *               type: string
 *             address:
 *               type: string
 *             phone_number:
 *               type: string
 *             email_address:
 *               type: string
 *             corporate_tax_id:
 *               type: string
 *             company_description:
 *               type: string
 *             logo_url:
 *               type: string
 *         request_message:
 *           type: string
 */

/**
 * @swagger
 * /api/role-change-requests:
 *   post:
 *     summary: Submit role change request (Tourist to Provider)
 *     tags: [Role Change Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleChangeRequestSubmission'
 *     responses:
 *       201:
 *         description: Role change request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 request:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     request_type:
 *                       type: string
 *                     status:
 *                       type: string
 *                     created_date:
 *                       type: string
 *       400:
 *         description: Validation error or existing pending request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Provider not found (for join_existing_provider)
 */
router.post('/',
  authenticate,
  authorize('tourist'),
  requireCompleteProfile,
  validate(schemas.roleChangeRequest),
  roleChangeController.submitRoleChangeRequest
);

/**
 * @swagger
 * /api/role-change-requests:
 *   get:
 *     summary: Get all role change requests (System Admin only)
 *     tags: [Role Change Requests]
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
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: request_type
 *         schema:
 *           type: string
 *           enum: [join_existing_provider, become_new_provider]
 *         description: Filter by request type
 *     responses:
 *       200:
 *         description: Role change requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoleChangeRequest'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/',
  authenticate,
  authorize('system_admin'),
  roleChangeController.getAllRoleChangeRequests
);

/**
 * @swagger
 * /api/role-change-requests/my:
 *   get:
 *     summary: Get user's own role change requests
 *     tags: [Role Change Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's role change requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoleChangeRequest'
 *       401:
 *         description: Unauthorized
 */
router.get('/my',
  authenticate,
  authorize('tourist'),
  roleChangeController.getMyRoleChangeRequests
);

/**
 * @swagger
 * /api/role-change-requests/{id}:
 *   get:
 *     summary: Get role change request by ID (System Admin only)
 *     tags: [Role Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role change request ID
 *     responses:
 *       200:
 *         description: Role change request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 request:
 *                   $ref: '#/components/schemas/RoleChangeRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role change request not found
 */
router.get('/:id',
  authenticate,
  authorize('system_admin'),
  roleChangeController.getRoleChangeRequestById
);

/**
 * @swagger
 * /api/role-change-requests/{id}/process:
 *   put:
 *     summary: Process role change request (System Admin only)
 *     tags: [Role Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role change request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               admin_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role change request processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 request:
 *                   $ref: '#/components/schemas/RoleChangeRequest'
 *       400:
 *         description: Request already processed or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role change request not found
 */
router.put('/:id/process',
  authenticate,
  authorize('system_admin'),
  validate(schemas.roleChangeDecision),
  roleChangeController.processRoleChangeRequest
);

/**
 * @swagger
 * /api/role-change-requests/{id}/cancel:
 *   delete:
 *     summary: Cancel role change request (Tourist only)
 *     tags: [Role Change Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role change request ID
 *     responses:
 *       200:
 *         description: Role change request cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Pending role change request not found
 */
router.delete('/:id/cancel',
  authenticate,
  authorize('tourist'),
  roleChangeController.cancelRoleChangeRequest
);

module.exports = router;