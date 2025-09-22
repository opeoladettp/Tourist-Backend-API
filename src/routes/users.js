const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const userController = require('../controllers/userController');

// @route   GET /api/users
// @desc    Get all users (System Admin only)
// @access  Private (System Admin)
router.get('/', 
  authenticate,
  authorize('system_admin'),
  userController.getAllUsers
);

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', 
  authenticate,
  requireCompleteProfile,
  userController.getDashboardData
);

// @route   GET /api/users/:id
// @desc    Get user by ID (System Admin only)
// @access  Private (System Admin)
router.get('/:id', 
  authenticate,
  authorize('system_admin'),
  userController.getUserById
);

// @route   PUT /api/users/:id
// @desc    Update user (System Admin only)
// @access  Private (System Admin)
router.put('/:id', 
  authenticate,
  authorize('system_admin'),
  validate(schemas.userUpdate),
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete user (System Admin only)
// @access  Private (System Admin)
router.delete('/:id', 
  authenticate,
  authorize('system_admin'),
  userController.deleteUser
);

module.exports = router;