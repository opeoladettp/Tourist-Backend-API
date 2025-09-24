const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email templates
const emailTemplates = {
  registrationSubmitted: (providerName, tourName, touristName) => ({
    subject: `New Registration for ${tourName}`,
    html: `
      <h2>New Tour Registration</h2>
      <p>Dear ${providerName},</p>
      <p>A new registration has been submitted for your tour: <strong>${tourName}</strong></p>
      <p>Tourist: ${touristName}</p>
      <p>Please log in to your dashboard to review and approve/reject this registration.</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  registrationStatusUpdate: (touristName, tourName, status) => ({
    subject: `Registration ${status.charAt(0).toUpperCase() + status.slice(1)} - ${tourName}`,
    html: `
      <h2>Registration Status Update</h2>
      <p>Dear ${touristName},</p>
      <p>Your registration for <strong>${tourName}</strong> has been <strong>${status}</strong>.</p>
      ${status === 'approved' ? '<p>Welcome aboard! You will receive further details soon.</p>' : ''}
      ${status === 'rejected' ? '<p>Unfortunately, your registration was not approved. You may try registering for other tours.</p>' : ''}
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  documentUploaded: (recipientName, documentName, fileName, uploaderName) => ({
    subject: `Document Uploaded - ${documentName}`,
    html: `
      <h2>Document Upload Notification</h2>
      <p>Dear ${recipientName},</p>
      <p>A new document has been uploaded:</p>
      <ul>
        <li><strong>Document:</strong> ${documentName}</li>
        <li><strong>File:</strong> ${fileName}</li>
        <li><strong>Uploaded by:</strong> ${uploaderName}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>Please log in to your dashboard to view the document.</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  roleChangeRequest: (providerName, touristName, touristEmail, message) => ({
    subject: `Role Change Request from ${touristName}`,
    html: `
      <h2>Role Change Request</h2>
      <p>Dear ${providerName},</p>
      <p>A tourist has requested to become a Provider Administrator for your company:</p>
      <ul>
        <li><strong>Name:</strong> ${touristName}</li>
        <li><strong>Email:</strong> ${touristEmail}</li>
        <li><strong>Message:</strong> ${message || 'No message provided'}</li>
      </ul>
      <p>Please log in to your dashboard to review and approve/reject this request.</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  roleChangeDecision: (touristName, providerName, status, adminNotes) => ({
    subject: `Role Change Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    html: `
      <h2>Role Change Request Update</h2>
      <p>Dear ${touristName},</p>
      <p>Your request to become a Provider Administrator for <strong>${providerName}</strong> has been <strong>${status}</strong>.</p>
      ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
      ${status === 'approved' ? '<p>Welcome to the team! You now have provider administrator access.</p>' : ''}
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  newProviderApplication: (providerName, touristName, touristEmail, message) => ({
    subject: `New Provider Application from ${touristName}`,
    html: `
      <h2>New Provider Application</h2>
      <p>Dear System Administrator,</p>
      <p>A tourist has applied to become a new provider on the platform:</p>
      <ul>
        <li><strong>Applicant Name:</strong> ${touristName}</li>
        <li><strong>Applicant Email:</strong> ${touristEmail}</li>
        <li><strong>Proposed Company Name:</strong> ${providerName}</li>
        <li><strong>Message:</strong> ${message || 'No message provided'}</li>
      </ul>
      <p>Please log in to your admin dashboard to review the full application details and approve/reject this request.</p>
      <p>Best regards,<br>Tourlicity System</p>
    `
  }),

  qrCodeGenerated: (adminName, tourName, qrCodeUrl, tourType) => ({
    subject: `QR Code Generated for ${tourName}`,
    html: `
      <h2>QR Code Generated</h2>
      <p>Dear ${adminName},</p>
      <p>A QR code has been generated for your ${tourType} tour: <strong>${tourName}</strong></p>
      <div style="text-align: center; margin: 20px 0;">
        <img src="${qrCodeUrl}" alt="Tour QR Code" style="max-width: 300px; border: 1px solid #ddd; padding: 10px;">
      </div>
      <p>You can use this QR code to:</p>
      <ul>
        <li>Share tour information quickly</li>
        <li>Allow easy tour registration</li>
        <li>Print for marketing materials</li>
      </ul>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  tourQRCode: (touristName, tourName, joinCode, qrCodeUrl, joinQrCodeUrl, startDate, endDate) => ({
    subject: `Your QR Code for ${tourName}`,
    html: `
      <h2>Your Tour QR Code</h2>
      <p>Dear ${touristName},</p>
      <p>Here are your QR codes for the tour: <strong>${tourName}</strong></p>
      
      <div style="margin: 20px 0;">
        <h3>Tour Information QR Code:</h3>
        <div style="text-align: center; margin: 10px 0;">
          <img src="${qrCodeUrl}" alt="Tour QR Code" style="max-width: 250px; border: 1px solid #ddd; padding: 10px;">
        </div>
      </div>

      ${joinQrCodeUrl ? `
      <div style="margin: 20px 0;">
        <h3>Quick Join QR Code:</h3>
        <div style="text-align: center; margin: 10px 0;">
          <img src="${joinQrCodeUrl}" alt="Join QR Code" style="max-width: 250px; border: 1px solid #ddd; padding: 10px;">
        </div>
      </div>
      ` : ''}

      <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Tour Details:</h3>
        <ul>
          <li><strong>Tour Name:</strong> ${tourName}</li>
          <li><strong>Join Code:</strong> ${joinCode}</li>
          <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
        </ul>
      </div>

      <p>Save these QR codes to your device for easy access during your tour!</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  tourUpdateNotification: (touristName, tourName, changes, qrCodeUrl, startDate, endDate) => ({
    subject: `Tour Update: ${tourName}`,
    html: `
      <h2>Tour Update Notification</h2>
      <p>Dear ${touristName},</p>
      <p>Your tour <strong>${tourName}</strong> has been updated.</p>
      
      <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
        <h3>Changes Made:</h3>
        <p>${changes}</p>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <h3>Updated QR Code:</h3>
        <img src="${qrCodeUrl}" alt="Updated Tour QR Code" style="max-width: 250px; border: 1px solid #ddd; padding: 10px;">
      </div>

      <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Current Tour Details:</h3>
        <ul>
          <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
        </ul>
      </div>

      <p>Please save the updated QR code for your records.</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  tourUpdateAdminNotification: (adminName, tourName, changes, touristCount, qrCodeUrl) => ({
    subject: `Tour Updated: ${tourName}`,
    html: `
      <h2>Tour Update Confirmation</h2>
      <p>Dear ${adminName},</p>
      <p>Your tour <strong>${tourName}</strong> has been successfully updated.</p>
      
      <div style="background-color: #d4edda; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745;">
        <h3>Changes Made:</h3>
        <p>${changes}</p>
      </div>

      <p><strong>Notifications sent to:</strong> ${touristCount} registered tourists</p>

      <div style="text-align: center; margin: 20px 0;">
        <h3>Updated QR Code:</h3>
        <img src="${qrCodeUrl}" alt="Updated Tour QR Code" style="max-width: 250px; border: 1px solid #ddd; padding: 10px;">
      </div>

      <p>All registered tourists have been notified of the changes and provided with the updated QR code.</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  sharedQRCode: (senderEmail, tourName, joinCode, qrCodeUrl, message, startDate, endDate) => ({
    subject: `${senderEmail} shared a tour with you: ${tourName}`,
    html: `
      <h2>Tour Shared With You</h2>
      <p>Hello!</p>
      <p><strong>${senderEmail}</strong> has shared a tour with you: <strong>${tourName}</strong></p>
      
      ${message ? `
      <div style="background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #2196f3;">
        <h3>Personal Message:</h3>
        <p><em>"${message}"</em></p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 20px 0;">
        <h3>Tour QR Code:</h3>
        <img src="${qrCodeUrl}" alt="Tour QR Code" style="max-width: 250px; border: 1px solid #ddd; padding: 10px;">
      </div>

      <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Tour Details:</h3>
        <ul>
          <li><strong>Tour Name:</strong> ${tourName}</li>
          <li><strong>Join Code:</strong> ${joinCode}</li>
          <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
        </ul>
      </div>

      <p>Scan the QR code or use the join code to learn more about this tour!</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  bulkQRCodeShare: (senderName, tourName, joinCode, qrCodeUrl, startDate, endDate) => ({
    subject: `${senderName} invited you to join: ${tourName}`,
    html: `
      <h2>Tour Invitation</h2>
      <p>Hello!</p>
      <p><strong>${senderName}</strong> has invited you to join an exciting tour: <strong>${tourName}</strong></p>

      <div style="text-align: center; margin: 20px 0;">
        <h3>Tour QR Code:</h3>
        <img src="${qrCodeUrl}" alt="Tour QR Code" style="max-width: 250px; border: 1px solid #ddd; padding: 10px;">
      </div>

      <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <h3>Tour Details:</h3>
        <ul>
          <li><strong>Tour Name:</strong> ${tourName}</li>
          <li><strong>Join Code:</strong> ${joinCode}</li>
          <li><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://tourlicity.com'}/join/${joinCode}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Join Tour Now
        </a>
      </div>

      <p>Scan the QR code or click the button above to join this amazing tour!</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  }),

  broadcastNotification: (touristName, tourName, message, tourId) => ({
    subject: `New Message - ${tourName}`,
    html: `
      <h2>New Tour Message</h2>
      <p>Dear ${touristName},</p>
      <p>You have received a new message for your tour: <strong>${tourName}</strong></p>
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
        <p style="margin: 0; font-style: italic;">"${message}"</p>
      </div>
      <p>This message was sent by your tour provider. Please check your tour details for any updates or instructions.</p>
      <p>Best regards,<br>Tourlicity Team</p>
    `
  })
};

// Send email function
const sendEmail = async (to, template, ...args) => {
  try {
    const emailContent = emailTemplates[template](...args);
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@tourlicity.com',
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${emailContent.subject}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendEmail, emailTemplates };