import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function Header({ v }: { v: Vals }) {
  return (
    <header style={sx('position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;padding:16px 28px;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);')}>
      <div style={sx('flex:1;min-width:0;')}>
        <div style={sx('display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-3);font-weight:500;')}>
          <span style={sx('color:var(--accent);font-weight:600;')}>{v.curProject.name}</span>
          <span>/</span>
          <span>{v.pageTitle}</span>
        </div>
        <h1 style={sx('margin:4px 0 0;font-size:19px;font-weight:700;letter-spacing:-.02em;')}>{v.pageTitle}</h1>
      </div>
      <H as="button" onClick={v.goProjectCfg} title="Projekt-Einstellungen" hover="background:var(--surface-2);color:var(--text)" css="width:40px;height:40px;flex:none;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--text-2);border:1px solid var(--border);transition:.12s;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" /></svg>
      </H>
      <H as="button" onClick={v.openCreate} hover="filter:brightness(1.08)" css="display:flex;align-items:center;gap:7px;background:var(--accent);color:var(--accent-text);font-weight:600;font-size:13.5px;padding:10px 15px;border-radius:10px;box-shadow:var(--shadow);transition:filter .12s;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Neuer Agent
      </H>
    </header>
  )
}
