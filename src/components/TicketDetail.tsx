import { H } from '../lib/H'
import { sx } from '../lib/sx'
import { ImageSlot } from './ImageSlot'
import type { Vals } from '../store/useDerived'

export function TicketDetail({ v }: { v: Vals }) {
  const t = v.ticket
  if (!t) return null
  return (
    <div style={sx('animation:fadeUp .3s ease both;')}>
      <button onClick={v.goTickets} style={sx('display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:16px;')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14 6l-6 6 6 6" /></svg>Alle Tickets
      </button>

      {/* lifecycle stepper */}
      <div style={sx('display:flex;align-items:center;gap:0;margin-bottom:18px;padding:14px 18px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);overflow-x:auto;overflow-y:hidden;')}>
        {t.stages.map((sg: any, i: number) => (
          <div key={i} style={sx('display:contents;')}>
            {sg.showBar && <span style={sx(`flex:1;min-width:22px;height:2px;background:${sg.barBg};`)}></span>}
            <span style={sx('display:flex;align-items:center;gap:8px;flex:none;padding:0 4px;')}>
              <span style={sx(`width:24px;height:24px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:${sg.dotBg};color:${sg.dotColor};`)}>
                {sg.done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4 4 10-10" /></svg>}
                {sg.active && <span style={sx('width:8px;height:8px;border-radius:50%;background:var(--accent-text);')}></span>}
              </span>
              <span style={sx(`font-size:12.5px;font-weight:600;color:${sg.textColor};white-space:nowrap;`)}>{sg.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div style={sx('display:grid;grid-template-columns:1fr 290px;gap:20px;align-items:start;')}>
        {/* MAIN */}
        <div style={sx('display:flex;flex-direction:column;gap:16px;')}>
          {/* title + task */}
          <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);padding:20px 22px;')}>
            <div style={sx('display:flex;align-items:center;gap:9px;margin-bottom:9px;')}>
              <span style={sx("font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-3);")}>{t.id}</span>
              <div style={sx('position:relative;')}>
                <H as="button" onClick={t.toggleStatusMenu} hover="filter:brightness(1.04)" css={`display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;background:${t.statusBg};color:${t.statusColor};transition:filter .12s;`}>
                  {t.statusLabel}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </H>
                {t.statusMenuOpen && (
                  <div style={sx('position:absolute;top:calc(100% + 6px);left:0;z-index:30;width:170px;background:var(--surface);border:1px solid var(--border);border-radius:11px;box-shadow:var(--shadow-lg);padding:5px;animation:fadeUp .14s ease;')}>
                    <div style={sx('padding:5px 8px 3px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);')}>Status ändern</div>
                    {t.statusOptions.map((so: any, i: number) => (
                      <H as="button" key={i} onClick={so.onPick} hover="background:var(--surface-2)" css={`width:100%;display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:8px;text-align:left;font-size:13px;transition:background .12s;background:${so.rowBg};`}>
                        <span style={sx(`width:8px;height:8px;border-radius:50%;flex:none;background:${so.dot};`)}></span>
                        <span style={sx('flex:1;')}>{so.label}</span>
                        {so.active && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6"><path d="M5 12l4 4 10-10" /></svg>}
                      </H>
                    ))}
                  </div>
                )}
              </div>
              <span style={sx(`font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:${t.prioColor};`)}>{t.prio} Priorität</span>
            </div>
            <div style={sx('font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.25;')}>{t.title}</div>
            <div style={sx('font-size:14px;color:var(--text-2);margin-top:9px;line-height:1.55;')}>{t.desc}</div>

            {t.working && (
              <div style={sx('display:flex;align-items:center;gap:13px;margin-top:16px;padding:12px 15px;border-radius:12px;background:var(--ok-soft);')}>
                <div style={sx(`width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex:none;background:${t.agentBg};color:${t.agentColor};animation:ring 2s ease-out infinite;`)}>{t.agentInitial}</div>
                <div style={sx('flex:1;min-width:0;font-size:13.5px;')}><b style={sx('font-weight:700;')}>{t.agentName}</b> <span style={sx('color:var(--ok);font-weight:600;')}>arbeitet gerade daran…</span></div>
                <span style={sx("font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-2);")}>{t.elapsed}</span>
              </div>
            )}
            {t.blocked && (
              <div style={sx('display:flex;align-items:center;gap:13px;margin-top:16px;padding:12px 15px;border-radius:12px;background:var(--err-soft);')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
                <div style={sx('flex:1;min-width:0;font-size:13.5px;color:var(--err);font-weight:600;')}>Blockiert — {t.agentName} wartet auf deine Rückmeldung.</div>
                <H as="button" onClick={v.restartAgent} hover="filter:brightness(1.08)" css="flex:none;font-size:12.5px;font-weight:700;padding:8px 13px;border-radius:9px;background:var(--err);color:#fff;transition:filter .12s;">Neu starten</H>
              </div>
            )}
          </div>

          {/* activity thread */}
          <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;')}>
            <div style={sx('display:flex;align-items:center;justify-content:space-between;padding:15px 20px 0;')}>
              <h3 style={sx('margin:0;font-size:14px;font-weight:600;')}>Verlauf & Kommentare</h3>
              <span style={sx('font-size:12px;color:var(--text-3);')}>{t.activityCount} Einträge</span>
            </div>
            <div style={sx('display:flex;gap:4px;padding:12px 16px 0;border-bottom:1px solid var(--border);')}>
              {t.phaseTabs.map((pt: any, i: number) => (
                <button key={i} onClick={pt.onPick} style={sx(`display:flex;align-items:center;gap:7px;padding:9px 13px 11px;font-size:13px;font-weight:600;color:${pt.tabColor};border-bottom:2px solid ${pt.underline};margin-bottom:-1px;transition:color .12s;`)}>
                  {pt.tab}
                  <span style={sx(`font-size:10.5px;font-weight:700;min-width:17px;text-align:center;padding:1px 5px;border-radius:20px;background:${pt.badgeBg};color:${pt.badgeColor};`)}>{pt.count}</span>
                </button>
              ))}
            </div>
            <div style={sx('padding:6px 22px 8px;')}>
              {t.showTerminal && <Terminal v={v} t={t} />}
              {t.activePhaseSteps.map((st: any, i: number) => (
                <Step key={i} st={st} />
              ))}
            </div>

            {/* composer */}
            <div style={sx('border-top:1px solid var(--border);padding:16px 20px;background:var(--surface-2);')}>
              <div style={sx('display:flex;gap:12px;')}>
                <div style={sx('width:32px;height:32px;border-radius:9px;background:var(--surface-3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex:none;')}>LM</div>
                <div style={sx('flex:1;min-width:0;')}>
                  <textarea value={v.composerText} onChange={v.setComposer} placeholder="Kommentar schreiben — z. B. auf einen Fehler reagieren oder Anweisung geben…" style={sx('width:100%;padding:11px 13px;border-radius:11px;border:1px solid var(--border);background:var(--surface);outline:none;font-size:13.5px;line-height:1.5;min-height:64px;resize:vertical;')}></textarea>
                  <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-top:9px;')}>
                    <span style={sx('font-size:11.5px;color:var(--text-3);')}>Kommentar wird an {t.composerTarget} zugestellt</span>
                    <H as="button" onClick={v.addComment} hover="filter:brightness(1.08)" css="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;padding:8px 15px;border-radius:9px;background:var(--accent);color:var(--accent-text);transition:filter .12s;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l16-8-6 16-3-6z" /></svg>Senden
                    </H>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div style={sx('display:flex;flex-direction:column;gap:14px;position:sticky;top:90px;')}>
          <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);padding:16px 18px;display:flex;flex-direction:column;gap:15px;')}>
            <div>
              <div style={sx('font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);margin-bottom:8px;')}>Bearbeiter · {t.teamCount}</div>
              <div style={sx('display:flex;flex-direction:column;gap:10px;')}>
                {t.team.map((m: any, i: number) => (
                  <div key={i} style={sx('display:flex;align-items:center;gap:10px;')}>
                    <div style={sx('position:relative;flex:none;')}>
                      <div style={sx(`width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:${m.bg};color:${m.color};`)}>{m.initial}</div>
                      {m.working && <span style={sx('position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:50%;border:2px solid var(--surface);background:var(--ok);')}></span>}
                    </div>
                    <div style={sx('flex:1;min-width:0;')}>
                      <div style={sx('font-size:13.5px;font-weight:600;')}>{m.name}</div>
                      <div style={sx('font-size:12px;color:var(--text-2);')}>{m.role}</div>
                    </div>
                    <span style={sx(`display:flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:3px 7px;border-radius:6px;background:${m.provBg};color:${m.provColor};`)}>{m.provIcon}{m.provKind}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={sx('border-top:1px solid var(--border);padding-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;')}>
              <div><div style={sx('font-size:11px;color:var(--text-3);')}>Skill</div><div style={sx("font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:600;margin-top:3px;")}>{t.skill}</div></div>
              <div><div style={sx('font-size:11px;color:var(--text-3);')}>Aktualisiert</div><div style={sx('font-size:12.5px;font-weight:600;margin-top:3px;')}>{t.updated}</div></div>
              <div><div style={sx('font-size:11px;color:var(--text-3);')}>Dauer</div><div style={sx("font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:600;margin-top:3px;")}>{t.elapsed}</div></div>
              <div><div style={sx('font-size:11px;color:var(--text-3);')}>Tokens</div><div style={sx("font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:600;margin-top:3px;")}>{t.tokens}</div></div>
            </div>
          </div>
          {t.hasPlan && (
            <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);padding:16px 18px;')}>
              <div style={sx('display:flex;align-items:center;gap:8px;margin-bottom:13px;')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h9M9 12h9M9 19h9M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2" /></svg>
                <span style={sx('font-size:13px;font-weight:700;')}>Umsetzungsplan</span>
                <span style={sx('margin-left:auto;font-size:10.5px;color:var(--text-3);')}>aus der Planung</span>
              </div>
              <div style={sx('display:flex;flex-direction:column;gap:9px;')}>
                {t.planItems.map((pi: any, i: number) => (
                  <div key={i} style={sx('display:flex;gap:10px;align-items:flex-start;')}>
                    <span style={sx('width:19px;height:19px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;background:var(--accent-2);color:var(--accent);margin-top:1px;')}>{pi.num}</span>
                    <span style={sx('flex:1;font-size:13px;line-height:1.45;color:var(--text);')}>{pi.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Terminal({ v, t }: { v: Vals; t: any }) {
  const term = t.terminal
  return (
    <div style={sx("margin:14px 0 4px;border-radius:12px;overflow:hidden;border:1px solid #24262c;background:#0c0d10;font-family:'JetBrains Mono',monospace;")}>
      <div style={sx('display:flex;align-items:center;gap:8px;padding:9px 13px;background:#15171c;border-bottom:1px solid #24262c;')}>
        <span style={sx('display:flex;gap:5px;')}><span style={sx('width:10px;height:10px;border-radius:50%;background:#ff5f57;')}></span><span style={sx('width:10px;height:10px;border-radius:50%;background:#febc2e;')}></span><span style={sx('width:10px;height:10px;border-radius:50%;background:#28c840;')}></span></span>
        <span style={sx('font-size:11.5px;color:#8b949e;margin-left:4px;')}>grillme · brainstorm — Planungs-Terminal</span>
        <span style={sx('margin-left:auto;font-size:11px;color:#6e7681;')}>{term.answered}/{term.total} beantwortet</span>
      </div>
      <div style={sx('padding:13px 15px;font-size:12.5px;line-height:1.7;max-height:280px;overflow-y:auto;')}>
        <div style={sx('color:#6e7681;')}>$ agent plan --interactive</div>
        {term.lines.map((ln: any, i: number) => (
          <div key={i}>
            <div style={sx('margin-top:9px;')}><span style={sx('color:#79c0ff;')}>[{ln.skill}]</span> <span style={sx('color:#adbac7;')}>{ln.q}</span></div>
            <div style={sx('display:flex;gap:8px;')}><span style={sx('color:#7ee787;')}>❯</span><span style={sx('color:#e6edf3;')}>{ln.a}</span></div>
          </div>
        ))}
        {term.hasCurrent && (
          <>
            <div style={sx('margin-top:11px;')}><span style={sx('color:#79c0ff;')}>[{term.curSkill}]</span> <span style={sx('color:#adbac7;')}>{term.curQ}</span></div>
            <div style={sx('display:flex;align-items:center;gap:8px;margin-top:3px;')}>
              <span style={sx('color:#7ee787;')}>❯</span>
              <input value={v.termInput} onChange={v.setTermInput} onKeyDown={v.onTermKey} placeholder="Antwort eingeben und Enter…" style={sx("flex:1;min-width:0;background:transparent;border:none;outline:none;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:12.5px;")} />
              <H as="button" onClick={v.submitTerm} hover="background:#2a2d34" css="font-size:11px;font-weight:600;color:#adbac7;padding:4px 10px;border-radius:7px;background:#1c1f25;border:1px solid #2a2d34;">Senden</H>
            </div>
          </>
        )}
        {term.done && (
          <div style={sx('margin-top:11px;color:#7ee787;')}>✓ Planung abgeschlossen — Antworten sind als Kommentare festgehalten. Ticket kann auf „Ready for Dev".</div>
        )}
      </div>
    </div>
  )
}

function Step({ st }: { st: any }) {
  if (st.isComment) {
    return (
      <div style={sx('display:flex;gap:14px;position:relative;')}>
        <div style={sx('width:34px;flex:none;display:flex;flex-direction:column;align-items:center;')}>
          <div style={sx(`width:34px;height:34px;border-radius:10px;margin-top:16px;display:flex;align-items:center;justify-content:center;flex:none;font-size:13px;font-weight:700;background:${st.actorAvatarBg};color:${st.actorAvatarColor};`)}>{st.actorInitial}</div>
          <div style={sx('flex:1;width:2px;background:var(--border);margin:8px 0 0;')}></div>
        </div>
        <div style={sx('flex:1;min-width:0;padding:16px 0 12px;')}>
          <div style={sx('display:flex;align-items:center;gap:8px;margin-bottom:9px;flex-wrap:wrap;')}>
            <span style={sx('font-size:13.5px;font-weight:700;')}>{st.actorName}</span>
            <span style={sx('font-size:13px;color:var(--text-2);')}>{st.action}</span>
            <span style={sx("margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3);")}>{st.time}</span>
          </div>
          {st.showText && (
            <div style={sx(`font-size:14px;line-height:1.6;color:var(--text);background:${st.bubbleBg};border:1px solid ${st.bubbleBorder};border-radius:12px;border-top-left-radius:3px;padding:12px 15px;`)}>{st.text}{st.streaming && <span style={sx('display:inline-block;width:8px;height:16px;margin-left:2px;transform:translateY(2px);background:var(--accent);animation:blink 1s step-end infinite;')}></span>}</div>
          )}
          {st.isSkill && (
            <div style={sx('border:1px solid var(--border);border-radius:12px;border-top-left-radius:3px;overflow:hidden;')}>
              <div style={sx('display:flex;align-items:center;gap:9px;padding:10px 14px;background:var(--surface-2);')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5l8 7-8 7" /></svg>
                <span style={sx("font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:600;color:var(--accent);")}>{st.skillName}</span>
                <span style={sx("font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--text-3);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>{st.args}</span>
                <span style={sx(`font-size:11px;font-weight:600;color:${st.okColor};`)}>{st.okText}</span>
              </div>
              <div style={sx('padding:10px 14px;font-size:13px;color:var(--text-2);line-height:1.5;')}>{st.result}</div>
            </div>
          )}
          {st.hasCode && (
            <div style={sx('margin-top:9px;border:1px solid var(--border);border-radius:11px;overflow:hidden;background:var(--surface-2);')}>
              <div style={sx('display:flex;align-items:center;gap:8px;padding:8px 13px;border-bottom:1px solid var(--border);')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l4-6-4-6M8 6l-4 6 4 6" /></svg>
                <span style={sx("font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--text-2);")}>{st.codeFile}</span>
              </div>
              <pre style={sx("margin:0;padding:13px 15px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;color:var(--text);overflow-x:auto;white-space:pre;")}>{st.codeBody}</pre>
            </div>
          )}
          {st.hasShot && (
            <div style={sx('margin-top:9px;border:1px solid var(--border);border-radius:11px;overflow:hidden;')}>
              <div style={sx('height:190px;background:var(--surface-2);')}>
                <ImageSlot id={st.shotId} />
              </div>
              <div style={sx('display:flex;align-items:center;gap:7px;padding:8px 13px;background:var(--surface);border-top:1px solid var(--border);')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="M5 17l4.5-4 3 2.5L16 12l3 3" /></svg>
                <span style={sx('font-size:12px;color:var(--text-2);')}>{st.shotCaption}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (st.isError) {
    return (
      <div style={sx('display:flex;gap:14px;position:relative;')}>
        <div style={sx('width:34px;flex:none;display:flex;flex-direction:column;align-items:center;')}>
          <div style={sx('width:34px;height:34px;border-radius:10px;margin-top:16px;display:flex;align-items:center;justify-content:center;flex:none;background:var(--err-soft);color:var(--err);')}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg></div>
          <div style={sx('flex:1;width:2px;background:var(--border);margin:8px 0 0;')}></div>
        </div>
        <div style={sx('flex:1;min-width:0;padding:16px 0 12px;')}>
          <div style={sx('display:flex;align-items:center;gap:8px;margin-bottom:9px;flex-wrap:wrap;')}>
            <span style={sx('font-size:13.5px;font-weight:700;')}>{st.actorName}</span>
            <span style={sx('font-size:13px;color:var(--err);font-weight:600;')}>Fehler</span>
            <span style={sx("margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3);")}>{st.time}</span>
          </div>
          <div style={sx('font-size:14px;line-height:1.6;color:var(--text);background:var(--err-soft);border:1px solid transparent;border-radius:12px;border-top-left-radius:3px;padding:12px 15px;')}>{st.text}</div>
        </div>
      </div>
    )
  }

  if (st.isHandoff) {
    return (
      <div style={sx('display:flex;gap:14px;position:relative;')}>
        <div style={sx('width:34px;flex:none;display:flex;flex-direction:column;align-items:center;')}>
          <div style={sx('width:34px;height:34px;border-radius:10px;margin-top:16px;display:flex;align-items:center;justify-content:center;flex:none;background:var(--surface-2);border:1px solid var(--border);color:var(--text-2);')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8l-4 4 4 4M3 12h13M17 4l4 4-4 4M21 8H9" /></svg></div>
          <div style={sx('flex:1;width:2px;background:var(--border);margin:8px 0 0;')}></div>
        </div>
        <div style={sx('flex:1;min-width:0;padding:16px 0 12px;')}>
          <div style={sx('display:flex;align-items:center;gap:10px;padding:12px 15px;border:1px dashed var(--border-2);border-radius:12px;background:var(--surface-2);flex-wrap:wrap;')}>
            <span style={sx(`width:26px;height:26px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:${st.actorAvatarBg};color:${st.actorAvatarColor};`)}>{st.actorInitial}</span>
            <span style={sx('font-size:12.5px;font-weight:700;')}>{st.actorName}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <span style={sx(`width:26px;height:26px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:${st.toAvatarBg};color:${st.toAvatarColor};`)}>{st.toInitial}</span>
            <span style={sx('font-size:12.5px;font-weight:700;')}>{st.toName}</span>
            <span style={sx("margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3);")}>{st.time}</span>
          </div>
          <div style={sx('font-size:13px;color:var(--text-2);line-height:1.55;margin-top:8px;padding-left:2px;')}>{st.text}</div>
        </div>
      </div>
    )
  }

  return null
}
