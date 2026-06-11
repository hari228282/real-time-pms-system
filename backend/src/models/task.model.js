import mongoose from 'mongoose';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'];

const taskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Float position lets us reorder by inserting "between" two cards (avg of neighbours)
    // and write a single document instead of renumbering the whole column.
    position: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// The board-load query: fetch a project's tasks grouped by column, ordered within a column.
taskSchema.index({ project: 1, status: 1, position: 1 });
taskSchema.index({ assignee: 1 });

taskSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Task = mongoose.model('Task', taskSchema);
