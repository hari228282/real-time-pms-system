# Learn MERN With This Project (Beginner Friendly)

This guide teaches you the whole project in **simple English**. Read it top to bottom.
By the end you will understand how every part works and *why* it was built that way.

Take your time. Open the real files next to this guide as you read each part.

---

## Table of Contents
1. [What is MERN?](#1-what-is-mern)
2. [The big picture (how everything connects)](#2-the-big-picture)
3. [The journey of one request](#3-the-journey-of-one-request)
4. [Backend explained, layer by layer](#4-backend-explained-layer-by-layer)
5. [Frontend explained, piece by piece](#5-frontend-explained-piece-by-piece)
6. [Full example: moving a task (frontend + backend together)](#6-full-example-moving-a-task)
7. [Key concepts you must know](#7-key-concepts-you-must-know)
8. [Glossary (simple definitions)](#8-glossary)
9. [How to keep learning (practice ideas)](#9-how-to-keep-learning)

---

## 1. What is MERN?

MERN is 4 technologies used together to build a full web app:

- **M — MongoDB**: the database. Where data is permanently saved (users, projects, tasks).
- **E — Express**: the backend framework (runs on Node.js). It handles requests and rules.
- **R — React**: the frontend. What the user sees and clicks in the browser.
- **N — Node.js**: the engine that runs JavaScript on the server (not in the browser).

Plus, this project adds two more:
- **Socket.IO** — for **real-time** (instant) updates between users.
- **Redis** — a fast in-memory store that helps real-time work across multiple servers.

**Simple analogy:** think of a restaurant.
- React = the dining area (what customers see).
- Express = the waiter (takes orders, brings food, follows rules).
- MongoDB = the storeroom (where ingredients are kept).
- Node.js = the kitchen (where the cooking happens).
- Socket.IO = a live announcement speaker ("Table 5's order is ready!").

---

## 2. The big picture

```
   BROWSER (React)                       SERVER (Node + Express)            DATA
 ┌──────────────────┐                  ┌──────────────────────┐      ┌─────────────┐
 │  Pages & buttons │  ── REST API ──► │  Routes → Controllers │ ───► │  MongoDB    │
 │  (what you see)  │  ◄── JSON ─────  │  → Services → Models  │ ◄─── │ (saved data)│
 │                  │                  │                       │      └─────────────┘
 │  Live updates    │  ◄═ WebSocket ═► │  Socket.IO server     │      ┌─────────────┐
 │  (auto refresh)  │                  │                       │ ◄──► │   Redis     │
 └──────────────────┘                  └──────────────────────┘      └─────────────┘
```

The browser talks to the server in **two ways**:
1. **REST API** (normal requests) — "create this task", "log me in". You ask, server answers.
2. **WebSocket** (always-open line) — server can *push* "someone moved a task!" without being asked.

---

## 3. The journey of one request

When you do something (like create a task), the request travels through layers.
This is the most important idea in the backend:

```
Request → Route → Middleware (auth + validation) → Controller → Service → Model → MongoDB
                                                                    │
Response ◄──────────────────────────────────────────────────────── ┘
```

Each layer has ONE job:
- **Route** = the address. "POST /api/tasks goes here."
- **Middleware** = security check at the door (Are you logged in? Is your data valid?).
- **Controller** = the receptionist. Takes the request, calls the right service, sends a reply.
- **Service** = the brain. All the real logic and rules live here. Only this layer talks to the DB.
- **Model** = the shape of the data + the actual database calls.

**Why split it like this?** So each file is small and does one thing. If something breaks,
you know exactly where to look. This is called **separation of concerns**.

---

## 4. Backend explained, layer by layer

Folder: `backend/src/`

### 4.1 `server.js` — the starting point
This is the first file that runs. It does things **in order**:
1. Connect to MongoDB.
2. Connect to Redis.
3. Attach the Socket.IO server.
4. Start listening for requests on a port.

It connects to the database FIRST, then starts accepting requests — so the app never
takes orders before the kitchen is ready. It also handles **graceful shutdown** (closing
connections cleanly when the server stops).

### 4.2 `config/` — settings and connections
- `index.js` — reads settings from environment variables (`.env`) and **validates** them with Zod.
  If `MONGO_URI` or `JWT_SECRET` is missing, the app refuses to start with a clear error.
  This is why there are **no hardcoded values** — everything comes from one safe place.
- `db.js` — connects to MongoDB.
- `redis.js` — connects to Redis (pub/sub for real-time + caching).

**Lesson:** never write secrets (passwords, URLs) directly in code. Put them in `.env` and
read them from a config file. The `.env.example` file shows what variables are needed.

### 4.3 `models/` — the shape of your data (Mongoose schemas)
A **model** describes what a document looks like in MongoDB and gives helper methods.

- **`user.model.js`**
  - Fields: `name`, `email` (unique), `passwordHash`.
  - `passwordHash` has `select: false` → it is **never** sent back in queries by default.
    This stops you from accidentally leaking the password hash.
  - `setPassword()` hashes the password with **bcrypt** (so we never store the real password).
  - `comparePassword()` checks a login attempt against the stored hash.
  - `toJSON` transform deletes `passwordHash` and `__v` from any output. Safety again.

- **`task.model.js`**
  - Fields: `project`, `title`, `description`, `status` (todo/in_progress/done), `assignee`,
    `position`, `createdBy`.
  - `position` is a **number (float)** used for ordering cards. (Explained in section 7.)
  - **Indexes** (`taskSchema.index(...)`) make the "load all tasks for a project" query fast.

- **`project.model.js`**
  - Fields: `name`, `owner`, and `members` (a small embedded list of `{ user, role }`).
  - Members are stored **inside** the project document because they are small and always read
    together with the project. This is a MongoDB design choice (embed vs. reference).

**Lesson:** a schema is a contract. It enforces required fields, types, allowed values
(`enum`), and uniqueness — so bad data can't get into the database.

### 4.4 `validators/` — checking the incoming data (Zod)
Before any logic runs, we check the request is valid. Example: when moving a task, the new
`status` must be one of `todo`, `in_progress`, `done`, and the id must be a real Mongo id.

If the data is wrong, it is rejected immediately with a clear message — the controller and
service never receive garbage. **Validate early, fail fast.**

### 4.5 `middleware/` — code that runs *between* the request and the controller
Middleware are functions that run in the middle of the request journey.

- **`auth.middleware.js` (`requireAuth`)** — reads the `Authorization: Bearer <token>` header,
  verifies the JWT, and attaches `req.user = { id, email }`. If the token is missing or bad,
  the request is stopped with 401. This answers **"who are you?"**.
- **`validate.middleware.js`** — runs a Zod schema against the request. On success it replaces
  the request data with the clean, parsed version. On failure the error goes to the error handler.
- **`error.middleware.js`** — the ONE place all errors become responses. It turns different
  error types (Zod errors, Mongoose errors, our custom `AppError`) into one consistent shape:
  `{ success: false, error: { code, message } }`. In production it hides internal details.

**Lesson:** middleware lets you reuse logic (auth, validation, error handling) across many
routes without repeating yourself.

### 4.6 `controllers/` — thin coordinators
A controller reads the validated request, calls a service, and sends the response. **That's it.**
No business logic, no database code. Example (`auth.controller.js`):
```js
register: catchAsync(async (req, res) => {
  const result = await authService.register(req.body); // service does the work
  created(res, result);                                // send 201 + data
}),
```
`catchAsync` is a small wrapper so we don't write `try/catch` everywhere — any error is
automatically forwarded to the central error handler.

### 4.7 `services/` — the brain (business logic + the only layer touching the DB)
This is where the real rules live. Example (`auth.service.js → register`):
1. Check if the email already exists → if yes, throw a "conflict" error.
2. Create the user and hash the password.
3. Save to the database.
4. Make a JWT token and return it.

The `task.service.js` shows another key pattern: **centralized authorization**. Every task
operation first calls `projectService.getMemberProjectOrThrow(...)` to confirm the user is a
member of that project. So permission checking is written once and reused everywhere — you
can never forget it.

**Lesson:** keep controllers thin and put logic in services. It makes the logic reusable and
testable, and keeps database code in one layer.

### 4.8 `utils/` — small reusable helpers
- **`AppError.js`** — a custom error class with a status code and message. Lets you write
  `throw AppError.notFound('Task not found')` anywhere, cleanly.
- **`catchAsync.js`** — wraps async controllers so errors auto-forward (no try/catch needed).
- **`jwt.js`** — one place to **sign** (create) and **verify** tokens. Both REST and sockets
  use the same functions, so a token works identically everywhere.
- **`apiResponse.js`** — `ok()` and `created()` send the standard success shape
  `{ success: true, data }`. One consistent response format for the whole app.

### 4.9 `sockets/` — the real-time part
- **`socketAuth.js`** — like `requireAuth` but for WebSockets. It runs once when a socket
  connects and checks the JWT from the handshake. No token = connection rejected.
- **`taskHandlers.js`** — handles `join-project` / `leave-project`. When you open a project,
  your socket **joins a room** named `project:<id>` — but only after re-checking you are a
  member. Task changes themselves go over REST, not sockets (the socket is just a subscription).
- **`realtime.js`** — holds the Socket.IO instance and exposes `emitToProject(...)`, the helper
  controllers use to **broadcast** an event to everyone in a project room (except the originator).
- **`index.js`** — builds the Socket.IO server, attaches the Redis adapter (for scaling), and
  wires auth + handlers.

### 4.10 `app.js` — assembling Express
This puts the app together: security headers (`helmet`), CORS, JSON body parsing, a `/health`
check, the feature routes (`/api/auth`, `/api/projects`, `/api/tasks`), and finally the 404 +
error handlers (which must come **last**).

---

## 5. Frontend explained, piece by piece

Folder: `frontend/src/`

### 5.1 `main.jsx` — the starting point
Mounts the React app into the page and wraps it in `BrowserRouter` (for page navigation/URLs).

### 5.2 `App.jsx` — the routes (which page shows for which URL)
- `/login` → Login page
- `/projects` → Project list (protected)
- `/projects/:projectId` → Task board (protected)

"Protected" means you must be logged in. `ProtectedRoute` checks for a token and redirects to
`/login` if you don't have one.

### 5.3 `api/` — the clean way to talk to the backend
- **`axios.js`** — one configured axios instance for the whole app. Its **interceptors** are
  the single place that:
  - adds your JWT token to every request automatically,
  - adds your `x-socket-id` header (so the server can skip echoing your own change back),
  - unwraps the `{ success, data }` envelope so you get `data` directly,
  - on a 401 (expired token), logs you out automatically.
- **`projects.api.js` / `tasks.api.js`** — small functions like `tasksApi.move(id, payload)`.
  Components call these instead of writing URLs everywhere.

**Lesson:** putting all API calls behind one module (an "abstraction layer") means if the API
changes, you fix it in one place. Components don't know about URLs or headers.

### 5.4 `socket/socket.js` — one shared WebSocket connection
Keeps a single socket for the whole app (not one per component). It sends the JWT in the
handshake so the server can authenticate. Helpers: `connectSocket`, `disconnectSocket`,
`getSocketId`.

### 5.5 `store/` — state management with Zustand
State = the data the UI shows. Zustand is a small, simple state library.

- **`authStore.js`** — holds `token` and `user`. It is **persisted to localStorage**, so a
  page refresh keeps you logged in. The axios and socket layers read the token from here.
- **`boardStore.js`** — holds the tasks for the open project. Important design choices:
  - Tasks are stored **normalized**: a map `byId = { taskId: task }`, not three arrays.
    Why? Because both drag actions and socket events target one task by id — a map gives an
    instant O(1) lookup instead of searching arrays.
  - The columns (Todo / In Progress / Done) are **derived** at render time by `selectColumns()`.
  - It has **convergent mutations** (`upsertTask`, `applyMoved`, `removeTask`) used by BOTH
    your own actions AND incoming socket events — so live updates and local changes flow
    through the exact same code and never disagree.
  - **Optimistic move + rollback**: `optimisticMove` applies the change instantly and returns
    a snapshot; if the server rejects it, `rollback` restores the snapshot.

### 5.6 `hooks/useProjectSocket.js` — the socket "glue"
This custom hook is the ONE place components use the socket. Given a `projectId` it:
1. connects the socket (with your token),
2. joins the project room (and re-joins automatically after a reconnect),
3. listens for `task:created / updated / moved / deleted` and writes them into the board store,
4. cleans up its listeners and leaves the room when you leave the page.

Components never call `socket.on(...)` directly — they just render the store. Clean and safe.

### 5.7 `pages/` — the 3 screens
- **`LoginPage.jsx`** — register/login form (controlled inputs), calls the auth API, saves the
  token to the auth store, redirects to `/projects`.
- **`ProjectListPage.jsx`** — lists your projects, lets you create one.
- **`TaskBoardPage.jsx`** — the main board. Loads tasks over REST, subscribes to live updates
  via `useProjectSocket`, renders 3 columns with drag-and-drop, and handles the move logic
  (optimistic update → save → rollback on failure). This is also where the "Add member" form lives.

### 5.8 `components/` — reusable building blocks
- `ui/Button.jsx`, `ui/Input.jsx`, `ui/Spinner.jsx`, `ui/ErrorBanner.jsx` — small reusable
  pieces used across pages. Built once, used many times. This is "reusable components".
- `Column.jsx`, `TaskCard.jsx` — the board's column and card.
- `ProtectedRoute.jsx` — wrapper that blocks pages if you're not logged in.

**Lesson:** a "controlled form" means React state holds the input's value (`value={x}` +
`onChange`). React is the single source of truth for what's typed.

---

## 6. Full example: moving a task

Let's connect everything. User A drags a task from **Todo → In Progress**:

**On the frontend:**
1. `TaskBoardPage`'s `onDragEnd` runs. It calculates the new column + position.
2. It calls `optimisticMove(...)` → the card moves **instantly** on screen (and saves a snapshot).
3. It calls `tasksApi.move(taskId, { status, position })` → a `PATCH` request to the backend.
   (axios auto-adds the JWT and the `x-socket-id` header.)

**On the backend:**
4. **Route** `/api/tasks/:taskId/status` runs `requireAuth` (checks JWT) → `validate` (checks input).
5. **Controller** `move` calls the service.
6. **Service** `move` checks A is a member of the project, then updates the task and **saves to MongoDB**.
7. **Controller** then calls `emitToProject(...)` → broadcasts a `task:moved` event to everyone
   in `project:<id>`, **except** User A (using `x-socket-id`).
8. **Controller** sends the saved task back as the HTTP response.

**Back on other users' screens (User B):**
9. User B's `useProjectSocket` is listening for `task:moved`. It receives the event and calls
   `applyMoved(...)` on the board store → React re-renders → the card moves on B's screen, with
   no refresh.

**If the save failed** (e.g. network error), User A's `catch` runs `rollback(snapshot)` and the
card snaps back. This is **persist-then-broadcast** + **optimistic UI** working together.

---

## 7. Key concepts you must know

### REST vs WebSocket
- **REST** = request/response. Best for actions (login, create, update).
- **WebSocket** = always-open two-way line. Best for the server *pushing* updates instantly.
- This app uses REST to *change* data and WebSockets to *notify* others about changes.

### JWT (JSON Web Token)
A signed token the server gives you when you log in. You send it back on every request to prove
who you are. The server can verify it without storing sessions — this is **stateless auth**,
which scales well. (Weakness: you can't cancel a token before it expires without extra work.)

### Hashing passwords (bcrypt)
We never store real passwords. We store a one-way **hash**. On login we hash the attempt and
compare. Even if the database leaks, real passwords are not exposed.

### Authentication vs Authorization
- **Authentication** = "Who are you?" (checking the JWT). Done by `requireAuth` / `socketAuth`.
- **Authorization** = "Are you allowed to do this?" (are you a member of this project). Done in
  the service layer. They are **two different checks** — the project does both.

### Service layer pattern
Controllers stay thin; all logic + database access lives in services. Reusable and testable.

### Normalized state + derived data (frontend)
Store data by id in a map (fast lookups). Compute the display shape (columns) when rendering.
Avoids bugs where the same task exists in two places and they get out of sync.

### Optimistic UI
Update the screen immediately (don't wait for the server) for a snappy feel, and roll back if
the server says no. Great UX, but you must handle the failure case.

### Float positions for ordering
Each card has a `position` number. To drop between card `1` and card `2`, set position `1.5`.
Only **one** card's document changes (not the whole column) — efficient. Trade-off: after many
moves the gaps shrink and may need re-numbering eventually.

### Redis adapter (scaling real-time)
If you run multiple backend copies, two users might be on different copies. Redis passes
broadcasts between them so everyone gets the update. Without it, real-time breaks when scaled.

---

## 8. Glossary

- **API**: a set of URLs the backend exposes for the frontend to use.
- **Endpoint**: one specific API URL + method, e.g. `POST /api/auth/login`.
- **Middleware**: a function that runs during a request, before the controller.
- **Schema/Model**: the defined shape of data in MongoDB (via Mongoose).
- **Index** (DB): a structure that makes certain queries fast.
- **JWT**: a signed token proving who you are.
- **Hash**: a one-way scramble of a password.
- **CORS**: browser security that controls which websites may call your API.
- **Room** (Socket.IO): a group of sockets that receive the same broadcasts.
- **Broadcast/emit**: sending an event to connected clients.
- **State**: the data the UI is currently showing.
- **Store**: where frontend state lives (here, Zustand).
- **Hook**: a reusable piece of React logic (functions starting with `use`).
- **Controlled input**: a form field whose value is held in React state.
- **Optimistic update**: updating the UI before the server confirms.
- **Environment variable**: a setting kept outside the code (in `.env`).

---

## 9. How to keep learning (practice ideas)

Do these IN the project — best way to learn:

**Easy**
1. Add a new field to a task (e.g. `priority`: low/medium/high). You'll touch: model → validator
   → service → frontend form → card display. This one change teaches the whole flow.
2. Add a "delete project" button on the project list page (the API already exists).

**Medium**
3. Show who created each task (the `createdBy` field) on the card.
4. Add a loading spinner state to the "Add member" button while it's saving.
5. Add the ability to **edit a task's title** by clicking it (use the existing `update` API).

**Harder (real skills)**
6. Add **token revocation**: a Redis denylist so logout actually invalidates the token.
7. Add **rate limiting** on `/auth/login` using `express-rate-limit` (stops brute-force).
8. Write your **first test** for `auth.service.js` (register + login) with Vitest or Jest.

**How to study any file you don't understand:**
- Read the comment at the top first — every file has one explaining its job.
- Follow one feature end-to-end (like section 6) instead of reading files randomly.
- Change one small thing and see what breaks. Breaking + fixing teaches fastest.

---

## Quick map of the whole project

```
backend/src/
  server.js        → starts everything (DB → Redis → sockets → listen)
  app.js           → assembles Express (security, routes, error handling)
  config/          → settings + DB/Redis connections (no hardcoded values)
  models/          → data shapes (User, Project, Task) + DB
  validators/      → check incoming data (Zod)
  middleware/      → auth, validation, error handling
  controllers/     → thin: take request, call service, send response
  services/        → the brain: all logic + the only layer touching the DB
  utils/           → small helpers (errors, jwt, response shape)
  sockets/         → real-time (auth, rooms, broadcast)

frontend/src/
  main.jsx         → mounts React
  App.jsx          → routes (which page for which URL)
  api/             → clean wrapper around backend calls (axios + interceptors)
  socket/          → one shared WebSocket connection
  store/           → state (authStore, boardStore) via Zustand
  hooks/           → useProjectSocket (the socket glue)
  pages/           → Login, ProjectList, TaskBoard
  components/      → reusable UI pieces + Column/TaskCard
```

You now have a full mental model of a real MERN app. Re-read section 6 until the end-to-end
flow feels obvious — that flow IS full-stack development.
