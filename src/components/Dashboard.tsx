import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Dashboard({ v }: { v: Vals }) {
  return (
    <div style={sx('animation:fadeUp .3s ease both;')}>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px;')}>
        {v.stats.map((s, i) => (
          <div key={i} style={sx('background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:var(--shadow);')}>
            <div style={sx('font-size:13px;color:var(--text-2);font-weight:500;')}>{s.label}</div>
            <div style={sx('display:flex;align-items:baseline;gap:9px;margin-top:10px;')}>
              <span style={sx('font-size:30px;font-weight:700;letter-spacing:-.03em;')}>{s.value}</span>
              <span style={sx(`font-size:12.5px;font-weight:600;color:${s.deltaColor};`)}>{s.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={sx('display:grid;grid-template-columns:1.5fr 1fr;gap:18px;align-items:start;')}>
        <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;')}>
          <div style={sx('display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border);')}>
            <h3 style={sx('margin:0;font-size:15px;font-weight:600;')}>Live-Aktivität</h3>
            <span style={sx('display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text-2);')}><span style={sx('width:7px;height:7px;border-radius:50%;background:var(--ok);animation:pulse 1.6s infinite;')}></span>Echtzeit</span>
          </div>
          <div style={sx('display:flex;flex-direction:column;')}>
            {v.feed.map((f, i) => (
              <H as="button" key={i} onClick={f.onOpen} hover="background:var(--surface-2)" css="text-align:left;display:flex;gap:13px;padding:13px 18px;border-bottom:1px solid var(--border);transition:background .12s;">
                <div style={sx(`width:30px;height:30px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:${f.avatarBg};color:${f.avatarColor};`)}>{f.initial}</div>
                <div style={sx('flex:1;min-width:0;')}>
                  <div style={sx('font-size:13.5px;line-height:1.45;')}><b style={sx('font-weight:600;')}>{f.agent}</b> <span style={sx('color:var(--text-2);')}>{f.action}</span> <span style={sx("font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent);")}>{f.ticketId}</span></div>
                  <div style={sx('font-size:11.5px;color:var(--text-3);margin-top:3px;')}>{f.time}</div>
                </div>
                <span style={sx(`align-self:flex-start;font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px;background:${f.badgeBg};color:${f.badgeColor};`)}>{f.badge}</span>
              </H>
            ))}
          </div>
        </div>

        <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;')}>
          <div style={sx('padding:16px 18px;border-bottom:1px solid var(--border);')}><h3 style={sx('margin:0;font-size:15px;font-weight:600;')}>Agenten im Projekt</h3></div>
          <div style={sx('display:flex;flex-direction:column;')}>
            {v.projectAgents.map((a, i) => (
              <div key={i} style={sx('display:flex;align-items:center;gap:12px;padding:13px 18px;border-bottom:1px solid var(--border);')}>
                <div style={sx('position:relative;flex:none;')}>
                  <div style={sx(`width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;background:${a.avatarBg};color:${a.avatarColor};`)}>{a.initial}</div>
                  <span style={sx(`position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:50%;border:2px solid var(--surface);background:${a.statusColor};`)}></span>
                </div>
                <div style={sx('flex:1;min-width:0;')}>
                  <div style={sx('font-size:13.5px;font-weight:600;')}>{a.name}</div>
                  <div style={sx('font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{a.subtitle}</div>
                </div>
                <span style={sx(`display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;padding:3px 7px;border-radius:6px;background:${a.provBg};color:${a.provColor};`)}>{a.provIcon}{a.provShort}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
