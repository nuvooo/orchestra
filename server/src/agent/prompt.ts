import type { Agent, Project, Ticket } from '../types.ts'

/** Shared by every provider: project instructions and design.md apply to all. */
export function buildSystem(project: Project, agent: Agent, _t: Ticket): string {
  const lines = [
    `Du bist „${agent.name}", ein KI-Agent mit der Rolle „${agent.role}" im Projekt „${project.name}".`,
    `Deine Workflow-Rolle ist „${agent.wf}". Arbeite fokussiert am zugewiesenen Ticket.`,
    'Antworte auf Deutsch. Nutze verfügbare Skills (Tools), wenn sie dich dem Ziel näher bringen. Halte Zwischenschritte kurz; liefere am Ende ein klares Ergebnis.',
  ]
  if (project.instructions) lines.push('\nProjekt-Anweisungen:\n' + project.instructions)
  if (project.designMd) lines.push('\nDesign-/Stilrichtlinien (design.md):\n' + project.designMd)
  return lines.join('\n')
}

export function buildTask(t: Ticket): string {
  return `Aufgabe (${t.id}): ${t.title}\n\n${t.desc}\n\nBearbeite diese Aufgabe Schritt für Schritt. Wenn eine Planung sinnvoll ist, plane zuerst. Nutze passende Skills und fasse am Ende dein Ergebnis zusammen.`
}
