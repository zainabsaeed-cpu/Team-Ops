const { Workspace, Board, Column, Card } = require('../models');
const { formatAutomationSettings } = require('./automationSettings');
const { createActivity, emitBoardEvent } = require('./realtime');

const archiveCutoffDate = (days = 7) => new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
const isDoneColumnTitle = (title = '') => /done|complete|archive/i.test(title);

async function runWorkspaceAutomations({ io, workspaceId, actorId = null } = {}) {
  if (!workspaceId) return { archived: 0 };

  const workspace = await Workspace.findById(workspaceId).lean();
  const settings = formatAutomationSettings(workspace || {});
  if (!settings.autoArchive) return { archived: 0 };

  const boards = await Board.find({ workspaceId }).select('_id name').lean();
  const boardIds = boards.map((board) => board._id);
  if (!boardIds.length) return { archived: 0 };

  const doneColumns = await Column.find({ board: { $in: boardIds } }).lean();
  const doneColumnIds = doneColumns
    .filter((column) => isDoneColumnTitle(column.title))
    .map((column) => column._id);

  if (!doneColumnIds.length) return { archived: 0 };

  const cutoff = archiveCutoffDate(7);
  const cards = await Card.find({
    column: { $in: doneColumnIds },
    archivedAt: null,
    updatedAt: { $lte: cutoff },
  }).select('_id column title').lean();

  if (!cards.length) return { archived: 0 };

  await Card.updateMany(
    { _id: { $in: cards.map((card) => card._id) } },
    { $set: { archivedAt: new Date() } },
  );

  const columnsById = new Map(doneColumns.map((column) => [column._id.toString(), column]));
  const archivedByBoard = new Map();
  cards.forEach((card) => {
    const column = columnsById.get(card.column.toString());
    const boardId = column?.board?.toString();
    if (!boardId) return;
    archivedByBoard.set(boardId, (archivedByBoard.get(boardId) || 0) + 1);
  });

  await Promise.all(Array.from(archivedByBoard.entries()).map(async ([boardId, count]) => {
    const action = `Auto-archived ${count} completed card${count === 1 ? '' : 's'}`;
    await createActivity({
      io,
      userId: actorId,
      workspaceId,
      boardId,
      action,
    });
    emitBoardEvent(io, boardId, 'cards:archived', { boardId, count });
  }));

  return { archived: cards.length };
}

module.exports = {
  runWorkspaceAutomations,
  isDoneColumnTitle,
};
