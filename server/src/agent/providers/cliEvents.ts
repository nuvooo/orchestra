import type { ActivityStep } from '../../types.ts'

/**
 * Maps a CLI's NDJSON event stream onto Orchestra's ActivityStep types.
 *
 * Pure on purpose: no subprocess, no database, no SSE. The wire format belongs
 * to another project and can change without notice, so this is the part most
 * likely to break — and the part cheapest to test against recorded fixtures.
 * Fixtures under __fixtures__ are real recorded output, not hand-written.
 */

export interface MapContext {
  actorId: string
  phase: 'plan' | 'build' | 'review'
  time: () => string
}

export interface MapResult {
  steps: ActivityStep[]
  /** Output tokens the CLI reports at the end of a run, if it reports any. */
  outputTokens?: number
}

export type EventMapper = (event: any, ctx: MapContext) => MapResult

const EMPTY: MapResult = { steps: [] }

/**
 * Claude Code: `claude --print --output-format stream-json --verbose`.
 *
 * Observed event types: `system` (init + hook_started/hook_response),
 * `assistant` (content blocks: text | tool_use), `user` (tool_result echo),
 * `rate_limit_event`, and a final `result`. Only `assistant` and `result`
 * carry anything worth showing; the rest is noise and is dropped.
 */
export const mapClaudeEvent: EventMapper = (ev, ctx) => {
  switch (ev?.type) {
    case 'assistant': {
      const steps: ActivityStep[] = []
      const blocks = ev.message?.content || []
      for (const block of blocks) {
        if (block.type === 'text' && block.text?.trim()) {
          steps.push({
            type: 'thought', actor: ctx.actorId, phase: ctx.phase, time: ctx.time(),
            action: 'plante das Vorgehen', text: block.text.trim(),
          })
        } else if (block.type === 'tool_use') {
          steps.push({
            type: 'skill', actor: ctx.actorId, phase: ctx.phase, time: ctx.time(),
            action: `nutzte ${block.name}`, skillName: block.name,
            args: JSON.stringify(block.input ?? {}), result: '', ok: true,
          })
        }
      }
      return { steps }
    }
    case 'result': {
      if (ev.is_error) {
        return {
          steps: [{
            type: 'error', actor: ctx.actorId, phase: ctx.phase, time: ctx.time(),
            text: 'Lauf fehlgeschlagen: ' + (ev.result || ev.subtype || 'unbekannter Fehler'),
          }],
        }
      }
      const steps: ActivityStep[] = []
      const text = typeof ev.result === 'string' ? ev.result.trim() : ''
      // Claude repeats the final answer here. dedupeFinalAnswer() below drops
      // the earlier duplicate, so this stays the authoritative result step.
      if (text) {
        steps.push({
          type: 'message', actor: ctx.actorId, phase: ctx.phase, time: ctx.time(),
          action: 'meldete Ergebnis', text,
        })
      }
      return { steps, outputTokens: ev.usage?.output_tokens }
    }
    default:
      return EMPTY
  }
}

/**
 * Splits stdout into whole NDJSON lines and maps each one. Returns the
 * leftover partial line so the caller can prepend it to the next chunk — a
 * JSON object split across two chunks would otherwise be silently dropped.
 */
export function consumeChunk(
  buffer: string, chunk: string, mapper: EventMapper, ctx: MapContext,
): { buffer: string; steps: ActivityStep[]; outputTokens?: number; skipped: number } {
  const lines = (buffer + chunk).split('\n')
  const rest = lines.pop() ?? ''
  const steps: ActivityStep[] = []
  let outputTokens: number | undefined
  let skipped = 0
  for (const line of lines) {
    if (!line.trim()) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      // A malformed line degrades the run, it must not end it.
      skipped++
      continue
    }
    const r = mapper(parsed, ctx)
    steps.push(...r.steps)
    if (r.outputTokens != null) outputTokens = r.outputTokens
  }
  return { buffer: rest, steps, outputTokens, skipped }
}

/**
 * Claude emits its final answer twice: once as an `assistant` text block, then
 * verbatim inside `result`. Showing both puts the same paragraph in the thread
 * twice — once mislabelled as thinking.
 *
 * We cannot know at `assistant` time whether a text block is interim narration
 * or the final answer, so hold the most recent one back: if `result` repeats it,
 * drop the held copy and keep the correctly typed message; otherwise the held
 * text was genuine narration and gets released ahead of the result.
 *
 * Feed steps in via `push`; anything still held at the end comes out of `flush`.
 */
export function dedupeFinalAnswer() {
  let held: ActivityStep | null = null
  return {
    push(incoming: ActivityStep[]): ActivityStep[] {
      const out: ActivityStep[] = []
      for (const s of incoming) {
        if (s.type === 'thought') {
          if (held) out.push(held)
          held = s
          continue
        }
        if (held && !(s.type === 'message' && s.text === held.text)) out.push(held)
        held = null
        out.push(s)
      }
      return out
    },
    flush(): ActivityStep[] {
      const out = held ? [held] : []
      held = null
      return out
    },
  }
}
