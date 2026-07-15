import { H } from '../lib/H'
import { sx } from '../lib/sx'
import { FlowEditor } from './FlowEditor'
import type { Vals } from '../store/useDerived'

export function ProjectConfig({ v }: { v: Vals }) {
  const c = v.projectCfg
  return (
    <div style={sx('animation:fadeUp .3s ease both;max-width:760px;display:flex;flex-direction:column;gap:16px;')}>
      {/* Integrationen */}
      <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
        <h3 style={sx('margin:0 0 4px;font-size:15px;font-weight:600;')}>Integrationen</h3>
        <p style={sx('margin:0 0 16px;font-size:13px;color:var(--text-2);')}>Verbinde Jira, um Tickets zu übernehmen, und Slack für Benachrichtigungen.</p>

        {/* Jira */}
        <div style={sx('border:1px solid var(--border);border-radius:12px;padding:15px;')}>
          <div style={sx('display:flex;align-items:center;gap:12px;')}>
            <div style={sx('width:38px;height:38px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;background:oklch(0.6 0.16 255 / 0.14);')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.16 255)" strokeWidth="2" strokeLinejoin="round"><path d="M12 2l9 9-9 9-3-3 6-6-6-6z" /></svg></div>
            <div style={sx('flex:1;min-width:0;')}>
              <div style={sx('font-size:14px;font-weight:700;')}>Jira</div>
              <div style={sx(`font-size:12px;color:${c.jira.statusColor};`)}>{c.jira.statusText}</div>
            </div>
            <button onClick={v.toggleJira} style={sx(`font-size:13px;font-weight:600;padding:8px 15px;border-radius:9px;transition:.12s;background:${c.jira.btnBg};color:${c.jira.btnColor};border:1px solid ${c.jira.btnBorder};`)}>{c.jira.btnLabel}</button>
          </div>
          {c.jira.connected && (
            <>
              <input value={c.jira.url} onChange={v.setJiraUrl} placeholder="https://dein-space.atlassian.net/PROJ" style={sx("width:100%;margin-top:12px;padding:9px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:13px;font-family:'JetBrains Mono',monospace;")} />
              <div style={sx('margin-top:14px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);')}>Aus Jira übernehmen</div>
              <div style={sx('display:flex;flex-direction:column;gap:8px;margin-top:9px;')}>
                {c.jiraInbox.map((ji, i) => (
                  <div key={i} style={sx('display:flex;align-items:center;gap:11px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);')}>
                    <span style={sx(`font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:${ji.typeColor};`)}>{ji.key}</span>
                    <span style={sx('flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{ji.title}</span>
                    <span style={sx('font-size:10.5px;font-weight:600;color:var(--text-3);')}>{ji.type}</span>
                    <H as="button" onClick={ji.onImport} hover="filter:brightness(1.08)" css="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:6px 11px;border-radius:8px;background:var(--accent);color:var(--accent-text);transition:filter .12s;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>Übernehmen
                    </H>
                  </div>
                ))}
                {c.jiraInboxEmpty && <div style={sx('font-size:12.5px;color:var(--text-3);padding:4px 2px;')}>Keine offenen Jira-Tickets — alle übernommen.</div>}
              </div>
            </>
          )}
        </div>

        {/* Slack */}
        <div style={sx('border:1px solid var(--border);border-radius:12px;padding:15px;margin-top:12px;')}>
          <div style={sx('display:flex;align-items:center;gap:12px;')}>
            <div style={sx('width:38px;height:38px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;background:oklch(0.7 0.15 330 / 0.14);')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.62 0.16 330)" strokeWidth="2" strokeLinecap="round"><path d="M9 3v10a2 2 0 1 1-2-2h10a2 2 0 1 1-2 2V3a2 2 0 1 1 2 2H7a2 2 0 1 1 2-2z" /></svg></div>
            <div style={sx('flex:1;min-width:0;')}>
              <div style={sx('font-size:14px;font-weight:700;')}>Slack</div>
              <div style={sx(`font-size:12px;color:${c.slack.statusColor};`)}>{c.slack.statusText}</div>
            </div>
            <button onClick={v.toggleSlack} style={sx(`font-size:13px;font-weight:600;padding:8px 15px;border-radius:9px;transition:.12s;background:${c.slack.btnBg};color:${c.slack.btnColor};border:1px solid ${c.slack.btnBorder};`)}>{c.slack.btnLabel}</button>
          </div>
          {c.slack.connected && (
            <>
              <div style={sx('display:flex;align-items:center;gap:8px;margin-top:12px;padding:9px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);')}>
                <span style={sx("font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-3);")}>Kanal</span>
                <input value={c.slack.channel} onChange={v.setSlackChannel} placeholder="#kanal" style={sx("flex:1;border:none;outline:none;background:none;font-size:13px;font-family:'JetBrains Mono',monospace;color:var(--text);")} />
              </div>
              <div style={sx('font-size:12px;color:var(--text-3);margin-top:8px;')}>Ticket-Updates und Eskalationen werden in diesen Kanal gepostet.</div>
            </>
          )}
        </div>
      </div>

      {/* Workflow & Rollen */}
      {v.hasWorkflow && (
        <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
          <h3 style={sx('margin:0 0 4px;font-size:15px;font-weight:600;')}>Workflow & Rollen</h3>
          <p style={sx('margin:0 0 14px;font-size:13px;color:var(--text-2);')}>Lege die Rollen deines Workflows selbst an und weise jedem Agenten eine zu.</p>
          <div style={sx('border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;background:var(--surface-2);')}>
            <div style={sx('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);margin-bottom:9px;')}>Rollen im Workflow</div>
            <div style={sx('display:flex;flex-wrap:wrap;gap:7px;')}>
              {v.roleChips.map((rc, i) => (
                <span key={i} style={sx('display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;padding:6px 8px 6px 11px;border-radius:9px;background:var(--surface);border:1px solid var(--border);')}>
                  {rc.isLead && <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)"><path d="M5 18l2-9 4 5 4-8 4 12z" /></svg>}
                  {rc.label}
                  <H as="button" onClick={rc.onRemove} title="Rolle entfernen" hover="background:var(--err-soft);color:var(--err)" css="width:18px;height:18px;border-radius:5px;display:flex;align-items:center;justify-content:center;color:var(--text-3);transition:.12s;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></H>
                </span>
              ))}
            </div>
            <div style={sx('display:flex;gap:8px;margin-top:11px;')}>
              <input value={v.roleInput} onChange={v.setRoleInput} placeholder="Neue Rolle, z. B. Research" style={sx('flex:1;padding:9px 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface);outline:none;font-size:13px;')} />
              <H as="button" onClick={v.addRole} hover="filter:brightness(1.08)" css="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:9px 14px;border-radius:9px;background:var(--accent);color:var(--accent-text);transition:filter .12s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Rolle</H>
            </div>
          </div>
          <div style={sx('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);margin-bottom:9px;')}>Zuweisung</div>
          <div style={sx('display:flex;flex-direction:column;gap:12px;')}>
            {v.workflowAgents.map((wa, i) => (
              <div key={i} style={sx('display:flex;flex-direction:column;gap:9px;padding:13px 15px;border:1px solid var(--border);border-radius:12px;')}>
                <div style={sx('display:flex;align-items:center;gap:11px;')}>
                  <span style={sx(`width:32px;height:32px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:${wa.avBg};color:${wa.avColor};`)}>{wa.initial}</span>
                  <div style={sx('flex:1;min-width:0;')}><div style={sx('font-size:13.5px;font-weight:600;')}>{wa.name}</div><div style={sx('font-size:12px;color:var(--text-2);')}>{wa.role}</div></div>
                  {wa.isLead && <span style={sx('display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 9px;border-radius:20px;background:var(--accent-2);color:var(--accent);')}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 18l2-9 4 5 4-8 4 12z" /></svg>Lead</span>}
                </div>
                <div style={sx('display:flex;flex-wrap:wrap;gap:6px;')}>
                  {wa.options.map((o, oi) => (
                    <button key={oi} onClick={o.onPick} style={sx(`font-size:12px;font-weight:600;padding:6px 11px;border-radius:8px;transition:.12s;background:${o.bg};color:${o.color};border:1px solid ${o.border};`)}>{o.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phasen-Workflow node editor */}
      {v.hasWorkflow && <FlowEditor v={v} />}

      {/* design.md */}
      <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
        <div style={sx('display:flex;align-items:center;gap:8px;margin-bottom:4px;')}><span style={sx("font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--accent);")}>design.md</span></div>
        <p style={sx('margin:0 0 12px;font-size:13px;color:var(--text-2);')}>Design- und Stilrichtlinien, die alle Agenten im Projekt berücksichtigen.</p>
        <textarea value={c.designMd} onChange={v.setDesignMd} style={sx("width:100%;padding:13px 15px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:13px;font-family:'JetBrains Mono',monospace;line-height:1.6;min-height:150px;resize:vertical;")}></textarea>
      </div>

      {/* Anweisungen */}
      <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
        <h3 style={sx('margin:0 0 4px;font-size:15px;font-weight:600;')}>Projekt-Anweisungen</h3>
        <p style={sx('margin:0 0 12px;font-size:13px;color:var(--text-2);')}>Verhaltensregeln, die jeder Agent in diesem Projekt befolgt (Systemkontext).</p>
        <textarea value={c.instructions} onChange={v.setInstructions} placeholder="z. B. Immer auf Deutsch antworten. Keine Secrets ausgeben…" style={sx('width:100%;padding:13px 15px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:13.5px;line-height:1.6;min-height:110px;resize:vertical;')}></textarea>
      </div>

      {/* Env */}
      <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:15px;box-shadow:var(--shadow);padding:20px;')}>
        <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;')}>
          <h3 style={sx('margin:0;font-size:15px;font-weight:600;')}>Umgebungsvariablen</h3>
          <span style={sx("font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--text-3);")}>.env</span>
        </div>
        <p style={sx('margin:0 0 12px;font-size:13px;color:var(--text-2);')}>Secrets und Keys, die den Agenten und Skills in diesem Projekt zur Verfügung stehen.</p>
        <div style={sx('display:flex;flex-direction:column;gap:8px;')}>
          {c.envRows.map((ev, i) => (
            <div key={i} style={sx('display:flex;gap:8px;align-items:center;')}>
              <input value={ev.key} onChange={ev.onKey} placeholder="KEY" style={sx("width:42%;padding:9px 11px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:12.5px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;")} />
              <input value={ev.value} onChange={ev.onVal} placeholder="Wert" style={sx("flex:1;min-width:0;padding:9px 11px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:12.5px;font-family:'JetBrains Mono',monospace;")} />
              <H as="button" onClick={ev.onRemove} title="Entfernen" hover="background:var(--err-soft);color:var(--err)" css="width:34px;height:34px;flex:none;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--text-3);border:1px solid var(--border);transition:.12s;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></H>
            </div>
          ))}
        </div>
        <H as="button" onClick={v.addEnv} hover="border-color:var(--accent);color:var(--accent)" css="margin-top:10px;display:flex;align-items:center;gap:7px;padding:9px 13px;border:1px dashed var(--border-2);border-radius:9px;font-size:13px;font-weight:600;color:var(--text-3);transition:.12s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Variable hinzufügen</H>
      </div>
    </div>
  )
}
