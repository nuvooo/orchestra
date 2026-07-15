import { H } from '../../lib/H'
import { sx } from '../../lib/sx'
import type { Vals } from '../../store/useDerived'

export function TicketModal({ v }: { v: Vals }) {
  if (!v.ticketModalOpen) return null
  return (
    <div style={sx('position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px;')}>
      <div onClick={v.closeTicketModal} style={sx('position:absolute;inset:0;background:rgba(10,10,12,.5);backdrop-filter:blur(2px);animation:fadeUp .2s ease;')}></div>
      <div style={sx('position:relative;width:460px;max-width:100%;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-lg);padding:24px;animation:fadeUp .22s ease;')}>
        <h2 style={sx('margin:0;font-size:17px;font-weight:700;')}>Neues Ticket</h2>
        <p style={sx('margin:3px 0 18px;font-size:12.5px;color:var(--text-2);')}>Wird angelegt und durchläuft den Standard-Ablauf: <b style={sx('color:var(--text);font-weight:600;')}>Angelegt → Geplant → Freigegeben → Umsetzung → Geprüft</b>.</p>
        <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Titel</label>
        <input value={v.newTicketTitle} onChange={v.setNewTicketTitle} placeholder="z. B. Suchfilter überarbeiten" style={sx('width:100%;margin:6px 0 16px;padding:11px 13px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;')} />
        <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Priorität</label>
        <div style={sx('display:flex;gap:8px;margin:8px 0 16px;')}>
          {v.prioOptions.map((p, i) => (
            <button key={i} onClick={p.onPick} style={sx(`flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:600;transition:.12s;background:${p.bg};color:${p.color};border:1px solid ${p.border};`)}>{p.label}</button>
          ))}
        </div>
        <label style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Agenten zuweisen</label>
        <div style={sx('display:flex;flex-direction:column;gap:7px;margin-top:8px;max-height:190px;overflow-y:auto;')}>
          {v.ticketAgentOptions.map((a, i) => (
            <button key={i} onClick={a.onToggle} style={sx(`display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:10px;text-align:left;transition:.12s;background:${a.rowBg};border:1px solid ${a.rowBorder};`)}>
              <span style={sx(`width:28px;height:28px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:${a.avBg};color:${a.avColor};`)}>{a.initial}</span>
              <span style={sx('flex:1;min-width:0;')}><span style={sx('display:block;font-size:13px;font-weight:600;')}>{a.name}</span><span style={sx('display:block;font-size:11.5px;color:var(--text-2);')}>{a.role}</span></span>
              {a.sel && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6"><path d="M5 12l4 4 10-10" /></svg>}
            </button>
          ))}
        </div>
        <div style={sx('display:flex;gap:10px;margin-top:20px;')}>
          <H as="button" onClick={v.closeTicketModal} hover="background:var(--surface-2)" css="flex:none;padding:11px 18px;border-radius:11px;border:1px solid var(--border);font-size:14px;font-weight:600;transition:background .12s;">Abbrechen</H>
          <H as="button" onClick={v.submitTicket} hover="filter:brightness(1.08)" css="flex:1;padding:11px;border-radius:11px;background:var(--accent);color:var(--accent-text);font-size:14px;font-weight:700;transition:filter .12s;">Ticket anlegen</H>
        </div>
      </div>
    </div>
  )
}
