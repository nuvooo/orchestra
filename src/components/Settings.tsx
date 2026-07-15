import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Settings({ v }: { v: Vals }) {
  return (
    <div style={sx('animation:fadeUp .3s ease both;max-width:680px;display:flex;flex-direction:column;gap:16px;')}>
      <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
        <h3 style={sx('margin:0 0 4px;font-size:15px;font-weight:600;')}>Erscheinungsbild</h3>
        <p style={sx('margin:0 0 16px;font-size:13px;color:var(--text-2);')}>Wähle das Farbschema der Oberfläche.</p>
        <div style={sx('display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;')}>
          <button onClick={v.setLight} style={sx(`padding:14px;border-radius:12px;border:1.5px solid ${v.themeSel.light};background:var(--surface-2);text-align:left;`)}>
            <div style={sx('height:38px;border-radius:8px;background:#f6f5f3;border:1px solid #e6e3de;margin-bottom:9px;')}></div>
            <span style={sx('font-size:13px;font-weight:600;')}>Hell</span>
          </button>
          <button onClick={v.setDark} style={sx(`padding:14px;border-radius:12px;border:1.5px solid ${v.themeSel.dark};background:var(--surface-2);text-align:left;`)}>
            <div style={sx('height:38px;border-radius:8px;background:#0d0d0f;border:1px solid #33333a;margin-bottom:9px;')}></div>
            <span style={sx('font-size:13px;font-weight:600;')}>Dunkel</span>
          </button>
          <button onClick={v.setSystem} style={sx(`padding:14px;border-radius:12px;border:1.5px solid ${v.themeSel.system};background:var(--surface-2);text-align:left;`)}>
            <div style={sx('height:38px;border-radius:8px;background:linear-gradient(105deg,#f6f5f3 50%,#0d0d0f 50%);border:1px solid var(--border);margin-bottom:9px;')}></div>
            <span style={sx('font-size:13px;font-weight:600;')}>System</span>
          </button>
        </div>
      </div>
      <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
        <h3 style={sx('margin:0 0 4px;font-size:15px;font-weight:600;')}>Provider & Modelle</h3>
        <p style={sx('margin:0 0 16px;font-size:13px;color:var(--text-2);')}>Cloud-APIs und lokale CLI-Provider für deine Agenten.</p>
        {v.providerRows.map((p, i) => (
          <div key={i} style={sx('display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);')}>
            <div style={sx('display:flex;align-items:center;gap:11px;')}>
              <div style={sx(`width:30px;height:30px;border-radius:8px;background:${p.provBg};color:${p.provColor};display:flex;align-items:center;justify-content:center;`)}>{p.icon}</div>
              <div><div style={sx("font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;")}>{p.label}</div><div style={sx('font-size:11.5px;color:var(--text-3);')}>{p.sub}</div></div>
            </div>
            <span style={sx(`font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;background:${p.stBg};color:${p.stColor};`)}>{p.state}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
