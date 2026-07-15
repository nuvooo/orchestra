import { useState } from 'react'
import { H } from '../lib/H'
import { sx } from '../lib/sx'
import type { Vals } from '../store/useDerived'

export function AuthScreen({ v }: { v: Vals }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = mode === 'login' ? await v.login(email, password) : await v.register(email, name, password)
    setBusy(false)
    if (!r.ok) setError(r.message || 'Etwas ist schiefgelaufen.')
    // on success the app re-renders into the main view (user is set)
  }

  const useDemo = async () => {
    setBusy(true); setError('')
    const r = await v.login('demo@orchestra.local', 'demo1234')
    setBusy(false)
    if (!r.ok) setError(r.message || 'Demo-Login fehlgeschlagen.')
  }

  return (
    <div style={sx("min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--text);font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;padding:20px;")}>
      <div style={sx('width:400px;max-width:100%;animation:fadeUp .3s ease both;')}>
        <div style={sx('display:flex;align-items:center;gap:11px;justify-content:center;margin-bottom:22px;')}>
          <div style={sx('width:34px;height:34px;border-radius:10px;background:var(--accent);display:flex;align-items:center;justify-content:center;flex:none;')}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="2.4" /><circle cx="12" cy="4" r="1.6" /><circle cx="20" cy="12" r="1.6" /><circle cx="12" cy="20" r="1.6" /><circle cx="4" cy="12" r="1.6" /><path d="M12 9.6V5.6M14.4 12h3.9M12 14.4v4M9.6 12H5.6" /></svg>
          </div>
          <span style={sx('font-weight:700;font-size:20px;letter-spacing:-.02em;')}>Orchestra</span>
        </div>

        <div style={sx('background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-lg);padding:26px;')}>
          <h1 style={sx('margin:0 0 4px;font-size:19px;font-weight:700;')}>{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</h1>
          <p style={sx('margin:0 0 20px;font-size:13px;color:var(--text-2);')}>{mode === 'login' ? 'Melde dich an, um deinen Workspace zu öffnen.' : 'Registriere dich — dein Workspace wird mit Beispielprojekten eingerichtet.'}</p>

          <form onSubmit={submit} style={sx('display:flex;flex-direction:column;gap:14px;')}>
            {mode === 'register' && (
              <label style={sx('display:block;')}>
                <span style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lena Mayer" style={sx('width:100%;margin-top:6px;padding:11px 13px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;color:var(--text);')} />
              </label>
            )}
            <label style={sx('display:block;')}>
              <span style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>E-Mail</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@firma.de" autoComplete="email" style={sx('width:100%;margin-top:6px;padding:11px 13px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;color:var(--text);')} />
            </label>
            <label style={sx('display:block;')}>
              <span style={sx('font-size:12px;font-weight:600;color:var(--text-2);')}>Passwort</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mind. 6 Zeichen" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} style={sx('width:100%;margin-top:6px;padding:11px 13px;border-radius:11px;border:1px solid var(--border);background:var(--surface-2);outline:none;font-size:14px;color:var(--text);')} />
            </label>

            {error && <div style={sx('font-size:13px;color:var(--err);background:var(--err-soft);border-radius:10px;padding:9px 12px;')}>{error}</div>}

            <H as="button" type="submit" disabled={busy} hover="filter:brightness(1.08)" css={`display:flex;align-items:center;justify-content:center;gap:7px;padding:12px;border-radius:11px;background:var(--accent);color:var(--accent-text);font-size:14px;font-weight:700;transition:filter .12s;opacity:${busy ? '0.7' : '1'};`}>
              {busy ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </H>
          </form>

          <div style={sx('display:flex;align-items:center;gap:10px;margin:18px 0;')}>
            <span style={sx('flex:1;height:1px;background:var(--border);')}></span>
            <span style={sx('font-size:11.5px;color:var(--text-3);')}>oder</span>
            <span style={sx('flex:1;height:1px;background:var(--border);')}></span>
          </div>
          <H as="button" onClick={useDemo} disabled={busy} hover="background:var(--surface-3)" css="width:100%;padding:11px;border-radius:11px;background:var(--surface-2);border:1px solid var(--border);font-size:13.5px;font-weight:600;color:var(--text);transition:background .12s;">Als Demo-Nutzer ansehen</H>
        </div>

        <div style={sx('text-align:center;margin-top:16px;font-size:13px;color:var(--text-2);')}>
          {mode === 'login' ? 'Noch kein Konto?' : 'Schon registriert?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={sx('color:var(--accent);font-weight:600;')}>{mode === 'login' ? 'Registrieren' : 'Anmelden'}</button>
        </div>
      </div>
    </div>
  )
}
