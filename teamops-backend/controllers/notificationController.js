const { Notification, formatNotification } = require('../models');

exports.getNotifications = async (req, res) => {
    try {
        const result = await Notification.find({ user: req.userId }).sort({ is_important: -1, is_read: 1, createdAt: -1 }).lean();
        res.json(result.map(formatNotification));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user: req.userId, is_read: false });
        res.json({ unread_count: count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            { $set: { is_read: true } },
            { returnDocument: 'after' }
        ).lean();

        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        res.json(formatNotification(notification));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.toggleNotificationImportant = async (req, res) => {
    try {
        const notification = await Notification.findOne({ _id: req.params.id, user: req.userId }).lean();

        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        const updatedNotification = await Notification.findByIdAndUpdate(
            notification._id,
            { $set: { is_important: !notification.is_important } },
            { returnDocument: 'after' }
        ).lean();

        res.json(formatNotification(updatedNotification));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.readAllNotifications = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.userId }, { $set: { is_read: true } });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
