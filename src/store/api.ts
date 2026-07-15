import type { Agent, Project, Ticket, ActivityStep, Skill } from './types'

// Thin client for the Orchestra backend. All calls hit /api (proxied to the
// server in dev) and include the session cookie.

const BASE = '/api'

function f(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(BASE + path, { credentials: 'include', ...opts })
}
async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}
const jsonBody = (body: unknown): RequestInit => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export interface AuthUser { id: string; email: string; name: string }
export interface HydratedState {
  projects: Project[]
  skills: Skill[]
  ticketSeq: number
  agentsConfigured: boolean
}

export const api = {
  // ---- auth ----
  async me(): Promise<{ user: AuthUser | null; agentsConfigured: boolean }> {
    return j(await f('/auth/me'))
  },
  async register(email: string, name: string, password: string): Promise<{ user?: AuthUser; message?: string; ok: boolean }> {
    const res = await f('/auth/register', { method: 'POST', ...jsonBody({ email, name, password }) })
    const data = await res.json().catch(() => ({}))
    return { ...data, ok: res.ok }
  },
  async login(email: string, password: string): Promise<{ user?: AuthUser; message?: string; ok: boolean }> {
    const res = await f('/auth/login', { method: 'POST', ...jsonBody({ email, password }) })
    const data = await res.json().catch(() => ({}))
    return { ...data, ok: res.ok }
  },
  async logout(): Promise<void> {
    await f('/auth/logout', { method: 'POST' })
  },

  // ---- state ----
  async getState(): Promise<HydratedState> {
    return j(await f('/state'))
  },
  createProject(p: Project) { return f('/projects', { method: 'POST', ...jsonBody(p) }) },
  patchProject(id: string, patch: Partial<Project>) { return f(`/projects/${id}`, { method: 'PATCH', ...jsonBody(patch) }) },
  createAgent(projectId: string, a: Agent) { return f(`/projects/${projectId}/agents`, { method: 'POST', ...jsonBody(a) }) },
  patchAgent(id: string, patch: Partial<Agent>) { return f(`/agents/${id}`, { method: 'PATCH', ...jsonBody(patch) }) },
  createTicket(projectId: string, t: Ticket, ticketSeq: number) {
    return f(`/projects/${projectId}/tickets`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-ticket-seq': String(ticketSeq) }, body: JSON.stringify(t) })
  },
  setTicketStatus(id: string, status: string, updated = 'gerade eben') { return f(`/tickets/${id}`, { method: 'PATCH', ...jsonBody({ status, updated }) }) },
  async comment(id: string, text: string): Promise<Ticket & { projectId: string }> { return j(await f(`/tickets/${id}/comment`, { method: 'POST', ...jsonBody({ text }) })) },
  async planAnswer(id: string, skill: string, q: string, a: string): Promise<Ticket & { projectId: string }> { return j(await f(`/tickets/${id}/plan-answer`, { method: 'POST', ...jsonBody({ skill, q, a }) })) },
  async runTicket(id: string): Promise<{ ok: boolean; message?: string }> {
    const res = await f(`/tickets/${id}/run`, { method: 'POST' })
    if (res.status === 503) return res.json()
    return j(res)
  },
  stream(id: string): EventSource { return new EventSource(`${BASE}/tickets/${id}/stream`, { withCredentials: true }) },
  setSkillInstalled(name: string, installed: boolean) { return f(`/skills/${encodeURIComponent(name)}`, { method: 'PATCH', ...jsonBody({ installed }) }) },
}

export type { ActivityStep }
