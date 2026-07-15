import type { Provider, Skill, Project } from './types'
import seedData from '../../shared/seed.json'

// Seed data lives in shared/seed.json so the frontend and the backend
// (server/) hydrate from a single source of truth.

export const PROVIDERS: Provider[] = [
  { id: 'claude-sonnet-4.5', label: 'claude-sonnet-4.5', kind: 'cloud' },
  { id: 'claude-opus-4.1', label: 'claude-opus-4.1', kind: 'cloud' },
  { id: 'gpt-4o', label: 'gpt-4o', kind: 'cloud' },
  { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro', kind: 'cloud' },
  { id: 'opencode', label: 'opencode', kind: 'local' },
  { id: 'claude-code', label: 'Claude Code', kind: 'local' },
  { id: 'aider', label: 'aider', kind: 'local' },
  { id: 'ollama', label: 'Ollama · llama-3.3', kind: 'local' },
]

export const WF_ROLES = ['Lead', 'Planung', 'Design', 'Code', 'Review', 'QA', 'Sonstige']

export const seedSkills: Skill[] = (seedData as { skills: Skill[] }).skills
export const seedProjects: Project[] = (seedData as { projects: Project[] }).projects

export const initialWizardData = () => ({
  name: '',
  designMd: '# \n\n## Stil\n- \n\n## Struktur\n- ',
  instructions: '',
  jira: { connected: false, url: '' },
  slack: { connected: false, channel: '' },
  envs: [],
})
