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