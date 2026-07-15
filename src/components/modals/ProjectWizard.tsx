import { H } from '../../lib/H'
import { sx } from '../../lib/sx'
import type { Vals } from '../../store/useDerived'

export function ProjectWizard({ v }: { v: Vals }) {
  if (!v.projectModalOpen) return null
  const w = v.wizard
  return (
    <div style={sx('position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px;')}>
      <div onClick={v.closeProject} style={sx('position:absolute;inset:0;background:rgba(10,10,12,.5);backdrop-filter:blur(2px);animation:fadeUp .2s ease;')}></div>
      <div style={sx('position:relative;width:520px;max-width:100%;max-height:90vh;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-lg);display:flex;flex-direction:column;animation:fadeUp .22s ease;overflow:hidden;')}>
        <div style={sx('padding:20px 22px 0;')}>
          <h2 style={sx('margin:0 0 3px;font-size:17px;font-weight:700;')}>Neues Projekt einrichten</h2>
          <p style={sx('margin:0;font-size:12.5px;color:var(--text-2);')}>Schritt {w.progress} — richte alles Wichtige direkt ein.</p>
          <div style={sx('display:flex;align-items:center;gap:0;margin:16px 0 2px;')}>
            {w.steps.map((ws, i) => (
              <div key={i} style={sx('display:contents;')}>
                <button onClick={ws.onGoto} style={sx('display:flex;align-items:center;gap:7px;flex:none;')}>
                  <span style={sx(`width:22px;height:22px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:${ws.dotBg};color:${ws.dotColor};`)}>{ws.num}</span>
                  <span style={sx(`font-size:12px;font-weight:600;color:${ws.textColor};white-space:nowrap;`)}>{ws.label}</span>
                </button>
                <span style={sx('flex:1;min-width:10px;height:1px;background:var(--border);margin:0 8px;')}></span>
              </div>
            ))}
          </div>
        </div>

        <div style={sx('flex:1;overflow-y:auto;padding:18px 22px;border-top:1px solid var(--border);margin-top:14px;')}>
          {/* Step 0: Name */}
          {w.is0 && (
            <>
              <div style={sx('display:flex;align-items:center;gap:14px;margin-bottom:16px;')}>
                <div style={sx('width:52px;height:52px;border-radius:13px;background:var(--accent);color:var(--accent-text);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex:none;')}>{w.initial}</div>
                <div style={sx('flex:1;')}>
                  <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Projektname</label>
                  <input value={w.name} onChange={v.setWizName} placeholder="z. B. Q4 Roadmap" autoFocus style={sx('width:100%;margin-top:6px;padding:11px 13px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;')} />
                </div>
              </div>
              <div style={sx('font-size:13px;color:var(--text-2);line-height:1.55;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:13px 15px;')}>In den nächsten Schritten legst du <b style={sx('color:var(--text);font-weight:600;')}>design.md</b>, <b style={sx('color:var(--text);font-weight:600;')}>Anweisungen</b>, <b style={sx('color:var(--text);font-weight:600;')}>Integrationen</b> (Jira/Slack) und <b style={sx('color:var(--text);font-weight:600;')}>Umgebungsvariablen</b> an. Alles später unter Projekt-Einstellungen änderbar.</div>
            </>
          )}

          {/* Step 1: design.md */}
          {w.is1 && (
            <>
              <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}><span style={sx("font-family:'JetBrains Mono',monospace;color:var(--accent);")}>design.md</span> — Design- & Stilrichtlinien</label>
              <textarea value={w.designMd} onChange={v.setWizDesign} style={sx("width:100%;margin-top:8px;padding:13px 15px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:13px;font-family:'JetBrains Mono',monospace;line-height:1.6;min-height:200px;resize:vertical;")}></textarea>
            </>
          )}

          {/* Step 2: Anweisungen */}
          {w.is2 && (
            <>
              <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Projekt-Anweisungen — Regeln für alle Agenten</label>
              <textarea value={w.instructions} onChange={v.setWizInstr} placeholder="z. B. Immer auf Deutsch antworten. Quellen angeben. Keine Secrets ausgeben…" style={sx('width:100%;margin-top:8px;padding:13px 15px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:13.5px;line-height:1.6;min-height:170px;resize:vertical;')}></textarea>
            </>
          )}

          {/* Step 3: Integrationen */}
          {w.is3 && (
            <>
              <div style={sx('display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border:1px solid var(--border);border-radius:12px;')}>
                <div style={sx('display:flex;align-items:center;gap:11px;')}><div style={sx('width:34px;height:34px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;background:oklch(0.6 0.16 255 / 0.14);')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.16 255)" strokeWidth="2" strokeLinejoin="round"><path d="M12 2l9 9-9 9-3-3 6-6-6-6z" /></svg></div><span style={sx('font-size:14px;font-weight:700;')}>Jira</span></div>
                <button onClick={v.toggleWizJira} style={sx(`font-size:13px;font-weight:600;padding:8px 14px;border-radius:9px;border:1px solid var(--border);background:${w.jiraBtnBg};color:${w.jiraBtnColor};transition:.12s;`)}>{w.jiraBtn}</button>
              </div>
              {w.jiraConnected && (
                <input value={w.jiraUrl} onChange={v.setWizJiraUrl} placeholder="https://dein-space.atlassian.net/PROJ" style={sx("width:100%;margin-top:9px;padding:10px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:13px;font-family:'JetBrains Mono',monospace;")} />
              )}
              <div style={sx('display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border:1px solid var(--border);border-radius:12px;margin-top:12px;')}>
                <div style={sx('display:flex;align-items:center;gap:11px;')}><div style={sx('width:34px;height:34px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;background:oklch(0.7 0.15 330 / 0.14);')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.62 0.16 330)" strokeWidth="2" strokeLinecap="round"><path d="M9 3v10a2 2 0 1 1-2-2h10a2 2 0 1 1-2 2V3a2 2 0 1 1 2 2H7a2 2 0 1 1 2-2z" /></svg></div><span style={sx('font-size:14px;font-weight:700;')}>Slack</span></div>
                <button onClick={v.toggleWizSlack} style={sx(`font-size:13px;font-weight:600;padding:8px 14px;border-radius:9px;border:1px solid var(--border);background:${w.slackBtnBg};color:${w.slackBtnColor};transition:.12s;`)}>{w.slackBtn}</button>
              </div>
              {w.slackConnected && (
                <div style={sx('display:flex;align-items:center;gap:8px;margin-top:9px;padding:9px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);')}>
                  <span style={sx("font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-3);")}>Kanal</span>
                  <input value={w.slackChannel} onChange={v.setWizSlackChannel} placeholder="#kanal" style={sx("flex:1;border:none;outline:none;background:none;font-size:13px;font-family:'JetBrains Mono',monospace;color:var(--text);")} />
                </div>
              )}
            </>
          )}

          {/* Step 4: Envs */}
          {w.is4 && (
            <>
              <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Umgebungsvariablen <span style={sx("font-family:'JetBrains Mono',monospace;color:var(--text-3);font-weight:400;")}>.env</span></label>
              <div style={sx('display:flex;flex-direction:column;gap:8px;margin-top:8px;')}>
                {w.envRows.map((ev, i) => (
                  <div key={i} style={sx('display:flex;gap:8px;align-items:center;')}>
                    <input value={ev.key} onChange={ev.onKey} placeholder="KEY" style={sx("width:42%;padding:9px 11px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:12.5px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;")} />
                    <input value={ev.value} onChange={ev.onVal} placeholder="Wert" style={sx("flex:1;min-width:0;padding:9px 11px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:12.5px;font-family:'JetBrains Mono',monospace;")} />
                    <H as="button" onClick={ev.onRemove} hover="background:var(--err-soft);color:var(--err)" css="width:34px;height:34px;flex:none;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--text-3);border:1px solid var(--border);transition:.12s;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></H>
                  </div>
                ))}
              </div>
              <H as="button" onClick={v.addWizEnv} hover="border-color:var(--accent);color:var(--accent)" css="margin-top:10px;display:flex;align-items:center;gap:7px;padding:9px 13px;border:1px dashed var(--border-2);border-radius:9px;font-size:13px;font-weight:600;color:var(--text-3);transition:.12s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Variable hinzufügen</H>
              <div style={sx('font-size:12.5px;color:var(--text-3);margin-top:12px;line-height:1.5;')}>Fertig? Mit „Projekt erstellen" wird das Projekt mit allen Einstellungen angelegt.</div>
            </>
          )}
        </div>

        <div style={sx('display:flex;gap:10px;padding:16px 22px;border-top:1px solid var(--border);')}>
          <H as="button" onClick={v.closeProject} hover="background:var(--surface-2)" css="flex:none;padding:11px 16px;border-radius:11px;border:1px solid var(--border);font-size:14px;font-weight:600;transition:background .12s;">Abbrechen</H>
          {w.step !== 0 && <H as="button" onClick={v.wizBack} hover="background:var(--surface-2)" css="flex:none;padding:11px 16px;border-radius:11px;border:1px solid var(--border);font-size:14px;font-weight:600;transition:background .12s;">Zurück</H>}
          <span style={sx('flex:1;')}></span>
          {w.notLast && <H as="button" onClick={v.wizNext} hover="filter:brightness(1.08)" css="flex:none;padding:11px 26px;border-radius:11px;background:var(--accent);color:var(--accent-text);font-size:14px;font-weight:700;transition:filter .12s;">Weiter</H>}
          {w.isLast && <H as="button" onClick={v.submitProject} hover="filter:brightness(1.08)" css="flex:none;padding:11px 26px;border-radius:11px;background:var(--accent);color:var(--accent-text);font-size:14px;font-weight:700;transition:filter .12s;">Projekt erstellen</H>}
        </div>
      </div>
    </div>
  )
}
