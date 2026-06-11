# Loom Video Script (8–10 minutes)

Simple talking script. Read it in your own words — don't read robot-like.
The assignment needs these 6 things, so the script is in 6 parts.

Tip: open these files in your editor before recording so you can point at them:
- `README.md` (architecture diagram)
- `backend/src/controllers/task.controller.js`
- `backend/src/services/task.service.js`
- `backend/src/sockets/taskHandlers.js`
- `backend/src/sockets/socketAuth.js`

---

## Part 0 — Intro (about 30 seconds)
"Hi, my name is ___. This is my Internal Project Management System — a real-time
task board, like Trello. Multiple users share a project, and when one person moves
a task, everyone else sees it move instantly. Let me walk you through how it works."

(Show the app: two windows side by side, drag a task, it moves in the other window.)

---

## Part 1 — System architecture & flow (about 1.5 minutes)
Open the README architecture diagram and explain it simply:

"The system has 4 parts:
1. **Frontend** — React with Vite. The user sees a Kanban board (Todo, In Progress, Done).
2. **Backend** — Node.js with Express. It handles the API and the WebSocket server.
3. **MongoDB** — the database. It permanently saves projects and tasks.
4. **Redis** — used so the real-time updates still work even if I run more than one backend.

The flow is: the browser talks to the backend in **two ways**.
- For normal actions (login, create task, move task) it uses **REST API** — request and response.
- For live updates it uses **WebSockets** — a constant open connection that pushes changes.

So REST is for *doing* things, WebSockets is for *getting notified* about things."

---

## Part 2 — Real-time communication design (about 1.5 minutes)
"The key idea is called **persist-then-broadcast**. When user A moves a task:
1. The change is sent to the backend over REST.
2. The backend **saves it to MongoDB first**.
3. Only AFTER saving, it **broadcasts** the change over WebSockets to everyone else in
   that project.

Why save first? Because if user C opens the project later, they load from the database.
If I broadcast before saving, the live users and the database could show different things.
Saving first keeps everyone consistent.

I also use **rooms**. Each project has its own room called `project:<projectId>`. The backend
only sends updates to people in that room — not to everyone on the whole app.

And I use **Redis** as an adapter. If I run two copies of the backend, two users might be
connected to different copies. Redis passes messages between them so both copies deliver the
update. Without Redis, real-time would break when scaling to more than one server."

---

## Part 3 — One backend API, line by line (about 2 minutes)
Use the **move task** API — it is the core action. Open `task.controller.js` and
`task.service.js`. Explain the journey of one request:

"Let's follow what happens when a task is moved. The URL is
`PATCH /api/tasks/:taskId/status`.

1. **Route** (`task.routes.js`): the request first passes through `requireAuth` — this checks
   the JWT token, so only logged-in users continue. Then `validate(moveTaskSchema)` checks the
   input with Zod — the new status must be one of todo/in_progress/done, etc. Bad input is
   rejected here before any logic runs.

2. **Controller** (`task.controller.js`, the `move` function): it's thin. It calls the service
   to do the real work, then broadcasts the result. It reads `x-socket-id` from the headers —
   I'll explain why in a moment.

3. **Service** (`task.service.js`, the `move` function): this is where the business logic lives.
   First it calls `getByIdAuthorized`, which finds the task AND checks that I'm a member of its
   project — so I can't move tasks in projects I'm not part of. Then it updates the status and
   position and saves to MongoDB. Only ONE document is written.

4. **Back in the controller**: after saving, it calls `emitToProject(...)` to broadcast a
   `task:moved` event to everyone else in the project room. Finally it sends the saved task back
   as the HTTP response.

So the layers are clean: route checks auth + input, controller coordinates, service holds the
logic and is the only part touching the database."

---

## Part 4 — One socket flow / event lifecycle (about 1.5 minutes)
Open `socketAuth.js` and `taskHandlers.js`. Explain the life of the `task:moved` event:

"Here is the full life of one real-time update.

1. **Connect**: when the frontend logs in, it opens a WebSocket and sends the JWT token in the
   handshake. On the server, `socketAuth.js` runs once and verifies that token. If it's invalid,
   the connection is rejected. If valid, it remembers who the user is on `socket.user`.

2. **Join a room**: when the user opens a project, the frontend sends a `join-project` event.
   In `taskHandlers.js`, the server re-checks that this user is actually a member of that project,
   then joins them to the room `project:<id>`. This second check matters — proving who you are is
   not the same as being allowed in this project.

3. **The update happens**: user A moves a task. That goes over REST (not the socket). The
   controller saves it, then broadcasts `task:moved` to the project room.

4. **Everyone else receives it**: user B's browser is listening for `task:moved`. When it
   arrives, it updates the Zustand store, and React re-renders — the card moves on screen with no
   refresh.

One detail: the person who made the change is **excluded** from the broadcast, using their
`x-socket-id`. That's the fix I'll talk about next."

---

## Part 5 — Deployment & infra setup (about 1 minute)
"For deployment:
- The **frontend** is on **Vercel** — it's made for React apps, free, and serves fast worldwide.
- The **backend** is on **Render** — because WebSockets need a real always-running server, which
  Vercel's serverless functions can't keep open. Render also gives me managed Redis.
- **MongoDB** is on MongoDB Atlas (cloud database).
- All secrets — database URL, JWT secret — are stored as **environment variables** in the
  dashboards, never hardcoded in the code.
- I also have a **GitHub Actions** pipeline that lints and builds both apps on every push, so
  broken code can't go live. Render and Vercel then auto-deploy when I push to main."

(If you set up a VM + Nginx + SSL instead, explain that here using deploy/DEPLOYMENT.md.)

---

## Part 6 — One technical mistake & fix (about 1 minute)
Use the "double update" problem — it's real and easy to explain:

"One problem I hit: when I moved a task, it **flickered on my own screen**. The card moved once
because I updated it instantly (optimistic update), and then it moved AGAIN because the server
broadcast the same change back to me. So I was getting my own update twice.

The fix: every time the frontend makes a change, it sends its own **socket id** in a header
called `x-socket-id`. When the backend broadcasts the event, it uses `.except(socketId)` to skip
the original sender. So now the person who made the change is not notified about their own change
— they already applied it. Everyone else still gets it. That removed the flicker."

(You can show `emitToProject` in `realtime.js` and the `x-socket-id` line in the controller.)

---

## Closing (about 15 seconds)
"That's my project — a real-time collaborative task board with clean separation between REST and
WebSockets, JWT auth on both, and a scalable design using Redis. Thanks for watching."

---

### Quick timing check
- Intro: 0:30
- Architecture: 1:30
- Real-time design: 1:30
- One API: 2:00
- One socket flow: 1:30
- Deployment: 1:00
- Mistake & fix: 1:00
- Closing: 0:15
**Total: ~9 minutes** ✅
