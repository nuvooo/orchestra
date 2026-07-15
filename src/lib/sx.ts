import type { CSSProperties } from 'react'

const KEBAB = /-([a-z])/g

function toCamel(prop: string): string {
  // Preserve custom properties (--foo) verbatim.
  if (prop.startsWith('--')) return prop
  return prop.replace(KEBAB, (_, c: string) => c.toUpperCase())
}

/**
 * Parse a CSS declaration string ("padding:10px;color:var(--x)") into a React
 * style object. This lets us port the prototype's inline `style="..."` strings
 * almost verbatim while keeping full fidelity (including CSS custom properties).
 */
export function sx(css?: string | null): CSSProperties {
  const out: Record<string, string> = {}
  if (!css) return out as CSSProperties
  for (const raw of css.split(';')) {
    const part = raw.trim()
    if (!part) continue
    const idx = part.indexOf(':')
    if (idx === -1) continue
    const prop = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (!prop) continue
    out[toCamel(prop)] = value
  }
  return out as CSSProperties
}

/** Merge multiple CSS strings / style objects into one style object. */
export function merge(...parts: Array<string | CSSProperties | undefined | false>): CSSProperties {
  let acc: Record<string, unknown> = {}
  for (const p of parts) {
    if (!p) continue
    acc = { ...acc, ...(typeof p === 'string' ? sx(p) : p) }
  }
  return acc as CSSProperties
}
