# Orchestra — Agenten-Orchestrierung

A project-centric agentic orchestration app: create and manage agents per project,
build a skills library, run tickets through a fixed lifecycle, and follow each agent's
work as a phase-tabbed activity thread. Dark & light mode throughout.

This is a React + Vite + TypeScript implementation of a design that was mocked up in
Claude Design. It was ported pixel-for-pixel from the exported HTML/CSS/JS prototype.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## What's included

- **Sidebar** — project switcher (with "Projekt-Einstellungen" and "Neues Projekt"),
  nav (Übersicht / Tickets / Agenten / Skills), live-running tickets, theme toggle,
  settings, user.
- **Übersicht (Dashboard)** — KPI stats, real-time activity feed, agents in the project.
- **Tickets (Kanban board)** — 5 columns (Backlog · Ready for Dev · In Arbeit · Review ·
  Fertig) with drag & drop, a "Verschieben nach" kebab menu, team avatars, provider and
  activity badges, and blocked tickets highlighted in red.
- **Ticket detail** — a fixed lifecycle stepper (Angelegt → Geplant → Freigegeben →
  Umsetzung → Geprüft), status dropdown, "arbeitet gerade daran" / blocked banners, a
  phase-tabbed activity thread (Vorbereitung / Umsetzung / Prüfen) with agent thoughts,
  skill calls, code snippets, screenshot drop-zones, handoffs and errors, a planning
  terminal (grillme / brainstorm) that records answers as comments, a user comment
  composer, and a right rail with the assignee team, meta, and the Umsetzungsplan.
- **Agenten** — cards with status, workflow role, provider badge (Cloud-API / Lokal CLI),
  and assigned skills, plus a create-agent slide-over.
- **Skills** — the `skills.sh` registry with install toggles and self-install.
- **Einstellungen** — theme (Hell / Dunkel / System) and providers.
- **Projekt-Einstellungen** — Jira & Slack integrations (with Jira import), self-defined
  workflow roles, a node-based per-phase workflow editor (React-Flow-style, dependency
  free), `design.md`, project instructions, and environment variables.
- **New-project wizard** — a 5-step assistant (Projekt · design.md · Anweisungen ·
  Integrationen · Umgebung).

## Architecture

The prototype was a single `DCLogic` state class with a `renderVals()` view-model builder.
The port preserves that shape for fidelity:

- `src/store/OrchestraContext.tsx` — the state + all action handlers (a faithful port of
  the `DCLogic` methods) exposed via React context.
- `src/store/useDerived.ts` — a direct port of `renderVals()`; builds every view model the
  components consume.
- `src/store/seed.ts` / `src/store/types.ts` — seed data and domain types.
- `src/lib/sx.ts` + `src/lib/H.tsx` — a CSS-string → style-object helper and a hoverable
  element wrapper, so the prototype's inline styles (and `style-hover`) port near-verbatim.
- `src/components/**` — one component per view, plus the modals.

All CSS variables (light/dark) and inline styles match the prototype so the visual output
is pixel-for-pixel.
