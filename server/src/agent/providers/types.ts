import type { ActivityStep, Agent, Project, Ticket } from '../../types.ts'

export interface Detection {
  available: boolean
  version?: string
  /** Why it is not available — shown in the UI instead of a silent empty entry. */
  reason?: string
}

export interface RunContext {
  ownerId: string
  project: Project
  agent: Agent
  ticket: Ticket
  signal: AbortSignal
}

export interface RunSummary {
  outputTokens: number
}

/**
 * One way of running a ticket. `run` yields steps as they happen and returns a
 * summary, so an SDK loop and a subprocess stream look identical from outside.
 */
export interface ProviderAdapter {
  id: string
  kind: 'cloud' | 'local'
  label: string
  detect(): Promise<Detection>
  run(ctx: RunContext): AsyncGenerator<ActivityStep, RunSummary>
}

/** What `GET /api/providers` returns. */
export interface ProviderInfo {
  id: string
  label: string
  kind: 'cloud' | 'local'
  available: boolean
  version?: string
  reason?: string
}
