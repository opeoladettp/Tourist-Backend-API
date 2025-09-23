const PushSubscription = require('../models/PushSubscription');
const NotificationQueueService = require('../services/notificationQueueService');
const User = require('../models/User');
const { paginate, buildPaginationResponse } = require('../utils/helpers');

// Subscribe to push notifications
const subscribeToPush = async (req, res) => {
  try {
    const { endpoint, keys, userAgent, deviceType, browser } = req.body;
    const userId = req.user._id;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ 
        error: 'Invalid subscription data. Endpoint and keys are required.' 
      });
    }

    // Check if subscription already exists
    const existingSubscription = await PushSubscription.findOne({ endpoint });
    
    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.user_id = userId;
      existingSubscription.p256dh_key = keys.p256dh;
      existingSubscription.auth_key = keys.auth;
      existingSubscription.user_agent = userAgent;
      existingSubscription.device_type = deviceType || 'unknown';
      existingSubscription.browser = browser;
      existingSubscription.is_active = true;
      existingSubscription.last_used = new Date();
      
      await existingSubscription.save();
      
      return res.json({
        message: 'Push subscription updated successfully',
        subscription_id: existingSubscription._id
      });
    }

    // Create new subscription
    const subscription = new PushSubscription({
      user_id: userId,
      endpoint,
      p256dh_key: keys.p256dh,
      auth_key: keys.auth,
      user_agent: userAgent,
      device_type: deviceType || 'unknown',
      browser: browser
    });

    await subscription.save();

    // Send welcome push notification
    await NotificationQueueService.queuePushNotification(
      userId.toString(),
      'Welcome to Tourlicity!',
      'You will now receive important updates about your tours.',
      {
        data: { type: 'welcome' },
        priority: 1
      }
    );

    res.status(201).json({
      message: 'Push subscription created successfully',
      subscription_id: subscription._id
    });
  } catch (error) {
    console.error('Subscribe to push error:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
};

// Unsubscribe from push notifications
const unsubscribeFromPush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user._id;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const subscription = await PushSubscription.findOne({ 
      endpoint, 
      user_id: userId 
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await subscription.markAsInactive();

    res.json({ message: 'Successfully unsubscribed from push notifications' });
  } catch (error) {
    console.error('Unsubscribe from push error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
};

// Get user's push subscriptions
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscriptions = await PushSubscription.find({ user_id: userId })
      .select('endpoint device_type browser is_active last_used created_at')
      .sort({ created_at: -1 });

    res.json({ subscriptions });
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

// Send test notification
const sendTestNotification = async (req, res) => {
  try {
    const { title = 'Test Notification', body = 'This is a test notification from Tourlicity!' } = req.body;
    const userId = req.user._id;

    // Queue both email and push notification
    const [emailJob, pushJob] = await Promise.all([
      NotificationQueueService.queueEmail(
        req.user.email,
        title,
        `<h2>${title}</h2><p>${body}</p><p>This is a test notification sent from your Tourlicity account.</p>`
      ),
      NotificationQueueService.queuePushNotification(
        userId.toString(),
        title,
        body,
        {
          data: { type: 'test' },
          priority: 1
        }
      )
    ]);

    res.json({
      message: 'Test notifications queued successfully',
      email_job_id: emailJob.id,
      push_job_id: pushJob.id
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};

// Send notification to specific user (Admin only)
const sendNotificationToUser = async (req, res) => {
  try {
    const { userId, title, body, type = 'admin', includeEmail = false } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ 
        error: 'userId, title, and body are required' 
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const jobs = [];

    // Queue push notification
    const pushJob = await NotificationQueueService.queuePushNotification(
      userId,
      title,
      body,
      {
        data: { type, sentBy: req.user._id.toString() },
        priority: 2
      }
    );
    jobs.push({ type: 'push', job_id: pushJob.id });

    // Queue email notification if requested
    if (includeEmail) {
      const emailJob = await NotificationQueueService.queueEmail(
        targetUser.email,
        title,
        `<h2>${title}</h2><p>${body}</p><p>Sent by: ${req.user.first_name} ${req.user.last_name}</p>`
      );
      jobs.push({ type: 'email', job_id: emailJob.id });
    }

    res.json({
      message: 'Notification queued successfully',
      recipient: {
        id: targetUser._id,
        name: `${targetUser.first_name} ${targetUser.last_name}`,
        email: targetUser.email
      },
      jobs
    });
  } catch (error) {
    console.error('Send notification to user error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

// Send bulk notification (Admin only)
const sendBulkNotification = async (req, res) => {
  try {
    const { 
      userIds, 
      userType, 
      title, 
      body, 
      type = 'bulk', 
      includeEmail = false,
      emailTemplate,
      emailTemplateData
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    let targetUsers = [];

    if (userIds && userIds.length > 0) {
      // Send to specific users
      targetUsers = await User.find({ 
        _id: { $in: userIds }, 
        is_active: true 
      });
    } else if (userType) {
      // Send to all users of specific type
      targetUsers = await User.find({ 
        user_type: userType, 
        is_active: true 
      });
    } else {
      return res.status(400).json({ 
        error: 'Either userIds or userType must be provided' 
      });
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: 'No valid users found' });
    }

    const jobs = [];

    // Queue push notifications
    const pushJobs = await NotificationQueueService.queueBulkPushNotification(
      targetUsers.map(u => u._id.toString()),
      title,
      body,
      {
        data: { type, sentBy: req.user._id.toString() },
        priority: 1
      }
    );
    jobs.push({ type: 'push', count: pushJobs.length });

    // Queue email notifications if requested
    if (includeEmail) {
      if (emailTemplate && emailTemplateData) {
        // Use email template
        const emailJobs = await Promise.all(
          targetUsers.map(user => 
            NotificationQueueService.queueEmailTemplate(
              user.email,
              emailTemplate,
              emailTemplateData
            )
          )
        );
        jobs.push({ type: 'email_template', count: emailJobs.length });
      } else {
        // Use direct content
        const emailJob = await NotificationQueueService.queueBulkEmail(
          targetUsers.map(u => u.email),
          title,
          `<h2>${title}</h2><p>${body}</p><p>Sent by: ${req.user.first_name} ${req.user.last_name}</p>`
        );
        jobs.push({ type: 'email', job_id: emailJob.id });
      }
    }

    res.json({
      message: 'Bulk notifications queued successfully',
      recipient_count: targetUsers.length,
      jobs
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
};

// Get notification queue statistics (Admin only)
const getQueueStats = async (req, res) => {
  try {
    const stats = await NotificationQueueService.getQueueStats();
    
    res.json({
      message: 'Queue statistics retrieved successfully',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
};

// Clean up notification queues (Admin only)
const cleanupQueues = async (req, res) => {
  try {
    await NotificationQueueService.cleanupQueues();
    
    res.json({ message: 'Queue cleanup completed successfully' });
  } catch (error) {
    console.error('Cleanup queues error:', error);
    res.status(500).json({ error: 'Failed to cleanup queues' });
  }
};

// Get all push subscriptions (Admin only)
const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, user_type, is_active } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    // Build query
    const query = {};
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    let subscriptions = await PushSubscription.find(query)
      .populate('user_id', 'first_name last_name email user_type')
      .skip(skip)
      .limit(limitNum)
      .sort({ created_at: -1 });

    // Filter by user type if specified
    if (user_type) {
      subscriptions = subscriptions.filter(sub => 
        sub.user_id && sub.user_id.user_type === user_type
      );
    }

    const total = await PushSubscription.countDocuments(query);

    res.json(buildPaginationResponse(subscriptions, total, page, limit));
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

// Get VAPID public key
const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(500).json({ 
        error: 'VAPID public key not configured' 
      });
    }

    res.json({ 
      publicKey,
      message: 'VAPID public key retrieved successfully'
    });
  } catch (error) {
    console.error('Get VAPID public key error:', error);
    res.status(500).json({ error: 'Failed to get VAPID public key' });
  }
};

module.exports = {
  subscribeToPush,
  unsubscribeFromPush,
  getUserSubscriptions,
  sendTestNotification,
  sendNotificationToUser,
  sendBulkNotification,
  getQueueStats,
  cleanupQueues,
  getAllSubscriptions,
  getVapidPublicKey
};