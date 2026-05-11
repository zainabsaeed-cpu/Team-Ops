const crypto = require('crypto');
const { Workspace, WorkspaceInviteToken, Board, Column, Card, Comment, Activity, Notification, User, VerificationToken, formatWorkspace, formatUser } = require('../models');
const { sendVerificationEmail, sendInvitationEmail, sendWorkspaceInviteEmail } = require('../utils/mailer');
const { normalizeAutomationSettings, formatAutomationSettings } = require('../utils/automationSettings');
const { runWorkspaceAutomations } = require('../utils/automationRunner');

const workspaceRoleHierarchy = { owner: 3, admin: 2, member: 1, viewer: 0 };
const assignableRoles = ['admin', 'member', 'viewer'];
const adminAssignableRoles = ['member', 'viewer'];
const inviteCodeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const generateInviteCode = () => {
    let suffix = '';

    for (let index = 0; index < 4; index++) {
        suffix += inviteCodeAlphabet[crypto.randomInt(inviteCodeAlphabet.length)];
    }

    return `TEAM-${suffix}`;
};

const createUniqueInviteCode = async () => {
    let inviteCode = generateInviteCode();

    while (await Workspace.exists({ inviteCode })) {
        inviteCode = generateInviteCode();
    }

    return inviteCode;
};

const createUniqueInviteToken = async () => {
    let token = crypto.randomBytes(32).toString('hex');

    while (await WorkspaceInviteToken.exists({ token })) {
        token = crypto.randomBytes(32).toString('hex');
    }

    return token;
};

const checkWorkspaceAccess = async (userId, workspaceId, requiredRole = 'member') => {
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) return { allowed: false, error: 'Workspace not found' };

    const member = workspace.members.find((item) => item.user.toString() === userId.toString());
    if (!member) return { allowed: false, error: 'Not a member of this workspace' };

    const userRoleLevel = workspaceRoleHierarchy[member.role] || 0;
    const requiredLevel = workspaceRoleHierarchy[requiredRole] ?? 1;
    if (userRoleLevel < requiredLevel) {
        return { allowed: false, error: `Requires ${requiredRole} role` };
    }

    return { allowed: true, workspace, member };
};

const workspacePayloadForUser = (workspace, userId) => {
    const member = (workspace.members || []).find((item) => item.user.toString() === userId.toString());
    return formatWorkspace(workspace, member?.role || 'member', workspace.members.length);
};

const canManageTargetMember = (requesterRole, targetRole) => {
    if (requesterRole === 'owner') return targetRole !== 'owner';
    if (requesterRole === 'admin') return ['member', 'viewer'].includes(targetRole);
    return false;
};

const canAssignMemberRole = (requesterRole, role) => {
    if (requesterRole === 'owner') return assignableRoles.includes(role);
    if (requesterRole === 'admin') return adminAssignableRoles.includes(role);
    return false;
};

const getWorkspaceBoard = async (workspace) => {
    const existing = await Board.findOne({ workspaceId: workspace._id }).sort({ createdAt: 1 });
    if (existing) {
        await Column.updateMany({ workspace: workspace._id, board: { $in: [null, undefined] } }, { board: existing._id });
        return existing;
    }
    return null;
};

exports.createWorkspace = async (req, res) => {
    const { name, description = '', techStack = [] } = req.body;
    const ownerId = req.userId;
    try {
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Workspace name is required' });
        }

        const normalizedTechStack = Array.isArray(techStack)
            ? techStack.map((item) => String(item).trim()).filter(Boolean)
            : [];
        const inviteCode = await createUniqueInviteCode();

        const workspace = await Workspace.create({
            name: name.trim(),
            description: String(description || '').trim(),
            techStack: normalizedTechStack,
            owner: ownerId,
            inviteCode,
            members: [{ user: ownerId, role: 'owner' }],
        });

        res.status(201).json({
            ...formatWorkspace(workspace, 'owner', 1),
            boardId: null,
            inviteCode: workspace.inviteCode,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserWorkspaces = async (req, res) => {
    const workspaces = await Workspace.find({ 'members.user': req.userId }).lean();
    const payload = await Promise.all(workspaces.map(async (workspace) => {
        const member = workspace.members.find((item) => item.user.toString() === req.userId.toString());
        const board = await getWorkspaceBoard(workspace);
        return {
            ...formatWorkspace(workspace, member?.role || 'member', workspace.members.length),
            boardId: board?._id?.toString() || null,
        };
    }));

    res.json(payload);
};

exports.getWorkspaceById = async (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
    }
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    const member = workspace.members.find((item) => item.user.toString() === req.userId.toString());
    if (!member) return res.status(403).json({ error: 'Not a member of this workspace' });
    res.json({
        id: workspace._id.toString(),
        name: workspace.name,
        description: workspace.description || '',
        tech_stack: Array.isArray(workspace.techStack) ? workspace.techStack : [],
        inviteCode: workspace.inviteCode,
        inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join?code=${encodeURIComponent(workspace.inviteCode || '')}`,
        currentUserRole: member.role,
        boardId: (await getWorkspaceBoard(workspace))?._id?.toString() || null,
    });
};

exports.getWorkspaceMembers = async (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
    }

    try {
        const workspace = await Workspace.findById(workspaceId).populate('members.user').lean();
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        const currentMember = (workspace.members || []).find((member) => member.user?._id?.toString() === req.userId.toString());
        if (!currentMember) {
            return res.status(403).json({ error: 'Not a member of this workspace' });
        }

        const members = (workspace.members || [])
            .filter((member) => member.user)
            .map((member) => ({
                ...formatUser(member.user),
                role: member.role,
            }));

        res.json({
            inviteCode: workspace.inviteCode,
            inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join?code=${encodeURIComponent(workspace.inviteCode || '')}`,
            currentUserRole: currentMember.role,
            members,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addMember = async (req, res) => {
    const { workspaceId } = req.params;
    if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
    }
    const { email, role } = req.body;
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
    }

    const requester = (workspace.members || []).find((member) => member.user.toString() === req.userId.toString());
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
        return res.status(403).json({ error: 'Only owners and admins can add members' });
    }

    const requestedRole = assignableRoles.includes(role) ? role : 'member';
    if (!canAssignMemberRole(requester.role, requestedRole)) {
        return res.status(403).json({ error: 'Admins can only add members and viewers' });
    }

    let user = await User.findOne({ email: normalized });

    // If user does not exist, create an unverified placeholder and send verification
    let createdNewUser = false;
    if (!user) {
        const name = normalized.split('@')[0];
        user = await User.create({ name, email: normalized, passwordHash: null, verified: false, authProvider: 'email' });
        createdNewUser = true;

        // create verification token and send email
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await VerificationToken.create({ userId: user._id, token: otp, expiresAt });
        await sendVerificationEmail(normalized, otp);
    }

    await Workspace.updateOne(
        { _id: workspaceId, 'members.user': { $ne: user._id } },
            { $push: { members: { user: user._id, role: requestedRole } } }
    );

    // Log activity
    try {
        await Activity.create({ workspace: workspaceId, board: workspaceId, user: req.userId, userId: req.userId, workspaceId, boardId: workspaceId, action: `Invited ${user.email} to workspace` });
    } catch (e) {
        // ignore activity errors
    }

    try {
        await sendInvitationEmail(user.email, workspace.inviteCode, workspace.name);
    } catch (e) {
        console.error('Failed to send workspace invitation email:', e.message);
    }

    res.status(201).json({ message: 'Member invited/added' });
};

exports.inviteByEmail = async (req, res) => {
    const { workspaceId } = req.params;
    const { email, role = 'member' } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRole = assignableRoles.includes(role) ? role : '';

    if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!normalizedRole) {
        return res.status(400).json({ error: 'Role must be admin, member, or viewer' });
    }

    try {
        const access = await checkWorkspaceAccess(req.userId, workspaceId, 'admin');
        if (!access.allowed) {
            return res.status(access.error === 'Workspace not found' ? 404 : 403).json({ error: access.error });
        }

        if (!canAssignMemberRole(access.member.role, normalizedRole)) {
            return res.status(403).json({ error: 'Admins can only invite members and viewers' });
        }

        const existingUser = await User.findOne({ email: normalizedEmail }).lean();
        if (existingUser && access.workspace.members.some((member) => member.user.toString() === existingUser._id.toString())) {
            return res.status(409).json({ error: 'That user is already a workspace member' });
        }

        const [token, inviter] = await Promise.all([
            createUniqueInviteToken(),
            User.findById(req.userId).lean(),
        ]);

        const invite = await WorkspaceInviteToken.create({
            token,
            workspaceId,
            email: normalizedEmail,
            role: normalizedRole,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            used: false,
        });

        await sendWorkspaceInviteEmail({
            toEmail: normalizedEmail,
            workspaceName: access.workspace.name,
            inviterName: inviter?.name || 'A teammate',
            token: invite.token,
        });

        await Activity.create({
            workspace: workspaceId,
            board: workspaceId,
            user: req.userId,
            userId: req.userId,
            workspaceId,
            boardId: workspaceId,
            action: `Sent workspace invite to ${normalizedEmail}`,
        });

        res.status(201).json({
            message: 'Invite sent',
            email: normalizedEmail,
            role: normalizedRole,
            expires_at: invite.expiresAt,
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to send invite' });
    }
};

exports.joinByInviteToken = async (req, res) => {
    const token = String(req.query.token || '').trim();

    if (!token) {
        return res.status(400).json({ error: 'Invite token is required' });
    }

    try {
        const invite = await WorkspaceInviteToken.findOne({ token });
        if (!invite || invite.used || invite.expiresAt <= new Date()) {
            return res.status(400).json({ error: 'Invite is invalid or expired' });
        }

        const user = await User.findById(req.userId).lean();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (String(user.email || '').toLowerCase() !== invite.email) {
            return res.status(403).json({ error: `This invite was sent to ${invite.email}` });
        }

        const workspace = await Workspace.findById(invite.workspaceId);
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const alreadyMember = workspace.members.some((member) => member.user.toString() === req.userId.toString());
        if (!alreadyMember) {
            workspace.members.push({ user: req.userId, role: invite.role || 'member' });
            await workspace.save();
        }

        invite.used = true;
        await invite.save();

        const updatedWorkspace = await Workspace.findById(workspace._id).lean();
        const joinedBoard = await getWorkspaceBoard(updatedWorkspace);
        await Activity.create({
            workspace: workspace._id,
            board: joinedBoard?._id || workspace._id,
            user: req.userId,
            userId: req.userId,
            workspaceId: workspace._id,
            boardId: joinedBoard?._id || workspace._id,
            action: 'Joined workspace via email invite',
        });

        res.json({
            message: 'Joined workspace',
            workspace: {
                ...workspacePayloadForUser(updatedWorkspace, req.userId),
                boardId: joinedBoard?._id?.toString() || null,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to join workspace' });
    }
};

exports.updateMemberRole = async (req, res) => {
    const { workspaceId } = req.params;
    const memberId = req.params.userId || req.params.memberId;
    const { role } = req.body;

    if (!assignableRoles.includes(role)) {
        return res.status(400).json({ error: 'Role must be admin, member, or viewer' });
    }

    try {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        const requester = workspace.members.find((member) => member.user.toString() === req.userId.toString());
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            return res.status(403).json({ error: 'Only owners and admins can change member roles' });
        }

        if (!memberId) {
            return res.status(400).json({ error: 'Member ID is required' });
        }

        const target = workspace.members.find((member) => member.user.toString() === memberId.toString());
        if (!target) return res.status(404).json({ error: 'Member not found' });
        if (target.role === 'owner' && memberId.toString() !== req.userId.toString()) {
            return res.status(400).json({ error: 'Owners cannot be demoted by another user' });
        }
        if (requester.role === 'admin' && !['member', 'viewer'].includes(target.role)) {
            return res.status(403).json({ error: 'Admins can only change members and viewers' });
        }
        if (!canManageTargetMember(requester.role, target.role) || !canAssignMemberRole(requester.role, role)) {
            return res.status(403).json({ error: 'You cannot assign that role' });
        }

        target.role = role;
        await workspace.save();

        await Activity.create({
            workspace: workspace._id,
            board: workspace._id,
            user: req.userId,
            userId: req.userId,
            workspaceId: workspace._id,
            boardId: workspace._id,
            action: `Changed a member role to ${role}`,
        });

        res.json({ message: 'Member role updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update member role' });
    }
};

exports.removeMember = async (req, res) => {
    const { workspaceId } = req.params;
    const memberId = req.params.userId || req.params.memberId;

    try {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        const requester = workspace.members.find((member) => member.user.toString() === req.userId.toString());
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            return res.status(403).json({ error: 'Only owners and admins can remove members' });
        }

        if (memberId.toString() === req.userId.toString()) {
            return res.status(400).json({ error: 'You cannot remove yourself' });
        }

        const target = workspace.members.find((member) => member.user.toString() === memberId.toString());
        if (!target) return res.status(404).json({ error: 'Member not found' });
        if (target.role === 'owner') {
            return res.status(400).json({ error: 'Owner cannot be removed here' });
        }
        if (!canManageTargetMember(requester.role, target.role)) {
            return res.status(403).json({ error: 'Admins can only remove members and viewers' });
        }

        workspace.members = workspace.members.filter((member) => member.user.toString() !== memberId.toString());
        await workspace.save();

        await Activity.create({
            workspace: workspace._id,
            board: workspace._id,
            user: req.userId,
            userId: req.userId,
            workspaceId: workspace._id,
            boardId: workspace._id,
            action: 'Removed a member from workspace',
        });

        res.json({ message: 'Member removed' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove member' });
    }
};

exports.joinByCode = async (req, res) => {
    const { code } = req.params;
    const inviteCode = String(code || '').trim().toUpperCase();

    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

    try {
        const workspace = await Workspace.findOne({ inviteCode }).lean();
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        await Workspace.updateOne(
            { _id: workspace._id, 'members.user': { $ne: req.userId } },
            { $push: { members: { user: req.userId, role: 'member' } } }
        );

        const updatedWorkspace = await Workspace.findById(workspace._id).lean();
        const member = updatedWorkspace.members.find((item) => item.user.toString() === req.userId.toString());

        const board = await getWorkspaceBoard(updatedWorkspace);

        await Activity.create({ workspace: workspace._id, board: board?._id || workspace._id, user: req.userId, userId: req.userId, workspaceId: workspace._id, boardId: board?._id || workspace._id, action: 'Joined workspace via invite code' });

        res.json({
            message: 'Joined workspace',
            workspace: {
                ...formatWorkspace(updatedWorkspace, member?.role || 'member', updatedWorkspace.members.length),
                boardId: board?._id?.toString() || null,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to join workspace' });
    }
};

exports.updateWorkspace = async (req, res) => {
    const { workspaceId } = req.params;
    const { name, description, techStack } = req.body;

    try {
        if (!workspaceId) {
            return res.status(400).json({ error: 'Workspace ID is required' });
        }

        if (name !== undefined && !String(name).trim()) {
            return res.status(400).json({ error: 'Workspace name is required' });
        }

        const access = await checkWorkspaceAccess(req.userId, workspaceId, 'admin');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const updates = {};
        if (name !== undefined) updates.name = String(name).trim();
        if (description !== undefined) updates.description = String(description || '').trim();
        if (techStack !== undefined) {
            updates.techStack = Array.isArray(techStack) ? techStack.map((item) => String(item).trim()).filter(Boolean) : [];
        }

        const updated = await Workspace.findByIdAndUpdate(workspaceId, updates, { new: true }).lean();

        if (!updated) return res.status(404).json({ error: 'Workspace not found' });

        res.json({
            id: updated._id.toString(),
            name: updated.name,
            description: updated.description || '',
            tech_stack: updated.techStack || [],
            inviteCode: updated.inviteCode,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update workspace' });
    }
};

exports.getAutomationSettings = async (req, res) => {
    const { workspaceId } = req.params;

    try {
        const access = await checkWorkspaceAccess(req.userId, workspaceId, 'viewer');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const workspace = await Workspace.findById(workspaceId).select('automationSettings').lean();
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        res.json({ settings: formatAutomationSettings(workspace) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load automation settings' });
    }
};

exports.updateAutomationSettings = async (req, res) => {
    const { workspaceId } = req.params;

    try {
        const access = await checkWorkspaceAccess(req.userId, workspaceId, 'admin');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const current = await Workspace.findById(workspaceId).select('automationSettings').lean();
        if (!current) return res.status(404).json({ error: 'Workspace not found' });

        const settings = normalizeAutomationSettings({
            ...formatAutomationSettings(current),
            ...(req.body?.settings || req.body || {}),
        });

        const workspace = await Workspace.findByIdAndUpdate(
            workspaceId,
            { $set: { automationSettings: settings } },
            { new: true },
        ).lean();

        const formattedSettings = formatAutomationSettings(workspace);
        const archived = await runWorkspaceAutomations({
            io: req.app.get('io'),
            workspaceId,
            actorId: req.userId,
        });

        req.app.get('io')?.to(`workspace:${workspaceId}`).emit('workspace:settings', {
            workspaceId,
            settings: formattedSettings,
            archivedCount: archived.archived,
        });

        res.json({ settings: formattedSettings, archivedCount: archived.archived });
    } catch (err) {
        console.error('Update automation settings error:', err);
        res.status(500).json({ error: 'Failed to save automation settings' });
    }
};

exports.deleteWorkspace = async (req, res) => {
    const { workspaceId } = req.params;
    const { confirmName } = req.body || {};

    try {
        if (!workspaceId) {
            return res.status(400).json({ error: 'Workspace ID is required' });
        }

        const access = await checkWorkspaceAccess(req.userId, workspaceId, 'owner');
        if (!access.allowed) return res.status(403).json({ error: access.error });

        const workspace = await Workspace.findById(workspaceId).lean();
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        if (String(confirmName || '') !== String(workspace.name || '')) {
            return res.status(400).json({ error: 'Workspace name confirmation is required' });
        }

        const boards = await Board.find({ workspaceId }).select('_id').lean();
        const boardIds = boards.map((board) => board._id);
        const columns = await Column.find({ workspace: workspaceId }).lean();
        const columnIds = columns.map((column) => column._id);
        const cards = await Card.find({ column: { $in: columnIds } }).select('_id').lean();
        const cardIds = cards.map((card) => card._id);

        await Promise.all([
            Card.deleteMany({ column: { $in: columnIds } }),
            Comment.deleteMany({ $or: [{ board: { $in: boardIds } }, { card: { $in: cardIds } }] }),
            Activity.deleteMany({ $or: [{ workspace: workspaceId }, { workspaceId }] }),
            Notification.deleteMany({ workspace: workspaceId }),
            WorkspaceInviteToken.deleteMany({ workspaceId }),
            Column.deleteMany({ workspace: workspaceId }),
            Board.deleteMany({ workspaceId }),
            Workspace.deleteOne({ _id: workspaceId }),
        ]);

        res.json({ message: 'Workspace deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete workspace' });
    }
};
