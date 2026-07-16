import * as dbmod from '../db.ts'
import { broadcast } from '../sse.ts'
import type { ActivityStep, Agent, Ticket } from '../types.ts'
import { credentialsConfigured } from './providers/anthropic.ts'
import * as registry from './providers/registry.ts'
import type { RunContext } from './providers/types.ts'

export { catalog as providerCatalog } from './providers/registry.ts'

/** True when at least one provider can actually run — cloud or local CLI. */
export async function agentsConfigured(): Promise<boolean> {
  return registry.anyAvailable()
}

/** Cheap synchronous variant for the startup banner. */
export function cloudConfigured(): boolean {
  return credentialsConfigured()
}

interface RunResult { ok: boolean; message: string }

const running = new Map<string, AbortController>()

export function stopAgent(ownerId: string, ticketId: string): boolean {
  const ctrl = running.get(ownerId + ':' + ticketId)
  if (!ctrl) return false
  ctrl.abort()
  return true
}

export async function runAgent(ownerId: string, ticketId: string): Promise<RunResult> {
  const chan = ownerId + ':' + ticketId
  if (running.has(chan)) return { ok: false, message: 'Läuft bereits.' }

  const t = dbmod.getTicket(ownerId, ticketId)
  if (!t) return { ok: false, message: 'Ticket nicht gefunden.' }
  const project = dbmod.getProject(ownerId, t.projectId)
  if (!project) return { ok: false, message: 'Projekt nicht gefunden.' }

  const team = ticketTeam(t).map((id) => project.agents.find((a) => a.id === id)).filter(Boolean) as Agent[]
  const actor = team[0]
  if (!actor) return { ok: false, message: 'Dem Ticket ist kein Agent zugewiesen.' }

  const adapter = await registry.get(actor.provider)
  if (!adapter) {
    return { ok: false, message: `Provider „${actor.provider}" ist hier nicht verfügbar.` }
  }
  const detection = await adapter.detect()
  if (!detection.available) {
    return { ok: false, message: `${adapter.label} ist nicht verfügbar: ${detection.reason || 'unbekannter Grund'}` }
  }

  const controller = new AbortController()
  running.set(chan, controller)
  const phase = phaseForStatus(t.status)

  dbmod.saveTicket(ownerId, {
    ...t, running: true,
    status: t.status === 'backlog' || t.status === 'ready' ? t.status : 'in_progress',
    updated: 'gerade eben',
  })
  broadcast(chan, 'status', { running: true })

  const append = (step: ActivityStep) => {
    dbmod.appendActivity(ownerId, ticketId, step)
    broadcast(chan, 'step', step)
  }

  const ctx: RunContext = { ownerId, project, agent: actor, ticket: t, signal: controller.signal }
  const started = Date.now()
  let summary = { outputTokens: 0 }

  try {
    const it = adapter.run(ctx)
    let r = await it.next()
    while (!r.done) {
      append(r.value)
      r = await it.next()
    }
    summary = r.value
  } catch (e: any) {
    const aborted = controller.signal.aborted
    append({
      type: 'error', actor: actor.id, phase, time: hhmm(),
      text: aborted ? 'Lauf abgebrochen.' : 'Lauf abgebrochen: ' + (e?.message || String(e)),
    })
    finish(ownerId, ticketId, chan, controller)
    return { ok: false, message: aborted ? 'Abgebrochen.' : (e?.message || 'Fehler beim Agentenlauf.') }
  }

  const secs = Math.round((Date.now() - started) / 1000)
  const finalT = dbmod.getTicket(ownerId, ticketId)!
  const out = summary.outputTokens
  dbmod.saveTicket(ownerId, {
    ...finalT, running: false, updated: 'gerade eben',
    elapsed: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
    tokens: out >= 1000 ? (out / 1000).toFixed(1) + 'k' : String(out),
  })
  running.delete(chan)
  broadcast(chan, 'status', { running: false })
  broadcast(chan, 'done', {})
  return { ok: true, message: 'Lauf abgeschlossen.' }
}

function finish(ownerId: string, ticketId: string, chan: string, _c: AbortController) {
  const cur = dbmod.getTicket(ownerId, ticketId)
  if (cur) dbmod.saveTicket(ownerId, { ...cur, running: false })
  running.delete(chan)
  broadcast(chan, 'status', { running: false })
}

function ticketTeam(t: Ticket): string[] {
  return t.agentIds && t.agentIds.length ? t.agentIds : t.agentId ? [t.agentId] : []
}

function phaseForStatus(s: string): 'plan' | 'build' | 'review' {
  return s === 'backlog' || s === 'ready' ? 'plan' : s === 'review' || s === 'done' ? 'review' : 'build'
}

function hhmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
