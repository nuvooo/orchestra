import Anthropic from '@anthropic-ai/sdk'
import * as dbmod from '../../db.ts'
import type { ActivityStep } from '../../types.ts'
import { buildSystem, buildTask } from '../prompt.ts'
import { SKILL_TOOLS, runSkill, toolFor } from '../skills.ts'
import type { Detection, ProviderAdapter, RunContext, RunSummary } from './types.ts'

export const DEFAULT_MODEL = process.env.ORCHESTRA_MODEL || 'claude-opus-4-8'

export function credentialsConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY || !!process.env.ANTHROPIC_AUTH_TOKEN
}

function client(): Anthropic {
  return new Anthropic() // reads ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL from env
}

/**
 * One adapter per model the account can actually use. `agent.provider` is the
 * model id and is passed straight to the API — so picking Opus over Sonnet has
 * a real effect instead of being decoration.
 */
export function makeAnthropicAdapter(modelId: string, label: string): ProviderAdapter {
  const detect = async (): Promise<Detection> =>
    credentialsConfigured()
      ? { available: true }
      : { available: false, reason: 'ANTHROPIC_API_KEY nicht gesetzt' }

  async function* run(ctx: RunContext): AsyncGenerator<ActivityStep, RunSummary> {
    if (!credentialsConfigured()) {
      throw new Error('ANTHROPIC_API_KEY nicht gesetzt — trage den Key in server/.env ein, um echte Läufe zu aktivieren.')
    }
    const c = client()
    const phase = ctx.ticket.status === 'backlog' || ctx.ticket.status === 'ready'
      ? 'plan' as const
      : ctx.ticket.status === 'review' || ctx.ticket.status === 'done' ? 'review' as const : 'build' as const

    const installed = new Set(
      dbmod.getState(ctx.ownerId).skills.filter((s) => s.installed).map((s) => s.name),
    )
    const skills = (ctx.agent.skills || []).filter((s) => installed.has(s) && SKILL_TOOLS[s])
    const tools = skills.map(toolFor)
    const toolNameToSkill = new Map(skills.map((s) => [s.replace(/-/g, '_'), s]))

    const system = buildSystem(ctx.project, ctx.agent, ctx.ticket)
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: buildTask(ctx.ticket) }]
    let totalOut = 0

    for (let i = 0; i < 8; i++) {
      if (ctx.signal.aborted) break
      const params: any = {
        model: modelId,
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        system,
        tools,
        messages,
      }
      const resp = await c.messages.create(params, { signal: ctx.signal })
      totalOut += resp.usage.output_tokens || 0

      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      for (const txt of resp.content.filter((b): b is Anthropic.TextBlock => b.type === 'text')) {
        if (txt.text.trim()) {
          yield {
            type: toolUses.length ? 'thought' : 'message', actor: ctx.agent.id, phase, time: hhmm(),
            action: toolUses.length ? 'plante das Vorgehen' : 'meldete Ergebnis', text: txt.text.trim(),
          }
        }
      }
      if (resp.stop_reason !== 'tool_use') break

      messages.push({ role: 'assistant', content: resp.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const skill = toolNameToSkill.get(tu.name) || tu.name
        const result = runSkill(skill, tu.input)
        yield {
          type: 'skill', actor: ctx.agent.id, phase, time: hhmm(),
          action: `nutzte ${skill}`, skillName: skill, args: JSON.stringify(tu.input), result, ok: true,
        }
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result })
      }
      messages.push({ role: 'user', content: toolResults })
    }
    return { outputTokens: totalOut }
  }

  return { id: modelId, kind: 'cloud', label, detect, run }
}

/**
 * Asks the API which models this account may use, instead of shipping a
 * hand-maintained list that goes stale on every release (and which currently
 * holds ids that would 404). Falls back to the default model if the call fails.
 */
export async function listAnthropicModels(): Promise<{ id: string; label: string }[]> {
  if (!credentialsConfigured()) return []
  try {
    const out: { id: string; label: string }[] = []
    for await (const m of client().models.list()) {
      out.push({ id: m.id, label: (m as any).display_name || m.id })
    }
    return out
  } catch (e: any) {
    console.warn('Models-API nicht erreichbar:', e?.message || e)
    return [{ id: DEFAULT_MODEL, label: DEFAULT_MODEL }]
  }
}

function hhmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
