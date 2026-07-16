import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Skills({ v }: { v: Vals }) {
  return (
    <div style={sx('animation:fadeUp .3s ease both;')}>
      <div style={sx('display:flex;align-items:center;gap:10px;margin-bottom:18px;font-size:13px;color:var(--text-2);')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8.5 12l2.2 2.2 4.8-4.8" /></svg>
        Verfügbare Skills — installieren und Agenten zuweisen.
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;')}>
        {v.skills.map((k, i) => (
          <div key={i} style={sx('background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:17px;box-shadow:var(--shadow);display:flex;flex-direction:column;')}>
            <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
              <span style={sx('font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;background:var(--accent-2);color:var(--accent);')}>{k.cat}</span>
            </div>
            <div style={sx("font-family:'JetBrains Mono',monospace;font-size:14.5px;font-weight:600;margin-top:12px;")}>{k.name}</div>
            <div style={sx('font-size:13px;color:var(--text-2);margin-top:6px;line-height:1.5;flex:1;')}>{k.desc}</div>
            <button onClick={k.onToggle} style={sx(`margin-top:14px;padding:9px;border-radius:9px;font-size:13px;font-weight:600;transition:.12s;background:${k.btnBg};color:${k.btnColor};border:1px solid ${k.btnBorder};`)}>{k.btnLabel}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
