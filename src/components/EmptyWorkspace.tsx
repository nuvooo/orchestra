import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

/** Shown on the project-scoped views until the user creates their first project. */
export function EmptyWorkspace({ v }: { v: Vals }) {
  return (
    <div style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:70px 20px;animation:fadeUp .3s ease both;')}>
      <div style={sx('width:52px;height:52px;border-radius:14px;border:1px dashed var(--border-2);display:flex;align-items:center;justify-content:center;color:var(--text-3);margin-bottom:16px;')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
      </div>
      <h2 style={sx('margin:0 0 6px;font-size:17px;font-weight:700;')}>Noch kein Projekt</h2>
      <p style={sx('margin:0 0 20px;font-size:13.5px;color:var(--text-2);max-width:380px;line-height:1.55;')}>
        Lege dein erstes Projekt an — danach kannst du Agenten hinzufügen und Tickets bearbeiten.
      </p>
      <H as="button" onClick={v.addProject} hover="filter:brightness(1.08)" css="display:flex;align-items:center;gap:7px;padding:11px 18px;border-radius:11px;background:var(--accent);color:var(--accent-text);font-size:13.5px;font-weight:700;transition:filter .12s;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Projekt anlegen
      </H>
    </div>
  )
}
