import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

export default function SortableCard({ card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <h4>{card.title}</h4>
      <small>{card.description}</small>
      <div className="row" style={{ marginTop: 10 }}>
        <span className={`priority ${card.priority}`}>
          {card.priority.toUpperCase()}
        </span>
        <small>Due {card.due_date}</small>
      </div>
    </article>
  )
}
