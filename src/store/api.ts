import type { Agent, Project, Ticket, ActivityStep, Skill } from './types'

// Thin client for the Orchestra backend. All calls hit /api (proxied to the
// server in dev). Mutations are fire-and-forget from the UI's perspective —
// the frontend updates optimistically with the same ids it sends.

const BASE = '/api'

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}

export interface HydratedState {
  projects: Project[]
  skills: Skill[]
  ticketSeq: number
  agentsConfigured: boolean
}

export const api = {
  async getState(): Promise<HydratedState> {
    return j(await fetch(`${BASE}/state`))
  },
  createProject(p: Project) {
    return fetch(`${BASE}/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) })
  },
  patchProject(id: string, patch: Partial<Project>) {
    return fetch(`${BASE}/projects/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
  },
  createAgent(projectId: string, a: Agent) {
    return fetch(`${BASE}/projects/${projectId}/agents`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(a) })
  },
  patchAgent(id: string, patch: Partial<Agent>) {
    return fetch(`${BASE}/agents/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
  },
  createTicket(projectId: string, t: Ticket, ticketSeq: number) {
    return fetch(`${BASE}/projects/${projectId}/tickets`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-ticket-seq': String(ticketSeq) }, body: JSON.stringify(t) })
  },
  setTicketStatus(id: string, status: string, updated = 'gerade eben') {
    return fetch(`${BASE}/tickets/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, updated }) })
  },
  async comment(id: string, text: string): Promise<Ticket & { projectId: string }> {
    return j(await fetch(`${BASE}/tickets/${id}/comment`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }))
  },
  async planAnswer(id: string, skill: string, q: string, a: string): Promise<Ticket & { projectId: string }> {
    return j(await fetch(`${BASE}/tickets/${id}/plan-answer`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ skill, q, a }) }))
  },
  async runTicket(id: string): Promise<{ ok: boolean; message?: string }> {
    const res = await fetch(`${BASE}/tickets/${id}/run`, { method: 'POST' })
    if (res.status === 503) return res.json()
    return j(res)
  },
  stream(id: string): EventSource {
    return new EventSource(`${BASE}/tickets/${id}/stream`)
  },
  setSkillInstalled(name: string, installed: boolean) {
    return fetch(`${BASE}/skills/${encodeURIComponent(name)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ installed }) })
  },
  async installSkill(name: string): Promise<{ skill: Skill; created: boolean }> {
    return j(await fetch(`${BASE}/skills/install`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }))
  },
}

export type { ActivityStep }
