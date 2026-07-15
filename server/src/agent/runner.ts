import Anthropic from '@anthropic-ai/sdk'
import * as dbmod from '../db.ts'
import { broadcast } from '../sse.ts'
import type { ActivityStep, Agent, Project, Ticket } from '../types.ts'

const MODEL = process.env.ORCHESTRA_MODEL || 'claude-opus-4-8'

export function agentsConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

function clientOrNull(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  return new Anthropic() // reads ANTHROPIC_API_KEY (+ ANTHROPIC_BASE_URL) from env
}

function phaseForStatus(s: string): 'plan' | 'build' | 'review' {
  return s === 'backlog' || s === 'ready' ? 'plan' : s === 'review' || s === 'done' ? 'review' : 'build'
}

function nowLabel(): string {
  return 'gerade eben'
}

// Each installed skill the acting agent owns becomes a client tool.
//
// Only reasoning skills exist today: they have no external side effect, so the
// tool result is a directive that hands the work back to the model rather than
// a report from some system. Any skill that would need a real integration (a
// search index, a mailer, a database) must not be added here until that
// integration exists — a tool that reports success it never performed poisons
// every conclusion the agent draws from it.
const SKILL_TOOLS: Record<string, { schema: Anthropic.Tool.InputSchema; run: (input: any) => string }> = {
  brainstorm: {
    schema: { type: 'object', properties: { topic: { type: 'string', description: 'Fragestellung, zu der Ansätze gesucht werden' } }, required: ['topic'] },
    run: (input) =>
      `Erarbeite jetzt selbst mehrere unterschiedliche Lösungsansätze zu „${input.topic}". ` +
      `Nenne pro Ansatz den Kerngedanken, einen Vorteil und einen Nachteil. Erfinde keine Quellen oder Messwerte.`,
  },
  grillme: {
    schema: { type: 'object', properties: { assumptions: { type: 'string', description: 'Zu prüfende Annahmen' } }, required: ['assumptions'] },
    run: (input) =>
      `Hinterfrage jetzt selbst kritisch: ${input.assumptions}. ` +
      `Benenne die riskanteste Annahme, was passiert wenn sie falsch ist, und woran man das früh erkennen würde. Erfinde keine Fakten.`,
  },
}

function toolFor(skill: string): Anthropic.Tool {
  return {
    name: skill.replace(/-/g, '_'),
    description: `Skill „${skill}" ausführen.`,
    input_schema: SKILL_TOOLS[skill]?.schema || { type: 'object', properties: { input: { type: 'string' } } },
  }
}

function runSkill(skill: string, input: any): string {
  const impl = SKILL_TOOLS[skill]
  if (!impl) return `Skill „${skill}" ist nicht implementiert und wurde nicht ausgeführt. Arbeite ohne ihn weiter.`
  return impl.run(input)
}

interface RunResult { ok: boolean; message: string }

const running = new Set<string>()

export async function runAgent(ownerId: string, ticketId: string): Promise<RunResult> {
  const chan = ownerId + ':' + ticketId
  const client = clientOrNull()
  if (!client) return { ok: false, message: 'ANTHROPIC_API_KEY nicht gesetzt — Agenten sind nicht konfiguriert. Trage den Key in server/.env ein, um echte Läufe zu aktivieren.' }
  if (running.has(chan)) return { ok: false, message: 'Läuft bereits.' }

  const t = dbmod.getTicket(ownerId, ticketId)
  if (!t) return { ok: false, message: 'Ticket nicht gefunden.' }
  const project = dbmod.getProject(ownerId, t.projectId)
  if (!project) return { ok: false, message: 'Projekt nicht gefunden.' }

  const team = ticketTeam(t).map((id) => project.agents.find((a) => a.id === id)).filter(Boolean) as Agent[]
  const actor = team[0]
  if (!actor) return { ok: false, message: 'Dem Ticket ist kein Agent zugewiesen.' }

  running.add(chan)
  const phase = phaseForStatus(t.status)
  const installed = new Set(dbmod.getState(ownerId).skills.filter((s) => s.installed).map((s) => s.name))
  const skills = (actor.skills || []).filter((s) => installed.has(s))
  const tools = skills.map(toolFor)
  const toolNameToSkill = new Map(skills.map((s) => [s.replace(/-/g, '_'), s]))

  // mark running
  dbmod.saveTicket(ownerId, { ...t, running: true, status: t.status === 'backlog' || t.status === 'ready' ? t.status : 'in_progress', updated: nowLabel() })
  broadcast(chan, 'status', { running: true })

  const started = Date.now()
  const append = (step: ActivityStep) => {
    const updated = dbmod.appendActivity(ownerId, ticketId, step)
    broadcast(chan, 'step', step)
    return updated
  }

  const system = buildSystem(project, actor, t)
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: buildTask(t) }]

  let totalOut = 0
  try {
    for (let i = 0; i < 8; i++) {
      // Built as `any` so newer request fields (adaptive thinking, effort) work
      // regardless of the installed @anthropic-ai/sdk type version.
      const params: any = {
        model: MODEL,
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        system,
        tools,
        messages,
      }
      const resp = await client.messages.create(params)
      totalOut += resp.usage.output_tokens || 0

      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      const texts = resp.content.filter((b): b is Anthropic.TextBlock => b.type === 'text')

      for (const txt of texts) {
        if (txt.text.trim()) {
          append({ type: toolUses.length ? 'thought' : 'message', actor: actor.id, phase, time: hhmm(), action: toolUses.length ? 'plante das Vorgehen' : 'meldete Ergebnis', text: txt.text.trim() })
        }
      }

      if (resp.stop_reason !== 'tool_use') break

      messages.push({ role: 'assistant', content: resp.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const skill = toolNameToSkill.get(tu.name) || tu.name
        const result = runSkill(skill, tu.input)
        append({ type: 'skill', actor: actor.id, phase, time: hhmm(), action: `nutzte ${skill}`, skillName: skill, args: JSON.stringify(tu.input), result, ok: true })
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result })
      }
      messages.push({ role: 'user', content: toolResults })
    }
  } catch (e: any) {
    append({ type: 'error', actor: actor.id, phase, time: hhmm(), text: 'Lauf abgebrochen: ' + (e?.message || String(e)) })
    dbmod.saveTicket(ownerId, { ...dbmod.getTicket(ownerId, ticketId)!, running: false })
    running.delete(chan)
    broadcast(chan, 'status', { running: false })
    return { ok: false, message: e?.message || 'Fehler beim Agentenlauf.' }
  }

  const secs = Math.round((Date.now() - started) / 1000)
  const finalT = dbmod.getTicket(ownerId, ticketId)!
  dbmod.saveTicket(ownerId, { ...finalT, running: false, updated: nowLabel(), elapsed: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, tokens: totalOut >= 1000 ? (totalOut / 1000).toFixed(1) + 'k' : String(totalOut) })
  running.delete(chan)
  broadcast(chan, 'status', { running: false })
  broadcast(chan, 'done', {})
  return { ok: true, message: 'Lauf abgeschlossen.' }
}

function ticketTeam(t: Ticket): string[] {
  return t.agentIds && t.agentIds.length ? t.agentIds : t.agentId ? [t.agentId] : []
}

function hhmm(): string {
  // Deterministic-ish clock label; the app shows relative times elsewhere.
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function buildSystem(project: Project, agent: Agent, t: Ticket): string {
  const lines = [
    `Du bist „${agent.name}", ein KI-Agent mit der Rolle „${agent.role}" im Projekt „${project.name}".`,
    `Deine Workflow-Rolle ist „${agent.wf}". Arbeite fokussiert am zugewiesenen Ticket.`,
    'Antworte auf Deutsch. Nutze verfügbare Skills (Tools), wenn sie dich dem Ziel näher bringen. Halte Zwischenschritte kurz; liefere am Ende ein klares Ergebnis.',
  ]
  if (project.instructions) lines.push('\nProjekt-Anweisungen:\n' + project.instructions)
  if (project.designMd) lines.push('\nDesign-/Stilrichtlinien (design.md):\n' + project.designMd)
  return lines.join('\n')
}

function buildTask(t: Ticket): string {
  return `Aufgabe (${t.id}): ${t.title}\n\n${t.desc}\n\nBearbeite diese Aufgabe Schritt für Schritt. Wenn eine Planung sinnvoll ist, plane zuerst. Nutze passende Skills und fasse am Ende dein Ergebnis zusammen.`
}
