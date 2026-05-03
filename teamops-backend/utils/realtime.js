const { Activity, Notification, formatActivityFeed, formatNotification } = require('../models');

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
  const { io, userId, message } = options;

  const notification = await Notification.create({
    user: userId,
    message,
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
