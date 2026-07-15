import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Skills({ v }: { v: Vals }) {
  return (
    <div style={sx('animation:fadeUp .3s ease both;')}>
      <div style={sx('display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:13px;color:var(--text-2);')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8.5 12l2.2 2.2 4.8-4.8" /></svg>
        Vorgefertigte Skills aus der <b style={sx("font-weight:600;color:var(--text);font-family:'JetBrains Mono',monospace;")}>skills.sh</b> Registry — installieren und Agenten zuweisen.
      </div>
      <div style={sx('display:flex;gap:9px;margin-bottom:18px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px;box-shadow:var(--shadow);')}>
        <div style={sx('display:flex;align-items:center;gap:9px;flex:1;padding:0 8px;color:var(--text-3);')}>
          <span style={sx("font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-3);")}>skills.sh/</span>
          <input value={v.skillInput} onChange={v.setSkillInput} placeholder="skill-name eingeben, z. B. translate" style={sx("flex:1;border:none;outline:none;background:none;font-size:13.5px;color:var(--text);font-family:'JetBrains Mono',monospace;")} />
        </div>
        <H as="button" onClick={v.installSkill} hover="filter:brightness(1.08)" css="display:flex;align-items:center;gap:7px;background:var(--accent);color:var(--accent-text);font-weight:600;font-size:13px;padding:9px 15px;border-radius:9px;transition:filter .12s;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
          Installieren
        </H>
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;')}>
        {v.skills.map((k, i) => (
          <div key={i} style={sx('background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:17px;box-shadow:var(--shadow);display:flex;flex-direction:column;')}>
            <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
              <span style={sx('font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;background:var(--accent-2);color:var(--accent);')}>{k.cat}</span>
              <span style={sx('font-size:11.5px;color:var(--text-3);')}>{k.installs} Installs</span>
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
