const { Notification, formatNotification } = require('../models');

exports.getNotifications = async (req, res) => {
    try {
        const result = await Notification.find({ user: req.userId }).sort({ is_read: 1, createdAt: -1 }).lean();
        res.json(result.map(formatNotification));
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
            { new: true }
        ).lean();

        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        res.json(formatNotification(notification));
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
