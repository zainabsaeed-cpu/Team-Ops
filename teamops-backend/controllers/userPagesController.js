const bcrypt = require('bcryptjs');
const { Workspace, Board, User, Activity, Column, Card, formatUser } = require('../models');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const workspaces = await Workspace.find({ 'members.user': req.userId }).sort({ createdAt: 1 }).lean();
        const workspacePayload = workspaces.map((workspace) => {
            const member = workspace.members.find((item) => item.user.toString() === req.userId.toString());
            return {
                id: workspace._id.toString(),
                name: workspace.name,
                role: member?.role || 'member',
            };
        });

        res.json({
            user: {
                ...formatUser(user),
                workspaces: workspacePayload,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, avatar } = req.body;
        const updates = {};

        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ error: 'Name cannot be empty' });
            }
            updates.name = String(name).trim();
        }

        if (avatar !== undefined) {
            updates.avatarUrl = avatar || null;
        }

        const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ user: formatUser(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

exports.getMyCards = async (req, res) => {
    try {
        const workspaces = await Workspace.find({ 'members.user': req.userId }).lean();
        const workspaceIds = workspaces.map((workspace) => workspace._id);
        const workspaceById = new Map(workspaces.map((workspace) => [workspace._id.toString(), workspace]));

        const boards = await Board.find({ workspaceId: { $in: workspaceIds } }).lean();
        const boardById = new Map(boards.map((board) => [board._id.toString(), board]));
        const columns = await Column.find({
            $or: [
                { board: { $in: boards.map((board) => board._id) } },
                { workspace: { $in: workspaceIds }, board: { $in: [null, undefined] } },
            ],
        }).lean();
        const columnById = new Map(columns.map((column) => [column._id.toString(), column]));

        const cards = await Card.find({ assignee: req.userId, column: { $in: columns.map((column) => column._id) } })
            .sort({ dueDate: 1, createdAt: 1 })
            .lean();

        const payload = cards.map((card) => {
            const column = columnById.get(card.column.toString());
            const board = column?.board ? boardById.get(column.board.toString()) : null;
            const workspace = workspaceById.get((board?.workspaceId || column?.workspace)?.toString());

            return {
                id: card._id.toString(),
                title: card.title,
                priority: card.priority,
                due_date: card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : null,
                board_id: board?._id?.toString() || column?.workspace?.toString(),
                board_name: board?.name || `${workspace?.name || 'Workspace'} Board`,
                workspace_id: workspace?._id?.toString() || '',
                workspace_name: workspace?.name || 'Workspace',
                column_id: column?._id?.toString() || '',
            };
        }).sort((left, right) => {
            if (!left.due_date && !right.due_date) return 0;
            if (!left.due_date) return 1;
            if (!right.due_date) return -1;
            return left.due_date.localeCompare(right.due_date);
        });

        res.json({ cards: payload });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load assigned cards' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const workspaces = await Workspace.find({ 'members.user': req.userId }).lean();
        const workspaceIds = workspaces.map((w) => w._id);

        const columns = await Column.find({ workspace: { $in: workspaceIds } }).lean();
        const doneColumnIds = new Set(
            columns.filter((c) => /done/i.test(c.title)).map((c) => c._id.toString())
        );

        const allCards = await Card.find({ column: { $in: columns.map((c) => c._id) } }).lean();
        const completedTasks = allCards.filter((c) => doneColumnIds.has(c.column.toString())).length;
        const pendingTasks = allCards.length - completedTasks;
        const efficiency = allCards.length > 0 ? Math.round((completedTasks / allCards.length) * 100) : 0;

        const now = new Date();
        const trend = [];
        for (let i = 5; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - (i * 7));
            weekEnd.setHours(23, 59, 59, 999);

            const count = allCards.filter((c) => {
                const created = new Date(c.createdAt);
                return created >= weekStart && created <= weekEnd && doneColumnIds.has(c.column.toString());
            }).length;

            trend.push({ sprint: `Week ${6 - i}`, done: count });
        }

        res.json({
            metrics: [
                { label: 'Completed Tasks', value: completedTasks, note: `across ${workspaces.length} workspace(s)` },
                { label: 'Pending Tasks', value: pendingTasks },
                { label: 'Efficiency', value: `${efficiency}%`, note: `${allCards.length} total tasks` },
            ],
            trend,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load analytics' });
    }
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
        res.json(users.map((user) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: memberRoles.get(user._id.toString()) || 'member',
            avatarUrl: user.avatarUrl || null,
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
    try {
        const { workspaceId } = req.query;
        const user = await User.findById(req.userId).lean();
        const workspace = workspaceId
            ? await Workspace.findOne({ _id: workspaceId, 'members.user': req.userId }).lean()
            : await Workspace.findOne({ 'members.user': req.userId }).sort({ createdAt: 1 }).lean();
        const member = workspace?.members?.find((item) => item.user.toString() === req.userId.toString());

        res.json({
            user: user ? formatUser(user) : null,
            workspaceId: workspace?._id?.toString() || '',
            workspaceName: workspace?.name || 'My Workspace',
            workspaceDescription: workspace?.description || '',
            techStack: workspace?.techStack || [],
            inviteCode: workspace?.inviteCode || '',
            inviteLink: workspace?.inviteCode ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?inviteCode=${encodeURIComponent(workspace.inviteCode)}` : '',
            currentUserRole: member?.role || 'member',
            notifyEmail: user?.notifyEmail !== false,
            notifyPush: user?.notifyPush !== false,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const {
            workspaceId,
            workspaceName,
            workspaceDescription,
            techStack,
            notifyEmail,
            notifyPush,
            displayName,
            avatarBase64,
        } = req.body;

        const userUpdates = {};
        if (notifyEmail !== undefined) userUpdates.notifyEmail = Boolean(notifyEmail);
        if (notifyPush !== undefined) userUpdates.notifyPush = Boolean(notifyPush);
        if (displayName && displayName.trim()) userUpdates.name = displayName.trim();
        if (avatarBase64 !== undefined) userUpdates.avatarUrl = avatarBase64 || null;

        if (Object.keys(userUpdates).length > 0) {
            await User.findByIdAndUpdate(req.userId, userUpdates);
        }

        const workspaceQuery = workspaceId
            ? { _id: workspaceId, 'members.user': req.userId }
            : { owner: req.userId };

        const workspace = await Workspace.findOne(workspaceQuery);
        if (workspace && (workspaceName !== undefined || workspaceDescription !== undefined || techStack !== undefined)) {
            const member = workspace.members.find((item) => item.user.toString() === req.userId.toString());
            if (!member || !['owner', 'admin'].includes(member.role)) {
                return res.status(403).json({ error: 'Only owners and admins can edit workspace settings' });
            }

            if (workspaceName !== undefined && workspaceName.trim()) workspace.name = workspaceName.trim();
            if (workspaceDescription !== undefined) workspace.description = String(workspaceDescription || '').trim();
            if (techStack !== undefined) workspace.techStack = Array.isArray(techStack) ? techStack.map((item) => String(item).trim()).filter(Boolean) : [];
            await workspace.save();
        }

        const freshWorkspace = workspaceId
            ? await Workspace.findOne({ _id: workspaceId, 'members.user': req.userId }).lean()
            : await Workspace.findOne({ 'members.user': req.userId }).sort({ createdAt: 1 }).lean();
        const user = await User.findById(req.userId).lean();
        const member = freshWorkspace?.members?.find((item) => item.user.toString() === req.userId.toString());

        res.json({
            user: user ? formatUser(user) : null,
            workspaceId: freshWorkspace?._id?.toString() || '',
            workspaceName: freshWorkspace?.name || workspaceName,
            workspaceDescription: freshWorkspace?.description || '',
            techStack: freshWorkspace?.techStack || [],
            inviteCode: freshWorkspace?.inviteCode || '',
            inviteLink: freshWorkspace?.inviteCode ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?inviteCode=${encodeURIComponent(freshWorkspace.inviteCode)}` : '',
            currentUserRole: member?.role || 'member',
            notifyEmail: user?.notifyEmail !== false,
            notifyPush: user?.notifyPush !== false,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.userId);
        if (!user || !user.passwordHash) {
            return res.status(400).json({ error: 'Password login is not enabled for this account' });
        }

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'Password updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update password' });
    }
};
