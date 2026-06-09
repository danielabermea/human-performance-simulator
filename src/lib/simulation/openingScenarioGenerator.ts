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

/** Alicia Morgan — limited time, operational impact, practical focus. Not hostile. */
const ALICIA_OPENING_TEMPLATES: OpeningTemplate[] = [
  {
    content:
      "My team is stretched thin right now. Help me understand why this is worth the time.",
    motivationLens: "burnout_capacity",
    emotionalTone: "overloaded",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "We've seen initiatives create more work than value before. We're already stretched so thin.",
    motivationLens: "prior_negative_experience",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "I need to know our time is being used well. There's already a lot on our team's plate.",
    motivationLens: "efficiency_concerns",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "medium",
  },
  {
    content:
      "I've only got a few minutes. Walk me through the operational impact before we go further.",
    motivationLens: "operational_risk",
    emotionalTone: "overloaded",
    contextType: "process_change_proposal",
    stakesLevel: "medium",
  },
  {
    content:
      "I'm open to this conversation, but I need practical answers on workload and disruption.",
    motivationLens: "burnout_capacity",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "high",
  },
  {
    content:
      "Competing priorities are real for us. What's the concrete ask for my team?",
    motivationLens: "political_pressure",
    emotionalTone: "cautious",
    contextType: "resource_allocation",
    stakesLevel: "high",
  },
  {
    content:
      "Help me understand how this affects day-to-day execution — I need clarity, not another vague initiative.",
    motivationLens: "operational_risk",
    emotionalTone: "skeptical",
    contextType: "operational_improvement",
    stakesLevel: "medium",
  },
  {
    content:
      "I want this meeting to be productive. What are we trying to accomplish, specifically?",
    motivationLens: "efficiency_concerns",
    emotionalTone: "cautious",
    contextType: "new_initiative_review",
    stakesLevel: "low",
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
  operational_risk: "uncertainty about day-to-day operational impact",
  burnout_capacity: "stretched team capacity and workload",
  efficiency_concerns: "productive use of time and practical value",
  political_pressure: "competing priorities and leadership expectations",
  prior_negative_experience: "prior initiatives that under-delivered",
};

const TONE_LABELS: Record<EmotionalTone, string> = {
  skeptical: "cautiously skeptical",
  frustrated: "tired but engaged",
  cautious: "cautious",
  overloaded: "overloaded",
  neutral_guarded: "neutral but guarded",
};

const CONTEXT_LABELS: Record<ContextType, string> = {
  new_initiative_review: "new initiative discussion",
  process_change_proposal: "workplace change proposal",
  operational_improvement: "workplace improvement discussion",
  cross_functional_alignment: "cross-team alignment discussion",
  resource_allocation: "resource and capacity discussion",
};

const STAKES_LABELS: Record<StakesLevel, string> = {
  low: "low (exploratory)",
  medium: "medium (team impact)",
  high: "high (significant team impact)",
};

export function buildOpeningContextPrompt(opening: OpeningScenario): string {
  return `${buildScenarioDefinitionPrompt(opening.definition)}

OPENING SCENARIO CONTEXT (you already spoke first as Alicia Morgan — stay consistent):
- You opened this meeting with: "${opening.content}"
- Primary concern lens: ${LENS_LABELS[opening.motivationLens]}
- Emotional tone at open: ${TONE_LABELS[opening.emotionalTone]}
- Meeting context: ${CONTEXT_LABELS[opening.contextType]}
- Stakes level: ${STAKES_LABELS[opening.stakesLevel]}
- Your name and title are shown separately in the UI — do NOT repeat them in messages
- You are Alicia Morgan: cautious, overloaded, and protective of your team — NOT hostile or argumentative
- You are open to collaboration when concerns are acknowledged; you disengage if dismissed or disrespected
- Communicate limited time, operational impact, and need for clarity — keep meetings productive
- Keep every response to 1–3 short, grammatically complete sentences — concise, not fragmented
- Do NOT repeat your opening verbatim; build on it naturally as the conversation continues`;
}
