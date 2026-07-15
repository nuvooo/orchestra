import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Board({ v }: { v: Vals }) {
  return (
    <div style={sx('animation:fadeUp .3s ease both;display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:12px;')}>
      {v.boardColumns.map((col, ci) => (
        <div key={ci} onDragOver={col.onOver} onDrop={col.onDrop} style={sx(`display:flex;flex-direction:column;gap:11px;padding:8px;margin:-8px;border-radius:14px;outline:${col.dropOutline};outline-offset:-2px;background:${col.dropBg};transition:background .12s;`)}>
          <div style={sx('display:flex;align-items:center;gap:8px;padding:0 4px;')}>
            <span style={sx(`width:8px;height:8px;border-radius:50%;background:${col.color};`)}></span>
            <span style={sx('font-size:13.5px;font-weight:600;')}>{col.name}</span>
            <span style={sx('font-size:12px;color:var(--text-3);background:var(--surface-2);padding:1px 8px;border-radius:20px;')}>{col.count}</span>
          </div>
          {col.tickets.map((t, ti) => (
            <div key={ti} style={sx('position:relative;')}>
              <H
                as="div"
                draggable={true}
                onDragStart={t.onDragStart}
                onDragEnd={t.onDragEnd}
                onClick={t.onOpen}
                hover="border-color:var(--border-2);transform:translateY(-1px)"
                css={`cursor:grab;opacity:${t.dragOpacity};text-align:left;background:var(--surface);border:1px solid ${t.cardBorder};border-radius:12px;padding:13px;box-shadow:var(--shadow);transition:.12s;`}
              >
                <div style={sx('display:flex;justify-content:space-between;gap:8px;align-items:center;')}>
                  <span style={sx(`font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:${t.prioColor};`)}>{t.prio}</span>
                  <span style={sx("font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--text-3);")}>{t.id}</span>
                </div>
                <div style={sx('font-size:13.5px;font-weight:500;margin-top:8px;line-height:1.45;padding-right:20px;')}>{t.title}</div>
                {t.blocked && (
                  <div style={sx('display:flex;align-items:center;gap:6px;margin-top:9px;font-size:11.5px;font-weight:600;color:var(--err);')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>Wartet auf Rückmeldung</div>
                )}
                <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-top:12px;')}>
                  <span style={sx('display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-3);')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 10h8M8 14h5" /><rect x="3" y="4" width="18" height="16" rx="3" /></svg>{t.activityCount}
                  </span>
                  <span style={sx('display:flex;align-items:center;gap:6px;')}>
                    <span style={sx(`font-family:'JetBrains Mono',monospace;font-size:10px;padding:2px 6px;border-radius:5px;background:${t.provBg};color:${t.provColor};`)}>{t.provShort}</span>
                    <span style={sx('display:flex;')}>
                      {t.teamAv.map((m, mi) => (
                        <span key={mi} style={sx(`width:24px;height:24px;border-radius:7px;margin-left:-5px;border:2px solid var(--surface);display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:600;background:${m.bg};color:${m.color};`)}>{m.initial}</span>
                      ))}
                      {t.extraCount && (
                        <span style={sx('width:24px;height:24px;border-radius:7px;margin-left:-5px;border:2px solid var(--surface);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;background:var(--surface-3);color:var(--text-2);')}>{t.extraCount}</span>
                      )}
                    </span>
                  </span>
                </div>
              </H>
              <H as="button" onClick={t.onMenu} title="Verschieben" hover="background:var(--surface-2);color:var(--text)" css="position:absolute;top:34px;right:9px;width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--text-3);transition:.12s;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="18" r="1.7" /></svg>
              </H>
              {t.menuOpen && (
                <div style={sx('position:absolute;top:56px;right:9px;z-index:30;width:158px;background:var(--surface);border:1px solid var(--border);border-radius:11px;box-shadow:var(--shadow-lg);padding:5px;animation:fadeUp .14s ease;')}>
                  <div style={sx('padding:5px 8px 3px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-3);')}>Verschieben nach</div>
                  {t.moveOptions.map((mo, moi) => (
                    <H as="button" key={moi} onClick={mo.onPick} hover="background:var(--surface-2)" css="width:100%;display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:8px;text-align:left;font-size:13px;transition:background .12s;">
                      <span style={sx(`width:8px;height:8px;border-radius:50%;flex:none;background:${mo.dot};`)}></span>
                      <span style={sx('flex:1;')}>{mo.label}</span>
                      {mo.active && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6"><path d="M5 12l4 4 10-10" /></svg>}
                    </H>
                  ))}
                </div>
              )}
            </div>
          ))}
          <H as="button" onClick={col.onAdd} hover="color:var(--accent);border-color:var(--accent)" css="padding:9px;border:1px dashed var(--border-2);border-radius:10px;font-size:12.5px;font-weight:600;color:var(--text-3);transition:.12s;">+ Ticket</H>
        </div>
      ))}
    </div>
  )
}
