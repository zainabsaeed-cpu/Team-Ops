const { Card, formatCard } = require('../models');

exports.getCards = async (req, res) => {
    const { columnId } = req.params;
    const result = await Card.find({ column: columnId }).sort({ position: 1 }).lean();
    res.json(result.map(formatCard));
};

exports.createCard = async (req, res) => {
    const { columnId } = req.params;
    const { title, description, priority, assignee_id, due_date, position } = req.body;
    const card = await Card.create({
        column: columnId,
        title,
        description,
        priority,
        assignee: assignee_id || null,
        dueDate: due_date || null,
        position,
    });
    res.status(201).json(formatCard(card.toObject()));
};

exports.moveCard = async (req, res) => {
    const { cardId } = req.params;
    const { newColumnId, newPosition } = req.body;
    await Card.findByIdAndUpdate(cardId, {
        column: newColumnId,
        position: newPosition,
        updatedAt: new Date(),
    });
    res.json({ message: 'Card moved' });
};