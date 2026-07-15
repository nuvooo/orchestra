import { useOrchestra, WIZ_STEPS, PROVIDERS } from './OrchestraContext'
import { planScript } from '../lib/plan'
import {
  provById,
  avatar,
  statusInfo,
  ticketStatus,
  prioColor,
  provStyle,
  phaseForStatus,
  phaseMeta,
} from '../lib/styleHelpers'
import type { Project, Ticket, Agent, Phase } from './types'

/**
 * Faithful port of the prototype's `renderVals()` — builds every view model the
 * templates consume from the current state + bound action handlers.
 */
export function useDerived() {
  const { state, actions } = useOrchestra()
  const st = state
  const a = actions
  const dark = st.theme === 'dark'
  const proj = a.curProj()
  const av = (h: number | null) => avatar(st.theme, h)
  const ticketTeam = a.ticketTeam

  const projIcon = (p: Project) => ({
    iconBg: `oklch(${dark ? 0.34 : 0.93} 0.07 ${p.hue})`,
    iconColor: `oklch(${dark ? 0.86 : 0.44} 0.15 ${p.hue})`,
    initial: p.name[0].toUpperCase(),
  })
  const curProject = { name: proj.name, ...projIcon(proj) }

  const openCountOf = (p: Project) => p.tickets.filter((t) => t.status !== 'done').length
  const projectList = st.projects.map((p) => ({
    name: p.name,
    ...projIcon(p),
    agentCount: p.agents.length,
    openCount: openCountOf(p),
    isCurrent: p.id === st.currentProjectId,
    rowBg: p.id === st.currentProjectId ? 'var(--surface-2)' : 'transparent',
    onPick: () => a.pickProject(p.id),
  }))

  const mk = (id: string) => (st.view === id ? { bg: 'var(--surface-2)', color: 'var(--text)' } : { bg: 'transparent', color: 'var(--text-2)' })
  const navStyles = {
    dashboard: mk('dashboard'),
    tickets: st.view === 'tickets' || st.view === 'ticket' ? { bg: 'var(--surface-2)', color: 'var(--text)' } : { bg: 'transparent', color: 'var(--text-2)' },
    agents: mk('agents'),
    skills: mk('skills'),
    settings: mk('settings'),
  }
  const titles: Record<string, string> = { dashboard: 'Übersicht', tickets: 'Tickets', ticket: 'Ticket', agents: 'Agenten', skills: 'Skills', settings: 'Einstellungen', projectcfg: 'Projekt-Einstellungen' }
  const pageTitle = titles[st.view] || 'Übersicht'

  const blockedCount = proj.tickets.filter((t) => t.status === 'blocked').length

  const provInfo = (ag: Agent) => {
    const pv = provById(ag.provider)
    const ps = provStyle(pv.kind)
    return { provLabel: pv.label, provKind: ps.kindLabel, provShort: ps.short, provBg: ps.bg, provColor: ps.color, provIconLocal: pv.kind === 'local' }
  }
  const projectAgents = proj.agents.map((ag) => {
    const s = statusInfo(ag.status)
    const pi = provInfo(ag)
    const t = proj.tickets.find((t) => ticketTeam(t).includes(ag.id) && t.status === 'in_progress')
    const wf = ag.wf || 'Sonstige'
    const isLead = wf === 'Lead'
    return {
      ...ag,
      ...av(ag.hue),
      initial: ag.name[0],
      statusColor: s.color,
      statusBg: s.bg,
      statusLabel: s.label,
      subtitle: t ? 'arbeitet an: ' + t.title : ag.role,
      ...pi,
      provIcon: pi.provIconLocal ? '▮' : '☁',
      wf,
      isLead,
      wfBg: isLead ? 'var(--accent-2)' : 'var(--surface-2)',
      wfColor: isLead ? 'var(--accent)' : 'var(--text-2)',
    }
  })

  const projRoles = proj.roles || []
  const roleChips = projRoles.map((r) => ({ label: r, isLead: r === 'Lead', onRemove: () => a.removeRole(r) }))
  const workflowAgents = proj.agents.map((ag) => {
    const aa = av(ag.hue)
    const wf = ag.wf || 'Sonstige'
    return {
      name: ag.name,
      role: ag.role,
      initial: ag.name[0],
      avBg: aa.avatarBg,
      avColor: aa.avatarColor,
      wf,
      isLead: wf === 'Lead',
      options: projRoles.map((r) => ({ label: r, active: r === wf, onPick: () => a.setWfRole(ag.id, r), bg: r === wf ? 'var(--accent)' : 'var(--surface-2)', color: r === wf ? 'var(--accent-text)' : 'var(--text-2)', border: r === wf ? 'var(--accent)' : 'var(--border)' })),
    }
  })

  // per-phase node workflow builder
  const NW = 180,
    NH = 64
  const flows = proj.flows || ({} as any)
  const fPhase = st.flowPhase
  const curFlow = flows[fPhase] || { nodes: [], edges: [] }
  const kindMeta = (k: string) =>
    ({
      start: { bg: 'var(--ok-soft)', color: 'var(--ok)', tag: 'Start' },
      agent: { bg: 'var(--accent-2)', color: 'var(--accent)', tag: 'Agent' },
      skill: { bg: 'oklch(0.62 0.11 210 / 0.16)', color: 'oklch(0.6 0.12 210)', tag: 'Skill' },
      condition: { bg: 'var(--warn-soft)', color: 'var(--warn)', tag: 'Bedingung' },
      end: { bg: 'var(--surface-3)', color: 'var(--text-2)', tag: 'Ende' },
    }[k] || { bg: 'var(--surface-2)', color: 'var(--text-2)', tag: 'Schritt' })
  const nodeById: Record<string, any> = {}
  curFlow.nodes.forEach((n: any) => (nodeById[n.id] = n))
  const flowNodes = curFlow.nodes.map((n: any) => {
    const m = kindMeta(n.kind)
    const editable = n.kind !== 'start'
    const pending = st.pendingConnect === n.id
    const isAgent = n.kind === 'agent'
    const ag = isAgent ? proj.agents.find((x) => x.id === n.agentId) : null
    const nodeSkills = n.skills || []
    const agentSel = [{ value: '', label: 'Agent wählen…' }].concat(proj.agents.map((x) => ({ value: x.id, label: x.name + (x.wf && x.wf !== 'Sonstige' ? ' · ' + x.wf : '') })))
    const skillChips = ag
      ? (ag.skills || []).map((sk) => ({ name: sk, active: nodeSkills.includes(sk), onToggle: () => a.toggleNodeSkill(n.id, sk), bg: nodeSkills.includes(sk) ? 'var(--accent-2)' : 'var(--surface-2)', color: nodeSkills.includes(sk) ? 'var(--accent)' : 'var(--text-3)', border: nodeSkills.includes(sk) ? 'var(--accent)' : 'var(--border)' }))
      : []
    return {
      id: n.id,
      x: n.x,
      y: n.y,
      label: n.label,
      tag: m.tag,
      headBg: m.bg,
      headColor: m.color,
      editable,
      isStart: n.kind === 'start',
      isEnd: n.kind === 'end',
      isAgent,
      agentId: n.agentId || '',
      agentSel,
      hasAgent: !!ag,
      skillChips,
      noSkills: !!ag && skillChips.length === 0,
      pickAgentHint: isAgent && !ag,
      onAgent: (e: any) => a.setNodeAgent(n.id, e),
      pending,
      onDown: (e: any) => a.beginNodeDrag(n.id, e),
      onLabel: (e: any) => a.setNodeLabel(n.id, e),
      onDelete: (e: any) => { if (e) e.stopPropagation(); a.deleteNode(n.id) },
      onOut: (e: any) => a.clickPort(n.id, true, e),
      onIn: (e: any) => a.clickPort(n.id, false, e),
      outBg: pending ? 'var(--accent)' : 'var(--surface)',
    }
  })
  const flowEdges = curFlow.edges
    .map((ed: any) => {
      const na2 = nodeById[ed.from],
        nb = nodeById[ed.to]
      if (!na2 || !nb) return null
      const fx = na2.x + NW,
        fy = na2.y + 33,
        tx = nb.x,
        ty = nb.y + 33
      const d = `M ${fx} ${fy} C ${fx + 70} ${fy}, ${tx - 70} ${ty}, ${tx} ${ty}`
      return { id: ed.id, d, mx: (fx + tx) / 2, my: (fy + ty) / 2, onDelete: (e: any) => a.deleteEdge(ed.id, e) }
    })
    .filter(Boolean)
  let maxX = 700,
    maxY = 340
  curFlow.nodes.forEach((n: any) => {
    maxX = Math.max(maxX, n.x + NW + 60)
    maxY = Math.max(maxY, n.y + NH + 40)
  })
  const flowTabs = ([['plan', 'Planung'], ['build', 'Umsetzung'], ['review', 'Prüfen']] as [Phase, string][]).map(([k, label]) => ({ key: k, label, active: k === fPhase, onPick: () => a.setFlowPhase(k), color: k === fPhase ? 'var(--text)' : 'var(--text-3)', underline: k === fPhase ? 'var(--accent)' : 'transparent' }))
  const flowView = { nodes: flowNodes, edges: flowEdges, w: maxX, h: maxY, phase: fPhase, pending: st.pendingConnect, hasPending: !!st.pendingConnect }

  // dashboard
  const inProg = proj.tickets.filter((t) => t.status === 'in_progress').length
  const doneCount = proj.tickets.filter((t) => t.status === 'done').length
  const stats = [
    { label: 'Agenten', value: String(proj.agents.length), delta: proj.agents.filter((x) => x.status === 'running').length + ' aktiv', deltaColor: 'var(--ok)' },
    { label: 'Tickets in Arbeit', value: String(inProg), delta: 'live', deltaColor: 'var(--accent)' },
    { label: 'Blockiert', value: String(blockedCount), delta: blockedCount ? 'Aktion nötig' : 'alles ok', deltaColor: blockedCount ? 'var(--err)' : 'var(--ok)' },
    { label: 'Erledigt', value: String(doneCount), delta: 'in diesem Projekt', deltaColor: 'var(--text-3)' },
  ]
  const badge = (s: string) => (s === 'in_progress' ? { t: 'Aktiv', bg: 'var(--ok-soft)', c: 'var(--ok)' } : s === 'blocked' ? { t: 'Blockiert', bg: 'var(--err-soft)', c: 'var(--err)' } : s === 'review' ? { t: 'Review', bg: 'var(--warn-soft)', c: 'var(--warn)' } : { t: 'Fertig', bg: 'var(--ok-soft)', c: 'var(--ok)' })
  const feed = proj.tickets
    .filter((t) => t.activity.length)
    .map((t) => {
      const last = t.activity[t.activity.length - 1]
      const primaryId = ticketTeam(t)[0]
      const ag = proj.agents.find((x) => x.id === (last.actor || primaryId)) || ({ name: '?', hue: 274 } as any)
      const b = badge(t.status)
      const action = last.type === 'skill' ? 'nutzte Skill in' : last.type === 'error' ? 'meldete Fehler in' : last.type === 'handoff' ? 'übergab' : 'arbeitete an'
      return { agent: ag.name, initial: ag.name[0], ...av(ag.hue), action, ticketId: t.id, time: t.updated, badge: b.t, badgeBg: b.bg, badgeColor: b.c, onOpen: () => a.openTicket(t.id) }
    })

  // board columns
  const colDefs: [string, string, string[]][] = [
    ['Backlog', 'backlog', ['backlog']],
    ['Ready for Dev', 'ready', ['ready']],
    ['In Arbeit', 'in_progress', ['in_progress', 'blocked']],
    ['Review', 'review', ['review']],
    ['Fertig', 'done', ['done']],
  ]
  const STATUS_LIST: [string, string][] = [
    ['backlog', 'Backlog'],
    ['ready', 'Ready for Dev'],
    ['in_progress', 'In Arbeit'],
    ['blocked', 'Blockiert'],
    ['review', 'Review'],
    ['done', 'Fertig'],
  ]
  const boardColumns = colDefs.map(([name, key, statuses]) => {
    const meta = ticketStatus(key)
    const tickets = proj.tickets
      .filter((t) => statuses.includes(t.status))
      .map((t) => {
        const team = ticketTeam(t).map((id) => proj.agents.find((x) => x.id === id)).filter(Boolean) as Agent[]
        const teamAv = team.slice(0, 3).map((ag) => {
          const aa = av(ag.hue)
          return { initial: ag.name[0], bg: aa.avatarBg, color: aa.avatarColor }
        })
        const extraCount = team.length > 3 ? '+' + (team.length - 3) : ''
        const primary = team[0] || ({ name: '?', provider: 'claude-sonnet-4.5' } as any)
        const pv = provById(primary.provider)
        const ps = provStyle(pv.kind)
        const extra = (st.threadExtra[t.id] || []).length
        const moveOptions = STATUS_LIST.map(([sv, sl]) => {
          const m = ticketStatus(sv)
          return { label: sl, dot: m.dot, active: sv === t.status, onPick: (e: any) => a.setTicketStatus(t.id, sv, e) }
        })
        return {
          id: t.id,
          title: t.title,
          prio: t.prio,
          prioColor: prioColor(t.prio),
          teamAv,
          extraCount,
          multi: team.length > 1,
          provShort: ps.short,
          provBg: ps.bg,
          provColor: ps.color,
          blocked: t.status === 'blocked',
          activityCount: String(t.activity.length + extra),
          cardBorder: t.status === 'blocked' ? 'var(--err)' : 'var(--border)',
          onOpen: () => a.openTicket(t.id),
          onMenu: (e: any) => a.toggleCardMenu(t.id, e),
          menuOpen: st.menuTicket === t.id,
          moveOptions,
          draggable: true,
          onDragStart: (e: any) => a.onDragStart(t.id, e),
          onDragEnd: a.onDragEnd,
          dragOpacity: st.draggedTicket === t.id ? '0.4' : '1',
        }
      })
    return {
      name,
      color: meta.dot,
      count: tickets.length,
      tickets,
      onAdd: a.openTicketModal,
      key,
      onOver: (e: any) => a.onColOver(key, e),
      onDrop: (e: any) => a.onColDrop(key === 'in_progress' ? 'in_progress' : key, e),
      dropBg: st.dragOverKey === key && !!st.draggedTicket ? 'var(--surface-2)' : 'transparent',
      dropOutline: st.dragOverKey === key && !!st.draggedTicket ? '2px dashed var(--accent)' : '2px dashed transparent',
    }
  })

  // ticket detail
  const tk = proj.tickets.find((t) => t.id === st.activeTicket) || proj.tickets[0] || null
  let ticket: any = null
  if (tk) {
    const team = ticketTeam(tk).map((id) => proj.agents.find((x) => x.id === id)).filter(Boolean) as Agent[]
    const primaryId = ticketTeam(tk)[0]
    const ag = team[0] || ({ name: 'Agent', role: '', hue: 274, provider: 'claude-sonnet-4.5' } as any)
    const aAv = av(ag.hue)
    const sMeta = ticketStatus(tk.status)
    const pv = provById(ag.provider)
    const ps = provStyle(pv.kind)
    const extra = st.threadExtra[tk.id] || []
    const planAns = st.planAnswers[tk.id] || []
    const planAnsComments = planAns.map((pa) => ({ type: 'user' as const, phase: 'plan' as const, time: pa.time, action: 'beantwortete ' + pa.skill, text: '„' + pa.q + '"  —  ' + pa.a }))
    const merged = [...tk.activity, ...planAnsComments, ...extra]
    const activity = merged.map((s: any, i: number) => {
      const isLast = i === merged.length - 1
      const streaming = tk.status === 'in_progress' && isLast && s.type === 'message'
      const isHandoff = s.type === 'handoff',
        isError = s.type === 'error',
        isUser = s.type === 'user'
      let actorAgent: any, actorInitial: string, actorName: string
      if (isUser) {
        actorName = 'Lena Mayer'
        actorInitial = 'LM'
        actorAgent = { hue: null }
      } else {
        actorAgent = proj.agents.find((x) => x.id === (s.actor || primaryId)) || ag
        actorInitial = actorAgent.name[0]
        actorName = actorAgent.name
      }
      const actorAv = isUser ? { avatarBg: 'var(--surface-3)', avatarColor: 'var(--text)' } : av(actorAgent.hue)
      const actorRole = isUser ? 'Du' : actorAgent.role || ''
      const toAgent = isHandoff ? proj.agents.find((x) => x.id === s.to) || ag : null
      const toAv = toAgent ? av(toAgent.hue) : ({} as any)
      const action = s.action || (s.type === 'skill' ? 'nutzte ' + s.skillName : s.type === 'message' ? 'antwortete' : 'kommentierte')
      const okOk = s.ok !== false
      const okColor = okOk ? 'var(--ok)' : 'var(--err)'
      const okText = okOk ? 'OK' : 'fehlgeschlagen'
      return {
        ...s,
        phase: isUser ? phaseForStatus(tk.status) : s.phase || 'build',
        isComment: !isHandoff && !isError,
        isSkill: s.type === 'skill',
        showText: s.type === 'thought' || s.type === 'message' || s.type === 'user',
        isHandoff,
        isError,
        isUser,
        actorName,
        actorInitial,
        actorRole,
        actorAvatarBg: actorAv.avatarBg,
        actorAvatarColor: actorAv.avatarColor,
        toName: toAgent ? toAgent.name : '',
        toInitial: toAgent ? toAgent.name[0] : '',
        toAvatarBg: toAv.avatarBg,
        toAvatarColor: toAv.avatarColor,
        action,
        time: s.time || '',
        bubbleBg: isUser ? 'var(--surface-2)' : s.type === 'message' ? 'var(--accent-2)' : 'var(--surface-2)',
        bubbleBorder: isUser ? 'var(--border-2)' : s.type === 'message' ? 'transparent' : 'var(--border)',
        hasCode: !!s.code,
        codeFile: s.code ? s.code.file : '',
        codeBody: s.code ? s.code.body : '',
        hasShot: !!s.shot,
        shotId: s.shot ? s.shot.id : '',
        shotCaption: s.shot ? s.shot.caption : '',
        okColor,
        okText,
        streaming,
      }
    })
    const phases = (['plan', 'build', 'review'] as Phase[])
      .map((k) => {
        const meta = phaseMeta(k)
        const steps = activity.filter((x) => x.phase === k)
        return { key: k, label: meta.label, tab: meta.tab, hint: meta.hint, color: meta.color, steps, count: String(steps.length) }
      })
      .filter((p) => p.steps.length > 0)
    let activePhaseKey = st.activePhase
    if (!phases.some((p) => p.key === activePhaseKey)) activePhaseKey = phases.length ? phases[0].key : 'plan'
    const phaseTabs = (['plan', 'build', 'review'] as Phase[]).map((k) => {
      const meta = phaseMeta(k)
      const ph = phases.find((p) => p.key === k)
      const n = ph ? ph.steps.length : 0
      return {
        key: k,
        tab: meta.tab,
        hint: meta.hint,
        color: meta.color,
        count: String(n),
        empty: n === 0,
        active: k === activePhaseKey,
        onPick: () => a.setPhase(k),
        tabColor: k === activePhaseKey ? 'var(--text)' : n === 0 ? 'var(--text-3)' : 'var(--text-2)',
        underline: k === activePhaseKey ? meta.color : 'transparent',
        badgeBg: k === activePhaseKey ? meta.color : 'var(--surface-3)',
        badgeColor: k === activePhaseKey ? '#fff' : 'var(--text-3)',
      }
    })
    const activePhaseObj = phases.find((p) => p.key === activePhaseKey) || { steps: [], hint: '', label: '' }
    // planning terminal
    const script = planScript(tk)
    const answered = planAns.length
    const termLines = script.slice(0, answered).map((qq, i) => ({ skill: qq.skill, q: qq.q, a: planAns[i].a }))
    const termCurrent = script[answered] || null
    const terminal = { lines: termLines, hasCurrent: !!termCurrent, curSkill: termCurrent ? termCurrent.skill : '', curQ: termCurrent ? termCurrent.q : '', done: !termCurrent, total: String(script.length), answered: String(answered) }
    // Umsetzungsplan
    const planItems = (tk.plan || []).map((p, i) => ({ text: p, num: String(i + 1) }))
    // Standard lifecycle
    const stageIdx = ({ backlog: 2, ready: 3, in_progress: 4, blocked: 4, review: 5, done: 6 } as Record<string, number>)[tk.status] || 2
    const stages = ['Angelegt', 'Geplant', 'Freigegeben', 'Umsetzung', 'Geprüft'].map((label, i) => {
      const n = i + 1
      const state2 = n < stageIdx ? 'done' : n === stageIdx ? 'active' : 'todo'
      return {
        label,
        state: state2,
        dotBg: state2 === 'todo' ? 'var(--surface-3)' : 'var(--accent)',
        dotColor: state2 === 'todo' ? 'var(--text-3)' : 'var(--accent-text)',
        textColor: state2 === 'todo' ? 'var(--text-3)' : 'var(--text)',
        barBg: n < stageIdx ? 'var(--accent)' : 'var(--border)',
        showBar: i > 0,
        done: state2 === 'done',
        active: state2 === 'active',
      }
    })
    const teamRail = team.map((m) => {
      const mav = av(m.hue)
      const mpv = provById(m.provider)
      const mps = provStyle(mpv.kind)
      const working = tk.status === 'in_progress' && !!activity.find((x) => x.actorName === m.name)
      return { name: m.name, role: m.role, initial: m.name[0], bg: mav.avatarBg, color: mav.avatarColor, provLabel: mpv.label, provKind: mps.kindLabel, provColor: mps.color, provBg: mps.bg, provIcon: mpv.kind === 'local' ? '▮' : '☁', working }
    })
    const agentSteps = activity.filter((x) => !x.isUser && !x.isHandoff)
    const lastAg = agentSteps.length ? agentSteps[agentSteps.length - 1] : null
    const bannerName = lastAg ? lastAg.actorName : ag.name
    const bannerInitial = lastAg ? lastAg.actorInitial : ag.name[0]
    const bannerBg = lastAg ? lastAg.actorAvatarBg : aAv.avatarBg
    const bannerColor = lastAg ? lastAg.actorAvatarColor : aAv.avatarColor
    ticket = {
      id: tk.id,
      title: tk.title,
      desc: tk.desc,
      prio: tk.prio,
      prioColor: prioColor(tk.prio),
      statusLabel: sMeta.label,
      statusColor: sMeta.color,
      statusBg: sMeta.bg,
      statusMenuOpen: st.statusMenuOpen,
      toggleStatusMenu: a.toggleStatusMenu,
      statusOptions: STATUS_LIST.map(([sv, sl]) => {
        const m = ticketStatus(sv)
        return { label: sl, dot: m.dot, active: sv === tk.status, rowBg: sv === tk.status ? 'var(--surface-2)' : 'transparent', onPick: () => a.setTicketStatus(tk.id, sv) }
      }),
      working: tk.status === 'in_progress',
      blocked: tk.status === 'blocked',
      agentName: bannerName,
      agentRole: ag.role,
      agentInitial: bannerInitial,
      agentBg: bannerBg,
      agentColor: bannerColor,
      composerTarget: team.length > 1 ? 'das Team' : ag.name,
      team: teamRail,
      teamCount: String(team.length),
      multi: team.length > 1,
      provLabel: pv.label,
      provKind: ps.kindLabel,
      provBg: ps.bg,
      provColor: ps.color,
      provIcon: pv.kind === 'local' ? '▮' : '☁',
      skill: tk.skill,
      updated: tk.updated,
      elapsed: tk.elapsed,
      tokens: tk.tokens,
      activity,
      phases,
      phaseTabs,
      activePhaseSteps: activePhaseObj.steps,
      activePhaseHint: (activePhaseObj as any).hint,
      activityCount: String(activity.length),
      showTerminal: activePhaseKey === 'plan',
      terminal,
      planItems,
      hasPlan: planItems.length > 0,
      stages,
    }
  }

  const sidebarRuns = proj.tickets
    .filter((t) => t.status === 'in_progress')
    .map((t) => {
      const pid = ticketTeam(t)[0]
      const ag = proj.agents.find((x) => x.id === pid) || ({ name: '?', hue: 274 } as any)
      const aa = av(ag.hue)
      return { initial: ag.name[0], avatarBg: aa.avatarBg, avatarColor: aa.avatarColor, short: t.title.length > 18 ? t.title.slice(0, 18) + '…' : t.title, onSelect: () => a.openTicket(t.id) }
    })

  // create agent
  const na = st.newAgent
  const kindBtn = (k: string) => (na.providerKind === k ? { bg: 'var(--accent-2)', color: 'var(--accent)', border: 'var(--accent)' } : { bg: 'var(--surface-2)', color: 'var(--text-2)', border: 'var(--border)' })
  const providerOptions = PROVIDERS.filter((p) => p.kind === na.providerKind).map((m) => ({ label: m.label, onPick: () => a.pickProvider(m.id), bg: m.id === na.provider ? 'var(--accent-2)' : 'var(--surface-2)', color: m.id === na.provider ? 'var(--accent)' : 'var(--text-2)', border: m.id === na.provider ? 'var(--accent)' : 'var(--border)' }))
  const skillOptions = st.skills.map((k) => {
    const sel = na.skills.includes(k.name)
    return { name: k.name, onToggle: () => a.toggleNewSkill(k.name), mark: sel ? '✓' : '+', bg: sel ? 'var(--accent-2)' : 'var(--surface-2)', color: sel ? 'var(--accent)' : 'var(--text-2)', border: sel ? 'var(--accent)' : 'var(--border)' }
  })

  const skills = st.skills.map((k) => ({ ...k, onToggle: () => a.toggleSkillInstall(k.name), btnLabel: k.installed ? '✓ Installiert' : '+ Hinzufügen', btnBg: k.installed ? 'var(--surface-2)' : 'var(--accent)', btnColor: k.installed ? 'var(--text-2)' : 'var(--accent-text)', btnBorder: k.installed ? 'var(--border)' : 'transparent' }))

  const sel = (v: string) => (st.themePref === v ? 'var(--accent)' : 'var(--border)')
  const providerRows = PROVIDERS.map((p) => {
    const ps = provStyle(p.kind)
    const connected = p.id !== 'gemini-2.5-pro'
    return { label: p.label, sub: p.kind === 'local' ? 'Lokaler CLI-Provider' : 'Cloud-API', icon: p.kind === 'local' ? '▮' : '☁', provBg: ps.bg, provColor: ps.color, state: connected ? 'Verbunden' : 'Einrichten', stBg: connected ? 'var(--ok-soft)' : 'var(--surface-2)', stColor: connected ? 'var(--ok)' : 'var(--text-2)' }
  })

  // project configuration
  const jc = proj.jira || { connected: false, url: '' }
  const sc = proj.slack || { connected: false, channel: '' }
  const jiraCfg = { connected: jc.connected, url: jc.url, statusText: jc.connected ? 'Verbunden' : 'Nicht verbunden', statusColor: jc.connected ? 'var(--ok)' : 'var(--text-3)', statusBg: jc.connected ? 'var(--ok-soft)' : 'var(--surface-2)', btnLabel: jc.connected ? 'Trennen' : 'Verbinden', btnBg: jc.connected ? 'var(--surface-2)' : 'var(--accent)', btnColor: jc.connected ? 'var(--text-2)' : 'var(--accent-text)', btnBorder: jc.connected ? 'var(--border)' : 'transparent' }
  const slackCfg = { connected: sc.connected, channel: sc.channel, statusText: sc.connected ? 'Verbunden' : 'Nicht verbunden', statusColor: sc.connected ? 'var(--ok)' : 'var(--text-3)', statusBg: sc.connected ? 'var(--ok-soft)' : 'var(--surface-2)', btnLabel: sc.connected ? 'Trennen' : 'Verbinden', btnBg: sc.connected ? 'var(--surface-2)' : 'var(--accent)', btnColor: sc.connected ? 'var(--text-2)' : 'var(--accent-text)', btnBorder: sc.connected ? 'var(--border)' : 'transparent' }
  const jiraInbox = (proj.jiraInbox || []).map((it) => ({ key: it.key, title: it.title, type: it.type, typeColor: it.type === 'Bug' ? 'var(--err)' : it.type === 'Story' ? 'var(--accent)' : 'var(--text-2)', onImport: () => a.importJira(it.key) }))
  const envRows = (proj.envs || []).map((e, i) => ({ key: e.key, value: e.value, onKey: (ev: any) => a.setEnvKey(i, ev), onVal: (ev: any) => a.setEnvVal(i, ev), onRemove: () => a.removeEnv(i) }))
  const projectCfg = { name: proj.name, jira: jiraCfg, slack: slackCfg, jiraInbox, jiraInboxEmpty: jiraInbox.length === 0, designMd: proj.designMd || '', instructions: proj.instructions || '', envRows }

  // new-project wizard
  const wd = st.wizardData
  const wstep = st.wizardStep
  const wlen = WIZ_STEPS.length
  const wizJira = wd.jira
  const wizSlack = wd.slack
  const wizard = {
    step: wstep,
    isFirst: wstep === 0,
    isLast: wstep === wlen - 1,
    notLast: wstep !== wlen - 1,
    progress: wstep + 1 + ' / ' + wlen,
    steps: WIZ_STEPS.map((label, i) => ({ label, num: String(i + 1), active: i === wstep, done: i < wstep, onGoto: () => a.wizGoto(i), dotBg: i < wstep ? 'var(--accent)' : i === wstep ? 'var(--accent)' : 'var(--surface-3)', dotColor: i <= wstep ? 'var(--accent-text)' : 'var(--text-3)', textColor: i === wstep ? 'var(--text)' : 'var(--text-3)' })),
    is0: wstep === 0,
    is1: wstep === 1,
    is2: wstep === 2,
    is3: wstep === 3,
    is4: wstep === 4,
    name: wd.name,
    initial: (wd.name.trim()[0] || 'P').toUpperCase(),
    designMd: wd.designMd,
    instructions: wd.instructions,
    jiraConnected: wizJira.connected,
    jiraUrl: wizJira.url,
    jiraBtn: wizJira.connected ? 'Verbunden ✓' : 'Jira verbinden',
    jiraBtnBg: wizJira.connected ? 'var(--ok-soft)' : 'var(--surface-2)',
    jiraBtnColor: wizJira.connected ? 'var(--ok)' : 'var(--text)',
    slackConnected: wizSlack.connected,
    slackChannel: wizSlack.channel,
    slackBtn: wizSlack.connected ? 'Verbunden ✓' : 'Slack verbinden',
    slackBtnBg: wizSlack.connected ? 'var(--ok-soft)' : 'var(--surface-2)',
    slackBtnColor: wizSlack.connected ? 'var(--ok)' : 'var(--text)',
    envRows: wd.envs.map((e, i) => ({ key: e.key, value: e.value, onKey: (ev: any) => a.setWizEnvKey(i, ev), onVal: (ev: any) => a.setWizEnvVal(i, ev), onRemove: () => a.removeWizEnv(i) })),
  }

  return {
    curProject,
    projectList,
    switcherOpen: st.switcherOpen,
    toggleSwitcher: a.toggleSwitcher,
    addProject: a.addProject,
    navStyles,
    pageTitle,
    hasBlocked: blockedCount > 0,
    blockedCount: String(blockedCount),
    isDashboard: st.view === 'dashboard',
    isTickets: st.view === 'tickets',
    isTicket: st.view === 'ticket',
    isAgents: st.view === 'agents',
    isSkills: st.view === 'skills',
    isSettings: st.view === 'settings',
    isDark: dark,
    isLight: !dark,
    goDashboard: a.goDashboard,
    goTickets: a.goTickets,
    goAgents: a.goAgents,
    goSkills: a.goSkills,
    goSettings: a.goSettings,
    toggleTheme: a.toggleTheme,
    openCreate: a.openCreate,
    closeCreate: a.closeCreate,
    stats,
    feed,
    projectAgents,
    skills,
    boardColumns,
    ticket,
    sidebarRuns,
    noRunning: sidebarRuns.length === 0,
    composerText: st.composerText,
    setComposer: a.setComposer,
    addComment: a.addComment,
    restartAgent: a.restartAgent,
    termInput: st.termInput,
    setTermInput: a.setTermInput,
    submitTerm: a.submitTerm,
    onTermKey: a.onTermKey,
    skillInput: st.skillInput,
    setSkillInput: a.setSkillInput,
    installSkill: a.installSkill,
    ticketModalOpen: st.ticketModalOpen,
    closeTicketModal: a.closeTicketModal,
    submitTicket: a.submitTicket,
    newTicketTitle: st.newTicket.title,
    setNewTicketTitle: a.setNewTicketTitle,
    prioOptions: ['Niedrig', 'Mittel', 'Hoch'].map((p) => ({ label: p, onPick: () => a.setNewTicketPrio(p), bg: st.newTicket.prio === p ? 'var(--accent-2)' : 'var(--surface-2)', color: st.newTicket.prio === p ? 'var(--accent)' : 'var(--text-2)', border: st.newTicket.prio === p ? 'var(--accent)' : 'var(--border)' })),
    ticketAgentOptions: proj.agents.map((ag) => {
      const sel2 = st.newTicket.agentIds.includes(ag.id)
      const aa = av(ag.hue)
      return { name: ag.name, role: ag.role, initial: ag.name[0], avBg: aa.avatarBg, avColor: aa.avatarColor, onToggle: () => a.toggleNewTicketAgent(ag.id), sel: sel2, rowBg: sel2 ? 'var(--accent-2)' : 'var(--surface-2)', rowBorder: sel2 ? 'var(--accent)' : 'var(--border)' }
    }),
    projectModalOpen: st.projectModalOpen,
    closeProject: a.closeProject,
    submitProject: a.submitProject,
    wizard,
    wizNext: a.wizNext,
    wizBack: a.wizBack,
    setWizName: a.setWizName,
    setWizDesign: a.setWizDesign,
    setWizInstr: a.setWizInstr,
    toggleWizJira: a.toggleWizJira,
    setWizJiraUrl: a.setWizJiraUrl,
    toggleWizSlack: a.toggleWizSlack,
    setWizSlackChannel: a.setWizSlackChannel,
    addWizEnv: a.addWizEnv,
    createOpen: st.createOpen,
    newAgent: na,
    newInitial: (na.name.trim()[0] || 'A').toUpperCase(),
    newSkillCount: na.skills.length,
    setName: a.setName,
    setRole: a.setRole,
    submitAgent: a.submitAgent,
    setKindCloud: a.setKindCloud,
    setKindLocal: a.setKindLocal,
    kindCloud: kindBtn('cloud'),
    kindLocal: kindBtn('local'),
    providerLabel: na.providerKind === 'local' ? 'CLI-Provider' : 'Modell',
    providerOptions,
    skillOptions,
    setLight: () => a.setThemePref('light'),
    setDark: () => a.setThemePref('dark'),
    setSystem: () => a.setThemePref('system'),
    themeSel: { light: sel('light'), dark: sel('dark'), system: sel('system') },
    providerRows,
    isProjectCfg: st.view === 'projectcfg',
    goProjectCfg: a.goProjectCfg,
    projectCfg,
    toggleJira: a.toggleJira,
    toggleSlack: a.toggleSlack,
    setJiraUrl: a.setJiraUrl,
    setSlackChannel: a.setSlackChannel,
    setDesignMd: a.setDesignMd,
    setInstructions: a.setInstructions,
    addEnv: a.addEnv,
    workflowAgents,
    hasWorkflow: workflowAgents.length > 0,
    roleChips,
    roleInput: st.roleInput,
    setRoleInput: a.setRoleInput,
    addRole: a.addRole,
    flowView,
    flowTabs,
    cancelConnect: a.cancelConnect,
    stop: (e: any) => { if (e && e.stopPropagation) e.stopPropagation() },
    addFlowAgent: () => a.addFlowNode('agent'),
    addFlowSkill: () => a.addFlowNode('skill'),
    addFlowCond: () => a.addFlowNode('condition'),
    addFlowEnd: () => a.addFlowNode('end'),
  }
}

export type Vals = ReturnType<typeof useDerived>
