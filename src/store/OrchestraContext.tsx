import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { PROVIDERS, WF_ROLES, initialWizardData } from './seed'
import { planScript } from '../lib/plan'
import { api } from './api'
import type { AuthUser } from './api'
import type {
  OrchestraState,
  Project,
  Flows,
  Phase,
  View,
  Ticket,
  ActivityStep,
} from './types'

const WIZ_STEPS = ['Projekt', 'design.md', 'Anweisungen', 'Integrationen', 'Umgebung']

function buildDefaultFlows(p: Project): Flows {
  const roles = p.roles || []
  const has = (r: string) => roles.includes(r)
  const mk = (specs: Array<{ id: string; x: number; y: number; kind: any; label: string }>) => {
    const nodes = specs.map((sp) => ({ id: sp.id, x: sp.x, y: sp.y, kind: sp.kind, label: sp.label }))
    const edges = []
    for (let i = 0; i < nodes.length - 1; i++)
      edges.push({ id: 'e' + i + '-' + nodes[i].id, from: nodes[i].id, to: nodes[i + 1].id })
    return { nodes, edges }
  }
  return {
    plan: mk([
      { id: 'p_s', kind: 'start', label: 'Start', x: 40, y: 150 },
      { id: 'p_1', kind: 'agent', label: (has('Lead') ? 'Lead' : 'Planung') + ': Scope', x: 250, y: 150 },
      { id: 'p_2', kind: 'skill', label: 'brainstorm', x: 250, y: 60 },
      { id: 'p_3', kind: 'skill', label: 'grillme', x: 250, y: 250 },
      { id: 'p_e', kind: 'end', label: 'Ready for Dev', x: 490, y: 150 },
    ]),
    build: mk([
      { id: 'b_s', kind: 'start', label: 'Freigegeben', x: 40, y: 150 },
      { id: 'b_1', kind: 'agent', label: (has('Code') ? 'Code' : 'Umsetzung') + ': Bauen', x: 250, y: 90 },
      { id: 'b_2', kind: 'agent', label: (has('Design') ? 'Design' : 'Design') + ': UI', x: 250, y: 210 },
      { id: 'b_e', kind: 'end', label: 'Bereit für QA', x: 490, y: 150 },
    ]),
    review: mk([
      { id: 'r_s', kind: 'start', label: 'In Review', x: 40, y: 150 },
      { id: 'r_1', kind: 'agent', label: (has('QA') ? 'QA' : 'Prüfen') + ': Tests', x: 250, y: 150 },
      { id: 'r_c', kind: 'condition', label: 'Alle grün?', x: 470, y: 150 },
      { id: 'r_e', kind: 'end', label: 'Fertig', x: 690, y: 150 },
    ]),
  }
}

function makeInitialState(): OrchestraState {
  return {
    view: 'tickets',
    theme: 'dark',
    themePref: 'dark',
    switcherOpen: false,
    createOpen: false,
    projectModalOpen: false,
    wizardStep: 0,
    roleInput: '',
    flowPhase: 'plan',
    pendingConnect: null,
    wizardData: initialWizardData(),
    currentProjectId: '',
    activeTicket: null,
    composerText: '',
    threadExtra: {},
    menuTicket: null,
    statusMenuOpen: false,
    draggedTicket: null,
    dragOverKey: null,
    activePhase: 'plan',
    termInput: '',
    planAnswers: {},
    ticketModalOpen: false,
    newTicket: { title: '', prio: 'Mittel', agentIds: [] },
    ticketSeq: 1,
    newAgent: { name: '', role: '', providerKind: 'cloud', provider: 'claude-sonnet-4.5', skills: ['brainstorm'] },
    skills: [],
    projects: [],
    agentsConfigured: false,
    hydrated: false,
    user: null,
    authChecked: false,
  }
}

// Map a mutation across the ticket with `id` in whichever project holds it.
function mapTicketAcross(projects: Project[], id: string, fn: (t: Ticket) => Ticket): Project[] {
  return projects.map((p) => ({ ...p, tickets: p.tickets.map((t) => (t.id === id ? fn(t) : t)) }))
}

export function useOrchestraStore() {
  const [state, setRaw] = useState<OrchestraState>(makeInitialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const setState = useCallback(
    (patch: Partial<OrchestraState> | ((prev: OrchestraState) => Partial<OrchestraState>)) => {
      setRaw((prev) => {
        const next = typeof patch === 'function' ? patch(prev) : patch
        return { ...prev, ...next }
      })
    },
    [],
  )

  // ---- hydration + auth ----
  const hydrate = useCallback(() => {
    return api
      .getState()
      .then((data) => {
        const projects = data.projects.map((p) => (p.flows ? p : { ...p, flows: buildDefaultFlows(p) }))
        setState((s) => {
          const stillValid = projects.some((p) => p.id === s.currentProjectId)
          const cur = stillValid ? s.currentProjectId : projects[0]?.id || s.currentProjectId
          return { projects, skills: data.skills, ticketSeq: data.ticketSeq, agentsConfigured: data.agentsConfigured, hydrated: true, currentProjectId: cur }
        })
      })
      .catch(() => setState({ hydrated: true }))
  }, [setState])

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    const r = await api.login(email, password)
    if (r.ok && r.user) { setState({ user: r.user, authChecked: true }); await hydrate() }
    return { ok: r.ok, message: r.message }
  }, [setState, hydrate])

  const register = useCallback(async (email: string, name: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    const r = await api.register(email, name, password)
    if (r.ok && r.user) { setState({ user: r.user, authChecked: true }); await hydrate() }
    return { ok: r.ok, message: r.message }
  }, [setState, hydrate])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    // reset to a clean, logged-out state
    setState({ ...makeInitialState(), authChecked: true, user: null })
  }, [setState])

  // ---- theme ----
  const mqRef = useRef<MediaQueryList | null>(null)
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null)

  const applyTheme = useCallback((pref: string) => {
    let eff = pref
    if (pref === 'system')
      eff = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset.theme = eff
    setState({ theme: eff as 'light' | 'dark' })
  }, [setState])

  const setThemePref = useCallback(
    (pref: 'light' | 'dark' | 'system') => {
      try {
        localStorage.setItem('orch-theme-pref', pref)
      } catch {
        /* ignore */
      }
      setState({ themePref: pref })
      applyTheme(pref)
    },
    [applyTheme, setState],
  )

  const toggleTheme = useCallback(() => {
    setThemePref(stateRef.current.theme === 'dark' ? 'light' : 'dark')
  }, [setThemePref])

  useEffect(() => {
    let pref = stateRef.current.themePref
    try {
      const saved = localStorage.getItem('orch-theme-pref')
      if (saved) {
        pref = saved as any
        setState({ themePref: saved as any })
      }
    } catch {
      /* ignore */
    }
    applyTheme(pref)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mqRef.current = mq
    const onMq = () => {
      if (stateRef.current.themePref === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onMq)

    // node-editor drag listeners
    const onFlowMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.sx
      const dy = e.clientY - d.sy
      const nx = Math.max(0, d.ox + dx)
      const ny = Math.max(0, d.oy + dy)
      updateFlow((f) => ({ ...f, nodes: f.nodes.map((n) => (n.id === d.id ? { ...n, x: nx, y: ny } : n)) }))
    }
    const onFlowUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onFlowMove)
    window.addEventListener('pointerup', onFlowUp)

    // seed default flows for projects that have none
    setState((s) => ({ projects: s.projects.map((p) => (p.flows ? p : { ...p, flows: buildDefaultFlows(p) })) }))

    // Check the session; hydrate the user's workspace if logged in.
    api
      .me()
      .then(({ user, agentsConfigured }) => {
        setState({ user, authChecked: true, agentsConfigured })
        if (user) hydrate()
      })
      .catch(() => setState({ authChecked: true }))

    return () => {
      mq.removeEventListener('change', onMq)
      window.removeEventListener('pointermove', onFlowMove)
      window.removeEventListener('pointerup', onFlowUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- project helpers ----
  // Null until the user creates their first project — a fresh workspace is empty.
  const curProj = useCallback((): Project | null => {
    const s = stateRef.current
    return s.projects.find((p) => p.id === s.currentProjectId) || s.projects[0] || null
  }, [])

  // Debounced persistence of the current project's config (design.md,
  // instructions, envs, roles, integrations, flows, agent role assignments).
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistProjectSoon = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const p = curProj()
      if (!p) return
      api.patchProject(p.id, p)
      // agents live in their own rows — upsert them so role/config edits persist
      p.agents.forEach((a) => api.createAgent(p.id, a))
    }, 300)
  }, [curProj])

  const updateProj = useCallback(
    (fn: (p: Project) => Project) => {
      setState((s) => ({ projects: s.projects.map((p) => (p.id !== s.currentProjectId ? p : fn(p))) }))
      persistProjectSoon()
    },
    [setState, persistProjectSoon],
  )

  // live agent run streams, keyed by ticket id
  const streamsRef = useRef<Map<string, EventSource>>(new Map())

  const ticketTeam = useCallback((t: Ticket): string[] => {
    return t.agentIds && t.agentIds.length ? t.agentIds : t.agentId ? [t.agentId] : []
  }, [])

  // ---- navigation ----
  const go = useCallback((v: View) => setState({ view: v }), [setState])
  const goDashboard = useCallback(() => go('dashboard'), [go])
  const goAgents = useCallback(() => go('agents'), [go])
  const goSkills = useCallback(() => go('skills'), [go])
  const goTickets = useCallback(() => go('tickets'), [go])
  const goSettings = useCallback(() => go('settings'), [go])
  const goProjectCfg = useCallback(() => setState({ view: 'projectcfg', switcherOpen: false }), [setState])

  // ---- workflow roles ----
  const setWfRole = useCallback(
    (agentId: string, role: string) => {
      updateProj((p) => ({
        ...p,
        agents: p.agents.map((a) => {
          if (a.id === agentId) return { ...a, wf: role }
          if (role === 'Lead' && a.wf === 'Lead') return { ...a, wf: 'Sonstige' }
          return a
        }),
      }))
    },
    [updateProj],
  )
  const setRoleInput = useCallback((e: any) => setState({ roleInput: e.target.value }), [setState])
  const addRole = useCallback(() => {
    const raw = (stateRef.current.roleInput || '').trim()
    if (!raw) return
    updateProj((p) => {
      const roles = p.roles || []
      if (roles.some((r) => r.toLowerCase() === raw.toLowerCase())) return p
      return { ...p, roles: [...roles, raw] }
    })
    setState({ roleInput: '' })
  }, [updateProj, setState])
  const removeRole = useCallback(
    (name: string) => {
      updateProj((p) => ({
        ...p,
        roles: (p.roles || []).filter((r) => r !== name),
        agents: p.agents.map((a) => (a.wf === name ? { ...a, wf: 'Sonstige' } : a)),
      }))
    },
    [updateProj],
  )

  // ---- flow editor ----
  const setFlowPhase = useCallback((k: Phase) => setState({ flowPhase: k, pendingConnect: null }), [setState])
  const updateFlow = useCallback(
    (fn: (f: Flows[Phase]) => Flows[Phase]) => {
      setState((s) => {
        const ph = s.flowPhase
        return {
          projects: s.projects.map((p) =>
            p.id !== s.currentProjectId
              ? p
              : { ...p, flows: { ...(p.flows as Flows), [ph]: fn((p.flows && p.flows[ph]) || { nodes: [], edges: [] }) } as Flows },
          ),
        }
      })
      persistProjectSoon()
    },
    [setState, persistProjectSoon],
  )
  const addFlowNode = useCallback(
    (kind: string) => {
      const labels: Record<string, string> = { agent: 'Agent-Schritt', skill: 'skill-name', condition: 'Bedingung?', end: 'Ende' }
      const id = 'n' + Date.now()
      updateFlow((f) => ({
        ...f,
        nodes: [...f.nodes, { id, kind: kind as any, label: labels[kind] || 'Schritt', x: 120 + ((f.nodes.length * 26) % 180), y: 110 + ((f.nodes.length * 24) % 140) }],
      }))
    },
    [updateFlow],
  )
  const setNodeLabel = useCallback((id: string, e: any) => {
    const v = e.target.value
    updateFlow((f) => ({ ...f, nodes: f.nodes.map((n) => (n.id === id ? { ...n, label: v } : n)) }))
  }, [updateFlow])
  const deleteNode = useCallback((id: string) => {
    updateFlow((f) => ({ ...f, nodes: f.nodes.filter((n) => n.id !== id), edges: f.edges.filter((ed) => ed.from !== id && ed.to !== id) }))
  }, [updateFlow])
  const beginNodeDrag = useCallback((id: string, e: any) => {
    if (e.target && e.target.tagName === 'INPUT') return
    e.preventDefault()
    const proj = curProj()
    if (!proj) return
    const ph = stateRef.current.flowPhase
    const f = (proj.flows && proj.flows[ph]) || { nodes: [] as any[] }
    const n = f.nodes.find((x: any) => x.id === id)
    if (!n) return
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y }
  }, [curProj])
  const clickPort = useCallback((id: string, isOut: boolean, e: any) => {
    e.stopPropagation()
    const pend = stateRef.current.pendingConnect
    if (isOut) {
      setState({ pendingConnect: id })
      return
    }
    if (pend && pend !== id) {
      updateFlow((f) => {
        if (f.edges.some((ed) => ed.from === pend && ed.to === id)) return f
        return { ...f, edges: [...f.edges, { id: 'e' + Date.now(), from: pend, to: id }] }
      })
      setState({ pendingConnect: null })
    }
  }, [setState, updateFlow])
  const cancelConnect = useCallback(() => {
    if (stateRef.current.pendingConnect) setState({ pendingConnect: null })
  }, [setState])
  const deleteEdge = useCallback((id: string, e?: any) => {
    if (e) e.stopPropagation()
    updateFlow((f) => ({ ...f, edges: f.edges.filter((ed) => ed.id !== id) }))
  }, [updateFlow])
  const setNodeAgent = useCallback((id: string, e: any) => {
    const v = e.target.value
    updateFlow((f) => ({ ...f, nodes: f.nodes.map((n) => (n.id === id ? { ...n, agentId: v, skills: [] } : n)) }))
  }, [updateFlow])
  const toggleNodeSkill = useCallback((id: string, skill: string) => {
    updateFlow((f) => ({
      ...f,
      nodes: f.nodes.map((n) => {
        if (n.id !== id) return n
        const cur = n.skills || []
        return { ...n, skills: cur.includes(skill) ? cur.filter((x) => x !== skill) : [...cur, skill] }
      }),
    }))
  }, [updateFlow])

  // ---- integrations ----
  const toggleJira = useCallback(() => updateProj((p) => ({ ...p, jira: { ...p.jira, connected: !p.jira.connected } })), [updateProj])
  const toggleSlack = useCallback(() => updateProj((p) => ({ ...p, slack: { ...p.slack, connected: !p.slack.connected } })), [updateProj])
  const setJiraUrl = useCallback((e: any) => { const v = e.target.value; updateProj((p) => ({ ...p, jira: { ...p.jira, url: v } })) }, [updateProj])
  const setSlackChannel = useCallback((e: any) => { const v = e.target.value; updateProj((p) => ({ ...p, slack: { ...p.slack, channel: v } })) }, [updateProj])
  const importJira = useCallback((key: string) => {
    setState((s) => {
      const proj = s.projects.find((p) => p.id === s.currentProjectId)!
      const item = (proj.jiraInbox || []).find((x) => x.key === key)
      if (!item) return {}
      const seq = s.ticketSeq + 1
      const first = proj.agents[0]
      const ticket: Ticket = {
        id: item.key,
        title: item.title,
        status: 'backlog',
        prio: item.type === 'Bug' ? 'Hoch' : 'Mittel',
        agentIds: first ? [first.id] : [],
        skill: 'brainstorm',
        elapsed: '—',
        tokens: '—',
        updated: 'gerade eben',
        desc: 'Aus Jira importiert (' + item.type + ' ' + item.key + '). Zuerst Planung, dann Freigabe zur Umsetzung.',
        plan: [],
        fromJira: true,
        activity: [
          { type: 'message', phase: 'plan', actor: first ? first.id : null, time: 'gerade eben', action: 'importierte aus Jira', text: 'Ticket ' + item.key + ' aus Jira übernommen. Ich starte mit der Planung.' },
        ],
      }
      api.createTicket(proj.id, ticket, seq)
      return {
        ticketSeq: seq,
        projects: s.projects.map((p) =>
          p.id !== s.currentProjectId ? p : { ...p, tickets: [ticket, ...p.tickets], jiraInbox: p.jiraInbox.filter((x) => x.key !== key) },
        ),
      }
    })
    persistProjectSoon()
  }, [setState, persistProjectSoon])
  const setDesignMd = useCallback((e: any) => { const v = e.target.value; updateProj((p) => ({ ...p, designMd: v })) }, [updateProj])
  const setInstructions = useCallback((e: any) => { const v = e.target.value; updateProj((p) => ({ ...p, instructions: v })) }, [updateProj])
  const addEnv = useCallback(() => updateProj((p) => ({ ...p, envs: [...(p.envs || []), { key: '', value: '' }] })), [updateProj])
  const setEnvKey = useCallback((i: number, e: any) => { const v = e.target.value; updateProj((p) => ({ ...p, envs: p.envs.map((x, ix) => (ix === i ? { ...x, key: v } : x)) })) }, [updateProj])
  const setEnvVal = useCallback((i: number, e: any) => { const v = e.target.value; updateProj((p) => ({ ...p, envs: p.envs.map((x, ix) => (ix === i ? { ...x, value: v } : x)) })) }, [updateProj])
  const removeEnv = useCallback((i: number) => updateProj((p) => ({ ...p, envs: p.envs.filter((_, ix) => ix !== i) })), [updateProj])

  // ---- project switcher / wizard ----
  const toggleSwitcher = useCallback(() => setState((s) => ({ switcherOpen: !s.switcherOpen })), [setState])
  const pickProject = useCallback((id: string) => {
    const p = stateRef.current.projects.find((x) => x.id === id)
    const first = p && p.tickets[0] ? p.tickets[0].id : null
    setState({ currentProjectId: id, switcherOpen: false, activeTicket: first, view: 'tickets' })
  }, [setState])
  const addProject = useCallback(() => setState({ projectModalOpen: true, switcherOpen: false, wizardStep: 0, wizardData: initialWizardData() }), [setState])
  const closeProject = useCallback(() => setState({ projectModalOpen: false }), [setState])
  const wizNext = useCallback(() => setState((s) => ({ wizardStep: Math.min(s.wizardStep + 1, WIZ_STEPS.length - 1) })), [setState])
  const wizBack = useCallback(() => setState((s) => ({ wizardStep: Math.max(s.wizardStep - 1, 0) })), [setState])
  const wizGoto = useCallback((i: number) => setState({ wizardStep: i }), [setState])
  const updWiz = useCallback((fn: (d: any) => any) => setState((s) => ({ wizardData: fn(s.wizardData) })), [setState])
  const setWizName = useCallback((e: any) => { const v = e.target.value; updWiz((d) => ({ ...d, name: v, slack: { ...d.slack, channel: d.slack.channel || '#' + v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } })) }, [updWiz])
  const setWizDesign = useCallback((e: any) => { const v = e.target.value; updWiz((d) => ({ ...d, designMd: v })) }, [updWiz])
  const setWizInstr = useCallback((e: any) => { const v = e.target.value; updWiz((d) => ({ ...d, instructions: v })) }, [updWiz])
  const toggleWizJira = useCallback(() => updWiz((d) => ({ ...d, jira: { ...d.jira, connected: !d.jira.connected } })), [updWiz])
  const setWizJiraUrl = useCallback((e: any) => { const v = e.target.value; updWiz((d) => ({ ...d, jira: { ...d.jira, url: v } })) }, [updWiz])
  const toggleWizSlack = useCallback(() => updWiz((d) => ({ ...d, slack: { ...d.slack, connected: !d.slack.connected } })), [updWiz])
  const setWizSlackChannel = useCallback((e: any) => { const v = e.target.value; updWiz((d) => ({ ...d, slack: { ...d.slack, channel: v } })) }, [updWiz])
  const addWizEnv = useCallback(() => updWiz((d) => ({ ...d, envs: [...d.envs, { key: '', value: '' }] })), [updWiz])
  const setWizEnvKey = useCallback((i: number, e: any) => { const v = e.target.value; updWiz((d) => ({ ...d, envs: d.envs.map((x: any, ix: number) => (ix === i ? { ...x, key: v } : x)) })) }, [updWiz])
  const setWizEnvVal = useCallback((i: number, e: any) => { const v = e.target.value; updWiz((d) => ({ ...d, envs: d.envs.map((x: any, ix: number) => (ix === i ? { ...x, value: v } : x)) })) }, [updWiz])
  const removeWizEnv = useCallback((i: number) => updWiz((d) => ({ ...d, envs: d.envs.filter((_: any, ix: number) => ix !== i) })), [updWiz])
  const submitProject = useCallback(() => {
    const d = stateRef.current.wizardData
    const id = 'p' + Date.now()
    const name = d.name.trim() || 'Unbenanntes Projekt'
    const proj: Project = {
      id,
      name,
      hue: 240 + Math.floor(Math.random() * 120),
      jira: { connected: d.jira.connected, url: d.jira.url },
      slack: { connected: d.slack.connected, channel: d.slack.channel || '#' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') },
      designMd: d.designMd,
      instructions: d.instructions,
      envs: d.envs.filter((e) => e.key.trim()),
      roles: d.roles && d.roles.length ? d.roles : ['Lead', 'Planung', 'Design', 'Code', 'Review', 'QA'],
      jiraInbox: [],
      agents: [],
      tickets: [],
    }
    proj.flows = buildDefaultFlows(proj)
    setState((s) => ({ projects: [...s.projects, proj], currentProjectId: id, projectModalOpen: false, switcherOpen: false, activeTicket: null, view: 'dashboard' }))
    api.createProject(proj)
  }, [setState])

  // ---- create agent ----
  const openCreate = useCallback(() => setState({ createOpen: true, switcherOpen: false }), [setState])
  const closeCreate = useCallback(() => setState({ createOpen: false }), [setState])
  const setName = useCallback((e: any) => setState((s) => ({ newAgent: { ...s.newAgent, name: e.target.value } })), [setState])
  const setRole = useCallback((e: any) => setState((s) => ({ newAgent: { ...s.newAgent, role: e.target.value } })), [setState])
  const setKind = useCallback((kind: 'cloud' | 'local') => {
    const first = PROVIDERS.find((p) => p.kind === kind)
    setState((s) => ({ newAgent: { ...s.newAgent, providerKind: kind, provider: first ? first.id : s.newAgent.provider } }))
  }, [setState])
  const setKindCloud = useCallback(() => setKind('cloud'), [setKind])
  const setKindLocal = useCallback(() => setKind('local'), [setKind])
  const pickProvider = useCallback((id: string) => setState((s) => ({ newAgent: { ...s.newAgent, provider: id } })), [setState])
  const toggleNewSkill = useCallback((name: string) => {
    setState((s) => {
      const has = s.newAgent.skills.includes(name)
      return { newAgent: { ...s.newAgent, skills: has ? s.newAgent.skills.filter((x) => x !== name) : [...s.newAgent.skills, name] } }
    })
  }, [setState])
  const submitAgent = useCallback(() => {
    const na = stateRef.current.newAgent
    const name = na.name.trim() || 'Neuer Agent'
    const agent = { id: 'x' + Date.now(), name, role: na.role.trim() || 'Custom Agent', wf: 'Sonstige', provider: na.provider, status: 'idle' as const, skills: na.skills.length ? na.skills : ['brainstorm'], hue: 240 + Math.floor(Math.random() * 120) }
    const projectId = stateRef.current.currentProjectId
    setState((s) => ({
      projects: s.projects.map((p) => (p.id === s.currentProjectId ? { ...p, agents: [...p.agents, agent] } : p)),
      createOpen: false,
      view: 'agents',
      newAgent: { name: '', role: '', providerKind: 'cloud', provider: 'claude-sonnet-4.5', skills: ['brainstorm'] },
    }))
    api.createAgent(projectId, agent)
  }, [setState])

  // ---- skills ----
  const toggleSkillInstall = useCallback((name: string) => {
    let next = false
    setState((s) => { const cur = s.skills.find((k) => k.name === name); next = !cur?.installed; return { skills: s.skills.map((k) => (k.name === name ? { ...k, installed: !k.installed } : k)) } })
    api.setSkillInstalled(name, next)
  }, [setState])
  // ---- ticket modal ----
  const openTicketModal = useCallback(() => setState({ ticketModalOpen: true, switcherOpen: false, menuTicket: null, newTicket: { title: '', prio: 'Mittel', agentIds: [] } }), [setState])
  const closeTicketModal = useCallback(() => setState({ ticketModalOpen: false }), [setState])
  const setNewTicketTitle = useCallback((e: any) => setState((s) => ({ newTicket: { ...s.newTicket, title: e.target.value } })), [setState])
  const setNewTicketPrio = useCallback((p: string) => setState((s) => ({ newTicket: { ...s.newTicket, prio: p } })), [setState])
  const toggleNewTicketAgent = useCallback((id: string) => {
    setState((s) => {
      const has = s.newTicket.agentIds.includes(id)
      return { newTicket: { ...s.newTicket, agentIds: has ? s.newTicket.agentIds.filter((x) => x !== id) : [...s.newTicket.agentIds, id] } }
    })
  }, [setState])
  const submitTicket = useCallback(() => {
    const s0 = stateRef.current
    const nt = s0.newTicket
    const proj = curProj()
    if (!proj) return
    const title = nt.title.trim() || 'Neues Ticket'
    const agentIds = nt.agentIds.length ? nt.agentIds : proj.agents[0] ? [proj.agents[0].id] : []
    const seq = s0.ticketSeq + 1
    const id = 'TCK-' + seq
    const ticket: Ticket = {
      id,
      title,
      status: 'backlog',
      prio: nt.prio,
      agentIds,
      skill: 'brainstorm',
      elapsed: '—',
      tokens: '—',
      updated: 'gerade eben',
      desc: 'Neu angelegt. Zuerst Planung im Vorbereitungs-Terminal, dann Freigabe zur Umsetzung.',
      plan: [],
      activity: [
        { type: 'message', phase: 'plan', actor: agentIds[0], time: 'gerade eben', action: 'legte das Ticket an', text: 'Ticket angelegt. Ich starte mit der Planung — beantworte die Fragen im Terminal, dann geht es „Ready for Dev".' },
      ],
    }
    api.createTicket(stateRef.current.currentProjectId, ticket, seq)
    setState((s) => ({ projects: s.projects.map((p) => (p.id === s.currentProjectId ? { ...p, tickets: [ticket, ...p.tickets] } : p)), ticketSeq: seq, ticketModalOpen: false, view: 'ticket', activeTicket: id, activePhase: 'plan', composerText: '', termInput: '' }))
  }, [curProj, setState])

  // ---- ticket detail ----
  const openTicket = useCallback((id: string) => {
    const proj = curProj()
    if (!proj) return
    const tk = proj.tickets.find((t) => t.id === id)
    let ph = phaseForStatusLocal(tk ? tk.status : 'backlog')
    if (tk) {
      const has = (k: string) => tk.activity.some((s) => (s.phase || 'build') === k)
      if (!has(ph)) ph = (['plan', 'build', 'review'] as Phase[]).find(has) || 'plan'
    }
    setState({ view: 'ticket', activeTicket: id, composerText: '', menuTicket: null, statusMenuOpen: false, activePhase: ph })
  }, [curProj, setState])
  const setPhase = useCallback((k: Phase) => setState({ activePhase: k }), [setState])
  const setTermInput = useCallback((e: any) => setState({ termInput: e.target.value }), [setState])
  const submitTerm = useCallback(() => {
    const s0 = stateRef.current
    const txt = s0.termInput.trim()
    if (!txt) return
    const id = s0.activeTicket!
    const proj = curProj()
    if (!proj) return
    const tk = proj.tickets.find((t) => t.id === id)
    if (!tk) return
    const script = planScript(tk)
    const answered = tk.activity.filter((s) => s.planAnswer).length
    const cur = script[answered]
    if (!cur) return
    const step: ActivityStep = { type: 'user', phase: 'plan', planAnswer: true, skillName: cur.skill, q: cur.q, a: txt, time: 'gerade eben', action: 'beantwortete ' + cur.skill, text: '„' + cur.q + '"  —  ' + txt }
    setState((s) => ({ projects: mapTicketAcross(s.projects, id, (t) => ({ ...t, activity: [...t.activity, step] })), termInput: '' }))
    api.planAnswer(id, cur.skill, cur.q, txt)
  }, [curProj, setState])
  const onTermKey = useCallback((e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitTerm()
    }
  }, [submitTerm])

  const toggleCardMenu = useCallback((id: string, e?: any) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    setState((s) => ({ menuTicket: s.menuTicket === id ? null : id }))
  }, [setState])
  const toggleStatusMenu = useCallback(() => setState((s) => ({ statusMenuOpen: !s.statusMenuOpen })), [setState])
  const setTicketStatus = useCallback((id: string, status: string, e?: any) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    setState((s) => ({ menuTicket: null, statusMenuOpen: false, projects: s.projects.map((p) => (p.id !== s.currentProjectId ? p : { ...p, tickets: p.tickets.map((t) => (t.id === id ? { ...t, status: status as any, updated: 'gerade eben' } : t)) })) }))
    api.setTicketStatus(id, status)
  }, [setState])

  const onDragStart = useCallback((id: string, e?: any) => {
    setState({ draggedTicket: id, menuTicket: null })
    if (e && e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      try { e.dataTransfer.setData('text/plain', id) } catch { /* ignore */ }
    }
  }, [setState])
  const onDragEnd = useCallback(() => setState({ draggedTicket: null, dragOverKey: null }), [setState])
  const onColOver = useCallback((key: string, e?: any) => {
    if (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move' }
    if (stateRef.current.dragOverKey !== key) setState({ dragOverKey: key })
  }, [setState])
  const onColDrop = useCallback((status: string, e?: any) => {
    if (e) e.preventDefault()
    const id = stateRef.current.draggedTicket
    if (id) {
      setState((s) => ({ draggedTicket: null, dragOverKey: null, projects: s.projects.map((p) => (p.id !== s.currentProjectId ? p : { ...p, tickets: p.tickets.map((t) => (t.id === id ? { ...t, status: status as any, updated: 'gerade eben' } : t)) })) }))
      api.setTicketStatus(id, status)
    } else {
      setState({ dragOverKey: null })
    }
  }, [setState])

  // ---- live agent runs (SSE) ----
  const openStream = useCallback((id: string) => {
    if (streamsRef.current.has(id)) return
    const es = api.stream(id)
    streamsRef.current.set(id, es)
    es.addEventListener('step', (ev: MessageEvent) => {
      try {
        const step = JSON.parse(ev.data) as ActivityStep
        setState((s) => ({ projects: mapTicketAcross(s.projects, id, (t) => ({ ...t, activity: [...t.activity, step] })) }))
      } catch { /* ignore malformed */ }
    })
    es.addEventListener('status', (ev: MessageEvent) => {
      try {
        const d = JSON.parse(ev.data) as { running?: boolean }
        setState((s) => ({ projects: mapTicketAcross(s.projects, id, (t) => ({ ...t, running: !!d.running, status: d.running && t.status !== 'backlog' && t.status !== 'ready' ? ('in_progress' as any) : t.status, updated: 'gerade eben' })) }))
      } catch { /* ignore */ }
    })
    const close = () => { es.close(); streamsRef.current.delete(id) }
    es.addEventListener('done', close)
  }, [setState])

  const runTicket = useCallback((id: string) => {
    openStream(id)
    api.runTicket(id).then((r) => {
      if (!r.ok) {
        let status = 'in_progress'
        for (const p of stateRef.current.projects) { const t = p.tickets.find((x) => x.id === id); if (t) { status = t.status; break } }
        const step: ActivityStep = { type: 'error', phase: phaseForStatusLocal(status), time: 'gerade eben', text: r.message || 'Agent konnte nicht gestartet werden.' }
        setState((s) => ({ projects: mapTicketAcross(s.projects, id, (t) => ({ ...t, activity: [...t.activity, step], running: false })) }))
        const es = streamsRef.current.get(id); if (es) { es.close(); streamsRef.current.delete(id) }
      }
    }).catch(() => {})
  }, [openStream, setState])

  const setComposer = useCallback((e: any) => setState({ composerText: e.target.value }), [setState])
  const addComment = useCallback(() => {
    const s0 = stateRef.current
    const txt = s0.composerText.trim()
    if (!txt) return
    const id = s0.activeTicket!
    const step: ActivityStep = { type: 'user', time: 'gerade eben', action: 'kommentierte', text: txt }
    setState((s) => ({ projects: mapTicketAcross(s.projects, id, (t) => ({ ...t, activity: [...t.activity, step] })), composerText: '' }))
    api.comment(id, txt)
  }, [setState])
  const restartAgent = useCallback(() => {
    const id = stateRef.current.activeTicket!
    const step: ActivityStep = { type: 'user', time: 'gerade eben', action: 'startete den Agenten neu', text: 'Neustart angefordert.' }
    setState((s) => ({ projects: mapTicketAcross(s.projects, id, (t) => ({ ...t, activity: [...t.activity, step], status: 'in_progress' as any })) }))
    api.comment(id, 'Neustart angefordert.')
    api.setTicketStatus(id, 'in_progress')
    runTicket(id)
  }, [setState, runTicket])

  const actions = useMemo(
    () => ({
      setThemePref, toggleTheme,
      curProj, ticketTeam,
      go, goDashboard, goAgents, goSkills, goTickets, goSettings, goProjectCfg,
      setWfRole, setRoleInput, addRole, removeRole,
      setFlowPhase, addFlowNode, setNodeLabel, deleteNode, beginNodeDrag, clickPort, cancelConnect, deleteEdge, setNodeAgent, toggleNodeSkill,
      toggleJira, toggleSlack, setJiraUrl, setSlackChannel, importJira,
      setDesignMd, setInstructions, addEnv, setEnvKey, setEnvVal, removeEnv,
      toggleSwitcher, pickProject, addProject, closeProject,
      wizNext, wizBack, wizGoto, setWizName, setWizDesign, setWizInstr, toggleWizJira, setWizJiraUrl, toggleWizSlack, setWizSlackChannel, addWizEnv, setWizEnvKey, setWizEnvVal, removeWizEnv, submitProject,
      openCreate, closeCreate, setName, setRole, setKindCloud, setKindLocal, pickProvider, toggleNewSkill, submitAgent,
      toggleSkillInstall,
      openTicketModal, closeTicketModal, setNewTicketTitle, setNewTicketPrio, toggleNewTicketAgent, submitTicket,
      openTicket, setPhase, setTermInput, submitTerm, onTermKey,
      toggleCardMenu, toggleStatusMenu, setTicketStatus,
      onDragStart, onDragEnd, onColOver, onColDrop,
      setComposer, addComment, restartAgent, runTicket,
      login, register, logout,
    }),
    // Every callback is stable (useCallback), so this memo effectively never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return { state, actions }
}

// local copy to avoid import cycle timing in openTicket
function phaseForStatusLocal(s: string): Phase {
  return s === 'backlog' || s === 'ready' ? 'plan' : s === 'review' || s === 'done' ? 'review' : 'build'
}

export type OrchestraActions = ReturnType<typeof useOrchestraStore>['actions']

interface Ctx {
  state: OrchestraState
  actions: OrchestraActions
}
const OrchestraCtx = createContext<Ctx | null>(null)

export function OrchestraProvider({ children }: { children: ReactNode }) {
  const store = useOrchestraStore()
  return <OrchestraCtx.Provider value={store}>{children}</OrchestraCtx.Provider>
}

export function useOrchestra(): Ctx {
  const ctx = useContext(OrchestraCtx)
  if (!ctx) throw new Error('useOrchestra must be used within OrchestraProvider')
  return ctx
}

export { WIZ_STEPS, WF_ROLES, PROVIDERS }
export type { ActivityStep }
