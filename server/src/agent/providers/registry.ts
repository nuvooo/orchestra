import { DEFAULT_MODEL, listAnthropicModels, makeAnthropicAdapter } from './anthropic.ts'
import { CLI_CONFIGS, makeCliAdapter } from './cli.ts'
import type { ProviderAdapter, ProviderInfo } from './types.ts'

const cliAdapters = CLI_CONFIGS.map(makeCliAdapter)

let modelAdapters: ProviderAdapter[] | null = null
let modelsAt = 0
const MODELS_TTL_MS = 5 * 60 * 1000

async function anthropicAdapters(): Promise<ProviderAdapter[]> {
  if (modelAdapters && Date.now() - modelsAt < MODELS_TTL_MS) return modelAdapters
  const models = await listAnthropicModels()
  modelAdapters = models.map((m) => makeAnthropicAdapter(m.id, m.label))
  modelsAt = Date.now()
  return modelAdapters
}

async function all(): Promise<ProviderAdapter[]> {
  return [...(await anthropicAdapters()), ...cliAdapters]
}

/** Resolves the adapter for an agent's provider; null when it no longer exists. */
export async function get(providerId: string): Promise<ProviderAdapter | null> {
  const list = await all()
  const hit = list.find((a) => a.id === providerId)
  if (hit) return hit
  // Agent has no provider (or an unknown one): fall back to the default model,
  // which is what the runner always used before providers were honoured.
  const fallback = list.find((a) => a.id === DEFAULT_MODEL)
  return fallback ?? null
}

/** The catalog behind GET /api/providers — what is actually available here. */
export async function catalog(): Promise<ProviderInfo[]> {
  const list = await all()
  return Promise.all(
    list.map(async (a) => {
      const d = await a.detect()
      return { id: a.id, label: a.label, kind: a.kind, available: d.available, version: d.version, reason: d.reason }
    }),
  )
}

export async function anyAvailable(): Promise<boolean> {
  return (await catalog()).some((p) => p.available)
}
