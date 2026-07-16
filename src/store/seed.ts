// Static option lists for the UI. Everything else — projects, agents, tickets,
// skills, and the provider catalog — is loaded from the server, which is the
// only side that can tell what is actually installed or reachable.

export const WF_ROLES = ['Lead', 'Planung', 'Design', 'Code', 'Review', 'QA', 'Sonstige']

export const initialWizardData = () => ({
  name: '',
  designMd: '# \n\n## Stil\n- \n\n## Struktur\n- ',
  instructions: '',
  workdir: '',
  jira: { connected: false, url: '' },
  slack: { connected: false, channel: '' },
  envs: [],
})
