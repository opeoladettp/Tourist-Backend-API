const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireCompleteProfile } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const calendarController = require('../controllers/calendarController');

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

module.exports = router;