const jwt = require('jsonwebtoken');
const { Workspace, Board, Column, Card } = require('../models');

const jwtSecret = process.env.JWT_SECRET || 'teamops-dev-secret';
const roleRank = { viewer: 0, member: 1, admin: 2, owner: 3 };

const auth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const getWorkspaceIdFromRequest = async (req) => {
    const directWorkspaceId = req.params.workspaceId
        || req.body?.workspaceId
        || req.query?.workspaceId;
    if (directWorkspaceId) return directWorkspaceId;

    if (req.params.boardId) {
        const board = await Board.findById(req.params.boardId).select('workspaceId').lean();
        return board?.workspaceId?.toString() || null;
    }

    if (req.params.columnId) {
        const column = await Column.findById(req.params.columnId).select('workspace').lean();
        return column?.workspace?.toString() || null;
    }

    if (req.params.cardId) {
        const card = await Card.findById(req.params.cardId).select('column').lean();
        if (!card) return null;
        const column = await Column.findById(card.column).select('workspace').lean();
        return column?.workspace?.toString() || null;
    }

    return null;
};

const requireRole = (...roles) => async (req, res, next) => {
    try {
        const workspaceId = await getWorkspaceIdFromRequest(req);
        if (!workspaceId) {
            return res.status(400).json({ error: 'Workspace ID is required' });
        }

        const workspace = await Workspace.findById(workspaceId).lean();
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const member = (workspace.members || []).find((item) => String(item?.user?._id || item?.user || '') === String(req.userId));
        if (!member) {
            return res.status(403).json({ error: 'Not a member of this workspace' });
        }

        if (!roles.includes(member.role)) {
            return res.status(403).json({ error: `Requires one of these roles: ${roles.join(', ')}` });
        }

        req.workspace = workspace;
        req.workspaceRole = member.role;
        req.workspaceMember = member;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Failed to check workspace permissions' });
    }
};

const hasAtLeastRole = (role, requiredRole) => (roleRank[role] ?? -1) >= (roleRank[requiredRole] ?? 0);

auth.requireRole = requireRole;
auth.hasAtLeastRole = hasAtLeastRole;
auth.roleRank = roleRank;

module.exports = auth;
