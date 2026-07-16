import { spawn, execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import type { ActivityStep } from '../../types.ts'
import { buildSystem, buildTask } from '../prompt.ts'
import { consumeChunk, dedupeFinalAnswer, mapClaudeEvent, type EventMapper, type MapContext } from './cliEvents.ts'
import type { Detection, ProviderAdapter, RunContext, RunSummary } from './types.ts'

const RUN_TIMEOUT_MS = parseInt(process.env.ORCHESTRA_CLI_TIMEOUT_MS || '600000', 10)

export interface CliConfig {
  id: string
  label: string
  command: string
  /** Args for `detect()`. Exit code 0 means available. */
  versionArgs: string[]
  /** Build the run args. Null means this CLI has no verified headless mode. */
  runArgs: ((ctx: RunContext) => string[]) | null
  mapper: EventMapper
  /** Set when headless running is not supported — surfaced in the UI. */
  unsupportedReason?: string
}

/**
 * Resolves a command to a real executable path.
 *
 * Never spawn with `shell: true` here: Node then joins argv into a single
 * command line without quoting, so any argument containing spaces or newlines
 * — like the system prompt — silently falls apart and the CLI receives a
 * mangled or empty task. Resolving the path lets us spawn with an argv array,
 * which the OS passes through untouched.
 */
function resolveCommand(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const finder = process.platform === 'win32' ? 'where' : 'which'
    execFile(finder, [cmd], { timeout: 10000 }, (err, stdout) => {
      if (err) return resolve(null)
      const first = (stdout || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0]
      resolve(first || null)
    })
  })
}

function runVersion(exe: string, args: string[]): Promise<Detection> {
  return new Promise((resolve) => {
    execFile(exe, args, { timeout: 10000 }, (err, stdout) => {
      if (err) return resolve({ available: false, reason: 'Versionsabfrage fehlgeschlagen' })
      const version = (stdout || '').trim().split('\n')[0]?.trim()
      resolve({ available: true, version: version || undefined })
    })
  })
}

/**
 * Kills the whole process tree. `claude` spawns children of its own; killing
 * only the direct child leaves the grandchildren running, which is how orphans
 * end up holding files open long after a run is over.
 */
function killTree(pid: number | undefined) {
  if (!pid) return
  if (process.platform === 'win32') {
    execFile('taskkill', ['/pid', String(pid), '/T', '/F'], () => {})
  } else {
    try { process.kill(-pid, 'SIGKILL') } catch { /* already gone */ }
  }
}

export function makeCliAdapter(cfg: CliConfig): ProviderAdapter {
  let cached: { at: number; result: Detection } | null = null

  const detect = async (): Promise<Detection> => {
    // Short TTL so a freshly installed tool shows up without a server restart.
    if (cached && Date.now() - cached.at < 30000) return cached.result
    const exe = await resolveCommand(cfg.command)
    const result: Detection = exe
      ? await runVersion(exe, cfg.versionArgs)
      : { available: false, reason: 'nicht im PATH gefunden' }
    if (result.available && cfg.unsupportedReason) {
      // Installed, but we cannot drive it — say so rather than offer it.
      const degraded: Detection = { available: false, version: result.version, reason: cfg.unsupportedReason }
      cached = { at: Date.now(), result: degraded }
      return degraded
    }
    cached = { at: Date.now(), result }
    return result
  }

  async function* run(ctx: RunContext): AsyncGenerator<ActivityStep, RunSummary> {
    const phase = ctx.ticket.status === 'backlog' || ctx.ticket.status === 'ready'
      ? 'plan' as const
      : ctx.ticket.status === 'review' || ctx.ticket.status === 'done' ? 'review' as const : 'build' as const
    const mapCtx: MapContext = { actorId: ctx.agent.id, phase, time: hhmm }

    if (!cfg.runArgs) throw new Error(`${cfg.label} unterstützt keinen Headless-Lauf.`)

    const workdir = ctx.project.workdir?.trim()
    if (!workdir) {
      throw new Error(
        'Kein Arbeitsverzeichnis gesetzt. Lokale CLI-Agenten brauchen eines — trage es in den Projekt-Einstellungen ein.',
      )
    }
    if (!existsSync(workdir) || !statSync(workdir).isDirectory()) {
      throw new Error(`Arbeitsverzeichnis „${workdir}" existiert nicht oder ist kein Verzeichnis.`)
    }

    const exe = await resolveCommand(cfg.command)
    if (!exe) throw new Error(`${cfg.label} wurde nicht im PATH gefunden.`)

    const child = spawn(exe, cfg.runArgs(ctx), {
      cwd: workdir,
      detached: process.platform !== 'win32', // own process group, so we can kill the tree
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const timer = setTimeout(() => killTree(child.pid), RUN_TIMEOUT_MS)
    const onAbort = () => killTree(child.pid)
    ctx.signal.addEventListener('abort', onAbort)

    // Queue between the stdout callback and this generator's consumer.
    const queue: ActivityStep[] = []
    const dedupe = dedupeFinalAnswer()
    let outputTokens = 0
    let buffer = ''
    let stderrTail = ''
    let done = false
    let failure: Error | null = null
    let wake: (() => void) | null = null
    const bump = () => { const w = wake; wake = null; w?.() }

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      const r = consumeChunk(buffer, chunk, cfg.mapper, mapCtx)
      buffer = r.buffer
      if (r.skipped) console.warn(`[${cfg.id}] ${r.skipped} unlesbare NDJSON-Zeile(n) übersprungen`)
      if (r.outputTokens != null) outputTokens = r.outputTokens
      queue.push(...dedupe.push(r.steps))
      bump()
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-800)
    })
    child.on('error', (err) => { failure = err; done = true; bump() })
    child.on('close', (code) => {
      queue.push(...dedupe.flush())
      if (code !== 0 && !ctx.signal.aborted) {
        failure = new Error(
          `${cfg.label} endete mit Code ${code}.` + (stderrTail.trim() ? ` ${stderrTail.trim().slice(-400)}` : ''),
        )
      }
      done = true
      bump()
    })

    try {
      while (true) {
        while (queue.length) yield queue.shift()!
        if (done) break
        await new Promise<void>((resolve) => { wake = resolve })
      }
      while (queue.length) yield queue.shift()!
      if (failure) throw failure
      return { outputTokens }
    } finally {
      clearTimeout(timer)
      ctx.signal.removeEventListener('abort', onAbort)
      killTree(child.pid)
    }
  }

  return { id: cfg.id, kind: 'local', label: cfg.label, detect, run }
}

function hhmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const CLI_CONFIGS: CliConfig[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    command: 'claude',
    versionArgs: ['--version'],
    mapper: mapClaudeEvent,
    runArgs: (ctx) => [
      '--print',
      '--output-format', 'stream-json',
      '--verbose', // required by the CLI for stream-json on --print
      '--permission-mode', 'acceptEdits',
      '--append-system-prompt', buildSystem(ctx.project, ctx.agent, ctx.ticket),
      buildTask(ctx.ticket),
    ],
  },
  {
    id: 'opencode',
    label: 'opencode',
    command: 'opencode',
    versionArgs: ['--version'],
    mapper: mapClaudeEvent, // unused while runArgs is null
    runArgs: null,
    // Verified 2026-07-16: `opencode run --format json` produces no output and
    // hangs with an explicit model. Not wired until the format is recorded.
    unsupportedReason: 'Headless-Lauf noch nicht unterstützt',
  },
]
