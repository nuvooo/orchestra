import type { Provider, AgentStatus, TicketStatus } from '../store/types'

/**
 * The catalog is loaded from the server, so it must be passed in. An agent can
 * reference a provider that is gone (uninstalled CLI, retired model) — fall
 * back to showing the raw id rather than crashing.
 */
export function provById(providers: Provider[], id: string): Provider {
  return providers.find((p) => p.id === id) || { id, label: id, kind: 'cloud', available: false, reason: 'unbekannter Provider' }
}

export function avatar(theme: 'light' | 'dark', hue: number | null) {
  if (hue == null) return { avatarBg: 'var(--surface-3)', avatarColor: 'var(--text)' }
  return {
    avatarBg: `oklch(${theme === 'dark' ? 0.32 : 0.94} 0.06 ${hue})`,
    avatarColor: `oklch(${theme === 'dark' ? 0.85 : 0.42} 0.14 ${hue})`,
  }
}

export function statusInfo(s: AgentStatus | string) {
  const m: Record<string, { label: string; color: string; bg: string }> = {
    running: { label: 'Aktiv', color: 'var(--ok)', bg: 'var(--ok-soft)' },
    idle: { label: 'Bereit', color: 'var(--text-3)', bg: 'var(--surface-2)' },
    paused: { label: 'Pausiert', color: 'var(--warn)', bg: 'var(--warn-soft)' },
    error: { label: 'Fehler', color: 'var(--err)', bg: 'var(--err-soft)' },
  }
  return m[s] || m.idle
}

export function ticketStatus(s: TicketStatus | string) {
  const m: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    backlog: { label: 'Backlog', color: 'var(--text-3)', bg: 'var(--surface-2)', dot: 'var(--text-3)' },
    ready: { label: 'Ready for Dev', color: 'oklch(0.62 0.11 210)', bg: 'oklch(0.62 0.11 210 / 0.14)', dot: 'oklch(0.62 0.11 210)' },
    in_progress: { label: 'In Arbeit', color: 'var(--accent)', bg: 'var(--accent-2)', dot: 'var(--accent)' },
    blocked: { label: 'Blockiert', color: 'var(--err)', bg: 'var(--err-soft)', dot: 'var(--err)' },
    review: { label: 'Review', color: 'var(--warn)', bg: 'var(--warn-soft)', dot: 'var(--warn)' },
    done: { label: 'Fertig', color: 'var(--ok)', bg: 'var(--ok-soft)', dot: 'var(--ok)' },
  }
  return m[s] || m.backlog
}

export function prioColor(p: string) {
  return p === 'Hoch' ? 'var(--err)' : p === 'Mittel' ? 'var(--warn)' : 'var(--text-3)'
}

export function provStyle(kind: string) {
  return kind === 'local'
    ? { bg: 'var(--ok-soft)', color: 'var(--ok)', short: 'Lokal', kindLabel: 'CLI' }
    : { bg: 'var(--accent-2)', color: 'var(--accent)', short: 'API', kindLabel: 'API' }
}

export function phaseForStatus(s: string): 'plan' | 'build' | 'review' {
  return s === 'backlog' || s === 'ready' ? 'plan' : s === 'review' || s === 'done' ? 'review' : 'build'
}

export function phaseMeta(k: string) {
  const m: Record<string, { label: string; tab: string; hint: string; color: string }> = {
    plan: { label: 'Planungs-Verlauf', tab: 'Vorbereitung', hint: 'grillme · brainstorm', color: 'oklch(0.62 0.11 210)' },
    build: { label: 'Umsetzungs-Verlauf', tab: 'Umsetzung', hint: 'Skills & Code', color: 'var(--accent)' },
    review: { label: 'Review-Verlauf', tab: 'Prüfen', hint: 'QA & Freigabe', color: 'var(--warn)' },
  }
  return m[k] || m.build
}
