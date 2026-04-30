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