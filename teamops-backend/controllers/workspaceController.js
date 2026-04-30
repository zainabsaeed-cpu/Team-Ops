const crypto = require('crypto');
const { Workspace, Column, User, formatWorkspace } = require('../models');

exports.createWorkspace = async (req, res) => {
    const { name } = req.body;
    const ownerId = req.userId;
    const inviteCode = crypto.randomBytes(4).toString('hex');
    try {
        const workspace = await Workspace.create({
            name,
            owner: ownerId,
            inviteCode,
            members: [{ user: ownerId, role: 'owner' }],
        });

        const defaultColumns = ['To Do', 'In Progress', 'Done'];
        for (let i = 0; i < defaultColumns.length; i++) {
            await Column.create({ workspace: workspace._id, title: defaultColumns[i], position: i });
        }
        res.status(201).json({ id: workspace._id.toString(), name: workspace.name, inviteCode: workspace.inviteCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserWorkspaces = async (req, res) => {
    const workspaces = await Workspace.find({ 'members.user': req.userId }).lean();
    const payload = workspaces.map((workspace) => {
        const member = workspace.members.find((item) => item.user.toString() === req.userId.toString());
        return formatWorkspace(workspace, member?.role || 'member', workspace.members.length);
    });

    res.json(payload);
};

exports.getWorkspaceById = async (req, res) => {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ id: workspace._id.toString(), name: workspace.name, inviteCode: workspace.inviteCode });
};

exports.addMember = async (req, res) => {
    const { workspaceId } = req.params;
    const { email, role } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Workspace.updateOne(
        { _id: workspaceId, 'members.user': { $ne: user._id } },
        { $push: { members: { user: user._id, role: role || 'member' } } }
    );

    res.status(201).json({ message: 'Member added' });
};