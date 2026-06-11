import { create } from 'zustand';

/**
 * Board state for the currently open project. Tasks are stored NORMALIZED (by id in a map)
 * rather than as three column arrays, because both socket events and drag operations target a
 * single task by id — an O(1) lookup/update instead of scanning arrays. Columns are derived
 * at render time via selectColumns().
 *
 * Every mutation here is a pure, synchronous state transition. Socket handlers and the
 * drag-end handler both call these — so live updates and local actions converge on one model.
 */
export const useBoardStore = create((set, get) => ({
  byId: {}, // { [taskId]: task }
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Replace the whole board (initial REST load / late-join state).
  setTasks: (tasks) =>
    set({ byId: Object.fromEntries(tasks.map((t) => [t._id, t])), error: null }),

  reset: () => set({ byId: {}, loading: false, error: null }),

  // ---- Convergent mutations (used by BOTH socket events and local actions) ----
  upsertTask: (task) => set((s) => ({ byId: { ...s.byId, [task._id]: task } })),

  applyMoved: ({ taskId, status, position }) =>
    set((s) => {
      const existing = s.byId[taskId];
      if (!existing) return s; // task we don't have (e.g. created elsewhere) — ignore
      return { byId: { ...s.byId, [taskId]: { ...existing, status, position } } };
    }),

  removeTask: (taskId) =>
    set((s) => {
      const next = { ...s.byId };
      delete next[taskId];
      return { byId: next };
    }),

  // ---- Optimistic move with rollback ----
  // Apply the move locally for instant feedback; return a snapshot so the caller can roll
  // back if the server rejects the change.
  optimisticMove: ({ taskId, status, position }) => {
    const snapshot = get().byId[taskId];
    get().applyMoved({ taskId, status, position });
    return snapshot;
  },

  rollback: (snapshot) => {
    if (snapshot) set((s) => ({ byId: { ...s.byId, [snapshot._id]: snapshot } }));
  },
}));

/** Derive ordered columns from the normalized map. Memo-friendly: pure function of byId. */
export function selectColumns(byId) {
  const columns = { todo: [], in_progress: [], done: [] };
  for (const task of Object.values(byId)) {
    (columns[task.status] || columns.todo).push(task);
  }
  for (const key of Object.keys(columns)) {
    columns[key].sort((a, b) => a.position - b.position);
  }
  return columns;
}
