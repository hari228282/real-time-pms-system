import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * A single draggable task. useSortable gives us the drag handlers + a transform so the card
 * follows the cursor. `data.status` is attached so the drag-end handler can tell which column
 * a card came from without a lookup.
 */
export function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task ${isDragging ? 'task--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <p className="task__title">{task.title}</p>
      {task.description && <p className="task__desc">{task.description}</p>}
    </div>
  );
}
