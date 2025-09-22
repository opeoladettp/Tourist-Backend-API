const TourTemplate = require('../models/TourTemplate');
const CalendarEntry = require('../models/CalendarEntry');
const { paginate, buildPaginationResponse, calculateDurationDays } = require('../utils/helpers');

// Get all tour templates
const getAllTourTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, is_active } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { template_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const templates = await TourTemplate.find(query)
      .populate('created_by', 'first_name last_name')
      .skip(skip)
      .limit(limitNum)
      .sort({ created_date: -1 });

    const total = await TourTemplate.countDocuments(query);

    res.json(buildPaginationResponse(templates, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tour templates' });
  }
};

// Get tour template by ID
const getTourTemplateById = async (req, res) => {
  try {
    const template = await TourTemplate.findById(req.params.id)
      .populate('created_by', 'first_name last_name');
    
    if (!template) {
      return res.status(404).json({ error: 'Tour template not found' });
    }

    // Get calendar entries for this template
    const calendarEntries = await CalendarEntry.find({ 
      tour_template_id: req.params.id 
    }).sort({ entry_date: 1, start_time: 1 });

    res.json({ 
      template,
      calendar_entries: calendarEntries
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tour template' });
  }
};

// Create new tour template (System Admin only)
const createTourTemplate = async (req, res) => {
  try {
    const templateData = req.body;
    templateData.created_by = req.user._id;

    // Calculate duration_days
    if (templateData.start_date && templateData.end_date) {
      templateData.duration_days = calculateDurationDays(
        templateData.start_date, 
        templateData.end_date
      );
    }

    const template = new TourTemplate(templateData);
    await template.save();

    res.status(201).json({
      message: 'Tour template created successfully',
      template
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create tour template' });
  }
};

// Update tour template (System Admin only)
const updateTourTemplate = async (req, res) => {
  try {
    const updates = req.body;

    // Recalculate duration_days if dates are updated
    if (updates.start_date || updates.end_date) {
      const template = await TourTemplate.findById(req.params.id);
      if (template) {
        const startDate = updates.start_date || template.start_date;
        const endDate = updates.end_date || template.end_date;
        updates.duration_days = calculateDurationDays(startDate, endDate);
      }
    }

    const template = await TourTemplate.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ error: 'Tour template not found' });
    }

    res.json({
      message: 'Tour template updated successfully',
      template
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update tour template' });
  }
};

// Toggle tour template status (System Admin only)
const toggleTemplateStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    
    const template = await TourTemplate.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: 'Tour template not found' });
    }

    res.json({
      message: `Tour template ${is_active ? 'activated' : 'deactivated'} successfully`,
      template
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template status' });
  }
};

// Delete tour template (System Admin only)
const deleteTourTemplate = async (req, res) => {
  try {
    const template = await TourTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Tour template not found' });
    }

    // Delete associated calendar entries
    await CalendarEntry.deleteMany({ tour_template_id: req.params.id });

    res.json({ message: 'Tour template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tour template' });
  }
};

// Get active templates for dropdown/selection
const getActiveTemplates = async (req, res) => {
  try {
    const templates = await TourTemplate.find({ is_active: true })
      .select('template_name start_date end_date duration_days')
      .sort({ template_name: 1 });

    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active templates' });
  }
};

module.exports = {
  getAllTourTemplates,
  getTourTemplateById,
  createTourTemplate,
  updateTourTemplate,
  toggleTemplateStatus,
  deleteTourTemplate,
  getActiveTemplates
};