// Server-side domain types. Structurally identical to the frontend's
// src/store/types.ts — both are hydrated from shared/seed.json.

export interface Provider { id: string; label: string; kind: 'cloud' | 'local' }
export interface Skill { name: string; cat: string; desc: string; installed: boolean }

export interface Agent {
  id: string; name: string; role: string; wf: string; provider: string
  status: 'running' | 'idle' | 'paused' | 'error'; skills: string[]; hue: number
}

export interface ActivityStep {
  type: 'thought' | 'skill' | 'message' | 'handoff' | 'error' | 'user'
  time?: string; action?: string; text?: string
  actor?: string | null; phase?: 'plan' | 'build' | 'review'
  skillName?: string; args?: string; result?: string; ok?: boolean
  to?: string
  code?: { file: string; body: string }
  shot?: { id: string; caption: string }
  planAnswer?: boolean
  a?: string
  q?: string
}

export interface Ticket {
  id: string; title: string; status: string; prio: string
  agentId?: string; agentIds?: string[]
  skill: string; elapsed: string; tokens: string; updated: string; desc: string
  activity: ActivityStep[]
  planQuestions?: { skill: string; q: string }[]
  plan?: string[]
  fromJira?: boolean
  running?: boolean
}

export interface Project {
  id: string; name: string; hue: number
  jira: { connected: boolean; url?: string }
  slack: { connected: boolean; channel?: string }
  designMd: string; instructions: string
  /** Absolute path local CLI agents run in. Empty until the user sets one. */
  workdir?: string
  envs: { key: string; value: string }[]
  jiraInbox: { key: string; title: string; type: string }[]
  roles: string[]
  agents: Agent[]
  tickets: Ticket[]
  flows?: any
}

export interface AppState {
  projects: Project[]
  skills: Skill[]
  ticketSeq: number
}
