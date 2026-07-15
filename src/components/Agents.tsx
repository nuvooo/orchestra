import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Agents({ v }: { v: Vals }) {
  return (
    <div style={sx('animation:fadeUp .3s ease both;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;')}>
      {v.projectAgents.map((a, i) => (
        <H key={i} as="div" hover="border-color:var(--border-2);transform:translateY(-2px)" css="background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:18px;box-shadow:var(--shadow);transition:transform .15s,border-color .15s;">
          <div style={sx('display:flex;align-items:flex-start;gap:13px;')}>
            <div style={sx('position:relative;flex:none;')}>
              <div style={sx(`width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;background:${a.avatarBg};color:${a.avatarColor};`)}>{a.initial}</div>
              <span style={sx(`position:absolute;right:-3px;bottom:-3px;width:14px;height:14px;border-radius:50%;border:2.5px solid var(--surface);background:${a.statusColor};`)}></span>
            </div>
            <div style={sx('flex:1;min-width:0;')}>
              <div style={sx('display:flex;align-items:center;gap:7px;')}>
                <span style={sx('font-size:16px;font-weight:700;')}>{a.name}</span>
                <span style={sx(`display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;background:${a.wfBg};color:${a.wfColor};`)}>{a.wf}</span>
              </div>
              <div style={sx('font-size:13px;color:var(--text-2);')}>{a.role}</div>
            </div>
            <span style={sx(`font-size:11px;font-weight:600;padding:4px 9px;border-radius:20px;background:${a.statusBg};color:${a.statusColor};`)}>{a.statusLabel}</span>
          </div>
          <div style={sx(`display:flex;align-items:center;gap:8px;margin-top:15px;padding:8px 11px;border-radius:9px;background:${a.provBg};`)}>
            <span style={sx(`color:${a.provColor};display:flex;`)}>{a.provIcon}</span>
            <span style={sx(`font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:${a.provColor};`)}>{a.provLabel}</span>
            <span style={sx(`margin-left:auto;font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:${a.provColor};`)}>{a.provKind}</span>
          </div>
          <div style={sx('display:flex;flex-wrap:wrap;gap:6px;margin-top:13px;')}>
            {a.skills.map((sk, si) => (
              <span key={si} style={sx("font-family:'JetBrains Mono',monospace;font-size:11px;padding:4px 8px;border-radius:7px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);")}>{sk}</span>
            ))}
          </div>
          <div style={sx('display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);')}>
            <H as="button" onClick={v.goTickets} hover="background:var(--surface-3)" css="flex:1;padding:8px;border-radius:9px;background:var(--surface-2);font-size:13px;font-weight:600;transition:background .12s;">Tickets</H>
            <H as="button" hover="background:var(--surface-2)" css="width:38px;display:flex;align-items:center;justify-content:center;border-radius:9px;border:1px solid var(--border);color:var(--text-2);transition:background .12s;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18" cy="12" r="1.7" /></svg>
            </H>
          </div>
        </H>
      ))}
      <H as="button" onClick={v.openCreate} hover="border-color:var(--accent);color:var(--accent)" css="min-height:230px;border:1.5px dashed var(--border-2);border-radius:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;color:var(--text-3);font-weight:600;font-size:14px;transition:.15s;">
        <span style={sx('width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </span>
        Agent für dieses Projekt
      </H>
    </div>
  )
}
