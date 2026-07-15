import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import * as db from './db.ts'
import { subscribe } from './sse.ts'
import { runAgent, agentsConfigured } from './agent/runner.ts'
import { fetchJiraIssues, postSlack } from './integrations.ts'
import type { User } from './db.ts'
import type { Agent, Project, Ticket } from './types.ts'

const COOKIE = 'orch_session'
const app = Fastify({ logger: false })
await app.register(cors, { origin: true, credentials: true })
await app.register(cookie)

// Resolve the current user from the session cookie and require it on /api
// routes (except health + auth). Handlers read (req as any).user.
app.addHook('preHandler', async (req, reply) => {
  const url = req.url.split('?')[0]
  const isAuth = url.startsWith('/api/auth/') || url === '/api/health'
  const token = (req.cookies as any)?.[COOKIE]
  const user = db.userForSession(token)
  ;(req as any).user = user
  if (url.startsWith('/api/') && !isAuth && !user) {
    reply.code(401).send({ message: 'Nicht angemeldet.' })
  }
})

const uid = (req: any): string => (req.user as User).id

app.get('/api/health', async () => ({ ok: true, agentsConfigured: agentsConfigured() }))

// ---- auth ----
function setSession(reply: any, userId: string) {
  const token = db.createSession(userId)
  reply.setCookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
}

app.post('/api/auth/register', async (req, reply) => {
  const { email, name, password } = (req.body as any) || {}
  if (!email || !password) return reply.code(400).send({ message: 'E-Mail und Passwort erforderlich.' })
  if (String(password).length < 6) return reply.code(400).send({ message: 'Passwort muss mindestens 6 Zeichen haben.' })
  if (db.getUserByEmail(email)) return reply.code(409).send({ message: 'E-Mail ist bereits registriert.' })
  const user = db.createUser(email, name || email.split('@')[0], password)
  setSession(reply, user.id)
  return { user }
})

app.post('/api/auth/login', async (req, reply) => {
  const { email, password } = (req.body as any) || {}
  const user = db.verifyPassword(email || '', password || '')
  if (!user) return reply.code(401).send({ message: 'E-Mail oder Passwort falsch.' })
  setSession(reply, user.id)
  return { user }
})

app.post('/api/auth/logout', async (req, reply) => {
  db.deleteSession((req.cookies as any)?.[COOKIE])
  reply.clearCookie(COOKIE, { path: '/' })
  return { ok: true }
})

app.get('/api/auth/me', async (req) => ({ user: (req as any).user || null, agentsConfigured: agentsConfigured() }))

// ---- state ----
app.get('/api/state', async (req) => ({ ...db.getState(uid(req)), agentsConfigured: agentsConfigured() }))

// ---- projects ----
app.post('/api/projects', async (req) => { const p = req.body as Project; db.createProject(uid(req), p); return db.getProject(uid(req), p.id) })
app.patch<{ Params: { id: string } }>('/api/projects/:id', async (req) => { db.patchProject(uid(req), req.params.id, req.body as Partial<Project>); return db.getProject(uid(req), req.params.id) })

// ---- agents ----
app.post<{ Params: { id: string } }>('/api/projects/:id/agents', async (req) => { db.upsertAgent(uid(req), req.params.id, req.body as Agent); return db.getProject(uid(req), req.params.id) })
app.patch<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
  const patch = req.body as Partial<Agent>
  for (const p of db.getState(uid(req)).projects) {
    const a = p.agents.find((x) => x.id === req.params.id)
    if (a) { db.upsertAgent(uid(req), p.id, { ...a, ...patch }); return db.getProject(uid(req), p.id) }
  }
  return reply.code(404).send({ message: 'Agent nicht gefunden.' })
})

// ---- tickets ----
app.post<{ Params: { id: string } }>('/api/projects/:id/tickets', async (req) => {
  const t = req.body as Ticket
  db.upsertTicket(uid(req), req.params.id, t)
  const seq = req.headers['x-ticket-seq']
  if (typeof seq === 'string') db.setMeta(uid(req), 'ticketSeq', seq)
  return db.getProject(uid(req), req.params.id)
})
app.patch<{ Params: { id: string } }>('/api/tickets/:id', async (req, reply) => {
  const body = req.body as { status?: string; updated?: string }
  const cur = db.getTicket(uid(req), req.params.id)
  if (!cur) return reply.code(404).send({ message: 'Ticket nicht gefunden.' })
  if (body.status) db.setTicketStatus(uid(req), req.params.id, body.status, body.updated || 'gerade eben')
  return db.getTicket(uid(req), req.params.id)
})
app.post<{ Params: { id: string } }>('/api/tickets/:id/comment', async (req, reply) => {
  const { text } = req.body as { text: string }
  const t = db.appendActivity(uid(req), req.params.id, { type: 'user', time: 'gerade eben', action: 'kommentierte', text })
  if (!t) return reply.code(404).send({ message: 'Ticket nicht gefunden.' })
  return t
})
app.post<{ Params: { id: string } }>('/api/tickets/:id/plan-answer', async (req, reply) => {
  const { skill, q, a } = req.body as { skill: string; q: string; a: string }
  const t = db.appendActivity(uid(req), req.params.id, { type: 'user', phase: 'plan', planAnswer: true, skillName: skill, q, a, time: 'gerade eben', action: 'beantwortete ' + skill, text: '„' + q + '"  —  ' + a })
  if (!t) return reply.code(404).send({ message: 'Ticket nicht gefunden.' })
  return t
})

// ---- real KI agent run + live stream ----
app.post<{ Params: { id: string } }>('/api/tickets/:id/run', async (req, reply) => {
  if (!agentsConfigured()) return reply.code(503).send({ ok: false, message: 'ANTHROPIC_API_KEY nicht gesetzt — trage ihn in server/.env ein, um echte Agentenläufe zu aktivieren.' })
  runAgent(uid(req), req.params.id).catch(() => {})
  return { ok: true, started: true }
})
app.get<{ Params: { id: string } }>('/api/tickets/:id/stream', async (req, reply) => {
  reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' })
  reply.raw.write(`event: hello\ndata: {}\n\n`)
  subscribe(uid(req) + ':' + req.params.id, reply)
  return reply
})

// ---- skills ----
app.patch<{ Params: { name: string } }>('/api/skills/:name', async (req) => {
  const { installed } = req.body as { installed: boolean }
  db.setSkillInstalled(uid(req), req.params.name, installed)
  return db.getSkill(uid(req), req.params.name)
})
app.post('/api/skills/install', async (req) => {
  const { name } = req.body as { name: string }
  const clean = name.replace(/^https?:\/\//, '').replace(/^skills\.sh\//, '').replace(/\s+/g, '-').toLowerCase()
  const ex = db.getSkill(uid(req), clean)
  if (ex) { db.setSkillInstalled(uid(req), clean, true); return { skill: db.getSkill(uid(req), clean), created: false } }
  db.addSkill(uid(req), { name: clean, cat: 'Eigene', desc: 'Selbst installiert aus der skills.sh Registry.', installs: 'neu', installed: true })
  return { skill: db.getSkill(uid(req), clean), created: true }
})

// ---- integrations ----
app.get<{ Params: { id: string } }>('/api/projects/:id/jira-issues', async (req, reply) => {
  const p = db.getProject(uid(req), req.params.id)
  if (!p) return reply.code(404).send({ message: 'Projekt nicht gefunden.' })
  return fetchJiraIssues(p)
})
app.post<{ Params: { id: string } }>('/api/projects/:id/slack-test', async (req, reply) => {
  const p = db.getProject(uid(req), req.params.id)
  if (!p) return reply.code(404).send({ message: 'Projekt nicht gefunden.' })
  const { text } = (req.body as { text?: string }) || {}
  return postSlack(p, text || 'Testnachricht von Orchestra.')
})

const PORT = parseInt(process.env.PORT || '8787', 10)
app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`Orchestra API on http://localhost:${PORT}  (agents ${agentsConfigured() ? 'ON' : 'OFF — set ANTHROPIC_API_KEY'})  · demo login demo@orchestra.local / demo1234`)
})
