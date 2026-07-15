import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function FlowEditor({ v }: { v: Vals }) {
  const f = v.flowView
  return (
    <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
      <h3 style={sx('margin:0 0 4px;font-size:15px;font-weight:600;')}>Phasen-Workflow</h3>
      <p style={sx('margin:0 0 14px;font-size:13px;color:var(--text-2);')}>Baue je Phase einen Ablauf aus Knoten. Knoten ziehen zum Verschieben; rechten Punkt anklicken, dann linken Punkt eines anderen Knotens = Verbindung.</p>
      <div style={sx('display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--border);margin-bottom:12px;')}>
        {v.flowTabs.map((ft, i) => (
          <button key={i} onClick={ft.onPick} style={sx(`padding:9px 14px 11px;font-size:13px;font-weight:600;color:${ft.color};border-bottom:2px solid ${ft.underline};margin-bottom:-1px;transition:color .12s;`)}>{ft.label}</button>
        ))}
        <div style={sx('margin-left:auto;display:flex;gap:6px;')}>
          <H as="button" onClick={v.addFlowAgent} hover="border-color:var(--accent);color:var(--accent)" css="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid var(--border);color:var(--text-2);transition:.12s;">+ Agent</H>
          <H as="button" onClick={v.addFlowSkill} hover="border-color:var(--accent);color:var(--accent)" css="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid var(--border);color:var(--text-2);transition:.12s;">+ Skill</H>
          <H as="button" onClick={v.addFlowCond} hover="border-color:var(--accent);color:var(--accent)" css="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid var(--border);color:var(--text-2);transition:.12s;">+ Bedingung</H>
          <H as="button" onClick={v.addFlowEnd} hover="border-color:var(--accent);color:var(--accent)" css="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid var(--border);color:var(--text-2);transition:.12s;">+ Ende</H>
        </div>
      </div>
      <div onClick={v.cancelConnect} style={sx('position:relative;height:380px;overflow:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);background-image:radial-gradient(var(--border) 1px, transparent 1px);background-size:20px 20px;')}>
        <div style={{ position: 'relative', width: f.w, height: f.h }}>
          <svg width={f.w} height={f.h} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
            {f.edges.map((ed: any, i: number) => (
              <path key={i} d={ed.d} fill="none" stroke="var(--border-2)" strokeWidth="2"></path>
            ))}
          </svg>
          {f.edges.map((ed: any, i: number) => (
            <H key={'d' + i} as="button" onClick={ed.onDelete} title="Verbindung löschen" hover="background:var(--err);color:#fff" css={`position:absolute;left:${ed.mx}px;top:${ed.my}px;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);color:var(--text-3);font-size:11px;line-height:1;`}>×</H>
          ))}
          {f.nodes.map((nd: any) => (
            <div key={nd.id} style={sx(`position:absolute;left:${nd.x}px;top:${nd.y}px;width:180px;background:var(--surface);border:1px solid var(--border);border-radius:11px;box-shadow:var(--shadow);`)}>
              <div onPointerDown={nd.onDown} style={sx(`display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:11px 11px 0 0;cursor:grab;background:${nd.headBg};`)}>
                <span style={sx(`font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${nd.headColor};flex:1;`)}>{nd.tag}</span>
                {nd.editable && <button onClick={nd.onDelete} style={sx(`width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:${nd.headColor};font-size:13px;line-height:1;`)}>×</button>}
              </div>
              <div style={sx('padding:9px 10px;')}>
                <input value={nd.label} onChange={nd.onLabel} style={sx('width:100%;border:none;outline:none;background:none;font-size:13px;font-weight:500;color:var(--text);')} />
                {nd.isAgent && (
                  <>
                    <select value={nd.agentId} onChange={nd.onAgent} onPointerDown={v.stop} style={sx('width:100%;margin-top:7px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:12px;color:var(--text);')}>
                      {nd.agentSel.map((op: any, oi: number) => (
                        <option key={oi} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {nd.hasAgent && (
                      <>
                        <div style={sx('font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-3);margin:8px 0 5px;')}>Skills in diesem Schritt</div>
                        <div style={sx('display:flex;flex-wrap:wrap;gap:4px;')}>
                          {nd.skillChips.map((sc: any, si: number) => (
                            <button key={si} onClick={sc.onToggle} onPointerDown={v.stop} style={sx(`font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 7px;border-radius:6px;transition:.12s;background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};`)}>{sc.name}</button>
                          ))}
                          {nd.noSkills && <span style={sx('font-size:10.5px;color:var(--text-3);')}>Agent hat keine Skills</span>}
                        </div>
                      </>
                    )}
                    {nd.pickAgentHint && <div style={sx('font-size:10.5px;color:var(--text-3);margin-top:5px;')}>Agent wählen, um Skills festzulegen</div>}
                  </>
                )}
              </div>
              <button onClick={nd.onIn} title="Eingang" style={sx('position:absolute;left:-7px;top:26px;width:14px;height:14px;border-radius:50%;background:var(--surface);border:2px solid var(--border-2);cursor:crosshair;')}></button>
              <button onClick={nd.onOut} title="Ausgang" style={sx(`position:absolute;right:-7px;top:26px;width:14px;height:14px;border-radius:50%;background:${nd.outBg};border:2px solid var(--accent);cursor:crosshair;`)}></button>
            </div>
          ))}
        </div>
      </div>
      {f.hasPending && <div style={sx('margin-top:9px;font-size:12px;color:var(--accent);font-weight:600;')}>Verbindung aktiv — klicke den linken Punkt eines Zielknotens (oder irgendwo, um abzubrechen).</div>}
    </div>
  )
}
