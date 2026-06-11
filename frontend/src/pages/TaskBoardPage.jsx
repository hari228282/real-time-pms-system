import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { projectsApi } from '../api/projects.api.js';
import { tasksApi } from '../api/tasks.api.js';
import { Column } from '../components/Column.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ErrorBanner } from '../components/ui/ErrorBanner.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useProjectSocket } from '../hooks/useProjectSocket.js';
import { COLUMNS } from '../lib/constants.js';
import { useAuthStore } from '../store/authStore.js';
import { selectColumns, useBoardStore } from '../store/boardStore.js';

/**
 * The real-time board. Responsibilities:
 *  - REST-load the persisted task state on mount (late-join correctness),
 *  - subscribe to live updates via useProjectSocket (which writes into the board store),
 *  - render Todo / In Progress / Done as dnd-kit columns,
 *  - on drag end: OPTIMISTICALLY move locally, persist via REST, and ROLL BACK on failure.
 *
 * The same store the socket writes to is the store we render — so a remote user's move and a
 * local drag both flow through one model and stay consistent.
 */
export function TaskBoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const byId = useBoardStore((s) => s.byId);
  const setTasks = useBoardStore((s) => s.setTasks);
  const optimisticMove = useBoardStore((s) => s.optimisticMove);
  const rollback = useBoardStore((s) => s.rollback);
  const upsertTask = useBoardStore((s) => s.upsertTask);
  const reset = useBoardStore((s) => s.reset);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberMsg, setMemberMsg] = useState(null); // { type: 'ok' | 'err', text }

  // Current user — used to decide whether to show the (admin-only) add-member control.
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = useMemo(
    () =>
      project?.members?.some(
        (m) => String(m.user?._id ?? m.user) === String(currentUser?._id) && m.role === 'admin',
      ) ?? false,
    [project, currentUser],
  );

  // Live socket subscription for this project's room.
  const { connected } = useProjectSocket(projectId);

  // Pointer sensor with a small activation distance so clicks aren't swallowed by drags.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Initial load: project meta + persisted tasks.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [{ project: proj }, { tasks }] = await Promise.all([
          projectsApi.get(projectId),
          tasksApi.list(projectId),
        ]);
        if (!active) return;
        setProject(proj);
        setTasks(tasks);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      reset(); // clear board state when leaving the project
    };
  }, [projectId, setTasks, reset]);

  const columns = useMemo(() => selectColumns(byId), [byId]);

  const onAddTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const { task } = await tasksApi.create(projectId, { title: newTitle.trim() });
      upsertTask(task); // our own create — socket echo is suppressed via x-socket-id
      setNewTitle('');
    } catch (err) {
      setError(err.message);
    }
  };

  // Add a teammate by email. The backend returns the project with members populated, so we
  // just swap it in and the members list re-renders. Errors (unknown email, already a member,
  // not an admin) surface inline beside the form.
  const onAddMember = async (e) => {
    e.preventDefault();
    const email = memberEmail.trim();
    if (!email) return;
    setMemberMsg(null);
    try {
      const { project: updated } = await projectsApi.addMember(projectId, { email });
      setProject(updated);
      setMemberEmail('');
      setMemberMsg({ type: 'ok', text: `Added ${email}` });
    } catch (err) {
      setMemberMsg({ type: 'err', text: err.message });
    }
  };

  /**
   * Compute the destination status + a new float position for a dropped card, then persist.
   * Position = midpoint between the neighbours at the drop index, so only ONE document changes.
   */
  const onDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const moved = byId[taskId];
    if (!moved) return;

    // `over.id` is either a column id (dropped on empty space) or another task's id.
    const overIsColumn = COLUMNS.some((c) => c.status === over.id);
    const destStatus = overIsColumn ? over.id : byId[over.id]?.status;
    if (!destStatus) return;

    // Tasks already in the destination column, excluding the one being moved.
    const destTasks = columns[destStatus].filter((t) => t._id !== taskId);

    // Where in the column did we drop? Index of the card we landed on (else append).
    const overIndex = overIsColumn
      ? destTasks.length
      : destTasks.findIndex((t) => t._id === over.id);
    const insertAt = overIndex === -1 ? destTasks.length : overIndex;

    const prev = destTasks[insertAt - 1]?.position;
    const next = destTasks[insertAt]?.position;
    const position = computePosition(prev, next);

    // No-op guard: same column and same neighbours.
    if (destStatus === moved.status && position === moved.position) return;

    // 1) Optimistic local update for instant feedback; keep a snapshot to undo.
    const snapshot = optimisticMove({ taskId, status: destStatus, position });

    try {
      // 2) Persist. The server confirms and broadcasts to OTHER clients (not us).
      await tasksApi.move(taskId, { status: destStatus, position });
    } catch (err) {
      // 3) Reconcile: server rejected — roll back to the pre-drag state.
      rollback(snapshot);
      setError(err.message);
    }
  };

  if (loading) return <Spinner label="Loading board…" />;

  return (
    <>
      <header className="topbar">
        <div className="row">
          <button className="link-btn" onClick={() => navigate('/projects')}>
            ← Projects
          </button>
          <h1 className="topbar__title">{project?.name}</h1>
        </div>
        <span className={`status-dot ${connected ? 'status-dot--live' : ''}`}>
          {connected ? 'Live' : 'Offline'}
        </span>
      </header>

      <div className="container">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <form onSubmit={onAddTask} className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              id="new-task"
              label="Add a task"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Design homepage"
            />
          </div>
          <Button type="submit" style={{ marginBottom: '1rem' }}>
            Add
          </Button>
        </form>

        <section className="members">
          <div className="members__list">
            <span className="members__label">Members</span>
            {project?.members?.map((m) => {
              const u = m.user ?? {};
              return (
                <span key={u._id ?? m._id} className="member-chip" title={u.email}>
                  {u.name ?? u.email ?? 'Member'}
                  {m.role === 'admin' && <span className="member-chip__role">admin</span>}
                </span>
              );
            })}
          </div>

          {isAdmin && (
            <form onSubmit={onAddMember} className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input
                  id="add-member"
                  label="Add member by email"
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="teammate@example.com"
                />
              </div>
              <Button type="submit" variant="ghost" style={{ marginBottom: '1rem' }}>
                Add member
              </Button>
            </form>
          )}

          {memberMsg && (
            <p className={`members__msg members__msg--${memberMsg.type}`}>{memberMsg.text}</p>
          )}
        </section>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="board">
            {COLUMNS.map((col) => (
              <Column
                key={col.status}
                status={col.status}
                title={col.title}
                tasks={columns[col.status]}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </>
  );
}

/** Midpoint positioning so inserting between two cards rewrites a single document. */
function computePosition(prev, next) {
  if (prev === undefined && next === undefined) return Date.now();
  if (prev === undefined) return next - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}
