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

export default function App() {
  const v = useDerived()
  return (
    <div style={sx("display:flex;min-height:100vh;background:var(--bg);color:var(--text);font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;")}>
      <Sidebar v={v} />
      <main style={sx('flex:1;min-width:0;display:flex;flex-direction:column;')}>
        <Header v={v} />
        <div style={sx('flex:1;padding:26px 28px 60px;max-width:1240px;width:100%;')}>
          {v.isDashboard && <Dashboard v={v} />}
          {v.isTickets && <Board v={v} />}
          {v.isTicket && <TicketDetail v={v} />}
          {v.isAgents && <Agents v={v} />}
          {v.isSkills && <Skills v={v} />}
          {v.isSettings && <Settings v={v} />}
          {v.isProjectCfg && <ProjectConfig v={v} />}
        </div>
      </main>

      <ProjectWizard v={v} />
      <TicketModal v={v} />
      <AgentSlideOver v={v} />
    </div>
  )
}
