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

Open http://localhost:5173. Without an `ANTHROPIC_API_KEY` the app is fully usable as a
persistent tool — only real agent **runs** are gated (the ticket shows a clear hint).
With a key set in `server/.env`, click **„Agent starten"** on a ticket and watch the
agent reason, call skills, and stream results into the thread.

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

## Status & roadmap

This is a phased build toward the full product:

- **Phase 1 — Backend + DB + persistence.** ✅ Done. Everything you do persists in SQLite;
  the frontend hydrates from the API.
- **Phase 2 — Real KI agents.** ✅ Done. Agents run tickets via the Claude API with tool
  use; activity streams live over SSE and is persisted. Skill *side effects* are currently
  illustrative (the model's reasoning is real) — wire individual skills to real integrations
  as needed in `server/src/agent/runner.ts`.
- **Phase 3 — Jira/Slack.** ✅ Real clients in place (`server/src/integrations.ts`), gated by
  credentials.
- **Phase 4 — Auth / multi-user + deployment.** ⏭ Next: sessions/accounts, Postgres (the
  repository is Postgres-portable), hosting, CI.

Ported from a Claude Design HTML/CSS/JS prototype; the frontend matches it pixel-for-pixel.
