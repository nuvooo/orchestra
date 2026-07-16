import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { consumeChunk, dedupeFinalAnswer, mapClaudeEvent, type MapContext } from './cliEvents.ts'

// Recorded from a real run on 2026-07-16:
//   claude --print --output-format stream-json --verbose --permission-mode acceptEdits
// Hand-written fixtures would only prove we agree with ourselves.
const FIXTURE = readFileSync(
  fileURLToPath(new URL('./__fixtures__/claude-stream.ndjson', import.meta.url)),
  'utf8',
)

const ctx: MapContext = { actorId: 'a1', phase: 'build', time: () => '12:00' }
const consumeAll = (text: string) => consumeChunk('', text, mapClaudeEvent, ctx)

describe('mapClaudeEvent über echte aufgezeichnete Ausgabe', () => {
  it('ignoriert system-, user- und rate_limit-Rauschen', () => {
    const noise = FIXTURE.split('\n').filter((l) => {
      if (!l.trim()) return false
      const t = JSON.parse(l).type
      return t === 'system' || t === 'user' || t === 'rate_limit_event'
    })
    expect(noise.length).toBeGreaterThan(0)
    expect(consumeAll(noise.join('\n') + '\n').steps).toEqual([])
  })

  it('macht aus Assistant-Text einen thought-Schritt', () => {
    const { steps } = consumeAll(FIXTURE)
    const thoughts = steps.filter((s) => s.type === 'thought')
    expect(thoughts).toHaveLength(2)
    expect(thoughts[0].text).toBe("I'll read the file first.")
    expect(thoughts[0].actor).toBe('a1')
    expect(thoughts[0].phase).toBe('build')
  })

  it('macht aus tool_use einen skill-Schritt mit Argumenten', () => {
    const { steps } = consumeAll(FIXTURE)
    const skills = steps.filter((s) => s.type === 'skill')
    expect(skills).toHaveLength(1)
    expect(skills[0].skillName).toBe('Read')
    expect(skills[0].action).toBe('nutzte Read')
    expect(JSON.parse(skills[0].args!)).toEqual({ file_path: 'C:\\scratch\\clitest\\notiz.txt' })
  })

  it('macht aus dem result-Event die Abschlussmeldung und liest die Tokens', () => {
    const { steps, outputTokens } = consumeAll(FIXTURE)
    const messages = steps.filter((s) => s.type === 'message')
    expect(messages).toHaveLength(1)
    expect(messages[0].text).toContain('Drei Worte')
    expect(outputTokens).toBe(175)
  })

  it('meldet einen fehlgeschlagenen Lauf als error-Schritt', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'error_during_execution', is_error: true, result: 'kaputt' })
    const { steps } = consumeAll(line + '\n')
    expect(steps).toEqual([
      { type: 'error', actor: 'a1', phase: 'build', time: '12:00', text: 'Lauf fehlgeschlagen: kaputt' },
    ])
  })
})

describe('dedupeFinalAnswer über echte aufgezeichnete Ausgabe', () => {
  const run = (text: string) => {
    const d = dedupeFinalAnswer()
    const { steps } = consumeChunk('', text, mapClaudeEvent, ctx)
    return [...d.push(steps), ...d.flush()]
  }

  it('zeigt die Schlussantwort genau einmal — als message, nicht als thought', () => {
    // Claude sends the final answer twice: as an assistant text block and again
    // inside `result`. Both showed up in the thread, one mislabelled as thinking.
    const out = run(FIXTURE)
    const withAnswer = out.filter((s) => s.text?.includes('Drei Worte'))
    expect(withAnswer).toHaveLength(1)
    expect(withAnswer[0].type).toBe('message')
    expect(withAnswer[0].action).toBe('meldete Ergebnis')
  })

  it('behaelt echte Zwischennarration', () => {
    const out = run(FIXTURE)
    expect(out.filter((s) => s.type === 'thought').map((s) => s.text)).toEqual([
      "I'll read the file first.",
    ])
  })

  it('haelt die Reihenfolge ein: erst Narration, dann Tool, dann Ergebnis', () => {
    expect(run(FIXTURE).map((s) => s.type)).toEqual(['thought', 'skill', 'message'])
  })

  it('gibt zurueckgehaltenen Text frei, wenn kein result folgt (Absturz)', () => {
    const d = dedupeFinalAnswer()
    const line = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'halb fertig' }] } })
    const { steps } = consumeChunk('', line + '\n', mapClaudeEvent, ctx)
    expect(d.push(steps)).toEqual([]) // held back
    expect(d.flush().map((s) => s.text)).toEqual(['halb fertig'])
  })
})

describe('consumeChunk', () => {
  it('haelt ein ueber zwei Chunks geteiltes JSON-Objekt zusammen', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'geteilt' }] },
    })
    const cut = Math.floor(line.length / 2)

    const first = consumeChunk('', line.slice(0, cut), mapClaudeEvent, ctx)
    expect(first.steps).toEqual([]) // incomplete — nothing emitted yet

    const second = consumeChunk(first.buffer, line.slice(cut) + '\n', mapClaudeEvent, ctx)
    expect(second.steps).toHaveLength(1)
    expect(second.steps[0].text).toBe('geteilt')
  })

  it('ueberspringt eine unlesbare Zeile, statt den Lauf zu beenden', () => {
    const good = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } })
    const r = consumeChunk('', 'das ist kein json\n' + good + '\n', mapClaudeEvent, ctx)
    expect(r.skipped).toBe(1)
    expect(r.steps).toHaveLength(1)
    expect(r.steps[0].text).toBe('ok')
  })

  it('gibt eine unvollstaendige letzte Zeile als Puffer zurueck', () => {
    const r = consumeChunk('', '{"type":"system"}\n{"type":"assis', mapClaudeEvent, ctx)
    expect(r.buffer).toBe('{"type":"assis')
  })
})
