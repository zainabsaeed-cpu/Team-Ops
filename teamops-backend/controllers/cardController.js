const { Card, formatCard } = require('../models');

exports.getCards = async (req, res) => {
    const { columnId } = req.params;
    const result = await Card.find({ column: columnId, archivedAt: null }).sort({ position: 1 }).lean();
    res.json(result.map(formatCard));
};

exports.createCard = async (req, res) => {
    const { columnId } = req.params;
    const { title, description, priority, assignee_id, due_date, position } = req.body;
    if (!title || !due_date) {
        return res.status(400).json({ error: 'Title and due date are required' });
    }
    const card = await Card.create({
        column: columnId,
        title,
        description,
        priority,
        assignee: assignee_id || null,
        dueDate: new Date(due_date),
        position,
    });
    res.status(201).json(formatCard(card.toObject()));
};

exports.moveCard = async (req, res) => {
    const { cardId } = req.params;
    const { newColumnId, newPosition } = req.body;
    await Card.findOneAndUpdate({ _id: cardId, archivedAt: null }, {
        column: newColumnId,
        position: newPosition,
        updatedAt: new Date(),
    });
    res.json({ message: 'Card moved' });
};

exports.updateCard = async (req, res) => {
    const { cardId } = req.params;
    const { title, description, priority, column, due_date } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (column !== undefined) updates.column = column;
    if (due_date !== undefined) {
        if (!due_date) return res.status(400).json({ error: 'Due date is required' });
        updates.dueDate = new Date(due_date);
    }
    updates.updatedAt = new Date();
    
    const card = await Card.findOneAndUpdate({ _id: cardId, archivedAt: null }, updates, { new: true });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(formatCard(card.toObject()));
};

exports.deleteCard = async (req, res) => {
    const { cardId } = req.params;
    const card = await Card.findOneAndDelete({ _id: cardId, archivedAt: null });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card deleted' });
};
