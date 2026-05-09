const { Workspace, Board, Column, Card, Comment, Activity, User, formatBoard, formatColumn, formatCard, formatComment, formatActivityLog } = require('../models');
const { createActivity, createNotification, emitBoardEvent } = require('../utils/realtime');
const { filterActivitiesForRole } = require('../utils/activityVisibility');

const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const parseDateOnly = (input) => {
    if (!input) return null;
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const isDoneColumn = (title) => /done/i.test(title || '');
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const defaultBoardColors = ['#7c5cfc', '#14b8a6', '#ff4d6d', '#f59e0b', '#38bdf8', '#22c55e'];
const defaultColumns = ['To Do', 'In Progress', 'In Review', 'Done'];
const isImportantPriority = (priority) => ['high', 'urgent'].includes(String(priority || '').toLowerCase());

// ── HELPER: Check if user has permission in workspace ──
const checkWorkspaceAccess = async (userId, workspaceId, requiredRole = 'member') => {
    if (!workspaceId) return { allowed: false, error: 'Workspace ID is required' };
    
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) return { allowed: false, error: 'Workspace not found' };

    const member = (workspace.members || []).find((m) => String(m?.user?._id || m?.user || '') === String(userId));
    if (!member) return { allowed: false, error: 'Not a member of this workspace' };

    // Role hierarchy: owner > admin > member > viewer
    const roleHierarchy = { owner: 3, admin: 2, member: 1, viewer: 0 };
    const userRoleLevel = roleHierarchy[member.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] ?? 1;

    if (userRoleLevel < requiredLevel) {
        return { allowed: false, error: `Requires ${requiredRole} role` };
    }

    return { allowed: true, member };
};

const resolveBoardAccess = async (userId, boardId, requiredRole = 'member') => {
    if (!boardId) return { allowed: false, error: 'Board ID is required' };

    const board = await Board.findById(boardId).lean();
    if (!board) return { allowed: false, error: 'Board not found', status: 404 };

    const workspaceId = board.workspaceId?.toString();
    const access = await checkWorkspaceAccess(userId, workspaceId, requiredRole);
    if (!access.allowed) return { ...access, status: 403 };

    return { allowed: true, board, workspaceId, member: access.member };
};

const createDefaultColumns = async (workspaceId, boardId) => {
    const docs = defaultColumns.map((title, position) => ({
        workspace: workspaceId,
        board: boardId,
        title,
        position,
    }));

    return Column.insertMany(docs);
};

const ensureWorkspaceBoard = async (workspaceId) => {
    const existing = await Board.findOne({ workspaceId }).sort({ createdAt: 1 });
    if (existing) {
        await Column.updateMany({ workspace: workspaceId, board: { $in: [null, undefined] } }, { board: existing._id });
        return existing;
    }

    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) return null;

    const board = await Board.create({
        workspaceId,
        name: `${workspace.name} Board`,
        color: defaultBoardColors[0],
    });

    const legacyColumns = await Column.find({ workspace: workspaceId, board: { $in: [null, undefined] } }).lean();
    if (legacyColumns.length > 0) {
        await Column.updateMany({ workspace: workspaceId, board: { $in: [null, undefined] } }, { board: board._id });
    } else {
        await createDefaultColumns(workspaceId, board._id);
    }

    return board;
};

exports.getWorkspaceBoards = async (req, res) => {
    const { workspaceId } = req.params;

    try {
        const access = await checkWorkspaceAccess(req.userId, workspaceId, 'viewer');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        await ensureWorkspaceBoard(workspaceId);
        const boards = await Board.find({ workspaceId }).sort({ createdAt: 1 }).lean();
        res.json({ boards: boards.map(formatBoard) });
    } catch (err) {
        console.error('Get boards error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createBoard = async (req, res) => {
    const { workspaceId } = req.params;
    const { name, color } = req.body;

    try {
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Board name is required' });
        }

        const access = await checkWorkspaceAccess(req.userId, workspaceId, 'admin');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const normalizedName = String(name).trim();
        const board = await Board.create({
            workspaceId,
            name: normalizedName,
            color: defaultBoardColors.includes(color) ? color : defaultBoardColors[0],
        });

        await createDefaultColumns(workspaceId, board._id);

        const user = await User.findById(req.userId).lean();
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId,
            boardId: board._id,
            action: `${user?.name || 'A user'} created board "${normalizedName}"`,
        });

        res.status(201).json({ board: formatBoard(board) });
    } catch (err) {
        console.error('Create board error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateBoard = async (req, res) => {
    const { boardId } = req.params;
    const { name, color } = req.body;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'admin');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const updates = {};
        if (name !== undefined) {
            if (!String(name).trim()) return res.status(400).json({ error: 'Board name cannot be empty' });
            updates.name = String(name).trim();
        }
        if (color !== undefined) {
            updates.color = String(color || '').trim() || defaultBoardColors[0];
        }

        const board = await Board.findByIdAndUpdate(boardId, updates, { new: true });
        res.json({ board: formatBoard(board) });
    } catch (err) {
        console.error('Update board error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteBoard = async (req, res) => {
    const { boardId } = req.params;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'admin');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const columns = await Column.find({ board: boardId }).lean();
        const columnIds = columns.map((column) => column._id);
        const cardIds = (await Card.find({ column: { $in: columnIds } }).select('_id').lean()).map((card) => card._id);

        await Promise.all([
            Comment.deleteMany({ $or: [{ card: { $in: cardIds } }, { board: boardId }] }),
            Card.deleteMany({ column: { $in: columnIds } }),
            Column.deleteMany({ board: boardId }),
            Activity.deleteMany({ boardId }),
            Board.deleteOne({ _id: boardId }),
        ]);

        emitBoardEvent(req.app.get('io'), boardId, 'board:deleted', { boardId });
        res.json({ message: 'Board deleted' });
    } catch (err) {
        console.error('Delete board error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getBoardData = async (req, res) => {
    const { boardId } = req.params;
    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const workspace = await Workspace.findById(access.workspaceId).lean();
        if (!workspace) {
            return res.status(404).json({ error: 'Board not found' });
        }

        const columnsResult = await Column.find({ board: boardId }).sort({ position: 1 }).lean();

        const columns = await Promise.all(columnsResult.map(async (col) => {
            const cardsResult = await Card.find({ column: col._id }).sort({ position: 1 }).populate('assignee', 'name email avatarUrl').lean();
            
            // Get comment counts for all cards in this column
            const cardsWithComments = await Promise.all(
                cardsResult.map(async (card) => {
                    const commentCount = await Comment.countDocuments({ card: card._id });
                    return {
                        ...formatCard(card),
                        comment_count: commentCount
                    };
                })
            );
            
            return { ...formatColumn(col), cards: cardsWithComments };
        }));

        const activitiesResult = await Activity.find({ $or: [{ boardId }, { board: boardId }, { workspace: boardId }] }).sort({ createdAt: -1 }).limit(50).populate('user', 'name').lean();
        const visibleActivities = filterActivitiesForRole(activitiesResult, access.member?.role, req.userId);

        res.json({
            id: boardId,
            workspace_id: access.workspaceId,
            title: access.board.name,
            name: access.board.name,
            color: access.board.color || defaultBoardColors[0],
            columns,
            activityLogs: visibleActivities.map(formatActivityLog)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createColumn = async (req, res) => {
    const { boardId } = req.params;
    const { title } = req.body;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Column title is required' });
        }

        const normalizedTitle = title.trim();
        if (normalizedTitle.length < 2 || normalizedTitle.length > 40) {
            return res.status(400).json({ error: 'Column title must be 2 to 40 characters' });
        }

        const access = await resolveBoardAccess(req.userId, boardId, 'admin');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const existing = await Column.findOne({ board: boardId, title: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') }).lean();
        if (existing) {
            return res.status(400).json({ error: 'A column with this title already exists' });
        }

        const lastColumn = await Column.findOne({ board: boardId }).sort({ position: -1 }).lean();
        const nextPosition = (lastColumn?.position ?? -1) + 1;

        const column = await Column.create({
            workspace: access.workspaceId,
            board: boardId,
            title: normalizedTitle,
            position: nextPosition,
        });

        const user = await User.findById(req.userId).lean();
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} created column "${normalizedTitle}"`,
        });

        emitBoardEvent(req.app.get('io'), boardId, 'column:created', {
            boardId,
            actorId: req.userId,
            column: formatColumn(column),
        });

        res.status(201).json({ column: formatColumn(column) });
    } catch (err) {
        console.error('Create column error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateColumn = async (req, res) => {
    const { boardId, columnId } = req.params;
    const { title } = req.body;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Column title is required' });
        }

        const normalizedTitle = title.trim();
        if (normalizedTitle.length < 2 || normalizedTitle.length > 40) {
            return res.status(400).json({ error: 'Column title must be 2 to 40 characters' });
        }

        const access = await resolveBoardAccess(req.userId, boardId, 'admin');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const column = await Column.findById(columnId).lean();
        if (!column) return res.status(404).json({ error: 'Column not found' });
        if (column.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const existing = await Column.findOne({
            board: boardId,
            _id: { $ne: columnId },
            title: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i')
        }).lean();
        if (existing) {
            return res.status(400).json({ error: 'A column with this title already exists' });
        }

        const updatedColumn = await Column.findByIdAndUpdate(
            columnId,
            { title: normalizedTitle },
            { new: true }
        );

        const user = await User.findById(req.userId).lean();
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} renamed column "${column.title}" to "${normalizedTitle}"`,
        });

        res.json({ column: formatColumn(updatedColumn) });
    } catch (err) {
        console.error('Update column error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteColumn = async (req, res) => {
    const { boardId, columnId } = req.params;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        const access = await resolveBoardAccess(req.userId, boardId, 'admin');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const column = await Column.findById(columnId).lean();
        if (!column) return res.status(404).json({ error: 'Column not found' });
        if (column.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const cardIds = (await Card.find({ column: columnId }).select('_id').lean()).map((card) => card._id);
        await Promise.all([
            Comment.deleteMany({ card: { $in: cardIds } }),
            Card.deleteMany({ column: columnId }),
        ]);
        await Column.deleteOne({ _id: columnId });
        await Column.updateMany(
            { board: boardId, position: { $gt: column.position } },
            { $inc: { position: -1 } }
        );

        const user = await User.findById(req.userId).lean();
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} deleted column "${column.title}"`,
        });

        emitBoardEvent(req.app.get('io'), boardId, 'column:deleted', {
            boardId,
            actorId: req.userId,
            columnId,
        });

        res.json({ message: 'Column deleted' });
    } catch (err) {
        console.error('Delete column error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createCard = async (req, res) => {
    const { boardId } = req.params;
    const { columnId, title, description, priority, assigneeId, dueDate } = req.body;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        // Validate required fields
        if (!title || !columnId) {
            return res.status(400).json({ error: 'Title and columnId are required' });
        }

        // Check access (members can create cards)
        const access = await resolveBoardAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        // Verify column belongs to this board
        const column = await Column.findById(columnId).lean();
        if (!column || column.board?.toString() !== boardId) {
            return res.status(400).json({ error: 'Invalid column' });
        }

        // Verify assignee if provided
        if (assigneeId) {
            const assignee = await User.findById(assigneeId).lean();
            if (!assignee) return res.status(400).json({ error: 'Invalid assignee' });
        }

        const dueDateOnly = dueDate ? parseDateOnly(dueDate) : null;
        if (dueDate && !dueDateOnly) {
            return res.status(400).json({ error: 'Invalid due date format' });
        }

        const allowPastDate = isDoneColumn(column.title);
        if (dueDateOnly && dueDateOnly < startOfToday() && !allowPastDate) {
            return res.status(400).json({ error: 'Due date cannot be in the past unless the card is in Done' });
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
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} created card "${title}"`,
        });

        // Notify assignee if different from creator
        if (assigneeId && assigneeId !== req.userId) {
            await createNotification({
                io: req.app.get('io'),
                userId: assigneeId,
                message: `You were assigned to "${title}" by ${user?.name || 'Someone'}`,
                isImportant: isImportantPriority(priority),
            });
        }

        // Populate assignee
        const populatedCard = await Card.findById(card._id).populate('assignee', 'name email avatarUrl');

        emitBoardEvent(req.app.get('io'), boardId, 'card:created', {
            boardId,
            actorId: req.userId,
            card: formatCard(populatedCard),
        });

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
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        // Check access
        const access = await resolveBoardAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        // Verify column belongs to this board
        const column = await Column.findById(card.column).lean();
        if (!column || column.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update fields
        if (title !== undefined) card.title = title.trim();
        if (description !== undefined) card.description = description.trim();
        if (priority !== undefined) card.priority = priority;
        if (dueDate !== undefined) {
            if (!dueDate) {
                card.dueDate = null;
            } else {
                const dueDateOnly = parseDateOnly(dueDate);
                if (!dueDateOnly) {
                    return res.status(400).json({ error: 'Invalid due date format' });
                }

                const allowPastDate = isDoneColumn(column.title);
                const currentDueDateOnly = parseDateOnly(card.dueDate);
                const isSameHistoricalDate = currentDueDateOnly && currentDueDateOnly.getTime() === dueDateOnly.getTime();

                // Smart rule: past due dates are allowed for Done cards or when preserving an existing historical date.
                if (dueDateOnly < startOfToday() && !allowPastDate && !isSameHistoricalDate) {
                    return res.status(400).json({ error: 'Due date cannot be moved to the past for active cards' });
                }

                card.dueDate = new Date(dueDate);
            }
        }
        const previousAssignee = card.assignee?.toString();
        if (assigneeId !== undefined) card.assignee = assigneeId || null;

        await card.save();

        // Log activity
        const user = await User.findById(req.userId).lean();
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} updated "${card.title}"`,
        });

        // Notify new assignee if changed and different from updater
        const newAssignee = assigneeId && assigneeId !== previousAssignee ? assigneeId : null;
        if (newAssignee && newAssignee !== req.userId) {
            await createNotification({
                io: req.app.get('io'),
                userId: newAssignee,
                message: `You were assigned to "${card.title}" by ${user?.name || 'Someone'}`,
                isImportant: isImportantPriority(card.priority),
            });
        }

        const populatedCard = await Card.findById(cardId).populate('assignee', 'name email avatarUrl');
        emitBoardEvent(req.app.get('io'), boardId, 'card:updated', {
            boardId,
            actorId: req.userId,
            card: formatCard(populatedCard),
        });
        res.json({ card: formatCard(populatedCard) });
    } catch (err) {
        console.error('Update card error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteCard = async (req, res) => {
    const { boardId, cardId } = req.params;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        // Check access (members+ can delete cards)
        const access = await resolveBoardAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        // Verify column belongs to this board
        const column = await Column.findById(card.column).lean();
        if (!column || column.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const cardTitle = card.title;
        const columnId = card.column.toString();
        await Promise.all([
            Card.deleteOne({ _id: cardId }),
            Comment.deleteMany({ card: cardId }),
        ]);
        await Card.updateMany(
            { column: card.column, position: { $gt: card.position } },
            { $inc: { position: -1 } }
        );

        // Log activity
        const user = await User.findById(req.userId).lean();
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} deleted card "${cardTitle}"`,
        });

        emitBoardEvent(req.app.get('io'), boardId, 'card:deleted', {
            boardId,
            actorId: req.userId,
            cardId,
            columnId,
        });

        res.json({ message: 'Card deleted' });
    } catch (err) {
        console.error('Delete card error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getBoardCardIds = async (boardId) => {
    const columns = await Column.find({ board: boardId }).select('_id').lean();
    const columnIds = columns.map((column) => column._id);
    return Card.find({ column: { $in: columnIds } }).select('_id').lean();
};

const normalizeTaggedCardIds = async (boardId, taggedCards = []) => {
    const requestedIds = [...new Set((Array.isArray(taggedCards) ? taggedCards : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean))];
    if (!requestedIds.length) return [];

    const boardCards = await getBoardCardIds(boardId);
    const allowedIds = new Set(boardCards.map((card) => String(card._id)));
    return requestedIds.filter((id) => allowedIds.has(id));
};

const normalizeTaggedMemberIds = async (workspaceId, taggedMembers = []) => {
    const requestedIds = [...new Set((Array.isArray(taggedMembers) ? taggedMembers : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean))];
    if (!requestedIds.length) return [];

    const workspace = await Workspace.findById(workspaceId).select('members.user').lean();
    const allowedIds = new Set((workspace?.members || []).map((member) => String(member.user?._id || member.user || '')));
    return requestedIds.filter((id) => allowedIds.has(id));
};

exports.getBoardComments = async (req, res) => {
    const { boardId } = req.params;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const comments = await Comment.find({ board: boardId, card: null })
            .populate('user', 'name email _id')
            .populate('taggedCards', 'title')
            .populate('taggedMembers', 'name email _id')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ comments: comments.map(formatComment) });
    } catch (err) {
        console.error('Get board comments error:', err);
        res.status(500).json({ error: 'Failed to load board comments' });
    }
};

exports.addBoardComment = async (req, res) => {
    const { boardId } = req.params;
    const { content, taggedCards = [], taggedMembers = [] } = req.body;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const trimmed = String(content || '').trim();
        if (!trimmed) {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        const safeTaggedCards = await normalizeTaggedCardIds(boardId, taggedCards);
        const safeTaggedMembers = await normalizeTaggedMemberIds(access.workspaceId, taggedMembers);
        const comment = await Comment.create({
            board: boardId,
            card: null,
            user: req.userId,
            taggedCards: safeTaggedCards,
            taggedMembers: safeTaggedMembers,
            content: trimmed,
        });

        const populatedComment = await Comment.findById(comment._id)
            .populate('user', 'name email _id')
            .populate('taggedCards', 'title')
            .populate('taggedMembers', 'name email _id')
            .lean();
        const formattedComment = formatComment(populatedComment);
        const user = await User.findById(req.userId).lean();

        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} commented on board "${access.board.name}"`,
        });

        await Promise.all(safeTaggedMembers
            .filter((memberId) => String(memberId) !== String(req.userId))
            .map((memberId) => createNotification({
                io: req.app.get('io'),
                userId: memberId,
                message: `${user?.name || 'Someone'} mentioned you on board "${access.board.name}"`,
                isImportant: true,
            })));

        emitBoardEvent(req.app.get('io'), boardId, 'board:commented', {
            boardId,
            actorId: req.userId,
            comment: formattedComment,
        });

        res.status(201).json({ comment: formattedComment });
    } catch (err) {
        console.error('Add board comment error:', err);
        res.status(500).json({ error: 'Failed to post board comment' });
    }
};

exports.deleteBoardComment = async (req, res) => {
    const { boardId, commentId } = req.params;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const comment = await Comment.findOne({ _id: commentId, board: boardId, card: null });
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        if (String(comment.user) !== String(req.userId) && !['owner', 'admin'].includes(access.member.role)) {
            return res.status(403).json({ error: 'You can only delete your own comments' });
        }

        await Comment.deleteOne({ _id: commentId });
        emitBoardEvent(req.app.get('io'), boardId, 'board:comment:deleted', {
            boardId,
            commentId,
        });

        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error('Delete board comment error:', err);
        res.status(500).json({ error: 'Failed to delete board comment' });
    }
};

exports.getCardComments = async (req, res) => {
    const { boardId, cardId } = req.params;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const card = await Card.findById(cardId).lean();
        if (!card) return res.status(404).json({ error: 'Card not found' });

        const column = await Column.findById(card.column).lean();
        if (!column || column.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const comments = await Comment.find({ card: cardId })
            .sort({ createdAt: 1 })
            .populate('user', 'name')
            .lean();

        res.json({ comments: comments.map(formatComment) });
    } catch (err) {
        console.error('Get comments error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addCardComment = async (req, res) => {
    const { boardId, cardId } = req.params;
    const { content } = req.body;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        const trimmed = String(content || '').trim();
        if (!trimmed) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const card = await Card.findById(cardId).lean();
        if (!card) return res.status(404).json({ error: 'Card not found' });

        const column = await Column.findById(card.column).lean();
        if (!column || column.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const comment = await Comment.create({
            card: cardId,
            user: req.userId,
            content: trimmed,
        });

        const populatedComment = await Comment.findById(comment._id).populate('user', 'name').lean();
        const formattedComment = formatComment(populatedComment);

        const user = await User.findById(req.userId).lean();
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: `${user?.name || 'A user'} commented on "${card.title}"`,
        });

        emitBoardEvent(req.app.get('io'), boardId, 'card:commented', {
            boardId,
            actorId: req.userId,
            cardId,
            comment: formattedComment,
        });

        res.status(201).json({ comment: formattedComment });
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.moveCard = async (req, res) => {
    const { boardId, cardId } = req.params;
    const { toColumnId, newIndex } = req.body;

    try {
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        // Check access
        const access = await resolveBoardAccess(req.userId, boardId, 'member');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        // Verify both columns belong to this board
        const fromColumn = await Column.findById(card.column).lean();
        const toColumn = await Column.findById(toColumnId).lean();

        if (!fromColumn || fromColumn.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        if (!toColumn || toColumn.board?.toString() !== boardId) {
            return res.status(403).json({ error: 'Invalid destination column' });
        }

        const fromColumnId = card.column.toString();
        const targetIndex = Math.max(0, Number.isInteger(newIndex) ? newIndex : 0);
        const destinationCards = await Card.find({
            column: toColumnId,
            _id: { $ne: card._id },
        }).sort({ position: 1, createdAt: 1 });

        destinationCards.splice(targetIndex, 0, card);
        await Promise.all(destinationCards.map((item, index) => {
            item.column = toColumnId;
            item.position = index;
            return item.save();
        }));

        if (fromColumnId !== String(toColumnId)) {
            const sourceCards = await Card.find({ column: fromColumnId }).sort({ position: 1, createdAt: 1 });
            await Promise.all(sourceCards.map((item, index) => {
                item.position = index;
                return item.save();
            }));
        }

        card.column = toColumnId;
        card.position = targetIndex;
        await card.save();

        // Log activity
        const user = await User.findById(req.userId).lean();
        const activity = `${user?.name || 'A user'} moved "${card.title}" to ${toColumn.title}`;
        await createActivity({
            io: req.app.get('io'),
            userId: req.userId,
            workspaceId: access.workspaceId,
            boardId,
            action: activity,
        });

        // Notify previous assignee if different from actor
        try {
            if (card.assignee && card.assignee.toString() !== req.userId.toString()) {
                await createNotification({
                    io: req.app.get('io'),
                    userId: card.assignee,
                    message: `${user?.name || 'Someone'} moved your card "${card.title}"`,
                    isImportant: isImportantPriority(card.priority),
                });
            }
        } catch (e) {
            // ignore notification errors
        }

        const populatedCard = await Card.findById(cardId).populate('assignee', 'name email avatarUrl');
        emitBoardEvent(req.app.get('io'), boardId, 'card:moved', {
            boardId,
            actorId: req.userId,
            cardId: card._id.toString(),
            columnId: toColumn._id.toString(),
            newColumnId: toColumn._id.toString(),
            toColumnId: toColumn._id.toString(),
            position: card.position,
            card: formatCard(populatedCard),
            activity,
        });

        res.json({ message: 'Card moved successfully' });
    } catch (err) {
        console.error('Move card error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getBoardAnalytics = async (req, res) => {
    const { boardId } = req.params;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const columns = await Column.find({ board: boardId }).sort({ position: 1 }).lean();
        const columnIds = columns.map((column) => column._id);
        const cards = await Card.find({ column: { $in: columnIds } }).populate('assignee', 'name email avatarUrl').lean();
        const doneColumnIds = new Set(columns.filter((column) => isDoneColumn(column.title)).map((column) => column._id.toString()));

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const cardsPerColumn = columns.map((column) => ({
            columnId: column._id.toString(),
            columnTitle: column.title,
            count: cards.filter((card) => card.column.toString() === column._id.toString()).length,
        }));

        const completedThisWeek = cards.filter((card) => {
            const updatedAt = new Date(card.updatedAt || card.createdAt);
            return doneColumnIds.has(card.column.toString()) && updatedAt >= weekStart;
        }).length;

        const assigneeCounts = new Map();
        cards.forEach((card) => {
            const assigneeId = card.assignee?._id?.toString() || 'unassigned';
            const assigneeName = card.assignee?.name || 'Unassigned';
            const current = assigneeCounts.get(assigneeId) || { assigneeId, assigneeName, count: 0 };
            current.count += 1;
            assigneeCounts.set(assigneeId, current);
        });

        const overdueCardsCount = cards.filter((card) => {
            if (!card.dueDate || doneColumnIds.has(card.column.toString())) return false;
            return parseDateOnly(card.dueDate) < startOfToday();
        }).length;

        res.json({
            cardsPerColumn,
            completedThisWeek,
            cardsPerAssignee: Array.from(assigneeCounts.values()),
            overdueCardsCount,
        });
    } catch (err) {
        console.error('Board analytics error:', err);
        res.status(500).json({ error: 'Failed to load board analytics' });
    }
};

// ── COMMENT MANAGEMENT ──────────────────────────
exports.getCardComments = async (req, res) => {
    const { boardId, cardId } = req.params;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const card = await Card.findById(cardId).lean();
        if (!card) return res.status(404).json({ error: 'Card not found' });

        const comments = await Comment.find({ card: cardId })
            .populate('user', 'name email _id')
            .sort({ createdAt: -1 })
            .lean();

        const formattedComments = comments.map(comment => formatComment(comment));

        res.json({ comments: formattedComments });
    } catch (err) {
        console.error('Get comments error:', err);
        res.status(500).json({ error: 'Failed to load comments' });
    }
};

exports.addCardComment = async (req, res) => {
    const { boardId, cardId } = req.params;
    const { content } = req.body;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        if (!content || String(content).trim().length === 0) {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        const comment = new Comment({
            card: cardId,
            user: req.userId,
            content: String(content).trim(),
        });

        await comment.save();
        const populatedComment = await comment.populate('user', 'name email _id');

        // Emit real-time event
        emitBoardEvent(req.app.get('io'), boardId, 'card:commented', {
            boardId,
            cardId: cardId,
            comment: formatComment(populatedComment),
            userId: req.userId,
        });

        res.json({ comment: formatComment(populatedComment) });
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Failed to post comment' });
    }
};

exports.deleteCardComment = async (req, res) => {
    const { boardId, cardId, commentId } = req.params;

    try {
        const access = await resolveBoardAccess(req.userId, boardId, 'viewer');
        if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        // Only comment author can delete
        if (String(comment.user) !== String(req.userId)) {
            return res.status(403).json({ error: 'You can only delete your own comments' });
        }

        await Comment.deleteOne({ _id: commentId });

        // Emit real-time event
        emitBoardEvent(req.app.get('io'), boardId, 'comment:deleted', {
            boardId,
            cardId: cardId,
            commentId: commentId,
        });

        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};
