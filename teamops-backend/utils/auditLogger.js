const { Activity, Board, Workspace } = require('../models');

const logAccountActivity = async (userId, action) => {
  if (!userId || !action) return;

  try {
    const workspaces = await Workspace.find({ 'members.user': userId }).select('_id').lean();
    await Promise.all(workspaces.map(async (workspace) => {
      const board = await Board.findOne({ workspaceId: workspace._id }).select('_id').sort({ createdAt: 1 }).lean();
      const boardId = board?._id || workspace._id;

      return Activity.create({
        workspace: workspace._id,
        board: boardId,
        user: userId,
        userId,
        workspaceId: workspace._id,
        boardId,
        action,
      });
    }));
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = {
  logAccountActivity,
};
