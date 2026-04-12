import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableCard from './SortableCard.jsx'

export default function BoardColumn({ column }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section className="column" ref={setNodeRef} style={isOver ? { borderColor: '#0b6e4f' } : undefined}>
      <div className="column-head">{column.title} ({column.cards.length})</div>
      <SortableContext items={column.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="column-body">
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}
