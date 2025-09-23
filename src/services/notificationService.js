const { sendEmail, emailTemplates } = require('../utils/email');
const NotificationQueueService = require('./notificationQueueService');
const User = require('../models/User');
const Registration = require('../models/Registration');

class NotificationService {
  /**
   * Send QR code generated notification to provider admins
   * @param {Object} tour - Tour object
   * @param {string} qrCodeUrl - URL of generated QR code
   * @param {string} tourType - 'template' or 'custom'
   */
  static async notifyQRCodeGenerated(tour, qrCodeUrl, tourType = 'custom') {
    try {
      // Get provider admins
      const providerAdmins = await User.find({
        provider_id: tour.provider_id,
        user_type: 'provider_admin',
        is_active: true
      });

      const tourName = tour.tour_name || tour.template_name;
      
      for (const admin of providerAdmins) {
        // Queue email notification
        await NotificationQueueService.queueEmailTemplate(
          admin.email,
          'qrCodeGenerated',
          [admin.first_name, tourName, qrCodeUrl, tourType]
        );

        // Queue push notification
        await NotificationQueueService.queuePushNotification(
          admin._id.toString(),
          'QR Code Generated',
          `QR code has been generated for ${tourName}`,
          {
            data: { 
              type: 'qr_code_generated', 
              tourId: tour._id.toString(),
              tourType 
            }
          }
        );
      }

      console.log(`QR code generation notifications sent for ${tourType} tour: ${tour._id}`);
    } catch (error) {
      console.error('Error sending QR code generation notifications:', error);
    }
  }

  /**
   * Send QR code to registered tourists
   * @param {string} tourId - Tour ID
   * @param {string} qrCodeUrl - URL of QR code
   * @param {string} joinQrCodeUrl - URL of join QR code
   */
  static async sendQRCodeToTourists(tourId, qrCodeUrl, joinQrCodeUrl) {
    try {
      // Get all approved registrations for this tour
      const registrations = await Registration.find({
        custom_tour_id: tourId,
        status: 'approved'
      }).populate('tourist_id').populate('custom_tour_id');

      for (const registration of registrations) {
        const tourist = registration.tourist_id;
        const tour = registration.custom_tour_id;

        if (tourist && tourist.is_active) {
          // Queue email notification
          await NotificationQueueService.queueEmailTemplate(
            tourist.email,
            'tourQRCode',
            [tourist.first_name, tour.tour_name, tour.join_code, qrCodeUrl, joinQrCodeUrl, tour.start_date, tour.end_date]
          );

          // Queue push notification
          await NotificationQueueService.queuePushNotification(
            tourist._id.toString(),
            'Your Tour QR Code',
            `QR code for ${tour.tour_name} is ready!`,
            {
              data: { 
                type: 'tour_qr_code', 
                tourId: tourId,
                qrCodeUrl,
                joinQrCodeUrl 
              }
            }
          );
        }
      }

      console.log(`QR codes sent to tourists for tour: ${tourId}`);
    } catch (error) {
      console.error('Error sending QR codes to tourists:', error);
    }
  }

  /**
   * Send tour update notification with new QR code
   * @param {Object} tour - Updated tour object
   * @param {string} qrCodeUrl - URL of updated QR code
   * @param {Array} changes - Array of changed fields
   */
  static async notifyTourUpdate(tour, qrCodeUrl, changes = []) {
    try {
      // Get all approved registrations
      const registrations = await Registration.find({
        custom_tour_id: tour._id,
        status: 'approved'
      }).populate('tourist_id');

      // Get provider admins
      const providerAdmins = await User.find({
        provider_id: tour.provider_id,
        user_type: 'provider_admin',
        is_active: true
      });

      const changesList = changes.join(', ');

      // Notify tourists
      for (const registration of registrations) {
        const tourist = registration.tourist_id;
        if (tourist && tourist.is_active) {
          const emailData = emailTemplates.tourUpdateNotification(
            tourist.first_name,
            tour.tour_name,
            changesList,
            qrCodeUrl,
            tour.start_date,
            tour.end_date
          );

          await sendEmail(tourist.email, emailData.subject, emailData.html);
        }
      }

      // Notify provider admins
      for (const admin of providerAdmins) {
        const emailData = emailTemplates.tourUpdateAdminNotification(
          admin.first_name,
          tour.tour_name,
          changesList,
          registrations.length,
          qrCodeUrl
        );

        await sendEmail(admin.email, emailData.subject, emailData.html);
      }

      console.log(`Tour update notifications sent for tour: ${tour._id}`);
    } catch (error) {
      console.error('Error sending tour update notifications:', error);
    }
  }

  /**
   * Send QR code sharing notification
   * @param {string} senderEmail - Email of person sharing
   * @param {string} recipientEmail - Email of recipient
   * @param {Object} tour - Tour object
   * @param {string} qrCodeUrl - QR code URL
   * @param {string} message - Optional message
   */
  static async sendSharedQRCode(senderEmail, recipientEmail, tour, qrCodeUrl, message = '') {
    try {
      const emailData = emailTemplates.sharedQRCode(
        senderEmail,
        tour.tour_name,
        tour.join_code,
        qrCodeUrl,
        message,
        tour.start_date,
        tour.end_date
      );

      await sendEmail(recipientEmail, emailData.subject, emailData.html);
      console.log(`QR code shared from ${senderEmail} to ${recipientEmail} for tour: ${tour._id}`);
    } catch (error) {
      console.error('Error sending shared QR code:', error);
    }
  }

  /**
   * Send bulk QR code notifications to multiple recipients
   * @param {Array} recipients - Array of email addresses
   * @param {Object} tour - Tour object
   * @param {string} qrCodeUrl - QR code URL
   * @param {string} senderName - Name of sender
   */
  static async sendBulkQRCode(recipients, tour, qrCodeUrl, senderName) {
    try {
      const promises = recipients.map(email => {
        const emailData = emailTemplates.bulkQRCodeShare(
          senderName,
          tour.tour_name,
          tour.join_code,
          qrCodeUrl,
          tour.start_date,
          tour.end_date
        );

        return sendEmail(email, emailData.subject, emailData.html);
      });

      await Promise.all(promises);
      console.log(`Bulk QR codes sent to ${recipients.length} recipients for tour: ${tour._id}`);
    } catch (error) {
      console.error('Error sending bulk QR codes:', error);
    }
  }
}

module.exports = NotificationService;