export type ProviderKind = 'cloud' | 'local'

export interface Provider {
  id: string
  label: string
  kind: ProviderKind
}

export interface Skill {
  name: string
  cat: string
  desc: string
  installs: string
  installed: boolean
}

export type AgentStatus = 'running' | 'idle' | 'paused' | 'error'

export interface Agent {
  id: string
  name: string
  role: string
  wf: string
  provider: string
  status: AgentStatus
  skills: string[]
  hue: number
}

export type TicketStatus = 'backlog' | 'ready' | 'in_progress' | 'blocked' | 'review' | 'done'

export type StepType = 'thought' | 'skill' | 'message' | 'handoff' | 'error' | 'user'
export type Phase = 'plan' | 'build' | 'review'

export interface CodeAttachment {
  file: string
  body: string
}
export interface ShotAttachment {
  id: string
  caption: string
}

export interface ActivityStep {
  type: StepType
  time?: string
  action?: string
  text?: string
  actor?: string | null
  phase?: Phase
  skillName?: string
  args?: string
  result?: string
  ok?: boolean
  to?: string
  code?: CodeAttachment
  shot?: ShotAttachment
  // plan-answer steps (from the planning terminal) carry the raw Q/A so the
  // terminal can re-render answered questions after a reload.
  planAnswer?: boolean
  a?: string
  q?: string
}

export interface PlanQuestion {
  skill: string
  q: string
}

export interface Ticket {
  id: string
  title: string
  status: TicketStatus
  prio: string
  agentId?: string
  agentIds?: string[]
  skill: string
  elapsed: string
  tokens: string
  updated: string
  desc: string
  activity: ActivityStep[]
  planQuestions?: PlanQuestion[]
  plan?: string[]
  fromJira?: boolean
  running?: boolean
}

export interface FlowNode {
  id: string
  x: number
  y: number
  kind: 'start' | 'agent' | 'skill' | 'condition' | 'end'
  label: string
  agentId?: string
  skills?: string[]
}
export interface FlowEdge {
  id: string
  from: string
  to: string
}
export interface Flow {
  nodes: FlowNode[]
  edges: FlowEdge[]
}
export interface Flows {
  plan: Flow
  build: Flow
  review: Flow
}

export interface Integration {
  connected: boolean
  url?: string
  channel?: string
}

export interface JiraInboxItem {
  key: string
  title: string
  type: string
}

export interface EnvVar {
  key: string
  value: string
}

export interface Project {
  id: string
  name: string
  hue: number
  jira: Integration
  slack: Integration
  designMd: string
  instructions: string
  envs: EnvVar[]
  jiraInbox: JiraInboxItem[]
  roles: string[]
  agents: Agent[]
  tickets: Ticket[]
  flows?: Flows
}

export type ThemePref = 'light' | 'dark' | 'system'
export type View =
  | 'dashboard'
  | 'tickets'
  | 'ticket'
  | 'agents'
  | 'skills'
  | 'settings'
  | 'projectcfg'

export interface NewAgentDraft {
  name: string
  role: string
  providerKind: ProviderKind
  provider: string
  skills: string[]
}

export interface NewTicketDraft {
  title: string
  prio: string
  agentIds: string[]
}

export interface WizardData {
  name: string
  designMd: string
  instructions: string
  jira: Integration
  slack: Integration
  envs: EnvVar[]
  roles?: string[]
}

export interface PlanAnswer {
  skill: string
  q: string
  a: string
  time: string
}

export interface ThreadComment {
  type: 'user'
  time: string
  action: string
  text: string
}

export interface OrchestraState {
  view: View
  theme: 'light' | 'dark'
  themePref: ThemePref
  switcherOpen: boolean
  createOpen: boolean
  projectModalOpen: boolean
  wizardStep: number
  roleInput: string
  flowPhase: Phase
  pendingConnect: string | null
  wizardData: WizardData
  currentProjectId: string
  activeTicket: string | null
  composerText: string
  threadExtra: Record<string, ThreadComment[]>
  menuTicket: string | null
  statusMenuOpen: boolean
  draggedTicket: string | null
  dragOverKey: string | null
  activePhase: Phase
  termInput: string
  planAnswers: Record<string, PlanAnswer[]>
  ticketModalOpen: boolean
  newTicket: NewTicketDraft
  ticketSeq: number
  skillInput: string
  newAgent: NewAgentDraft
  skills: Skill[]
  projects: Project[]
  agentsConfigured: boolean
  hydrated: boolean
  user: { id: string; email: string; name: string } | null
  authChecked: boolean
}
