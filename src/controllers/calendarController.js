const CalendarEntry = require('../models/CalendarEntry');
const CustomTour = require('../models/CustomTour');
const TourTemplate = require('../models/TourTemplate');
const DefaultActivity = require('../models/DefaultActivity');
const ImageUploadService = require('../services/imageUploadService');
const { createTourUpdate } = require('../utils/helpers');

// Get calendar entries for tour template or custom tour
const getCalendarEntries = async (req, res) => {
  try {
    const { tour_template_id, custom_tour_id } = req.query;
    
    if (!tour_template_id && !custom_tour_id) {
      return res.status(400).json({ error: 'tour_template_id or custom_tour_id is required' });
    }

    const query = {};
    if (tour_template_id) query.tour_template_id = tour_template_id;
    if (custom_tour_id) query.custom_tour_id = custom_tour_id;

    // Check access permissions for custom tours
    if (custom_tour_id) {
      const tour = await CustomTour.findById(custom_tour_id);
      if (!tour) {
        return res.status(404).json({ error: 'Custom tour not found' });
      }

      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const entries = await CalendarEntry.find(query)
      .populate('created_by', 'first_name last_name')
      .sort({ entry_date: 1, start_time: 1 });

    res.json({ calendar_entries: entries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar entries' });
  }
};

// Get calendar entry by ID
const getCalendarEntryById = async (req, res) => {
  try {
    const entry = await CalendarEntry.findById(req.params.id)
      .populate('created_by', 'first_name last_name');
    
    if (!entry) {
      return res.status(404).json({ error: 'Calendar entry not found' });
    }

    // Check access permissions
    if (entry.custom_tour_id) {
      const tour = await CustomTour.findById(entry.custom_tour_id);
      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ calendar_entry: entry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar entry' });
  }
};

// Create calendar entry
const createCalendarEntry = async (req, res) => {
  try {
    const entryData = req.body;
    entryData.created_by = req.user._id;

    // Check access permissions for custom tours
    if (entryData.custom_tour_id) {
      const tour = await CustomTour.findById(entryData.custom_tour_id);
      if (!tour) {
        return res.status(400).json({ error: 'Custom tour not found' });
      }

      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const entry = new CalendarEntry(entryData);
    await entry.save();

    // Create tour update notification if this is for a custom tour
    if (entryData.custom_tour_id) {
      await createTourUpdate(
        entryData.custom_tour_id,
        'calendar_entry',
        `Added new activity: ${entryData.activity}`,
        req.user._id
      );
    }

    const populatedEntry = await CalendarEntry.findById(entry._id)
      .populate('created_by', 'first_name last_name');

    res.status(201).json({
      message: 'Calendar entry created successfully',
      calendar_entry: populatedEntry
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create calendar entry' });
  }
};

// Update calendar entry
const updateCalendarEntry = async (req, res) => {
  try {
    const entryId = req.params.id;
    const updates = req.body;

    const currentEntry = await CalendarEntry.findById(entryId);
    if (!currentEntry) {
      return res.status(404).json({ error: 'Calendar entry not found' });
    }

    // Check access permissions
    if (currentEntry.custom_tour_id) {
      const tour = await CustomTour.findById(currentEntry.custom_tour_id);
      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const entry = await CalendarEntry.findByIdAndUpdate(
      entryId,
      updates,
      { new: true, runValidators: true }
    ).populate('created_by', 'first_name last_name');

    // Create tour update notification if this is for a custom tour
    if (currentEntry.custom_tour_id) {
      await createTourUpdate(
        currentEntry.custom_tour_id,
        'calendar_entry',
        `Updated activity: ${entry.activity}`,
        req.user._id
      );
    }

    res.json({
      message: 'Calendar entry updated successfully',
      calendar_entry: entry
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update calendar entry' });
  }
};

// Delete calendar entry
const deleteCalendarEntry = async (req, res) => {
  try {
    const entryId = req.params.id;

    const entry = await CalendarEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Calendar entry not found' });
    }

    // Check access permissions
    if (entry.custom_tour_id) {
      const tour = await CustomTour.findById(entry.custom_tour_id);
      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await CalendarEntry.findByIdAndDelete(entryId);

    // Create tour update notification if this is for a custom tour
    if (entry.custom_tour_id) {
      await createTourUpdate(
        entry.custom_tour_id,
        'calendar_entry',
        `Removed activity: ${entry.activity}`,
        req.user._id
      );
    }

    res.json({ message: 'Calendar entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete calendar entry' });
  }
};

// Upload featured image for calendar entry
const uploadFeaturedImage = async (req, res) => {
  try {
    const entryId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate image
    const validation = ImageUploadService.validateImage(req.file);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid image file',
        details: validation.errors
      });
    }

    // Find calendar entry
    const entry = await CalendarEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Calendar entry not found' });
    }

    // Check permissions
    if (entry.custom_tour_id) {
      const tour = await CustomTour.findById(entry.custom_tour_id);
      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Delete old image if exists
    if (entry.featured_image) {
      await ImageUploadService.deleteImage(entry.featured_image);
    }

    // Update entry with new image URL (multer-s3 provides the location)
    entry.featured_image = req.file.location;
    entry.featured_image_uploaded_at = new Date();
    await entry.save();

    // Create tour update if this is for a custom tour
    if (entry.custom_tour_id) {
      await createTourUpdate(
        entry.custom_tour_id,
        req.user._id,
        'calendar_entry_updated',
        `Featured image added to activity: ${entry.activity}`
      );
    }

    res.json({
      message: 'Featured image uploaded successfully',
      featured_image: entry.featured_image,
      uploaded_at: entry.featured_image_uploaded_at
    });
  } catch (error) {
    console.error('Upload featured image error:', error);
    res.status(500).json({ error: 'Failed to upload featured image' });
  }
};

// Delete featured image for calendar entry
const deleteFeaturedImage = async (req, res) => {
  try {
    const entryId = req.params.id;

    // Find calendar entry
    const entry = await CalendarEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Calendar entry not found' });
    }

    // Check permissions
    if (entry.custom_tour_id) {
      const tour = await CustomTour.findById(entry.custom_tour_id);
      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (!entry.featured_image) {
      return res.status(400).json({ error: 'No featured image to delete' });
    }

    // Delete image from S3
    await ImageUploadService.deleteImage(entry.featured_image);

    // Update entry
    entry.featured_image = null;
    entry.featured_image_uploaded_at = null;
    await entry.save();

    // Create tour update if this is for a custom tour
    if (entry.custom_tour_id) {
      await createTourUpdate(
        entry.custom_tour_id,
        req.user._id,
        'calendar_entry_updated',
        `Featured image removed from activity: ${entry.activity}`
      );
    }

    res.json({ message: 'Featured image deleted successfully' });
  } catch (error) {
    console.error('Delete featured image error:', error);
    res.status(500).json({ error: 'Failed to delete featured image' });
  }
};

// Get presigned URL for direct upload
const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, contentType = 'image/jpeg' } = req.body;
    
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const presignedData = await ImageUploadService.generatePresignedUrl(
      'calendar-images',
      fileName,
      contentType
    );

    res.json({
      message: 'Presigned URL generated successfully',
      ...presignedData
    });
  } catch (error) {
    console.error('Get presigned URL error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
};

// Update calendar entry with presigned uploaded image
const updateWithPresignedImage = async (req, res) => {
  try {
    const entryId = req.params.id;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Find calendar entry
    const entry = await CalendarEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Calendar entry not found' });
    }

    // Check permissions
    if (entry.custom_tour_id) {
      const tour = await CustomTour.findById(entry.custom_tour_id);
      if (req.user.user_type === 'provider_admin' && 
          req.user.provider_id?.toString() !== tour.provider_id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Delete old image if exists
    if (entry.featured_image) {
      await ImageUploadService.deleteImage(entry.featured_image);
    }

    // Update entry
    entry.featured_image = imageUrl;
    entry.featured_image_uploaded_at = new Date();
    await entry.save();

    // Create tour update if this is for a custom tour
    if (entry.custom_tour_id) {
      await createTourUpdate(
        entry.custom_tour_id,
        req.user._id,
        'calendar_entry_updated',
        `Featured image updated for activity: ${entry.activity}`
      );
    }

    res.json({
      message: 'Featured image updated successfully',
      featured_image: entry.featured_image,
      uploaded_at: entry.featured_image_uploaded_at
    });
  } catch (error) {
    console.error('Update with presigned image error:', error);
    res.status(500).json({ error: 'Failed to update with presigned image' });
  }
};

// Get default activities for selection
const getDefaultActivities = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const query = { is_active: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { activity_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const activities = await DefaultActivity.find(query)
      .select('activity_name description typical_duration_hours category')
      .sort({ activity_name: 1 });

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch default activities' });
  }
};

module.exports = {
  getCalendarEntries,
  getCalendarEntryById,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  uploadFeaturedImage,
  deleteFeaturedImage,
  getPresignedUrl,
  updateWithPresignedImage,
  getDefaultActivities
};