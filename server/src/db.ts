import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { AppState, Project, Agent, Ticket, Skill, ActivityStep } from './types.ts'

const DB_FILE = process.env.DATABASE_FILE || './orchestra.db'
const db = new Database(DB_FILE)
db.pragma('journal_mode = WAL')

// Per-user data isolation via an owner_id column and composite primary keys, so
// two users can both have e.g. "TCK-09" without collision.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, salt TEXT, pass_hash TEXT, created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id TEXT, expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS projects (
    owner_id TEXT, id TEXT, name TEXT, hue INTEGER,
    jira TEXT, slack TEXT, designMd TEXT, instructions TEXT,
    envs TEXT, jiraInbox TEXT, roles TEXT, flows TEXT, ord INTEGER,
    PRIMARY KEY (owner_id, id)
  );
  CREATE TABLE IF NOT EXISTS agents (
    owner_id TEXT, id TEXT, project_id TEXT, name TEXT, role TEXT, wf TEXT,
    provider TEXT, status TEXT, skills TEXT, hue INTEGER, ord INTEGER,
    PRIMARY KEY (owner_id, id)
  );
  CREATE TABLE IF NOT EXISTS tickets (
    owner_id TEXT, id TEXT, project_id TEXT, title TEXT, status TEXT, prio TEXT,
    agent_id TEXT, agent_ids TEXT, skill TEXT, elapsed TEXT, tokens TEXT,
    updated TEXT, descr TEXT, activity TEXT, plan_questions TEXT, plan TEXT,
    from_jira INTEGER, running INTEGER, ord INTEGER,
    PRIMARY KEY (owner_id, id)
  );
  CREATE TABLE IF NOT EXISTS skills (
    owner_id TEXT, name TEXT, cat TEXT, descr TEXT, installed INTEGER, ord INTEGER,
    PRIMARY KEY (owner_id, name)
  );
  CREATE TABLE IF NOT EXISTS meta ( owner_id TEXT, key TEXT, value TEXT, PRIMARY KEY (owner_id, key) );
`)

// Legacy migration: pre-auth databases had no owner_id. Detect and reset the
// data tables (dev-only; nothing was released with the old schema).
try {
  const cols = db.prepare(`PRAGMA table_info(projects)`).all() as { name: string }[]
  if (cols.length && !cols.some((c) => c.name === 'owner_id')) {
    db.exec('DROP TABLE IF EXISTS projects; DROP TABLE IF EXISTS agents; DROP TABLE IF EXISTS tickets; DROP TABLE IF EXISTS skills; DROP TABLE IF EXISTS meta;')
    // recreate with the new schema on next boot
    throw new Error('schema-reset')
  }
} catch (e: any) {
  if (e?.message === 'schema-reset') {
    // re-run creation
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (owner_id TEXT, id TEXT, name TEXT, hue INTEGER, jira TEXT, slack TEXT, designMd TEXT, instructions TEXT, envs TEXT, jiraInbox TEXT, roles TEXT, flows TEXT, ord INTEGER, PRIMARY KEY (owner_id, id));
      CREATE TABLE IF NOT EXISTS agents (owner_id TEXT, id TEXT, project_id TEXT, name TEXT, role TEXT, wf TEXT, provider TEXT, status TEXT, skills TEXT, hue INTEGER, ord INTEGER, PRIMARY KEY (owner_id, id));
      CREATE TABLE IF NOT EXISTS tickets (owner_id TEXT, id TEXT, project_id TEXT, title TEXT, status TEXT, prio TEXT, agent_id TEXT, agent_ids TEXT, skill TEXT, elapsed TEXT, tokens TEXT, updated TEXT, descr TEXT, activity TEXT, plan_questions TEXT, plan TEXT, from_jira INTEGER, running INTEGER, ord INTEGER, PRIMARY KEY (owner_id, id));
      CREATE TABLE IF NOT EXISTS skills (owner_id TEXT, name TEXT, cat TEXT, descr TEXT, installed INTEGER, ord INTEGER, PRIMARY KEY (owner_id, name));
      CREATE TABLE IF NOT EXISTS meta ( owner_id TEXT, key TEXT, value TEXT, PRIMARY KEY (owner_id, key) );
    `)
  }
}

const J = (v: unknown) => JSON.stringify(v ?? null)
const P = <T>(s: string | null | undefined, fb: T): T => {
  if (s == null) return fb
  try { return JSON.parse(s) as T } catch { return fb }
}

// ---------- users & sessions ----------
export interface User { id: string; email: string; name: string }

function hash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex')
}
export function createUser(email: string, name: string, password: string): User {
  const id = 'u' + randomBytes(8).toString('hex')
  const salt = randomBytes(16).toString('hex')
  db.prepare('INSERT INTO users (id,email,name,salt,pass_hash,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, email.toLowerCase(), name, salt, hash(password, salt), Date.now())
  seedForUser(id)
  return { id, email: email.toLowerCase(), name }
}
export function getUserByEmail(email: string): (User & { salt: string; pass_hash: string }) | null {
  const r = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) as any
  return r ? { id: r.id, email: r.email, name: r.name, salt: r.salt, pass_hash: r.pass_hash } : null
}
export function getUserById(id: string): User | null {
  const r = db.prepare('SELECT id,email,name FROM users WHERE id=?').get(id) as any
  return r || null
}
export function verifyPassword(email: string, password: string): User | null {
  const u = getUserByEmail(email)
  if (!u) return null
  const candidate = Buffer.from(hash(password, u.salt), 'hex')
  const known = Buffer.from(u.pass_hash, 'hex')
  if (candidate.length !== known.length || !timingSafeEqual(candidate, known)) return null
  return { id: u.id, email: u.email, name: u.name }
}
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30 // 30 days
export function createSession(userId: string): string {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(token, userId, Date.now() + SESSION_TTL)
  return token
}
export function userForSession(token: string | undefined): User | null {
  if (!token) return null
  const r = db.prepare('SELECT * FROM sessions WHERE token=?').get(token) as any
  if (!r || r.expires_at < Date.now()) return null
  return getUserById(r.user_id)
}
export function deleteSession(token: string | undefined) {
  if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token)
}

// ---------- seed a new user's workspace ----------
// A new user starts with an empty workspace: no projects, no tickets. Only the
// built-in planning skills are installed, since the plan flow depends on them.
function seedForUser(ownerId: string) {
  const seedPath = fileURLToPath(new URL('../../shared/seed.json', import.meta.url))
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as { projects: Project[]; skills: Skill[] }
  const tx = db.transaction(() => {
    seed.projects.forEach((p, i) => insertProjectRow(ownerId, p, i))
    seed.skills.forEach((s, i) => db.prepare(
      'INSERT OR REPLACE INTO skills (owner_id,name,cat,descr,installed,ord) VALUES (?,?,?,?,?,?)'
    ).run(ownerId, s.name, s.cat, s.desc, s.installed ? 1 : 0, i))
    db.prepare('INSERT OR REPLACE INTO meta (owner_id,key,value) VALUES (?,?,?)').run(ownerId, 'ticketSeq', '1')
  })
  tx()
}

function insertProjectRow(ownerId: string, p: Project, ord: number) {
  db.prepare(`INSERT OR REPLACE INTO projects
    (owner_id,id,name,hue,jira,slack,designMd,instructions,envs,jiraInbox,roles,flows,ord)
    VALUES (@owner_id,@id,@name,@hue,@jira,@slack,@designMd,@instructions,@envs,@jiraInbox,@roles,@flows,@ord)`).run({
    owner_id: ownerId, id: p.id, name: p.name, hue: p.hue, jira: J(p.jira), slack: J(p.slack),
    designMd: p.designMd || '', instructions: p.instructions || '',
    envs: J(p.envs || []), jiraInbox: J(p.jiraInbox || []), roles: J(p.roles || []),
    flows: J(p.flows || null), ord,
  })
  ;(p.agents || []).forEach((a, i) => upsertAgent(ownerId, p.id, a, i))
  ;(p.tickets || []).forEach((t, i) => upsertTicket(ownerId, p.id, t, i))
}

// ---------- writers (all owner-scoped) ----------
export function upsertAgent(ownerId: string, projectId: string, a: Agent, ord?: number) {
  const curOrd = ord ?? nextOrd(ownerId, 'agents', projectId)
  db.prepare(`INSERT OR REPLACE INTO agents
    (owner_id,id,project_id,name,role,wf,provider,status,skills,hue,ord)
    VALUES (@owner_id,@id,@project_id,@name,@role,@wf,@provider,@status,@skills,@hue,@ord)`).run({
    owner_id: ownerId, id: a.id, project_id: projectId, name: a.name, role: a.role, wf: a.wf || 'Sonstige',
    provider: a.provider, status: a.status, skills: J(a.skills || []), hue: a.hue, ord: curOrd,
  })
}

export function upsertTicket(ownerId: string, projectId: string, t: Ticket, ord?: number) {
  const curOrd = ord ?? nextOrd(ownerId, 'tickets', projectId)
  db.prepare(`INSERT OR REPLACE INTO tickets
    (owner_id,id,project_id,title,status,prio,agent_id,agent_ids,skill,elapsed,tokens,updated,descr,activity,plan_questions,plan,from_jira,running,ord)
    VALUES (@owner_id,@id,@project_id,@title,@status,@prio,@agent_id,@agent_ids,@skill,@elapsed,@tokens,@updated,@descr,@activity,@plan_questions,@plan,@from_jira,@running,@ord)`).run({
    owner_id: ownerId, id: t.id, project_id: projectId, title: t.title, status: t.status, prio: t.prio,
    agent_id: t.agentId ?? null, agent_ids: J(t.agentIds || null), skill: t.skill,
    elapsed: t.elapsed, tokens: t.tokens, updated: t.updated, descr: t.desc,
    activity: J(t.activity || []), plan_questions: J(t.planQuestions || null),
    plan: J(t.plan || null), from_jira: t.fromJira ? 1 : 0, running: t.running ? 1 : 0, ord: curOrd,
  })
}

function nextOrd(ownerId: string, table: 'agents' | 'tickets', projectId: string): number {
  const row = db.prepare(`SELECT COALESCE(MAX(ord),-1)+1 n FROM ${table} WHERE owner_id=? AND project_id=?`).get(ownerId, projectId) as { n: number }
  return row.n
}

export function patchProject(ownerId: string, id: string, patch: Partial<Project>) {
  const cur = getProjectRow(ownerId, id)
  if (!cur) return
  const merged = { ...cur, ...patch }
  db.prepare(`UPDATE projects SET
    name=@name, jira=@jira, slack=@slack, designMd=@designMd, instructions=@instructions,
    envs=@envs, jiraInbox=@jiraInbox, roles=@roles, flows=@flows WHERE owner_id=@owner_id AND id=@id`).run({
    owner_id: ownerId, id, name: merged.name, jira: J(merged.jira), slack: J(merged.slack),
    designMd: merged.designMd || '', instructions: merged.instructions || '',
    envs: J(merged.envs || []), jiraInbox: J(merged.jiraInbox || []),
    roles: J(merged.roles || []), flows: J(merged.flows || null),
  })
}

export function createProject(ownerId: string, p: Project) {
  const ord = (db.prepare('SELECT COALESCE(MAX(ord),-1)+1 n FROM projects WHERE owner_id=?').get(ownerId) as { n: number }).n
  insertProjectRow(ownerId, p, ord)
}

export function setTicketStatus(ownerId: string, id: string, status: string, updated: string) {
  db.prepare('UPDATE tickets SET status=?, updated=? WHERE owner_id=? AND id=?').run(status, updated, ownerId, id)
}

export function getTicket(ownerId: string, id: string): (Ticket & { projectId: string }) | null {
  const r = db.prepare('SELECT * FROM tickets WHERE owner_id=? AND id=?').get(ownerId, id) as any
  return r ? rowToTicket(r) : null
}

export function saveTicket(ownerId: string, t: Ticket & { projectId: string }) {
  upsertTicket(ownerId, t.projectId, t)
}

export function appendActivity(ownerId: string, id: string, step: ActivityStep): (Ticket & { projectId: string }) | null {
  const t = getTicket(ownerId, id)
  if (!t) return null
  t.activity = [...t.activity, step]
  upsertTicket(ownerId, t.projectId, t)
  return t
}

export function setSkillInstalled(ownerId: string, name: string, installed: boolean) {
  db.prepare('UPDATE skills SET installed=? WHERE owner_id=? AND name=?').run(installed ? 1 : 0, ownerId, name)
}
export function addSkill(ownerId: string, s: Skill) {
  const ord = (db.prepare('SELECT COALESCE(MAX(ord),-1)+1 n FROM skills WHERE owner_id=?').get(ownerId) as { n: number }).n
  db.prepare('INSERT OR REPLACE INTO skills (owner_id,name,cat,descr,installed,ord) VALUES (?,?,?,?,?,?)')
    .run(ownerId, s.name, s.cat, s.desc, s.installed ? 1 : 0, ord)
}
export function getSkill(ownerId: string, name: string): Skill | null {
  const r = db.prepare('SELECT * FROM skills WHERE owner_id=? AND name=?').get(ownerId, name) as any
  return r ? { name: r.name, cat: r.cat, desc: r.descr, installed: !!r.installed } : null
}

export function getMeta(ownerId: string, key: string): string | null {
  const r = db.prepare('SELECT value FROM meta WHERE owner_id=? AND key=?').get(ownerId, key) as { value: string } | undefined
  return r ? r.value : null
}
export function setMeta(ownerId: string, key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO meta (owner_id,key,value) VALUES (?,?,?)').run(ownerId, key, value)
}

// ---------- readers ----------
function getProjectRow(ownerId: string, id: string): Project | null {
  const r = db.prepare('SELECT * FROM projects WHERE owner_id=? AND id=?').get(ownerId, id) as any
  return r ? rowToProject(r) : null
}
function rowToProject(r: any): Project {
  return {
    id: r.id, name: r.name, hue: r.hue,
    jira: P(r.jira, { connected: false }), slack: P(r.slack, { connected: false }),
    designMd: r.designMd || '', instructions: r.instructions || '',
    envs: P(r.envs, []), jiraInbox: P(r.jiraInbox, []), roles: P(r.roles, []),
    flows: P(r.flows, null), agents: [], tickets: [],
  }
}
function rowToAgent(r: any): Agent {
  return { id: r.id, name: r.name, role: r.role, wf: r.wf, provider: r.provider, status: r.status, skills: P(r.skills, []), hue: r.hue }
}
function rowToTicket(r: any): Ticket & { projectId: string } {
  return {
    projectId: r.project_id, id: r.id, title: r.title, status: r.status, prio: r.prio,
    agentId: r.agent_id ?? undefined, agentIds: P(r.agent_ids, undefined as any),
    skill: r.skill, elapsed: r.elapsed, tokens: r.tokens, updated: r.updated, desc: r.descr,
    activity: P(r.activity, []), planQuestions: P(r.plan_questions, undefined as any),
    plan: P(r.plan, undefined as any), fromJira: !!r.from_jira, running: !!r.running,
  }
}

export function getProject(ownerId: string, id: string): Project | null {
  const p = getProjectRow(ownerId, id)
  if (!p) return null
  p.agents = (db.prepare('SELECT * FROM agents WHERE owner_id=? AND project_id=? ORDER BY ord').all(ownerId, id) as any[]).map(rowToAgent)
  p.tickets = (db.prepare('SELECT * FROM tickets WHERE owner_id=? AND project_id=? ORDER BY ord').all(ownerId, id) as any[]).map((r) => {
    const t = rowToTicket(r); delete (t as any).projectId; return t
  })
  return p
}

export function getState(ownerId: string): AppState {
  const projRows = db.prepare('SELECT id FROM projects WHERE owner_id=? ORDER BY ord').all(ownerId) as { id: string }[]
  const projects = projRows.map((r) => getProject(ownerId, r.id)!).filter(Boolean)
  const skills = (db.prepare('SELECT * FROM skills WHERE owner_id=? ORDER BY ord').all(ownerId) as any[]).map((r) => ({
    name: r.name, cat: r.cat, desc: r.descr, installed: !!r.installed,
  })) as Skill[]
  const ticketSeq = parseInt(getMeta(ownerId, 'ticketSeq') || '1', 10)
  return { projects, skills, ticketSeq }
}

export default db
