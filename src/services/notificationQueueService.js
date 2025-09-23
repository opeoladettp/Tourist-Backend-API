const Queue = require('bull');
const { sendEmail, emailTemplates } = require('../utils/email');
const webpush = require('web-push');
const User = require('../models/User');
const PushSubscription = require('../models/PushSubscription');

// Configure web-push (only if VAPID keys are provided)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@tourlicity.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('VAPID keys configured for push notifications');
} else {
  console.log('VAPID keys not configured - push notifications will be disabled');
}

// Create notification queues with error handling
let emailQueue, pushQueue;

try {
  emailQueue = new Queue('email notifications', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    },
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50,      // Keep last 50 failed jobs
      attempts: 3,           // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });

  pushQueue = new Queue('push notifications', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });

  // Handle queue errors
  emailQueue.on('error', (error) => {
    console.error('Email queue error:', error);
  });

  pushQueue.on('error', (error) => {
    console.error('Push queue error:', error);
  });

} catch (error) {
  console.error('Failed to initialize notification queues:', error);
  console.log('Notification queues will be disabled. Redis connection required.');
}

class NotificationQueueService {
  /**
   * Initialize queue processors
   */
  static initializeQueues() {
    if (!emailQueue || !pushQueue) {
      console.log('Queues not available - skipping initialization');
      return;
    }
    // Email queue processor
    emailQueue.process('send-email', async (job) => {
      const { to, subject, html, template, templateData } = job.data;
      
      try {
        let emailContent;
        
        if (template && templateData) {
          // Use email template
          if (emailTemplates[template]) {
            emailContent = emailTemplates[template](...templateData);
            await sendEmail(to, emailContent.subject, emailContent.html);
          } else {
            throw new Error(`Email template '${template}' not found`);
          }
        } else {
          // Use direct content
          await sendEmail(to, subject, html);
        }
        
        console.log(`Email sent successfully to ${to}`);
        return { success: true, recipient: to };
      } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        throw error;
      }
    });

    // Push notification queue processor
    pushQueue.process('send-push', async (job) => {
      const { userId, title, body, data, icon, badge, actions } = job.data;
      
      try {
        // Get user's push subscriptions
        const subscriptions = await PushSubscription.find({ 
          user_id: userId, 
          is_active: true 
        });

        if (subscriptions.length === 0) {
          console.log(`No active push subscriptions found for user ${userId}`);
          return { success: true, sent: 0, reason: 'No subscriptions' };
        }

        const payload = JSON.stringify({
          title,
          body,
          icon: icon || '/icons/notification-icon.png',
          badge: badge || '/icons/badge-icon.png',
          data: data || {},
          actions: actions || [],
          timestamp: Date.now()
        });

        const promises = subscriptions.map(async (subscription) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh_key,
                  auth: subscription.auth_key
                }
              },
              payload
            );
            return { success: true, subscriptionId: subscription._id };
          } catch (error) {
            console.error(`Failed to send push to subscription ${subscription._id}:`, error);
            
            // If subscription is invalid, mark it as inactive
            if (error.statusCode === 410 || error.statusCode === 404) {
              await PushSubscription.findByIdAndUpdate(subscription._id, {
                is_active: false,
                last_error: error.message,
                updated_at: new Date()
              });
            }
            
            return { success: false, subscriptionId: subscription._id, error: error.message };
          }
        });

        const results = await Promise.all(promises);
        const successful = results.filter(r => r.success).length;
        
        console.log(`Push notifications sent: ${successful}/${subscriptions.length} for user ${userId}`);
        return { success: true, sent: successful, total: subscriptions.length };
      } catch (error) {
        console.error(`Failed to send push notifications to user ${userId}:`, error);
        throw error;
      }
    });

    // Bulk notification processor
    emailQueue.process('send-bulk-email', async (job) => {
      const { recipients, subject, html, template, templateData } = job.data;
      
      try {
        const promises = recipients.map(async (recipient) => {
          try {
            let emailContent;
            
            if (template && templateData) {
              if (emailTemplates[template]) {
                // Pass recipient-specific data if available
                const recipientData = Array.isArray(templateData) 
                  ? templateData 
                  : templateData[recipient] || templateData;
                emailContent = emailTemplates[template](...recipientData);
                await sendEmail(recipient, emailContent.subject, emailContent.html);
              } else {
                throw new Error(`Email template '${template}' not found`);
              }
            } else {
              await sendEmail(recipient, subject, html);
            }
            
            return { success: true, recipient };
          } catch (error) {
            console.error(`Failed to send bulk email to ${recipient}:`, error);
            return { success: false, recipient, error: error.message };
          }
        });

        const results = await Promise.all(promises);
        const successful = results.filter(r => r.success).length;
        
        console.log(`Bulk email sent: ${successful}/${recipients.length}`);
        return { success: true, sent: successful, total: recipients.length };
      } catch (error) {
        console.error('Failed to send bulk emails:', error);
        throw error;
      }
    });

    console.log('Notification queues initialized');
  }

  /**
   * Add email notification to queue
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @param {Object} options - Queue options
   */
  static async queueEmail(to, subject, html, options = {}) {
    try {
      if (!emailQueue) {
        console.log('Email queue not available, sending directly');
        await sendEmail(to, subject, html);
        return { id: 'direct-send' };
      }

      const job = await emailQueue.add('send-email', {
        to,
        subject,
        html
      }, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        attempts: options.attempts || 3
      });

      console.log(`Email queued for ${to}, job ID: ${job.id}`);
      return job;
    } catch (error) {
      console.error('Failed to queue email:', error);
      // Fallback to direct send
      try {
        await sendEmail(to, subject, html);
        return { id: 'fallback-send' };
      } catch (fallbackError) {
        console.error('Fallback email send failed:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * Add email notification using template to queue
   * @param {string} to - Recipient email
   * @param {string} template - Template name
   * @param {Array} templateData - Template data array
   * @param {Object} options - Queue options
   */
  static async queueEmailTemplate(to, template, templateData, options = {}) {
    try {
      const job = await emailQueue.add('send-email', {
        to,
        template,
        templateData
      }, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        attempts: options.attempts || 3
      });

      console.log(`Email template '${template}' queued for ${to}, job ID: ${job.id}`);
      return job;
    } catch (error) {
      console.error('Failed to queue email template:', error);
      throw error;
    }
  }

  /**
   * Add bulk email notification to queue
   * @param {Array} recipients - Array of recipient emails
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @param {Object} options - Queue options
   */
  static async queueBulkEmail(recipients, subject, html, options = {}) {
    try {
      const job = await emailQueue.add('send-bulk-email', {
        recipients,
        subject,
        html
      }, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        attempts: options.attempts || 2
      });

      console.log(`Bulk email queued for ${recipients.length} recipients, job ID: ${job.id}`);
      return job;
    } catch (error) {
      console.error('Failed to queue bulk email:', error);
      throw error;
    }
  }

  /**
   * Add bulk email using template to queue
   * @param {Array} recipients - Array of recipient emails
   * @param {string} template - Template name
   * @param {Object|Array} templateData - Template data
   * @param {Object} options - Queue options
   */
  static async queueBulkEmailTemplate(recipients, template, templateData, options = {}) {
    try {
      const job = await emailQueue.add('send-bulk-email', {
        recipients,
        template,
        templateData
      }, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        attempts: options.attempts || 2
      });

      console.log(`Bulk email template '${template}' queued for ${recipients.length} recipients, job ID: ${job.id}`);
      return job;
    } catch (error) {
      console.error('Failed to queue bulk email template:', error);
      throw error;
    }
  }

  /**
   * Add push notification to queue
   * @param {string} userId - User ID
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} options - Additional options
   */
  static async queuePushNotification(userId, title, body, options = {}) {
    try {
      if (!pushQueue) {
        console.log('Push queue not available, skipping push notification');
        return { id: 'no-queue' };
      }

      const job = await pushQueue.add('send-push', {
        userId,
        title,
        body,
        data: options.data || {},
        icon: options.icon,
        badge: options.badge,
        actions: options.actions || []
      }, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        attempts: options.attempts || 3
      });

      console.log(`Push notification queued for user ${userId}, job ID: ${job.id}`);
      return job;
    } catch (error) {
      console.error('Failed to queue push notification:', error);
      return { id: 'failed' };
    }
  }

  /**
   * Add bulk push notifications to queue
   * @param {Array} userIds - Array of user IDs
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} options - Additional options
   */
  static async queueBulkPushNotification(userIds, title, body, options = {}) {
    try {
      const promises = userIds.map(userId => 
        this.queuePushNotification(userId, title, body, options)
      );

      const jobs = await Promise.all(promises);
      console.log(`Bulk push notifications queued for ${userIds.length} users`);
      return jobs;
    } catch (error) {
      console.error('Failed to queue bulk push notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to all users with specific role
   * @param {string} userType - User type (tourist, provider_admin, system_admin)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} options - Additional options
   */
  static async queueNotificationByRole(userType, title, body, options = {}) {
    try {
      const users = await User.find({ 
        user_type: userType, 
        is_active: true 
      }).select('_id email');

      // Queue push notifications
      const pushJobs = await this.queueBulkPushNotification(
        users.map(u => u._id.toString()),
        title,
        body,
        options
      );

      // Queue email notifications if email template provided
      let emailJobs = [];
      if (options.emailTemplate && options.emailTemplateData) {
        emailJobs = await Promise.all(
          users.map(user => 
            this.queueEmailTemplate(
              user.email,
              options.emailTemplate,
              options.emailTemplateData,
              options
            )
          )
        );
      }

      console.log(`Role-based notifications queued for ${users.length} ${userType}s`);
      return { pushJobs, emailJobs, userCount: users.length };
    } catch (error) {
      console.error('Failed to queue role-based notifications:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    try {
      const [emailStats, pushStats] = await Promise.all([
        {
          waiting: await emailQueue.getWaiting(),
          active: await emailQueue.getActive(),
          completed: await emailQueue.getCompleted(),
          failed: await emailQueue.getFailed()
        },
        {
          waiting: await pushQueue.getWaiting(),
          active: await pushQueue.getActive(),
          completed: await pushQueue.getCompleted(),
          failed: await pushQueue.getFailed()
        }
      ]);

      return {
        email: {
          waiting: emailStats.waiting.length,
          active: emailStats.active.length,
          completed: emailStats.completed.length,
          failed: emailStats.failed.length
        },
        push: {
          waiting: pushStats.waiting.length,
          active: pushStats.active.length,
          completed: pushStats.completed.length,
          failed: pushStats.failed.length
        }
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old jobs
   */
  static async cleanupQueues() {
    try {
      await Promise.all([
        emailQueue.clean(24 * 60 * 60 * 1000, 'completed'), // Clean completed jobs older than 24 hours
        emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'), // Clean failed jobs older than 7 days
        pushQueue.clean(24 * 60 * 60 * 1000, 'completed'),
        pushQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed')
      ]);

      console.log('Queue cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup queues:', error);
    }
  }

  /**
   * Pause queues
   */
  static async pauseQueues() {
    await Promise.all([
      emailQueue.pause(),
      pushQueue.pause()
    ]);
    console.log('Notification queues paused');
  }

  /**
   * Resume queues
   */
  static async resumeQueues() {
    await Promise.all([
      emailQueue.resume(),
      pushQueue.resume()
    ]);
    console.log('Notification queues resumed');
  }

  /**
   * Close queues
   */
  static async closeQueues() {
    await Promise.all([
      emailQueue.close(),
      pushQueue.close()
    ]);
    console.log('Notification queues closed');
  }
}

module.exports = NotificationQueueService;