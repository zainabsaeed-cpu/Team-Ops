const { Workspace, Column, Card, Activity, User, formatColumn, formatCard, formatActivityLog } = require('../models');

// ── HELPER: Check if user has permission in workspace ──
const checkWorkspaceAccess = async (userId, workspaceId, requiredRole = 'member') => {
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) return { allowed: false, error: 'Workspace not found' };

    const member = workspace.members.find(m => m.user.toString() === userId);
    if (!member) return { allowed: false, error: 'Not a member of this workspace' };

    // Role hierarchy: owner > admin > member
    const roleHierarchy = { owner: 3, admin: 2, member: 1 };
    const userRoleLevel = roleHierarchy[member.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 1;

    if (userRoleLevel < requiredLevel) {
        return { allowed: false, error: `Requires ${requiredRole} role` };
    }

    return { allowed: true, member };
};

exports.getBoardData = async (req, res) => {
    const { boardId } = req.params; // boardId is workspaceId
    try {
        // Check access
        const access = await checkWorkspaceAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const workspace = await Workspace.findById(boardId).lean();
        if (!workspace) {
            return res.status(404).json({ error: 'Board not found' });
        }

        const columnsResult = await Column.find({ workspace: boardId }).sort({ position: 1 }).lean();

        const columns = await Promise.all(columnsResult.map(async (col) => {
            const cardsResult = await Card.find({ column: col._id }).sort({ position: 1 }).populate('assignee', 'name email').lean();
            return { ...formatColumn(col), cards: cardsResult.map(formatCard) };
        }));

        const activitiesResult = await Activity.find({ workspace: boardId }).sort({ createdAt: -1 }).limit(50).populate('user', 'name').lean();

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

exports.createCard = async (req, res) => {
    const { boardId } = req.params;
    const { columnId, title, description, priority, assigneeId, dueDate } = req.body;

    try {
        // Validate required fields
        if (!title || !columnId) {
            return res.status(400).json({ error: 'Title and columnId are required' });
        }

        // Check access (members can create cards)
        const access = await checkWorkspaceAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        // Verify column belongs to this workspace
        const column = await Column.findById(columnId).lean();
        if (!column || column.workspace.toString() !== boardId) {
            return res.status(400).json({ error: 'Invalid column' });
        }

        // Verify assignee if provided
        if (assigneeId) {
            const assignee = await User.findById(assigneeId).lean();
            if (!assignee) return res.status(400).json({ error: 'Invalid assignee' });
        }

        // Get max position in column
        const maxCard = await Card.findOne({ column: columnId }).sort({ position: -1 }).lean();
        const position = (maxCard?.position || 0) + 1;

        // Create card
        const card = await Card.create({
            column: columnId,
            title: title.trim(),
            description: description?.trim() || '',
            priority: priority || 'medium',
            assignee: assigneeId || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            position,
        });

        // Log activity
        const user = await User.findById(req.userId).lean();
        await Activity.create({
            workspace: boardId,
            user: req.userId,
            action: `${user?.name || 'A user'} created card "${title}"`,
        });

        // Populate assignee
        const populatedCard = await Card.findById(card._id).populate('assignee', 'name email');

        res.status(201).json({ card: formatCard(populatedCard) });
    } catch (err) {
        console.error('Create card error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateCard = async (req, res) => {
    const { boardId, cardId } = req.params;
    const { title, description, priority, assigneeId, dueDate, status } = req.body;

    try {
        // Check access
        const access = await checkWorkspaceAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        // Verify column belongs to this workspace
        const column = await Column.findById(card.column).lean();
        if (!column || column.workspace.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update fields
        if (title !== undefined) card.title = title.trim();
        if (description !== undefined) card.description = description.trim();
        if (priority !== undefined) card.priority = priority;
        if (dueDate !== undefined) card.dueDate = dueDate ? new Date(dueDate) : null;
        if (assigneeId !== undefined) card.assignee = assigneeId || null;

        await card.save();

        // Log activity
        const user = await User.findById(req.userId).lean();
        await Activity.create({
            workspace: boardId,
            user: req.userId,
            action: `${user?.name || 'A user'} updated "${card.title}"`,
        });

        const populatedCard = await Card.findById(cardId).populate('assignee', 'name email');
        res.json({ card: formatCard(populatedCard) });
    } catch (err) {
        console.error('Update card error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteCard = async (req, res) => {
    const { boardId, cardId } = req.params;

    try {
        // Check access (admins+ can delete)
        const access = await checkWorkspaceAccess(req.userId, boardId, 'admin');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        // Verify column belongs to this workspace
        const column = await Column.findById(card.column).lean();
        if (!column || column.workspace.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const cardTitle = card.title;
        await Card.deleteOne({ _id: cardId });

        // Log activity
        const user = await User.findById(req.userId).lean();
        await Activity.create({
            workspace: boardId,
            user: req.userId,
            action: `${user?.name || 'A user'} deleted card "${cardTitle}"`,
        });

        res.json({ message: 'Card deleted' });
    } catch (err) {
        console.error('Delete card error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.moveCard = async (req, res) => {
    const { boardId, cardId } = req.params;
    const { toColumnId, newIndex } = req.body;

    try {
        // Check access
        const access = await checkWorkspaceAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        // Verify both columns belong to this workspace
        const fromColumn = await Column.findById(card.column).lean();
        const toColumn = await Column.findById(toColumnId).lean();

        if (!fromColumn || fromColumn.workspace.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        if (!toColumn || toColumn.workspace.toString() !== boardId) {
            return res.status(403).json({ error: 'Invalid destination column' });
        }

        card.column = toColumnId;
        card.position = newIndex || 0;
        await card.save();

        // Log activity
        const user = await User.findById(req.userId).lean();
        await Activity.create({
            workspace: boardId,
            user: req.userId,
            action: `${user?.name || 'A user'} moved "${card.title}" to ${toColumn.title}`,
        });

        res.json({ message: 'Card moved successfully' });
    } catch (err) {
        console.error('Move card error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
