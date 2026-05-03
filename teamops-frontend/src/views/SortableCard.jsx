import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

export default function SortableCard({ card, onClick, highlighted = false }) {
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
      className={`card ${onClick ? 'card-clickable' : ''} ${isDragging ? 'dragging' : ''} ${highlighted ? 'card-highlighted' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Open ${card.title}` : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
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
