# AI Usage Declaration

This project was built with AI assistance (Claude, via Claude Code), used as a senior-engineer
pair programmer. In the spirit of transparency, here is exactly where and how it was used — and
where the judgment remained mine.

## Where AI was used

- **Planning (Phase 1).** Drafting the FRD and System Design docs — structuring the
  requirements, the API table, the Mongoose schema with indexes, the socket event catalogue,
  and the Mermaid diagrams. I reviewed and approved these before any code was written.
- **Boilerplate & scaffolding.** Project structure, config loader, ESLint/Prettier configs,
  the Express assembly, and repetitive per-resource modules (validators, routes, API clients).
- **Implementation drafting.** First-pass code for the service layer, controllers, socket
  handlers, the Zustand stores, and the React components — then read line-by-line and adjusted.
- **DevOps artifacts.** The Nginx config (including the WebSocket `Upgrade` headers), the
  GitHub Actions workflow, and the deployment guide.
- **Documentation.** This README and the doc set.

## Where the judgment was mine (and I can defend it)

- **Architectural decisions** — Zustand over Redux/Context, Socket.IO over raw WS, the Redis
  adapter for horizontal scaling, optimistic-with-reconciliation, persist-then-broadcast,
  per-project roles, the float-`position` ordering scheme. Each is justified in
  `docs/SYSTEM_DESIGN.md` and the README; I understand the trade-offs.
- **Verification** — I ran lint + build for both apps and reviewed every file. I did not accept
  code I could not explain.

## Honesty note

AI accelerated the *typing*, not the *thinking*. Every decision in this codebase is one I can
explain and defend in a live review — which was the explicit goal from the start.
