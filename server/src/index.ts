import Fastify from 'fastify'
import cors from '@fastify/cors'
import * as db from './db.ts'
import { subscribe } from './sse.ts'
import { runAgent, agentsConfigured } from './agent/runner.ts'
import { fetchJiraIssues, postSlack } from './integrations.ts'
import type { Agent, Project, Ticket } from './types.ts'

const app = Fastify({ logger: false })
await app.register(cors, { origin: true })

app.get('/api/health', async () => ({ ok: true, agentsConfigured: agentsConfigured() }))

app.get('/api/state', async () => ({ ...db.getState(), agentsConfigured: agentsConfigured() }))

// ---- projects ----
app.post('/api/projects', async (req) => {
  const p = req.body as Project
  db.createProject(p)
  return db.getProject(p.id)
})

app.patch<{ Params: { id: string } }>('/api/projects/:id', async (req) => {
  db.patchProject(req.params.id, req.body as Partial<Project>)
  return db.getProject(req.params.id)
})

// ---- agents ----
app.post<{ Params: { id: string } }>('/api/projects/:id/agents', async (req) => {
  const a = req.body as Agent
  db.upsertAgent(req.params.id, a)
  return db.getProject(req.params.id)
})

app.patch<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
  const patch = req.body as Partial<Agent>
  // find the owning project + current agent, merge, upsert
  for (const p of db.getState().projects) {
    const a = p.agents.find((x) => x.id === req.params.id)
    if (a) { db.upsertAgent(p.id, { ...a, ...patch }, undefined); return db.getProject(p.id) }
  }
  return reply.code(404).send({ message: 'Agent nicht gefunden.' })
})

// ---- tickets ----
app.post<{ Params: { id: string } }>('/api/projects/:id/tickets', async (req) => {
  const t = req.body as Ticket
  db.upsertTicket(req.params.id, t)
  const seq = req.headers['x-ticket-seq']
  if (typeof seq === 'string') db.setMeta('ticketSeq', seq)
  return db.getProject(req.params.id)
})

app.patch<{ Params: { id: string } }>('/api/tickets/:id', async (req, reply) => {
  const body = req.body as { status?: string; updated?: string }
  const cur = db.getTicket(req.params.id)
  if (!cur) return reply.code(404).send({ message: 'Ticket nicht gefunden.' })
  if (body.status) db.setTicketStatus(req.params.id, body.status, body.updated || 'gerade eben')
  return db.getTicket(req.params.id)
})

app.post<{ Params: { id: string } }>('/api/tickets/:id/comment', async (req, reply) => {
  const { text } = req.body as { text: string }
  const t = db.appendActivity(req.params.id, { type: 'user', time: 'gerade eben', action: 'kommentierte', text })
  if (!t) return reply.code(404).send({ message: 'Ticket nicht gefunden.' })
  return t
})

app.post<{ Params: { id: string } }>('/api/tickets/:id/plan-answer', async (req, reply) => {
  const { skill, q, a } = req.body as { skill: string; q: string; a: string }
  const t = db.appendActivity(req.params.id, { type: 'user', phase: 'plan', planAnswer: true, skillName: skill, q, a, time: 'gerade eben', action: 'beantwortete ' + skill, text: '„' + q + '"  —  ' + a })
  if (!t) return reply.code(404).send({ message: 'Ticket nicht gefunden.' })
  return t
})

// ---- real KI agent run + live stream ----
app.post<{ Params: { id: string } }>('/api/tickets/:id/run', async (req, reply) => {
  if (!agentsConfigured()) {
    return reply.code(503).send({ ok: false, message: 'ANTHROPIC_API_KEY nicht gesetzt — trage ihn in server/.env ein, um echte Agentenläufe zu aktivieren.' })
  }
  // fire-and-forget; progress arrives over the SSE stream
  runAgent(req.params.id).catch(() => { /* errors are surfaced as activity steps */ })
  return { ok: true, started: true }
})

app.get<{ Params: { id: string } }>('/api/tickets/:id/stream', async (req, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })
  reply.raw.write(`event: hello\ndata: {}\n\n`)
  subscribe(req.params.id, reply)
  // keep the connection open
  return reply
})

// ---- skills ----
app.patch<{ Params: { name: string } }>('/api/skills/:name', async (req) => {
  const { installed } = req.body as { installed: boolean }
  db.setSkillInstalled(req.params.name, installed)
  return db.getSkill(req.params.name)
})

app.post('/api/skills/install', async (req) => {
  const { name } = req.body as { name: string }
  const clean = name.replace(/^https?:\/\//, '').replace(/^skills\.sh\//, '').replace(/\s+/g, '-').toLowerCase()
  const ex = db.getSkill(clean)
  if (ex) { db.setSkillInstalled(clean, true); return { skill: db.getSkill(clean), created: false } }
  db.addSkill({ name: clean, cat: 'Eigene', desc: 'Selbst installiert aus der skills.sh Registry.', installs: 'neu', installed: true })
  return { skill: db.getSkill(clean), created: true }
})

// ---- integrations ----
app.get<{ Params: { id: string } }>('/api/projects/:id/jira-issues', async (req, reply) => {
  const p = db.getProject(req.params.id)
  if (!p) return reply.code(404).send({ message: 'Projekt nicht gefunden.' })
  return fetchJiraIssues(p)
})

app.post<{ Params: { id: string } }>('/api/projects/:id/slack-test', async (req, reply) => {
  const p = db.getProject(req.params.id)
  if (!p) return reply.code(404).send({ message: 'Projekt nicht gefunden.' })
  const { text } = (req.body as { text?: string }) || {}
  return postSlack(p, text || 'Testnachricht von Orchestra.')
})

const PORT = parseInt(process.env.PORT || '8787', 10)
app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`Orchestra API on http://localhost:${PORT}  (agents ${agentsConfigured() ? 'ON' : 'OFF — set ANTHROPIC_API_KEY'})`)
})
