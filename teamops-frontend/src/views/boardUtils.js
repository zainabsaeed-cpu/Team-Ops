export function findColumnByCardId(columns, cardId) {
  return columns.find((column) =>
    column.cards.some((card) => card.id === cardId),
  )
}

export function moveCardInColumns(columns, { activeId, overId, overColumnId }) {
  const sourceColumn = findColumnByCardId(columns, activeId)
  if (!sourceColumn) {
    return { columns }
  }

  const sourceIndex = sourceColumn.cards.findIndex((card) => card.id === activeId)
  const card = sourceColumn.cards[sourceIndex]
  if (!card) {
    return { columns }
  }

  const destinationColumn = overColumnId
    ? columns.find((column) => column.id === overColumnId)
    : columns.find((column) => column.cards.some((item) => item.id === overId))

  if (!destinationColumn) {
    return { columns }
  }

  const nextColumns = columns.map((column) => ({
    ...column,
    cards: [...column.cards],
  }))

  const nextSource = nextColumns.find((column) => column.id === sourceColumn.id)
  const nextDestination = nextColumns.find((column) => column.id === destinationColumn.id)

  const [movedCard] = nextSource.cards.splice(sourceIndex, 1)

  let insertIndex = nextDestination.cards.length
  if (!overColumnId) {
    const hoveredCardIndex = nextDestination.cards.findIndex((item) => item.id === overId)
    if (hoveredCardIndex >= 0) {
      insertIndex = hoveredCardIndex
    }
  }

  nextDestination.cards.splice(insertIndex, 0, movedCard)

  return {
    columns: nextColumns,
    movedCard,
    sourceColumn: nextSource,
    destinationColumn: nextDestination,
    insertIndex,
  }
}
