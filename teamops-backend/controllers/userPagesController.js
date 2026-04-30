const { Workspace, User, Activity } = require('../models');

exports.getAnalytics = async (req, res) => {
    // Return static metrics as requested
    res.json({
        metrics: [
            { label: 'Completed Tasks', value: 24 },
            { label: 'Pending Tasks', value: 12 },
            { label: 'Efficiency', value: '88%' }
        ],
        trend: [5, 10, 8, 15, 12, 20]
    });
};

exports.getActivityFeed = async (req, res) => {
    try {
        const workspaces = await Workspace.find({ 'members.user': req.userId }).lean();
        const workspaceIds = workspaces.map((workspace) => workspace._id);
        const result = await Activity.find({ workspace: { $in: workspaceIds } }).sort({ createdAt: -1 }).limit(20).lean();
        res.json(result.map((activity) => ({
            id: activity._id.toString(),
            message: activity.action,
            time: new Date(activity.createdAt).toLocaleString(),
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const workspaces = workspaceId
            ? await Workspace.find({ _id: workspaceId }).lean()
            : await Workspace.find({ 'members.user': req.userId }).lean();

        const memberRoles = new Map();
        workspaces.forEach((workspace) => {
            workspace.members.forEach((member) => {
                memberRoles.set(member.user.toString(), member.role);
            });
        });

        const users = await User.find({ _id: { $in: Array.from(memberRoles.keys()) } }).lean();
        const statuses = ['Online', 'Online', 'Away', 'Offline'];
        res.json(users.map((user, index) => ({
            id: user._id.toString(),
            name: user.name,
            role: memberRoles.get(user._id.toString()) || 'member',
            status: statuses[index % statuses.length],
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAchievements = (req, res) => {
    res.json([
        { id: 1, title: 'Early Bird', description: 'Complete a task before 9 AM', icon: '🌅' },
        { id: 2, title: 'Team Player', description: 'Collaborate on 5 tasks', icon: '🤝' }
    ]);
};

exports.getSchedule = (req, res) => {
    res.json([
        { id: 1, title: 'Daily Standup', time: '10:00 AM' },
        { id: 2, title: 'Product Review', time: '02:00 PM' }
    ]);
};

exports.getMessages = (req, res) => {
    res.json([
        { id: 1, from: 'Zainab', content: 'Hey, did you check the new designs?', time: '2 mins ago' },
        { id: 2, from: 'Ahmed', content: 'The PR is ready for review.', time: '1 hour ago' }
    ]);
};

exports.getSettings = async (req, res) => {
    // Mock settings as requested
    res.json({
        workspaceName: 'TeamOps Workspace',
        notifyEmail: true,
        notifyPush: true,
    });
};

exports.updateSettings = async (req, res) => {
    // For now, just return success
    res.json({
        workspaceName: req.body.workspaceName || 'TeamOps Workspace',
        notifyEmail: Boolean(req.body.notifyEmail),
        notifyPush: Boolean(req.body.notifyPush),
    });
};
