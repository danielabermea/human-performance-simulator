import { ALICIA_MORGAN, StakeholderProfile } from "./stakeholderIdentity";
import {
  buildScenarioDefinition,
  buildScenarioDefinitionPrompt,
  ScenarioDefinition,
} from "./scenarioDefinition";
import {
  ContextType,
  EmotionalTone,
  MotivationLens,
  StakesLevel,
} from "./scenarioTypes";

export type { ContextType, EmotionalTone, MotivationLens, StakesLevel } from "./scenarioTypes";
export type { ScenarioDefinition } from "./scenarioDefinition";

export type OpeningScenario = {
  content: string;
  definition: ScenarioDefinition;
  motivationLens: MotivationLens;
  emotionalTone: EmotionalTone;
  contextType: ContextType;
  stakesLevel: StakesLevel;
  stakeholderId: string;
};

type OpeningTemplate = {
  content: string;
  motivationLens: MotivationLens;
  emotionalTone: EmotionalTone;
  contextType: ContextType;
  stakesLevel: StakesLevel;
};

/** First-conversation openings — team impact, cautious curiosity, not hostile or interview-style */
const ALICIA_OPENING_TEMPLATES: OpeningTemplate[] = [
  {
    content:
      "My team is already juggling a lot. Before we commit to anything, I need to understand what this will require from us.",
    motivationLens: "burnout_capacity",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "I'm open to the conversation, but capacity is my biggest concern. How much involvement are you expecting from my team?",
    motivationLens: "burnout_capacity",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "We've been through changes before that created more work than value. Help me understand what impact you're expecting this to have on my team.",
    motivationLens: "prior_negative_experience",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "I understand there's a new initiative being discussed. My first concern is how much time and attention this will require from my team.",
    motivationLens: "burnout_capacity",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "This is our first conversation on this. My team runs lean, so I need to understand the participation you're expecting before we go further.",
    motivationLens: "burnout_capacity",
    emotionalTone: "overloaded",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "I'm willing to hear you out, but past initiatives have added workload without the payoff. What's the realistic ask for my team?",
    motivationLens: "prior_negative_experience",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "high",
  },
];

function hashSessionSeed(sessionId: string, salt: number): number {
  let hash = salt >>> 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function generateOpeningScenario(
  sessionId: string,
  stakeholder: StakeholderProfile = ALICIA_MORGAN
): OpeningScenario {
  const seed = hashSessionSeed(sessionId, 41);
  const template =
    ALICIA_OPENING_TEMPLATES[seed % ALICIA_OPENING_TEMPLATES.length];
  const definition = buildScenarioDefinition(
    sessionId,
    stakeholder,
    template.motivationLens,
    template.contextType
  );

  return {
    content: template.content,
    definition,
    motivationLens: template.motivationLens,
    emotionalTone: template.emotionalTone,
    contextType: template.contextType,
    stakesLevel: template.stakesLevel,
    stakeholderId: ALICIA_MORGAN.id,
  };
}

const LENS_LABELS: Record<MotivationLens, string> = {
  operational_risk: "disruption to day-to-day operations",
  burnout_capacity: "team capacity, workload impact, and participation required",
  efficiency_concerns: "whether the initiative creates more work than value",
  political_pressure: "competing priorities and leadership expectations",
  prior_negative_experience: "prior initiatives that added work without promised benefits",
};

const TONE_LABELS: Record<EmotionalTone, string> = {
  skeptical: "cautiously skeptical",
  frustrated: "tired but engaged",
  cautious: "cautiously curious, not hostile",
  overloaded: "busy and stretched",
  neutral_guarded: "neutral but guarded",
};

const CONTEXT_LABELS: Record<ContextType, string> = {
  new_initiative_review: "first conversation about a proposed change initiative",
  process_change_proposal: "first conversation about a proposed change initiative",
  operational_improvement: "first conversation about a proposed change initiative",
  cross_functional_alignment: "first conversation about a proposed change initiative",
  resource_allocation: "first conversation about a proposed change initiative",
};

const STAKES_LABELS: Record<StakesLevel, string> = {
  low: "low (exploratory)",
  medium: "medium (team time and participation at stake)",
  high: "high (significant team impact)",
};

export function buildOpeningContextPrompt(opening: OpeningScenario): string {
  return `${buildScenarioDefinitionPrompt(opening.definition)}

OPENING SCENARIO CONTEXT (you already spoke first as Alicia Morgan — stay consistent):
- You opened this first conversation with: "${opening.content}"
- Primary concern lens: ${LENS_LABELS[opening.motivationLens]}
- Emotional tone at open: ${TONE_LABELS[opening.emotionalTone]}
- Meeting context: ${CONTEXT_LABELS[opening.contextType]}
- Stakes level: ${STAKES_LABELS[opening.stakesLevel]}
- The person you are meeting leads the initiative but has no direct authority over your team — progress depends on trust and credibility
- You are not opposed to change; you are protecting your team's capacity and evaluating people impact
- Your name and title are shown separately in the UI — do NOT repeat them in messages
- Keep every response to 1–3 short, grammatically complete sentences — busy operational leader, not formal or AI-sounding
- Do NOT repeat your opening verbatim; build on it naturally as the conversation continues
- Behave as a decision-maker, not an interviewer — react, express concerns, and decide with incomplete information`;
}
