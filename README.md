# Orchestra — Agenten-Orchestrierung

A project-centric agentic orchestration app: create and manage agents per project,
install skills, run tickets through a fixed lifecycle, and follow each agent's work
as a live, phase-tabbed activity thread. Dark & light mode throughout.

Orchestra is a **full-stack** app:

- **Frontend** — React + Vite + TypeScript (ported pixel-for-pixel from a Claude Design
  prototype).
- **Backend** — Node + TypeScript + **Fastify**, with **SQLite** (via `better-sqlite3`)
  as the system of record. State persists across reloads and restarts.
- **Real KI agents** — agents actually run tickets via the **Claude API** (`@anthropic-ai/sdk`),
  reasoning and calling their installed skills as tools; activity streams live to the UI
  over **SSE**.
- **Integrations** — real Jira (import issues) and Slack (post messages) clients, activated
  by credentials.

## Quick start

Two processes: the API and the web app.

```bash
# 1) Backend
cd server
cp .env.example .env          # optional: fill in ANTHROPIC_API_KEY, Jira/Slack creds
npm install
npm run dev                   # http://localhost:8787  (seeds SQLite on first boot)

# 2) Frontend (separate terminal, from the repo root)
npm install
npm run dev                   # http://localhost:5173  (Vite proxies /api → :8787)
```

Open http://localhost:5173. You'll land on a **login screen** — register an account to get
your own empty workspace, then create your first project. Each user's data is fully isolated.

Without an `ANTHROPIC_API_KEY` the app is fully usable as a persistent tool — only real
agent **runs** are gated (the ticket shows a clear hint). With a key set in `server/.env`,
click **„Agent starten"** on a ticket and watch the agent reason, call skills, and stream
results into the thread.

### Configuration (`server/.env`)

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables real agent runs. |
| `ORCHESTRA_MODEL` | Model for runs (default `claude-opus-4-8`). |
| `JIRA_EMAIL` / `JIRA_API_TOKEN` | Jira REST auth (issue import). |
| `SLACK_BOT_TOKEN` | Slack `chat.postMessage`. |
| `PORT` / `DATABASE_FILE` | API port / SQLite file. |

Jira/Slack are also connected **per project** in the UI (Projekt-Einstellungen); the env
vars supply the credentials the server uses.

## What's included

- **Sidebar** — project switcher, nav, live-running tickets, theme toggle, settings.
- **Übersicht** — KPI stats, real-time activity feed, agents in the project.
- **Tickets (Kanban board)** — 5 columns, drag & drop, move menus, team avatars, blocked
  highlighting. Moves persist to the DB.
- **Ticket detail** — lifecycle stepper, "arbeitet gerade" / blocked banners, a phase-tabbed
  activity thread (Vorbereitung / Umsetzung / Prüfen) with agent thoughts, skill calls,
  code snippets, screenshot drop-zones, handoffs, errors; a planning terminal; a user
  comment composer; and **„Agent starten"** for a real run.
- **Agenten**, installable **Skills**, **Einstellungen**, and **Projekt-Einstellungen**
  (Jira/Slack, workflow roles, node-based phase-workflow editor, design.md, instructions,
  envs) — all persisted.

## Architecture

```
shared/seed.json          ← single source of truth for seed data (frontend + backend)
src/                      ← React frontend
  store/OrchestraContext  ← state + actions; hydrates from /api/state, persists mutations
  store/useDerived        ← view-model builder (renderVals port)
  store/api.ts            ← typed client for the backend
server/src/
  index.ts                ← Fastify routes
  db.ts                   ← SQLite schema, seed, repository
  agent/runner.ts         ← real Claude agent loop (tool use) + activity persistence
  sse.ts                  ← per-ticket Server-Sent-Events bus
  integrations.ts         ← Jira + Slack clients
```

The frontend holds optimistic local state and sends the same ids to the backend, which is
the system of record. Agent runs are fire-and-forget on `POST /api/tickets/:id/run`;
progress arrives on `GET /api/tickets/:id/stream` (SSE) and is written to SQLite as it
happens, so it survives reloads.

### API (selected)

Auth: `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` ·
`GET /api/auth/me`. All `/api/*` data routes require a session and are scoped to the user.

`GET /api/state` · `POST /api/projects` · `PATCH /api/projects/:id` ·
`POST /api/projects/:id/agents` · `POST /api/projects/:id/tickets` · `PATCH /api/tickets/:id` ·
`POST /api/tickets/:id/comment` · `POST /api/tickets/:id/plan-answer` ·
`POST /api/tickets/:id/run` · `GET /api/tickets/:id/stream` · `POST /api/skills/install` ·
`GET /api/projects/:id/jira-issues` · `POST /api/projects/:id/slack-test`

## Build

```bash
npm run build            # frontend (tsc + vite build)
cd server && npm run typecheck
```

## Deployment (single unit)

In production the whole app ships as **one process**: the Fastify server serves both
the API and the built frontend. Point `WEB_DIR` at the built `dist/` and the server
serves the SPA (with a fallback so client-side routes work); `/api/*` stays the API.

### Docker

```bash
cp server/.env.example .env      # optional: ANTHROPIC_API_KEY, Jira/Slack creds
docker compose up --build        # http://localhost:8787
```

- The image is a multi-stage build: build the frontend, install the (native)
  `better-sqlite3` server deps, then a slim runtime that runs the API and serves `dist/`.
- SQLite lives on the **`./data` volume** (`DATABASE_FILE=/data/orchestra.db`), so your
  data survives container rebuilds. No external database required.
- Register an account on first visit; each user gets an isolated workspace.

To run the same single-unit setup without Docker:

```bash
npm run build                                   # -> dist/
cd server && npm install
WEB_DIR=../dist DATABASE_FILE=./orchestra.db npm start
# http://localhost:8787 serves both the UI and the API
```

### CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: it typechecks + builds the
frontend, typechecks the server, and builds the Docker image.

## Status & roadmap

This is a phased build toward the full product:

- **Phase 1 — Backend + DB + persistence.** ✅ Done. Everything you do persists in SQLite;
  the frontend hydrates from the API.
- **Phase 2 — Real KI agents.** ✅ Done. Agents run tickets via the Claude API with tool
  use; activity streams live over SSE and is persisted. Only reasoning skills
  (`brainstorm`, `grillme`) ship today — they have no external side effect, so the tool
  result hands the work back to the model. Skills needing a real integration (search,
  mail, SQL) must be wired up in `server/src/agent/runner.ts` before being offered.
- **Phase 3 — Jira/Slack.** ✅ Real clients in place (`server/src/integrations.ts`), gated by
  credentials.
- **Phase 4a — Auth + Multi-User.** ✅ Done. Email+password accounts with cookie sessions
  (`server/src/db.ts`, `server/src/index.ts`); every user gets an isolated, empty workspace
  (data scoped by `owner_id` with composite primary keys).
- **Phase 4b — Deployment.** ✅ Done. Single-unit **Docker** image + `docker-compose.yml`
  (the API serves the built SPA), SQLite persisted on a volume, and **GitHub Actions CI**
  (frontend build, server typecheck, Docker build). SQLite stays the system of record — no
  external database needed.

Ported from a Claude Design HTML/CSS/JS prototype; the frontend matches it pixel-for-pixel.
