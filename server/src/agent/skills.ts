import type Anthropic from '@anthropic-ai/sdk'

/**
 * Only reasoning skills exist today: they have no external side effect, so the
 * tool result is a directive that hands the work back to the model rather than
 * a report from some system. Any skill that would need a real integration (a
 * search index, a mailer, a database) must not be added here until that
 * integration exists — a tool that reports success it never performed poisons
 * every conclusion the agent draws from it.
 *
 * Applies to cloud providers only. Local CLI agents bring their own tools and
 * know nothing about this list.
 */
export const SKILL_TOOLS: Record<string, { schema: Anthropic.Tool.InputSchema; run: (input: any) => string }> = {
  brainstorm: {
    schema: { type: 'object', properties: { topic: { type: 'string', description: 'Fragestellung, zu der Ansätze gesucht werden' } }, required: ['topic'] },
    run: (input) =>
      `Erarbeite jetzt selbst mehrere unterschiedliche Lösungsansätze zu „${input.topic}". ` +
      `Nenne pro Ansatz den Kerngedanken, einen Vorteil und einen Nachteil. Erfinde keine Quellen oder Messwerte.`,
  },
  grillme: {
    schema: { type: 'object', properties: { assumptions: { type: 'string', description: 'Zu prüfende Annahmen' } }, required: ['assumptions'] },
    run: (input) =>
      `Hinterfrage jetzt selbst kritisch: ${input.assumptions}. ` +
      `Benenne die riskanteste Annahme, was passiert wenn sie falsch ist, und woran man das früh erkennen würde. Erfinde keine Fakten.`,
  },
}

export function toolFor(skill: string): Anthropic.Tool {
  return {
    name: skill.replace(/-/g, '_'),
    description: `Skill „${skill}" ausführen.`,
    input_schema: SKILL_TOOLS[skill]?.schema || { type: 'object', properties: { input: { type: 'string' } } },
  }
}

export function runSkill(skill: string, input: any): string {
  const impl = SKILL_TOOLS[skill]
  if (!impl) return `Skill „${skill}" ist nicht implementiert und wurde nicht ausgeführt. Arbeite ohne ihn weiter.`
  return impl.run(input)
}
