const { Activity, Notification, Workspace, formatActivityFeed, formatNotification } = require('../models');
const { formatAutomationSettings, shouldDigestNotification } = require('./automationSettings');

function emitBoardEvent(io, boardId, eventName, payload) {
  if (!io || !boardId || !eventName) {
    return;
  }

  io.to(`board:${boardId}`).emit(eventName, payload);
}

function emitUserEvent(io, userId, eventName, payload) {
  if (!io || !userId || !eventName) {
    return;
  }

  io.to(`user:${userId}`).emit(eventName, payload);
}

async function createActivity(firstArg, boardIdArg, userIdArg, actionArg) {
  const options = typeof firstArg === 'object' && firstArg !== null && !firstArg.emit
    ? firstArg
    : { io: firstArg, boardId: boardIdArg, userId: userIdArg, action: actionArg };
  const { io, userId, workspaceId, boardId, action } = options;

  const activity = await Activity.create({
    user: userId || null,
    workspace: workspaceId,
    board: boardId || workspaceId,
    userId: userId || null,
    workspaceId,
    boardId: boardId || workspaceId,
    action,
  });

  const payload = formatActivityFeed(activity.toObject());
  emitBoardEvent(io, boardId || workspaceId, 'activity:new', payload);

  return payload;
}

async function createNotification(firstArg, userIdArg, messageArg) {
  const options = typeof firstArg === 'object' && firstArg !== null && !firstArg.emit
    ? firstArg
    : { io: firstArg, userId: userIdArg, message: messageArg };
  const { io, userId, message, isImportant = false, workspaceId = null } = options;
  const workspace = workspaceId ? await Workspace.findById(workspaceId).select('automationSettings').lean() : null;
  const settings = formatAutomationSettings(workspace || {});
  const shouldDigest = workspaceId && shouldDigestNotification(settings, { isImportant, message });

  if (shouldDigest) {
    const digestDate = new Date().toISOString().slice(0, 10);
    const notification = await Notification.findOneAndUpdate(
      {
        user: userId,
        workspace: workspaceId,
        delivery_mode: 'digest',
        digest_date: digestDate,
        is_read: false,
      },
      {
        $setOnInsert: {
          user: userId,
          workspace: workspaceId,
          is_important: false,
          delivery_mode: 'digest',
          digest_date: digestDate,
        },
        $inc: { digest_count: 1 },
      },
      { upsert: true, new: true },
    );
    notification.message = `Digest: ${notification.digest_count} non-critical update${notification.digest_count === 1 ? '' : 's'} waiting`;
    await notification.save();

    const payload = formatNotification(notification.toObject());
    emitUserEvent(io, userId, 'notification:new', payload);
    return payload;
  }

  const notification = await Notification.create({
    user: userId,
    workspace: workspaceId,
    message,
    is_important: Boolean(isImportant),
    delivery_mode: 'instant',
  });

  const payload = formatNotification(notification.toObject());
  emitUserEvent(io, userId, 'notification:new', payload);

  return payload;
}

module.exports = {
  createActivity,
  createNotification,
  emitBoardEvent,
  emitUserEvent,
};
