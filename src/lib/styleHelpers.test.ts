import { describe, expect, it } from 'vitest'
import { provById } from './styleHelpers'
import type { Provider } from '../store/types'

const catalog: Provider[] = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', kind: 'cloud', available: true },
  { id: 'claude-code', label: 'Claude Code', kind: 'local', available: true, version: '2.1.210' },
  { id: 'opencode', label: 'opencode', kind: 'local', available: false, reason: 'Headless-Lauf noch nicht unterstützt' },
]

describe('provById', () => {
  it('findet einen Provider aus dem Server-Katalog', () => {
    expect(provById(catalog, 'claude-code')).toEqual(catalog[1])
  })

  it('faellt auf die rohe id zurueck, statt zu crashen', () => {
    // An agent can outlive its provider: CLI uninstalled, model retired, or —
    // as shipped before — an id that never existed (`claude-sonnet-4.5`).
    const p = provById(catalog, 'claude-sonnet-4.5')
    expect(p.label).toBe('claude-sonnet-4.5')
    expect(p.available).toBe(false)
    expect(p.reason).toBe('unbekannter Provider')
  })
})
