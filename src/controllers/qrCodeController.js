const QRCodeService = require('../services/qrCodeService');
const NotificationService = require('../services/notificationService');
const CustomTour = require('../models/CustomTour');
const TourTemplate = require('../models/TourTemplate');

// Generate QR code for custom tour
const generateCustomTourQRCode = async (req, res) => {
  try {
    const tourId = req.params.id;
    const { generateJoinCode = false, notify = true } = req.body;

    const tour = await CustomTour.findById(tourId)
      .populate('provider_id', 'provider_name')
      .populate('tour_template_id', 'template_name');

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Check if user has permission (provider admin or system admin)
    if (req.user.user_type === 'provider_admin' && 
        tour.provider_id._id.toString() !== req.user.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate main QR code
    const qrCodeUrl = await QRCodeService.generateTourQRCode(tour, 'custom');
    
    // Generate join QR code if requested
    let joinQrCodeUrl = null;
    if (generateJoinCode) {
      joinQrCodeUrl = await QRCodeService.generateJoinQRCode(tour);
    }

    // Update tour with QR code URLs
    tour.qr_code_url = qrCodeUrl;
    tour.qr_code_generated_at = new Date();
    if (joinQrCodeUrl) {
      tour.join_qr_code_url = joinQrCodeUrl;
    }
    await tour.save();

    // Send notifications if requested
    if (notify) {
      await NotificationService.notifyQRCodeGenerated(tour, qrCodeUrl, 'custom');
      
      if (joinQrCodeUrl) {
        await NotificationService.sendQRCodeToTourists(tourId, qrCodeUrl, joinQrCodeUrl);
      }
    }

    res.json({
      message: 'QR code generated successfully',
      qr_code_url: qrCodeUrl,
      join_qr_code_url: joinQrCodeUrl,
      generated_at: tour.qr_code_generated_at
    });
  } catch (error) {
    console.error('Generate custom tour QR code error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

// Generate QR code for tour template
const generateTemplateQRCode = async (req, res) => {
  try {
    const templateId = req.params.id;
    const { notify = true } = req.body;

    const template = await TourTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Tour template not found' });
    }

    // Generate QR code
    const qrCodeUrl = await QRCodeService.generateTourQRCode(template, 'template');

    // Update template with QR code URL
    template.qr_code_url = qrCodeUrl;
    template.qr_code_generated_at = new Date();
    await template.save();

    // Send notifications if requested
    if (notify) {
      await NotificationService.notifyQRCodeGenerated(template, qrCodeUrl, 'template');
    }

    res.json({
      message: 'QR code generated successfully',
      qr_code_url: qrCodeUrl,
      generated_at: template.qr_code_generated_at
    });
  } catch (error) {
    console.error('Generate template QR code error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

// Regenerate QR code for custom tour
const regenerateCustomTourQRCode = async (req, res) => {
  try {
    const tourId = req.params.id;
    const { notify = true } = req.body;

    const tour = await CustomTour.findById(tourId)
      .populate('provider_id', 'provider_name')
      .populate('tour_template_id', 'template_name');

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Check permissions
    if (req.user.user_type === 'provider_admin' && 
        tour.provider_id._id.toString() !== req.user.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Regenerate QR codes
    const oldQrCodeUrl = tour.qr_code_url;
    const oldJoinQrCodeUrl = tour.join_qr_code_url;

    const newQrCodeUrl = await QRCodeService.regenerateQRCode(tour, oldQrCodeUrl, 'custom');
    
    let newJoinQrCodeUrl = null;
    if (oldJoinQrCodeUrl) {
      newJoinQrCodeUrl = await QRCodeService.regenerateQRCode(tour, oldJoinQrCodeUrl, 'custom');
    }

    // Update tour
    tour.qr_code_url = newQrCodeUrl;
    tour.qr_code_generated_at = new Date();
    if (newJoinQrCodeUrl) {
      tour.join_qr_code_url = newJoinQrCodeUrl;
    }
    await tour.save();

    // Send notifications
    if (notify) {
      await NotificationService.notifyTourUpdate(
        tour, 
        newQrCodeUrl, 
        ['QR code regenerated']
      );
    }

    res.json({
      message: 'QR code regenerated successfully',
      qr_code_url: newQrCodeUrl,
      join_qr_code_url: newJoinQrCodeUrl,
      generated_at: tour.qr_code_generated_at
    });
  } catch (error) {
    console.error('Regenerate QR code error:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
};

// Share QR code via email
const shareQRCode = async (req, res) => {
  try {
    const tourId = req.params.id;
    const { recipients, message = '', bulk = false } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients are required' });
    }

    const tour = await CustomTour.findById(tourId)
      .populate('provider_id', 'provider_name');

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    if (!tour.qr_code_url) {
      return res.status(400).json({ error: 'QR code not generated for this tour' });
    }

    // Check permissions
    if (req.user.user_type === 'provider_admin' && 
        tour.provider_id._id.toString() !== req.user.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const senderName = `${req.user.first_name} ${req.user.last_name}`;
    const senderEmail = req.user.email;

    if (bulk) {
      // Send to multiple recipients
      await NotificationService.sendBulkQRCode(recipients, tour, tour.qr_code_url, senderName);
    } else {
      // Send individual emails
      for (const recipient of recipients) {
        await NotificationService.sendSharedQRCode(
          senderEmail, 
          recipient, 
          tour, 
          tour.qr_code_url, 
          message
        );
      }
    }

    res.json({
      message: `QR code shared successfully to ${recipients.length} recipient(s)`,
      recipients_count: recipients.length
    });
  } catch (error) {
    console.error('Share QR code error:', error);
    res.status(500).json({ error: 'Failed to share QR code' });
  }
};

// Get QR code information
const getQRCodeInfo = async (req, res) => {
  try {
    const tourId = req.params.id;
    const { type = 'custom' } = req.query;

    let tour;
    if (type === 'template') {
      tour = await TourTemplate.findById(tourId);
    } else {
      tour = await CustomTour.findById(tourId)
        .populate('provider_id', 'provider_name');
    }

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Check permissions for custom tours
    if (type === 'custom' && req.user.user_type === 'provider_admin' && 
        tour.provider_id._id.toString() !== req.user.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const qrInfo = {
      has_qr_code: !!tour.qr_code_url,
      qr_code_url: tour.qr_code_url,
      generated_at: tour.qr_code_generated_at,
      tour_name: tour.tour_name || tour.template_name,
      tour_id: tour._id
    };

    if (type === 'custom') {
      qrInfo.has_join_qr_code = !!tour.join_qr_code_url;
      qrInfo.join_qr_code_url = tour.join_qr_code_url;
      qrInfo.join_code = tour.join_code;
    }

    res.json(qrInfo);
  } catch (error) {
    console.error('Get QR code info error:', error);
    res.status(500).json({ error: 'Failed to get QR code information' });
  }
};

// Delete QR code
const deleteQRCode = async (req, res) => {
  try {
    const tourId = req.params.id;
    const { type = 'custom' } = req.body;

    let tour;
    if (type === 'template') {
      tour = await TourTemplate.findById(tourId);
    } else {
      tour = await CustomTour.findById(tourId)
        .populate('provider_id', 'provider_name');
    }

    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Check permissions for custom tours
    if (type === 'custom' && req.user.user_type === 'provider_admin' && 
        tour.provider_id._id.toString() !== req.user.provider_id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete QR codes from S3
    const deletions = [];
    if (tour.qr_code_url) {
      deletions.push(QRCodeService.deleteQRCode(tour.qr_code_url));
    }
    if (tour.join_qr_code_url) {
      deletions.push(QRCodeService.deleteQRCode(tour.join_qr_code_url));
    }

    await Promise.all(deletions);

    // Update tour
    tour.qr_code_url = null;
    tour.qr_code_generated_at = null;
    if (tour.join_qr_code_url) {
      tour.join_qr_code_url = null;
    }
    await tour.save();

    res.json({ message: 'QR code deleted successfully' });
  } catch (error) {
    console.error('Delete QR code error:', error);
    res.status(500).json({ error: 'Failed to delete QR code' });
  }
};

module.exports = {
  generateCustomTourQRCode,
  generateTemplateQRCode,
  regenerateCustomTourQRCode,
  shareQRCode,
  getQRCodeInfo,
  deleteQRCode
};