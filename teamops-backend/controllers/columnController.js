const { Column, formatColumn } = require('../models');

exports.getColumns = async (req, res) => {
    const { workspaceId } = req.params;
    const result = await Column.find({ workspace: workspaceId }).sort({ position: 1 }).lean();
    res.json(result.map(formatColumn));
};

exports.createColumn = async (req, res) => {
    const { workspaceId } = req.params;
    const { title, position } = req.body;
    const column = await Column.create({ workspace: workspaceId, title, position });
    res.status(201).json(formatColumn(column.toObject()));
};

exports.updateColumn = async (req, res) => {
    const { columnId } = req.params;
    const { title } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    updates.updatedAt = new Date();
    
    const column = await Column.findByIdAndUpdate(columnId, updates, { new: true });
    if (!column) return res.status(404).json({ error: 'Column not found' });
    res.json(formatColumn(column.toObject()));
};

exports.deleteColumn = async (req, res) => {
    const { columnId } = req.params;
    const column = await Column.findByIdAndDelete(columnId);
    if (!column) return res.status(404).json({ error: 'Column not found' });
    res.json({ message: 'Column deleted' });
};