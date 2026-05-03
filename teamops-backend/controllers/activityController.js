const { Activity, Board, Workspace, formatActivityFeed } = require('../models');

exports.getBoardActivities = async (req, res) => {
    try {
        const { boardId } = req.params;
        const board = await Board.findById(boardId).lean();
        if (!board) return res.status(404).json({ error: 'Board not found' });

        const workspace = await Workspace.findOne({ _id: board.workspaceId, 'members.user': req.userId }).lean();
        if (!workspace) return res.status(403).json({ error: 'Not a member of this workspace' });

        const activities = await Activity.find({ $or: [{ boardId }, { board: boardId }] })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('user', 'name')
            .lean();
        res.json(activities.map(formatActivityFeed));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
};

exports.getActivityFeed = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const workspace = await Workspace.findOne({ _id: workspaceId, 'members.user': req.userId }).lean();
        if (!workspace) return res.status(403).json({ error: 'Not a member of this workspace' });

        const activities = await Activity.find({ workspace: workspaceId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('user', 'name')
            .lean();
        res.json(activities.map(formatActivityFeed));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
};
