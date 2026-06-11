# "Defend Your Code" Cheat Sheet

Study aid for the live review. Everything here maps to real files in this repo.

---

## 1. End-to-end flow of ONE real-time task update

**Scenario:** User A drags "Design homepage" from Todo → In Progress. User B (same project,
different browser, possibly a different backend instance) sees it move.

1. **Browser A — optimistic update.** `TaskBoardPage.onDragEnd` computes the destination
   `status` and a float `position` (midpoint of the drop neighbours), then calls
   `boardStore.optimisticMove(...)`. The card moves **instantly** and a snapshot of the
   pre-move task is kept for rollback.
2. **Browser A — persist.** `tasksApi.move(taskId, { status, position })` →
   `PATCH /api/tasks/:taskId/status`. The axios request interceptor attaches the **JWT** and
   the **`x-socket-id`** header (A's own socket id).
3. **Server — auth + validate.** `requireAuth` verifies the JWT → `req.user`. `validate(moveTaskSchema)`
   (Zod) checks the body.
4. **Server — authorize + persist.** `taskController.move` calls `taskService.move`, which loads
   the task, re-checks that the user is a **member of the task's project** (reusing
   `projectService.getMemberProjectOrThrow`), updates `status`/`position`, and **saves to
   MongoDB**. Persist happens **before** any broadcast.
5. **Server — broadcast.** The controller calls `emitToProject(projectId, 'task:moved',
   payload, originSocketId)` → `io.to('project:<id>').except(originSocketId).emit(...)`.
   A is **excluded** (already updated optimistically).
6. **Redis adapter — cross-instance fan-out.** The emit is published over **Redis pub/sub**.
   Every backend instance subscribed to that room delivers it to its **local** sockets — so B
   gets it even if B is connected to a *different* instance than A.
7. **Browser B — apply.** B's `useProjectSocket` `task:moved` handler calls
   `boardStore.applyMoved(...)`. The normalized store updates; the column re-renders. B sees
   the move in well under a second.
8. **Browser A — confirm/reconcile.** A's `PATCH` resolves `200` → nothing more to do. If it
   had **failed**, `rollback(snapshot)` restores the original position and an error banner shows.

**One sentence:** optimistic local move → REST persist (auth + validate + authorize + save) →
broadcast to the room except the originator → Redis fans it across instances → other clients
apply it to the same normalized store they render.

---

## 2. One backend API, line-by-line — the task status-move route

**Route** (`src/routes/task.routes.js`):
```js
taskItemRouter.patch('/:taskId/status', validate(moveTaskSchema), taskController.move);
```
- `PATCH` — partial update of one field-group (status/position), not a full replace.
- `validate(moveTaskSchema)` — Zod middleware: `status` must be an enum value and/or `position`
  a number; `.refine` rejects an empty body. Invalid input never reaches the controller.
- `requireAuth` ran earlier (`taskItemRouter.use(requireAuth)`), so `req.user` exists here.

**Controller** (`src/controllers/task.controller.js`):
```js
move: catchAsync(async (req, res) => {
  const task = await taskService.move(req.params.taskId, req.user.id, req.body);  // (1)
  emitToProject(                                                                  // (2)
    task.project,
    SOCKET_EVENTS.TASK_MOVED,
    { taskId: task.id, status: task.status, position: task.position, projectId: task.project },
    originSocket(req)                                                             // (3)
  );
  ok(res, { task });                                                             // (4)
});
```
- `catchAsync` — wraps the async fn so any throw forwards to the central error handler (no try/catch here).
- **(1)** Delegate to the service — the controller has **no** business logic and never touches Mongoose.
- **(2)** **After** the DB write succeeds, broadcast the committed result to the project room.
- **(3)** `originSocket(req)` = `req.headers['x-socket-id']` → the originator is excluded from the echo.
- **(4)** `ok()` returns the standard `{ success: true, data }` envelope.

**Service** (`src/services/task.service.js`):
```js
async function move(taskId, userId, { status, position }) {
  const task = await getByIdAuthorized(taskId, userId);  // load + authorize (member of its project)
  if (status !== undefined) task.status = status;
  if (position !== undefined) task.position = position;
  await task.save();                                     // single-document write
  return task;
}
```
- `getByIdAuthorized` centralizes the **authorization** (throws 403/404 if not a member) — so
  authz isn't duplicated across REST and sockets.
- Only the changed fields are set; **one** document is written (the float `position` is why a
  reorder doesn't renumber the whole column).

---

## 3. One socket event's full lifecycle — `task:moved`

- **Connection setup.** Client builds the socket with `auth: { token }` (`socket/socket.js`).
  Server `io.use(socketAuth)` verifies the JWT once per connection → `socket.user`. Unauthenticated
  handshakes are rejected before any handler is wired.
- **Subscribe.** On opening the board, `useProjectSocket` emits `join-project { projectId }`.
  The server handler **re-checks membership** (`getMemberProjectOrThrow`) then `socket.join('project:<id>')`.
  (Handshake proves *who*; join proves *allowed in this room*.)
- **Emit.** `task:moved` is **not** sent by clients — it originates server-side after the REST
  `PATCH` persists, via `emitToProject(...)` → `io.to(room).except(originSocketId).emit('task:moved', payload)`.
- **Transport.** The Redis adapter publishes the room emit so all instances deliver to their local members.
- **Receive.** Each other client's `useProjectSocket` `task:moved` listener calls
  `boardStore.applyMoved({ taskId, status, position })`; React re-renders the affected columns.
- **Teardown.** On unmount the hook emits `leave-project` and removes all listeners; on disconnect
  Socket.IO auto-removes the socket from its rooms.

---

## 4. The most likely "why did you do it this way?" per decision

| Decision | Crisp answer |
|---|---|
| **Socket.IO over raw WS** | Rooms, auto-reconnect, heartbeats, transport fallback, and a first-class Redis adapter — all of which I'd otherwise hand-build on `ws`. |
| **Redis adapter** | With >1 backend instance behind the proxy, A and B may be on different instances; a plain `io.emit` only reaches local sockets. The adapter pub/subs each room emit so fan-out is correct cluster-wide. |
| **Zustand over Redux/Context** | Socket events arrive imperatively and frequently; I update a normalized store via `getState()` outside React's render cycle — no provider boilerplate, and no Context "re-render every consumer" storm. |
| **Optimistic UI + reconciliation** | The actor gets instant drag feedback; observers render only server-confirmed events. On a failed PATCH I roll back to a snapshot — snappy without ever showing other users uncommitted state. |
| **Persist-then-broadcast** | The DB write precedes the emit, so a late-joiner's REST load can never disagree with the live stream. |
| **Service layer owns Mongoose** | Controllers stay thin and testable; authorization lives in one place and is reused by both REST and sockets. |
| **Zod validation** | Schema-first, type-inferred, reusable; one `validate()` middleware guards every endpoint with a consistent error shape. |
| **JWT (stateless)** | No session store to bottleneck horizontal scaling. Trade-off I'd name: revocation needs a denylist — Redis is already wired for it. |
| **Float `position`** | Reorder = write one document (midpoint of neighbours) instead of renumbering the column. Known edge case: floats can get dense after many inserts → a background renormalize pass. |
| **`x-socket-id` header** | Lets the server exclude the originator from its own echo while still broadcasting to everyone else over REST-triggered emits. |
| **Per-project roles** | A user can be admin of one project and member of another — matches how real PM tools model permissions. |

---

## 5. A realistic "mistake I hit and fixed" (for the Loom video)

**The bug:** When I first wired it up, the user who *moved* a card saw it **jump twice** — once
from the optimistic update, then again when the server's `task:moved` echo arrived and re-applied
the same change. With fast drags it occasionally produced a brief flicker / wrong-order flash.

**Root cause:** I was broadcasting with `io.to(room).emit(...)`, which includes the sender.

**The fix:** the frontend sends its socket id as an `x-socket-id` header on every mutation, and
the server emits with `io.to(room).except(originSocketId).emit(...)`. The originator is now
skipped — it keeps its optimistic state — while everyone else still gets the update. This also
made me articulate the cleaner mental model: *the actor owns optimistic state; observers are
server-confirmed.*

**Why it's a good story:** it shows understanding of the optimistic-update pitfall (double
application), a concrete fix, and that the fix sharpened the overall design — exactly the kind
of trade-off reasoning a reviewer wants to hear.
