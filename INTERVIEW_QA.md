# Interview / Review Practice Q&A

Reviewer-style questions with simple model answers, based on the actual code.
Read the answer, then practice saying it in your own words (don't memorize word-for-word).

Tip: the honest-weakness answers (Q9, Q16) matter a lot — reviewers respect
"here is the limitation and the fix" more than pretending it is perfect.

---

## Architecture & design choices

### Q1. Why did you use both REST and WebSockets? Why not just one?
REST is for *doing* actions — login, create, move a task — request and response.
WebSockets are for *getting notified* when someone else changes something. WebSockets
alone would be messy for normal CRUD (no clean request/response, no status codes), and
REST alone can't *push* updates — the browser would have to keep asking "any changes?".
So I use each for what it is best at.

### Q2. Why Zustand for state, not Redux or Context?
Two reasons. First, my socket layer needs to update state from *outside* React components —
Zustand lets me do that with `getState()`, which is awkward with Context. Second, real-time
events fire often; with Context, every update re-renders every consumer. Zustand only
re-renders the components that use the changed data. It is also much less boilerplate than Redux.

### Q3. Walk me through what happens when User A moves a task.
The browser updates the card instantly (optimistic). It sends `PATCH /tasks/:id/status` over
REST. The backend checks the JWT, validates the input with Zod, checks A is a member of the
project, saves the change to MongoDB, then broadcasts a `task:moved` event to everyone else in
that project's room. User B's browser receives it and moves the card. User A is skipped from the
broadcast because they already moved it.

---

## Real-time

### Q4. What is "persist-then-broadcast" and why does the order matter?
It means save to the database *first*, then broadcast. The order matters because someone might
open the project later — they load from the database. If I broadcast before saving and the save
failed, live users would see one thing and the database another. Saving first guarantees the
database and live state always match.

### Q5. Why do you need Redis? The app works without it locally.
Locally I run one backend, so it is not strictly needed. But in production I might run multiple
backend copies behind a load balancer. Two users on the same project could be connected to
*different* copies. Redis passes the broadcast between copies so both deliver it. Without Redis,
a user on copy 1 would not see updates from a user on copy 2.

### Q6. What are "rooms" and why use them?
Each project has a room named `project:<projectId>`. When a broadcast happens, it only goes to
people in that room — not to every connected user on the whole app. It keeps updates private to
the project and avoids sending data to people who do not need it.

---

## Auth & security

### Q7. How does socket authentication work? Is it different from the REST auth?
Same idea, different place. For REST, the JWT comes in the `Authorization` header and
`requireAuth` middleware checks it. For sockets, the JWT is sent in the connection handshake
(`handshake.auth.token`), and `socketAuth` (registered with `io.use()`) checks it once when the
connection opens. If invalid, the connection is rejected before any event runs.

### Q8. After the socket is authenticated, why do you check membership AGAIN on join-project?
Because they are two different questions. The handshake proves *who* you are. Joining a project
room asks *are you allowed in this specific project*. Without the second check, any logged-in
user could subscribe to any project's live updates just by sending its id. So `join-project`
re-verifies membership before joining the room.

### Q9. (Tough) What is a security weakness in your current auth?
JWTs cannot be revoked before they expire. If a token is stolen, it stays valid until expiry —
there is no logout/denylist on the server yet. The clean fix is a Redis denylist of revoked
tokens, checked on each request. My design is ready for it since Redis is already there, but I
have not built it yet.

---

## Database & the code

### Q10. How do you order tasks in a column? What happens with many reorders?
Each task has a `position` number (a float). To drop a card between two cards, I set its position
to the *midpoint* of its neighbours — like between 1 and 2 I use 1.5. This means only **one**
document is updated, not the whole column. The trade-off: after very many reorders the gaps get
tiny and could need re-numbering, but for normal use it is fine.

### Q11. Why is the service layer separate from the controller?
The controller is thin — it just reads the request, calls the service, and shapes the response.
The service holds all the business logic and is the *only* layer that touches the database. This
keeps logic in one place, makes it reusable (tasks and projects share the same membership check),
and would make it testable without HTTP.

### Q12. How do you handle errors so controllers are not full of try/catch?
I wrap each controller in `catchAsync`, which catches any thrown error and passes it to one
central error-handling middleware. I throw a custom `AppError` with a code and message. So every
error comes out in the same shape `{ success: false, error: { code, message } }`, and controllers
stay clean.

### Q13. Where does input validation happen?
In a `validate` middleware using Zod, before the controller runs. Each endpoint has a schema —
for example, moving a task checks the status is one of the allowed values and the id is a valid
Mongo id. Bad input is rejected early with a clear message, so the service never receives garbage.

---

## The "gotcha" questions

### Q14. Why send x-socket-id? What breaks without it?
Without it, when I move a task, the server broadcasts the change back to *me* too — so my card
moves once from my optimistic update and again from the echo, causing a flicker. By sending my
socket id, the server uses `.except(socketId)` to skip me. I already applied the change; everyone
else gets it.

### Q15. What is the difference between optimistic and server-confirmed updates here?
The person making the change (the actor) updates the screen *immediately*, before the server
replies — that is optimistic, and feels instant. If the server rejects it, I roll back using a
saved snapshot. Other users (observers) only update when the server's confirmed event arrives —
they never guess. So the actor gets speed, observers get correctness.

### Q16. (Honest one) What would you improve or add next?
Three things: automated tests (the CI test stage is wired but empty), rate limiting on login to
stop brute-force, and token revocation for real logout. The architecture is solid; these are the
production-hardening steps.

---

## Files to have open while answering
- `backend/src/controllers/task.controller.js` — the thin controller
- `backend/src/services/task.service.js` — the business logic + DB
- `backend/src/sockets/socketAuth.js` — handshake auth
- `backend/src/sockets/taskHandlers.js` — join-project + room logic
- `backend/src/sockets/realtime.js` — emitToProject (the broadcast point)
- `README.md` — architecture diagram + design decisions
