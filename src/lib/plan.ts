import type { Ticket, PlanQuestion } from '../store/types'

export function planScript(tk?: Ticket | null): PlanQuestion[] {
  return tk && tk.planQuestions && tk.planQuestions.length
    ? tk.planQuestions
    : [
        { skill: 'brainstorm', q: 'Welche Lösungsansätze kommen für dieses Ticket in Frage?' },
        { skill: 'grillme', q: 'Welche Annahme ist am riskantesten — und was passiert, wenn sie falsch ist?' },
        { skill: 'grillme', q: 'Was ist explizit NICHT Teil des Scopes?' },
        { skill: 'brainstorm', q: 'Was ist der kleinste sinnvolle erste Schritt (MVP)?' },
      ]
}
