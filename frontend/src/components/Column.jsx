import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { TaskCard } from './TaskCard.jsx';

/**
 * A board column (Todo / In Progress / Done). It's a droppable target keyed by the status, so
 * a card dropped onto an EMPTY column still resolves to the right status. The SortableContext
 * lists its task ids to enable reordering within the column.
 */
export function Column({ status, title, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={`column ${isOver ? 'column--over' : ''}`}>
      <div className="column__header">
        <span>{title}</span>
        <span className="column__count">{tasks.length}</span>
      </div>

      <SortableContext
        items={tasks.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} />
        ))}
        {tasks.length === 0 && <p className="muted">No tasks</p>}
      </SortableContext>
    </div>
  );
}
