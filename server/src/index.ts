import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import * as db from './db.ts'
import { subscribe } from './sse.ts'
import { runAgent, agentsConfigured, providerCatalog } from './agent/runner.ts'
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

app.get('/api/health', async () => ({ ok: true, agentsConfigured: await agentsConfigured() }))

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

app.get('/api/auth/me', async (req) => ({ user: (req as any).user || null, agentsConfigured: await agentsConfigured() }))

// ---- state ----
app.get('/api/state', async (req) => ({ ...db.getState(uid(req)), agentsConfigured: await agentsConfigured() }))

// ---- providers ----
// What can actually run here: Anthropic models the account may use (asked via
// the Models API) plus local CLIs found on PATH.
app.get('/api/providers', async () => providerCatalog())

// ---- projects ----
app.post('/api/projects', async (req) => { const p = req.body as Project; db.createProject(uid(req), p); return db.getProject(uid(req), p.id) })
app.patch<{ Params: { id: string } }>('/api/projects/:id', async (req, reply) => {
  const patch = req.body as Partial<Project>
  // The browser cannot see the server's filesystem, so the path is checked here.
  if (typeof patch.workdir === 'string' && patch.workdir.trim()) {
    const dir = patch.workdir.trim()
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      return reply.code(400).send({ message: `„${dir}" existiert nicht oder ist kein Verzeichnis.` })
    }
  }
  db.patchProject(uid(req), req.params.id, patch)
  return db.getProject(uid(req), req.params.id)
})

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

// ---- serve the built SPA (production single-unit) ----
// In dev, Vite serves the UI and proxies /api here, so WEB_DIR usually doesn't
// exist and this is skipped. In prod/Docker, WEB_DIR points at the built dist.
const WEB_DIR = process.env.WEB_DIR || resolve(process.cwd(), '../dist')
if (existsSync(WEB_DIR)) {
  await app.register(fastifyStatic, { root: WEB_DIR, wildcard: false })
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ message: 'Nicht gefunden.' })
    return reply.sendFile('index.html') // SPA fallback
  })
  console.log(`Serving frontend from ${WEB_DIR}`)
}

const PORT = parseInt(process.env.PORT || '8787', 10)
app.listen({ port: PORT, host: '0.0.0.0' }).then(async () => {
  const providers = await providerCatalog()
  const ready = providers.filter((p) => p.available)
  const summary = ready.length
    ? ready.map((p) => p.label).join(', ')
    : 'keine — ANTHROPIC_API_KEY setzen oder eine lokale CLI installieren'
  console.log(`Orchestra API on http://localhost:${PORT}\n  Provider: ${summary}`)
})
