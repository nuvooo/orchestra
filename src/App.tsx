import { sx } from './lib/sx'
import { useDerived } from './store/useDerived'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { Board } from './components/Board'
import { TicketDetail } from './components/TicketDetail'
import { Agents } from './components/Agents'
import { Skills } from './components/Skills'
import { Settings } from './components/Settings'
import { ProjectConfig } from './components/ProjectConfig'
import { ProjectWizard } from './components/modals/ProjectWizard'
import { TicketModal } from './components/modals/TicketModal'
import { AgentSlideOver } from './components/modals/AgentSlideOver'
import { AuthScreen } from './components/AuthScreen'
import { EmptyWorkspace } from './components/EmptyWorkspace'

export default function App() {
  const v = useDerived()

  // Auth gate: wait for the session check, then show login or the app.
  if (!v.authChecked) {
    return (
      <div style={sx("min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--text-3);font-family:'Instrument Sans',system-ui,sans-serif;font-size:14px;")}>
        Lädt…
      </div>
    )
  }
  if (!v.user) return <AuthScreen v={v} />

  return (
    <div style={sx("display:flex;min-height:100vh;background:var(--bg);color:var(--text);font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;")}>
      <Sidebar v={v} />
      <main style={sx('flex:1;min-width:0;display:flex;flex-direction:column;')}>
        <Header v={v} />
        <div style={sx('flex:1;padding:26px 28px 60px;max-width:1240px;width:100%;')}>
          {/* Without a project there is nothing to show on the project-scoped
              views — Skills and Settings stand on their own. */}
          {!v.hasProjects && !v.isSkills && !v.isSettings ? (
            <EmptyWorkspace v={v} />
          ) : (
            <>
              {v.isDashboard && <Dashboard v={v} />}
              {v.isTickets && <Board v={v} />}
              {v.isTicket && <TicketDetail v={v} />}
              {v.isAgents && <Agents v={v} />}
              {v.isSkills && <Skills v={v} />}
              {v.isSettings && <Settings v={v} />}
              {v.isProjectCfg && <ProjectConfig v={v} />}
            </>
          )}
        </div>
      </main>

      <ProjectWizard v={v} />
      <TicketModal v={v} />
      <AgentSlideOver v={v} />
    </div>
  )
}
