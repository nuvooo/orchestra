import { H } from '../../lib/H'
import { sx } from '../../lib/sx'
import type { Vals } from '../../store/useDerived'

export function AgentSlideOver({ v }: { v: Vals }) {
  if (!v.createOpen) return null
  return (
    <div style={sx('position:fixed;inset:0;z-index:60;')}>
      <div onClick={v.closeCreate} style={sx('position:absolute;inset:0;background:rgba(10,10,12,.5);backdrop-filter:blur(2px);animation:fadeUp .2s ease;')}></div>
      <div style={sx('position:absolute;top:0;right:0;height:100vh;width:460px;max-width:92vw;background:var(--surface);border-left:1px solid var(--border);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;animation:fadeUp .25s ease;')}>
        <div style={sx('display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid var(--border);')}>
          <div><h2 style={sx('margin:0;font-size:17px;font-weight:700;')}>Neuer Agent</h2><p style={sx('margin:3px 0 0;font-size:12.5px;color:var(--text-2);')}>in Projekt <b style={sx('color:var(--text);font-weight:600;')}>{v.curProject.name}</b></p></div>
          <H as="button" onClick={v.closeCreate} hover="background:var(--surface-2)" css="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--text-2);transition:background .12s;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </H>
        </div>
        <div style={sx('flex:1;overflow-y:auto;padding:22px;display:flex;flex-direction:column;gap:18px;')}>
          <div style={sx('display:flex;align-items:center;gap:14px;')}>
            <div style={sx('width:52px;height:52px;border-radius:13px;background:var(--accent);color:var(--accent-text);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex:none;')}>{v.newInitial}</div>
            <div style={sx('flex:1;')}>
              <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Name</label>
              <input value={v.newAgent.name} onChange={v.setName} placeholder="z. B. Atlas" style={sx('width:100%;margin-top:6px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;')} />
            </div>
          </div>
          <div>
            <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Rolle</label>
            <input value={v.newAgent.role} onChange={v.setRole} placeholder="z. B. Research Analyst" style={sx('width:100%;margin-top:6px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;')} />
          </div>
          <div>
            <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Provider-Typ</label>
            <div style={sx('display:flex;gap:8px;margin-top:8px;')}>
              <button onClick={v.setKindCloud} style={sx(`flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:10px;font-size:13px;font-weight:600;transition:.12s;background:${v.kindCloud.bg};color:${v.kindCloud.color};border:1px solid ${v.kindCloud.border};`)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 18 18z" /></svg>
                Cloud-API
              </button>
              <button onClick={v.setKindLocal} style={sx(`flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:10px;font-size:13px;font-weight:600;transition:.12s;background:${v.kindLocal.bg};color:${v.kindLocal.color};border:1px solid ${v.kindLocal.border};`)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 9l3 3-3 3M13 15h4" /></svg>
                Lokal / CLI
              </button>
            </div>
          </div>
          <div>
            <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>{v.providerLabel}</label>
            <div style={sx('display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;')}>
              {v.providerOptions.map((m, i) => (
                <button key={i} onClick={m.onPick} disabled={m.disabled} title={m.title} style={sx(`display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;padding:8px 11px;border-radius:9px;transition:.12s;background:${m.bg};color:${m.color};border:1px solid ${m.border};opacity:${m.opacity};cursor:${m.disabled ? 'not-allowed' : 'pointer'};`)}>{m.label}</button>
              ))}
              {!v.providerOptions.length && (
                <span style={sx('font-size:12.5px;color:var(--text-3);')}>Keine gefunden.</span>
              )}
            </div>
          </div>
          <div>
            <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Skills <span style={sx('color:var(--text-3);font-weight:400;')}>({v.newSkillCount} gewählt)</span></label>
            <div style={sx('display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;')}>
              {v.skillOptions.map((s, i) => (
                <button key={i} onClick={s.onToggle} disabled={s.disabled} style={sx(`display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:12px;padding:7px 10px;border-radius:9px;transition:.12s;background:${s.bg};color:${s.color};border:1px solid ${s.border};opacity:${s.opacity};cursor:${s.disabled ? 'not-allowed' : 'pointer'};`)}>
                  <span style={sx('font-size:13px;')}>{s.mark}</span>{s.name}
                </button>
              ))}
            </div>
            {v.skillsNote && (
              <div style={sx('margin-top:8px;font-size:12px;color:var(--text-3);line-height:1.5;')}>{v.skillsNote}</div>
            )}
          </div>
          <div>
            <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Instruktionen</label>
            <textarea placeholder="Beschreibe das Verhalten und Ziel des Agenten…" style={sx('width:100%;margin-top:6px;padding:11px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;min-height:80px;resize:vertical;line-height:1.5;')}></textarea>
          </div>
        </div>
        <div style={sx('display:flex;gap:10px;padding:18px 22px;border-top:1px solid var(--border);')}>
          <H as="button" onClick={v.closeCreate} hover="background:var(--surface-2)" css="flex:none;padding:11px 18px;border-radius:10px;border:1px solid var(--border);font-size:14px;font-weight:600;transition:background .12s;">Abbrechen</H>
          <H as="button" onClick={v.submitAgent} hover="filter:brightness(1.08)" css="flex:1;padding:11px;border-radius:10px;background:var(--accent);color:var(--accent-text);font-size:14px;font-weight:700;transition:filter .12s;">Agent erstellen</H>
        </div>
      </div>
    </div>
  )
}
