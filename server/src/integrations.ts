import type { Project } from './types.ts'

// Real Jira + Slack clients. They activate when credentials are present
// (per-project config + JIRA_EMAIL/JIRA_API_TOKEN / SLACK_BOT_TOKEN env), and
// otherwise return a clear "not configured" status instead of failing.

export interface JiraIssue { key: string; title: string; type: string }

/**
 * Fetch open issues from a project's connected Jira via the REST API.
 * project.jira.url should look like https://your-space.atlassian.net/PROJ/KEY.
 * Auth uses JIRA_EMAIL + JIRA_API_TOKEN (Basic). Returns null if unconfigured.
 */
export async function fetchJiraIssues(project: Project): Promise<{ ok: boolean; issues?: JiraIssue[]; message: string }> {
  const url = project.jira?.url || ''
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN
  if (!project.jira?.connected || !url) return { ok: false, message: 'Jira ist für dieses Projekt nicht verbunden.' }
  if (!email || !token) return { ok: false, message: 'Jira-Zugangsdaten fehlen (JIRA_EMAIL / JIRA_API_TOKEN in server/.env).' }

  const base = url.match(/^https?:\/\/[^/]+/)?.[0]
  const projectKey = url.split('/').filter(Boolean).pop()
  if (!base || !projectKey) return { ok: false, message: 'Ungültige Jira-URL.' }

  const jql = encodeURIComponent(`project = ${projectKey} AND statusCategory != Done ORDER BY created DESC`)
  const endpoint = `${base}/rest/api/3/search?jql=${jql}&maxResults=25&fields=summary,issuetype`
  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64'),
        Accept: 'application/json',
      },
    })
    if (!res.ok) return { ok: false, message: `Jira-API antwortete mit ${res.status}.` }
    const data = (await res.json()) as any
    const issues: JiraIssue[] = (data.issues || []).map((i: any) => ({
      key: i.key, title: i.fields?.summary || i.key, type: i.fields?.issuetype?.name || 'Task',
    }))
    return { ok: true, issues, message: `${issues.length} offene Jira-Tickets geladen.` }
  } catch (e: any) {
    return { ok: false, message: 'Jira nicht erreichbar: ' + (e?.message || String(e)) }
  }
}

/**
 * Post a message to a project's Slack channel via chat.postMessage.
 * Uses SLACK_BOT_TOKEN. Returns a clear status if unconfigured.
 */
export async function postSlack(project: Project, text: string): Promise<{ ok: boolean; message: string }> {
  const channel = project.slack?.channel
  const token = process.env.SLACK_BOT_TOKEN
  if (!project.slack?.connected || !channel) return { ok: false, message: 'Slack ist für dieses Projekt nicht verbunden.' }
  if (!token) return { ok: false, message: 'Slack-Bot-Token fehlt (SLACK_BOT_TOKEN in server/.env).' }
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel, text }),
    })
    const data = (await res.json()) as any
    if (!data.ok) return { ok: false, message: 'Slack-Fehler: ' + (data.error || 'unbekannt') }
    return { ok: true, message: `In ${channel} gepostet.` }
  } catch (e: any) {
    return { ok: false, message: 'Slack nicht erreichbar: ' + (e?.message || String(e)) }
  }
}
