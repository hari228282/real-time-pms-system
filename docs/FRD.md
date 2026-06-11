# Functional Requirements Document (FRD)

**Project:** Internal Project Management System with Real-Time Task Collaboration
**Version:** 1.0
**Status:** Draft for approval (Phase 1)

---

## 1. Purpose & Overview

An internal tool where teams manage **Projects** and the **Tasks** inside them on a
Kanban-style board (**Todo → In Progress → Done**). Multiple users collaborate on the
same project simultaneously: when one user moves or edits a task, every other connected
user sees the change **instantly** (WebSockets), and a user who opens the project later
loads the **latest persisted state** from the database.

The system is the canonical source of truth; real-time is a delivery mechanism layered on
top of a persistent store — not a replacement for it.

---

## 2. Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Authentication** | Register, login, logout, "who am I" (`/me`). JWT-based, stateless. |
| F2 | **Project management** | Create / read / update / delete projects. Each project has an owner and a member list. |
| F3 | **Membership** | Project owner adds/removes members. Only members can view/act on a project's tasks. |
| F4 | **Task management** | CRUD tasks within a project. Each task has title, description, status, assignee, position/order. |
| F5 | **Status transitions** | Dedicated endpoint + socket event to move a task between columns (the core real-time action). |
| F6 | **Real-time sync** | All members in a project room receive task create/update/move/delete events live. |
| F7 | **Persistence + late join** | Opening a project fetches current state via REST; sockets keep it live thereafter. |
| F8 | **Optimistic UI** | Frontend applies the change locally first, then reconciles with the server-confirmed event. |

---

## 3. User Roles & Permissions

Roles are **scoped per project** (a user can be Admin of Project A and Member of Project B).
There is also a system-level distinction for account ownership.

| Capability | Project Admin / Owner | Project Member | Non-member |
|---|:---:|:---:|:---:|
| View project & its tasks | ✅ | ✅ | ❌ |
| Create / edit / delete tasks | ✅ | ✅ | ❌ |
| Move task between columns | ✅ | ✅ | ❌ |
| Update project metadata (name, description) | ✅ | ❌ | ❌ |
| Add / remove members | ✅ | ❌ | ❌ |
| Delete the project | ✅ (owner only) | ❌ | ❌ |
| Receive real-time events for the project | ✅ | ✅ | ❌ |

**Authorization model:**
- **Authentication** (who you are) → JWT middleware on REST, `io.use()` handshake on sockets.
- **Authorization** (what you may do) → ownership/membership checks in the **service layer**,
  enforced again at the socket `join-project` step so a user can't subscribe to a project's room
  without being a member.

---

## 4. Assumptions

1. Users are internal/trusted employees; no public sign-up gating or email verification needed for this scope.
2. A task belongs to exactly **one** project (no cross-project tasks).
3. Status set is fixed: `todo`, `in_progress`, `done` (enum, not user-defined columns).
4. "Latest state wins" for concurrent moves — last write is persisted; clients reconcile to the server event (no operational-transform/CRDT merging needed at this scale).
5. Single MongoDB database; Redis available for the Socket.IO adapter and light caching.
6. Reasonable team sizes (tens of members per project, hundreds of tasks) — pagination covers larger lists.
7. JWT stored client-side (in memory + refresh strategy noted in design); HTTPS everywhere in production.

---

## 5. Out of Scope (explicitly)

- User-configurable workflow columns / custom statuses.
- File attachments, comments/threads, @mentions, notifications email/push.
- Sub-tasks, task dependencies, Gantt charts, time tracking.
- Operational Transform / CRDT conflict resolution for simultaneous edits of the *same field*.
- Org/team hierarchy, billing, audit log, SSO/OAuth providers.
- Offline mode / full local-first sync.
- Mobile native apps (responsive web only).

These are noted so reviewers see the boundaries were a deliberate decision, not an oversight.

---

## 6. Success Criteria

- Two browsers logged in as different members of the same project: moving a task in one
  reflects in the other in **< 1s** without a refresh.
- Refreshing or joining late shows the **persisted** board state, identical to what others see.
- Unauthenticated REST calls and unauthenticated socket handshakes are **rejected**.
- A non-member cannot read a project's tasks nor join its socket room.
- All inputs validated; all errors returned in one consistent shape.
