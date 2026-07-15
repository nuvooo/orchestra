import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AppState, Project, Agent, Ticket, Skill, ActivityStep } from './types.ts'

const DB_FILE = process.env.DATABASE_FILE || './orchestra.db'
const db = new Database(DB_FILE)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT, hue INTEGER,
    jira TEXT, slack TEXT, designMd TEXT, instructions TEXT,
    envs TEXT, jiraInbox TEXT, roles TEXT, flows TEXT, ord INTEGER
  );
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY, project_id TEXT, name TEXT, role TEXT, wf TEXT,
    provider TEXT, status TEXT, skills TEXT, hue INTEGER, ord INTEGER
  );
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY, project_id TEXT, title TEXT, status TEXT, prio TEXT,
    agent_id TEXT, agent_ids TEXT, skill TEXT, elapsed TEXT, tokens TEXT,
    updated TEXT, descr TEXT, activity TEXT, plan_questions TEXT, plan TEXT,
    from_jira INTEGER, running INTEGER, ord INTEGER
  );
  CREATE TABLE IF NOT EXISTS skills (
    name TEXT PRIMARY KEY, cat TEXT, descr TEXT, installs TEXT, installed INTEGER, ord INTEGER
  );
  CREATE TABLE IF NOT EXISTS meta ( key TEXT PRIMARY KEY, value TEXT );
`)

const J = (v: unknown) => JSON.stringify(v ?? null)
const P = <T>(s: string | null | undefined, fb: T): T => {
  if (s == null) return fb
  try { return JSON.parse(s) as T } catch { return fb }
}

// ---- seed on first boot ----
function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) c FROM projects').get() as { c: number }).c
  if (count > 0) return
  const seedPath = fileURLToPath(new URL('../../shared/seed.json', import.meta.url))
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as {
    projects: Project[]; skills: Skill[]
  }
  const tx = db.transaction(() => {
    seed.projects.forEach((p, i) => insertProjectRow(p, i))
    seed.skills.forEach((s, i) => db.prepare(
      'INSERT OR REPLACE INTO skills (name,cat,descr,installs,installed,ord) VALUES (?,?,?,?,?,?)'
    ).run(s.name, s.cat, s.desc, s.installs, s.installed ? 1 : 0, i))
    // ticket sequence starts above the seeded ids
    db.prepare('INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)').run('ticketSeq', '40')
  })
  tx()
}

function insertProjectRow(p: Project, ord: number) {
  db.prepare(`INSERT OR REPLACE INTO projects
    (id,name,hue,jira,slack,designMd,instructions,envs,jiraInbox,roles,flows,ord)
    VALUES (@id,@name,@hue,@jira,@slack,@designMd,@instructions,@envs,@jiraInbox,@roles,@flows,@ord)`).run({
    id: p.id, name: p.name, hue: p.hue, jira: J(p.jira), slack: J(p.slack),
    designMd: p.designMd || '', instructions: p.instructions || '',
    envs: J(p.envs || []), jiraInbox: J(p.jiraInbox || []), roles: J(p.roles || []),
    flows: J(p.flows || null), ord,
  })
  ;(p.agents || []).forEach((a, i) => upsertAgent(p.id, a, i))
  ;(p.tickets || []).forEach((t, i) => upsertTicket(p.id, t, i))
}

// ---- writers ----
export function upsertAgent(projectId: string, a: Agent, ord?: number) {
  const curOrd = ord ?? nextOrd('agents', projectId)
  db.prepare(`INSERT OR REPLACE INTO agents
    (id,project_id,name,role,wf,provider,status,skills,hue,ord)
    VALUES (@id,@project_id,@name,@role,@wf,@provider,@status,@skills,@hue,@ord)`).run({
    id: a.id, project_id: projectId, name: a.name, role: a.role, wf: a.wf || 'Sonstige',
    provider: a.provider, status: a.status, skills: J(a.skills || []), hue: a.hue, ord: curOrd,
  })
}

export function upsertTicket(projectId: string, t: Ticket, ord?: number) {
  const curOrd = ord ?? nextOrd('tickets', projectId)
  db.prepare(`INSERT OR REPLACE INTO tickets
    (id,project_id,title,status,prio,agent_id,agent_ids,skill,elapsed,tokens,updated,descr,activity,plan_questions,plan,from_jira,running,ord)
    VALUES (@id,@project_id,@title,@status,@prio,@agent_id,@agent_ids,@skill,@elapsed,@tokens,@updated,@descr,@activity,@plan_questions,@plan,@from_jira,@running,@ord)`).run({
    id: t.id, project_id: projectId, title: t.title, status: t.status, prio: t.prio,
    agent_id: t.agentId ?? null, agent_ids: J(t.agentIds || null), skill: t.skill,
    elapsed: t.elapsed, tokens: t.tokens, updated: t.updated, descr: t.desc,
    activity: J(t.activity || []), plan_questions: J(t.planQuestions || null),
    plan: J(t.plan || null), from_jira: t.fromJira ? 1 : 0, running: t.running ? 1 : 0, ord: curOrd,
  })
}

function nextOrd(table: 'agents' | 'tickets', projectId: string): number {
  const row = db.prepare(`SELECT COALESCE(MAX(ord),-1)+1 n FROM ${table} WHERE project_id=?`).get(projectId) as { n: number }
  return row.n
}

export function patchProject(id: string, patch: Partial<Project>) {
  const cur = getProjectRow(id)
  if (!cur) return
  const merged = { ...cur, ...patch }
  db.prepare(`UPDATE projects SET
    name=@name, jira=@jira, slack=@slack, designMd=@designMd, instructions=@instructions,
    envs=@envs, jiraInbox=@jiraInbox, roles=@roles, flows=@flows WHERE id=@id`).run({
    id, name: merged.name, jira: J(merged.jira), slack: J(merged.slack),
    designMd: merged.designMd || '', instructions: merged.instructions || '',
    envs: J(merged.envs || []), jiraInbox: J(merged.jiraInbox || []),
    roles: J(merged.roles || []), flows: J(merged.flows || null),
  })
}

export function createProject(p: Project) {
  const ord = (db.prepare('SELECT COALESCE(MAX(ord),-1)+1 n FROM projects').get() as { n: number }).n
  insertProjectRow(p, ord)
}

export function setTicketStatus(id: string, status: string, updated: string) {
  db.prepare('UPDATE tickets SET status=?, updated=? WHERE id=?').run(status, updated, id)
}

export function getTicket(id: string): (Ticket & { projectId: string }) | null {
  const r = db.prepare('SELECT * FROM tickets WHERE id=?').get(id) as any
  if (!r) return null
  return rowToTicket(r)
}

export function saveTicket(t: Ticket & { projectId: string }) {
  upsertTicket(t.projectId, t)
}

export function appendActivity(id: string, step: ActivityStep): (Ticket & { projectId: string }) | null {
  const t = getTicket(id)
  if (!t) return null
  t.activity = [...t.activity, step]
  upsertTicket(t.projectId, t)
  return t
}

export function setSkillInstalled(name: string, installed: boolean) {
  db.prepare('UPDATE skills SET installed=? WHERE name=?').run(installed ? 1 : 0, name)
}
export function addSkill(s: Skill) {
  const ord = (db.prepare('SELECT COALESCE(MAX(ord),-1)+1 n FROM skills').get() as { n: number }).n
  db.prepare('INSERT OR REPLACE INTO skills (name,cat,descr,installs,installed,ord) VALUES (?,?,?,?,?,?)')
    .run(s.name, s.cat, s.desc, s.installs, s.installed ? 1 : 0, ord)
}
export function getSkill(name: string): Skill | null {
  const r = db.prepare('SELECT * FROM skills WHERE name=?').get(name) as any
  return r ? { name: r.name, cat: r.cat, desc: r.descr, installs: r.installs, installed: !!r.installed } : null
}

export function getMeta(key: string): string | null {
  const r = db.prepare('SELECT value FROM meta WHERE key=?').get(key) as { value: string } | undefined
  return r ? r.value : null
}
export function setMeta(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)').run(key, value)
}

// ---- readers ----
function getProjectRow(id: string): Project | null {
  const r = db.prepare('SELECT * FROM projects WHERE id=?').get(id) as any
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

export function getProject(id: string): Project | null {
  const p = getProjectRow(id)
  if (!p) return null
  p.agents = (db.prepare('SELECT * FROM agents WHERE project_id=? ORDER BY ord').all(id) as any[]).map(rowToAgent)
  p.tickets = (db.prepare('SELECT * FROM tickets WHERE project_id=? ORDER BY ord').all(id) as any[]).map((r) => {
    const t = rowToTicket(r); delete (t as any).projectId; return t
  })
  return p
}

export function getState(): AppState {
  const projRows = db.prepare('SELECT id FROM projects ORDER BY ord').all() as { id: string }[]
  const projects = projRows.map((r) => getProject(r.id)!).filter(Boolean)
  const skills = (db.prepare('SELECT * FROM skills ORDER BY ord').all() as any[]).map((r) => ({
    name: r.name, cat: r.cat, desc: r.descr, installs: r.installs, installed: !!r.installed,
  })) as Skill[]
  const ticketSeq = parseInt(getMeta('ticketSeq') || '40', 10)
  return { projects, skills, ticketSeq }
}

seedIfEmpty()

export default db
