const mongoose = require('mongoose');

const calendarEntrySchema = new mongoose.Schema({
    tour_template_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TourTemplate'
    },
    custom_tour_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomTour'
    },
    entry_date: {
        type: Date,
        required: true
    },
    activity: {
        type: String,
        required: true
    },
    activity_description: String,
    activity_details: String,
    featured_image: {
        type: String, // URL to featured image in S3
        default: null
    },
    featured_image_uploaded_at: {
        type: Date,
        default: null
    },
    web_links: [String],
    start_time: String, // HH:MM format
    end_time: String,   // HH:MM format
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'updated_date' }
});

module.exports = mongoose.model('CalendarEntry', calendarEntrySchema);