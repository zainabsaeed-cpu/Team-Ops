const { Workspace, Column, Card, Activity, User, formatColumn, formatCard, formatActivityLog } = require('../models');

exports.getBoardData = async (req, res) => {
    const { boardId } = req.params; // boardId is workspaceId
    try {
        const workspace = await Workspace.findById(boardId).lean();
        if (!workspace) {
            return res.status(404).json({ error: 'Board not found' });
        }

        const columnsResult = await Column.find({ workspace: boardId }).sort({ position: 1 }).lean();

        const columns = await Promise.all(columnsResult.map(async (col) => {
            const cardsResult = await Card.find({ column: col._id }).sort({ position: 1 }).lean();
            return { ...formatColumn(col), cards: cardsResult.map(formatCard) };
        }));

        const activitiesResult = await Activity.find({ workspace: boardId }).sort({ createdAt: -1 }).limit(50).lean();

        res.json({
            id: boardId,
            title: `${workspace.name} Board`,
            columns,
            activityLogs: activitiesResult.map(formatActivityLog)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.moveCard = async (req, res) => {
    const { boardId, cardId } = req.params;
    const { toColumnId, newIndex } = req.body;

    try {
        await Card.findByIdAndUpdate(cardId, {
            column: toColumnId,
            position: newIndex,
            updatedAt: new Date(),
        });

        const user = await User.findById(req.userId).lean();
        const card = await Card.findById(cardId).lean();
        
        const action = `${user?.name || 'A user'} moved card "${card?.title || 'Untitled'}"`;
        await Activity.create({ workspace: boardId, user: req.userId, action });

        res.json({ message: 'Card moved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
