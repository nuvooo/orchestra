import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Sidebar({ v }: { v: Vals }) {
  const cp = v.curProject
  return (
    <aside style={sx('width:250px;flex:none;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;background:var(--surface);border-right:1px solid var(--border);padding:16px 14px;')}>
      <div style={sx('display:flex;align-items:center;gap:9px;padding:2px 6px 14px;')}>
        <div style={sx('width:26px;height:26px;border-radius:8px;background:var(--accent);display:flex;align-items:center;justify-content:center;flex:none;')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="2.4" /><circle cx="12" cy="4" r="1.6" /><circle cx="20" cy="12" r="1.6" /><circle cx="12" cy="20" r="1.6" /><circle cx="4" cy="12" r="1.6" /><path d="M12 9.6V5.6M14.4 12h3.9M12 14.4v4M9.6 12H5.6" /></svg>
        </div>
        <span style={sx('font-weight:700;font-size:14.5px;letter-spacing:-.02em;')}>Orchestra</span>
      </div>

      {/* PROJECT SWITCHER */}
      <div style={sx('position:relative;margin-bottom:16px;')}>
        <H as="button" onClick={v.toggleSwitcher} hover="border-color:var(--border-2)" css="width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);transition:border-color .12s;">
          <span style={sx(`width:30px;height:30px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:${cp.iconBg};color:${cp.iconColor};`)}>{cp.initial}</span>
          <span style={sx('flex:1;min-width:0;text-align:left;')}>
            <span style={sx('display:block;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);')}>Projekt</span>
            <span style={sx('display:block;font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{cp.name}</span>
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round"><path d="M8 10l4-4 4 4M8 14l4 4 4-4" /></svg>
        </H>

        {v.switcherOpen && (
          <div style={sx('position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:50;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);padding:6px;animation:fadeUp .16s ease;')}>
            <div style={sx('padding:6px 8px 4px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);')}>Projekt wechseln</div>
            {v.projectList.map((p, i) => (
              <H as="button" key={i} onClick={p.onPick} hover="background:var(--surface-2)" css={`width:100%;display:flex;align-items:center;gap:10px;padding:8px;border-radius:9px;text-align:left;transition:background .12s;background:${p.rowBg};`}>
                <span style={sx(`width:26px;height:26px;border-radius:7px;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:${p.iconBg};color:${p.iconColor};`)}>{p.initial}</span>
                <span style={sx('flex:1;min-width:0;')}>
                  <span style={sx('display:block;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{p.name}</span>
                  <span style={sx('display:block;font-size:11px;color:var(--text-3);')}>{p.agentCount} Agenten · {p.openCount} offen</span>
                </span>
                {p.isCurrent && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6"><path d="M5 12l4 4 10-10" /></svg>}
              </H>
            ))}
            <H as="button" onClick={v.goProjectCfg} hover="background:var(--surface-2)" css="width:100%;display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:9px;text-align:left;color:var(--text-2);font-weight:600;font-size:13px;margin-top:2px;border-top:1px solid var(--border);transition:background .12s;">
              <span style={sx('width:26px;height:26px;border-radius:7px;flex:none;display:flex;align-items:center;justify-content:center;')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" /></svg></span>
              Projekt-Einstellungen
            </H>
            <H as="button" onClick={v.addProject} hover="background:var(--surface-2)" css="width:100%;display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:9px;text-align:left;color:var(--accent);font-weight:600;font-size:13px;transition:background .12s;">
              <span style={sx('width:26px;height:26px;border-radius:7px;flex:none;display:flex;align-items:center;justify-content:center;border:1px dashed var(--border-2);')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
              Neues Projekt
            </H>
          </div>
        )}
      </div>

      <nav style={sx('display:flex;flex-direction:column;gap:2px;')}>
        <H as="button" onClick={v.goDashboard} hover="background:var(--surface-2)" css={`display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;font-size:14px;font-weight:500;transition:background .12s;background:${v.navStyles.dashboard.bg};color:${v.navStyles.dashboard.color};`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></svg>
          Übersicht
        </H>
        <H as="button" onClick={v.goTickets} hover="background:var(--surface-2)" css={`display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;font-size:14px;font-weight:500;transition:background .12s;background:${v.navStyles.tickets.bg};color:${v.navStyles.tickets.color};`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h8.2a2 2 0 0 1 1.5.7l4 4.6a1 1 0 0 1 0 1.4l-4 4.6a2 2 0 0 1-1.5.7H6a2 2 0 0 1-2-2z" /><circle cx="9" cy="12" r="1.4" /></svg>
          Tickets
          {v.hasBlocked && <span style={sx('margin-left:auto;font-size:11px;font-weight:700;padding:1px 7px;border-radius:20px;background:var(--err-soft);color:var(--err);')}>{v.blockedCount}</span>}
        </H>
        <H as="button" onClick={v.goAgents} hover="background:var(--surface-2)" css={`display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;font-size:14px;font-weight:500;transition:background .12s;background:${v.navStyles.agents.bg};color:${v.navStyles.agents.color};`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>
          Agenten
        </H>
        <H as="button" onClick={v.goSkills} hover="background:var(--surface-2)" css={`display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;font-size:14px;font-weight:500;transition:background .12s;background:${v.navStyles.skills.bg};color:${v.navStyles.skills.color};`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><path d="M13.5 17h7M17 13.5v7" /></svg>
          Skills
        </H>
      </nav>

      <div style={sx('margin-top:20px;padding:0 10px 8px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-3);')}>Läuft gerade</div>
      <div style={sx('display:flex;flex-direction:column;gap:2px;overflow-y:auto;')}>
        {v.sidebarRuns.map((r, i) => (
          <H as="button" key={i} onClick={r.onSelect} hover="background:var(--surface-2)" css="display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;text-align:left;transition:background .12s;">
            <span style={sx(`width:20px;height:20px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:${r.avatarBg};color:${r.avatarColor};`)}>{r.initial}</span>
            <span style={sx('flex:1;min-width:0;font-size:12.5px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{r.short}</span>
            <span style={sx('width:7px;height:7px;border-radius:50%;flex:none;background:var(--ok);animation:pulse 1.6s ease-in-out infinite;')}></span>
          </H>
        ))}
        {v.noRunning && <div style={sx('padding:6px 10px;font-size:12px;color:var(--text-3);')}>Keine aktiven Läufe</div>}
      </div>

      <div style={sx('margin-top:auto;display:flex;flex-direction:column;gap:8px;padding-top:14px;')}>
        <H as="button" onClick={v.toggleTheme} hover="background:var(--surface-2)" css="display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;font-size:14px;font-weight:500;color:var(--text-2);transition:background .12s;">
          {v.isDark ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></svg>
              Light Mode
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5z" /></svg>
              Dark Mode
            </>
          )}
        </H>
        <H as="button" onClick={v.goSettings} hover="background:var(--surface-2)" css={`display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;font-size:14px;font-weight:500;transition:background .12s;background:${v.navStyles.settings.bg};color:${v.navStyles.settings.color};`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.4" /><circle cx="9" cy="17" r="2.4" /></svg>
          Einstellungen
        </H>
        <div style={sx('display:flex;align-items:center;gap:10px;padding:8px 6px;border-top:1px solid var(--border);margin-top:2px;')}>
          <div style={sx('width:30px;height:30px;border-radius:8px;background:var(--surface-3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex:none;')}>{(v.user?.name || v.user?.email || '?').slice(0, 2).toUpperCase()}</div>
          <div style={sx('flex:1;min-width:0;line-height:1.2;')}>
            <div style={sx('font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{v.user?.name || 'Nutzer'}</div>
            <div style={sx('font-size:11px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{v.user?.email}</div>
          </div>
          <H as="button" onClick={v.logout} title="Abmelden" hover="background:var(--surface-2);color:var(--text)" css="width:28px;height:28px;flex:none;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-3);transition:.12s;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 17l-5-5 5-5M4 12h11" /></svg>
          </H>
        </div>
      </div>
    </aside>
  )
}
