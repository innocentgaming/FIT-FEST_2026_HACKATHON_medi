const express = require('express');
const router = express.Router();
const { store } = require('../db/store');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get user's notifications (sorted newest first)
router.get('/', (req, res) => {
  const allNotifications = store.get('notifications') || [];
  const userNotifications = allNotifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  res.json({
    notifications: userNotifications,
    count: userNotifications.length,
    unreadCount
  });
});

// Get unread notification count
router.get('/unread-count', (req, res) => {
  const allNotifications = store.get('notifications') || [];
  const unreadCount = allNotifications.filter(
    (n) => n.userId === req.user.id && !n.read
  ).length;

  res.json({ unreadCount });
});

// Mark single notification as read
router.put('/:id/read', (req, res) => {
  const { id } = req.params;
  const notif = store.findById('notifications', id);

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  if (notif.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized: Cannot modify another user notification.' });
  }

  const updated = store.update('notifications', id, { read: true });
  res.json({ message: 'Notification marked as read.', notification: updated });
});

// Mark all user's notifications as read
router.put('/read-all', (req, res) => {
  const allNotifications = store.get('notifications') || [];
  let updatedCount = 0;

  allNotifications.forEach((n) => {
    if (n.userId === req.user.id && !n.read) {
      store.update('notifications', n.id, { read: true });
      updatedCount++;
    }
  });

  res.json({
    message: 'All notifications marked as read.',
    updatedCount
  });
});

module.exports = router;
