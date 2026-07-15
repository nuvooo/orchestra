import type { Provider } from './types'

// Static option lists for the UI. Everything user-owned (projects, agents,
// tickets, skills) is loaded from the server — the frontend starts empty.

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

export const initialWizardData = () => ({
  name: '',
  designMd: '# \n\n## Stil\n- \n\n## Struktur\n- ',
  instructions: '',
  jira: { connected: false, url: '' },
  slack: { connected: false, channel: '' },
  envs: [],
})
