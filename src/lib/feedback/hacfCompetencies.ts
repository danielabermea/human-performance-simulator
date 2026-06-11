/** Human Amplified Capabilities Framework - primary scored competencies */
export type CompetencyScores = {
  emotionalIntelligence: number;
  relationshipIntelligence: number;
  criticalThinkingDiscernment: number;
  adaptabilityLearningAgility: number;
  humanCenteredDecisionMaking: number;
};

/** @deprecated Use CompetencyScores */
export type ExecutiveScores = CompetencyScores;

export type CompetencyKey = keyof CompetencyScores;

export type BehavioralLevel =
  | "Demonstrated"
  | "Developing"
  | "Not Yet Observed";

export const BEHAVIORAL_LEVEL_ORDER: BehavioralLevel[] = [
  "Not Yet Observed",
  "Developing",
  "Demonstrated",
];

export const BEHAVIORAL_LEVEL_EXPLANATIONS: Record<BehavioralLevel, string> = {
  Demonstrated:
    "Multiple observable behaviors aligned with this competency appeared during the conversation.",
  Developing:
    "Some behaviors were observed, but stronger application opportunities remained.",
  "Not Yet Observed":
    "There was insufficient evidence to evaluate this competency.",
};

export const HACF_COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  emotionalIntelligence: "Emotional Intelligence",
  relationshipIntelligence: "Relationship Intelligence",
  criticalThinkingDiscernment: "Critical Thinking & Discernment",
  adaptabilityLearningAgility: "Adaptability & Learning Agility",
  humanCenteredDecisionMaking: "Human-Centered Decision Making",
};

export const HACF_COMPETENCY_DEFINITIONS: Record<CompetencyKey, string> = {
  emotionalIntelligence:
    "The ability to recognize and regulate emotions in yourself and respond constructively under pressure.",
  relationshipIntelligence:
    "The ability to build trust, understand others, navigate differences, and create meaningful collaboration.",
  criticalThinkingDiscernment:
    "The ability to evaluate information, question assumptions, recognize patterns, and make sound judgments under ambiguity.",
  adaptabilityLearningAgility:
    "The ability to adjust your approach, learn from feedback, and remain effective as circumstances change.",
  humanCenteredDecisionMaking:
    "The ability to make decisions that balance people, performance, ethics, and long-term impact.",
};

/** @deprecated Internal legacy label */
export type ScoreLevel = BehavioralLevel;

export function createInitialScores(): CompetencyScores {
  return {
    emotionalIntelligence: 50,
    relationshipIntelligence: 50,
    criticalThinkingDiscernment: 50,
    adaptabilityLearningAgility: 50,
    humanCenteredDecisionMaking: 50,
  };
}

/** Convert internal 0–100 score to evidence-based assessment level */
export function scoreToBehavioralLevel(score: number): BehavioralLevel {
  if (score >= 60) return "Demonstrated";
  if (score >= 35) return "Developing";
  return "Not Yet Observed";
}

export function isDemonstratedLevel(level: BehavioralLevel): boolean {
  return level === "Demonstrated";
}

export function isDevelopingLevel(level: BehavioralLevel): boolean {
  return level === "Developing";
}

/** @deprecated Use isDevelopingLevel */
export function isEmergingLevel(level: BehavioralLevel): boolean {
  return level === "Developing";
}

/** @deprecated Use isDemonstratedLevel */
export function isStrongPerformanceLevel(level: BehavioralLevel): boolean {
  return level === "Demonstrated";
}

/** @deprecated Use isEmergingLevel or level === "Not Yet Observed" */
export function isDevelopmentPerformanceLevel(level: BehavioralLevel): boolean {
  return level === "Not Yet Observed" || level === "Developing";
}

export function behavioralLevelToNumber(level: BehavioralLevel): 1 | 2 | 3 {
  const index = BEHAVIORAL_LEVEL_ORDER.indexOf(level);
  return (index + 1) as 1 | 2 | 3;
}

/** @deprecated Use scoreToBehavioralLevel */
export function interpretScore(score: number): BehavioralLevel {
  return scoreToBehavioralLevel(score);
}

export function calculateOverallScore(scores: CompetencyScores): number {
  return Math.round(
    (scores.emotionalIntelligence +
      scores.relationshipIntelligence +
      scores.criticalThinkingDiscernment +
      scores.adaptabilityLearningAgility +
      scores.humanCenteredDecisionMaking) /
      5
  );
}

export function blendCompetencyScores(
  turnScores: CompetencyScores,
  sessionScores: CompetencyScores,
  turnWeight = 0.45
): CompetencyScores {
  const sessionWeight = 1 - turnWeight;
  const blended = {} as CompetencyScores;

  for (const key of Object.keys(turnScores) as CompetencyKey[]) {
    blended[key] = Math.round(
      turnScores[key] * turnWeight + sessionScores[key] * sessionWeight
    );
  }

  return blended;
}

export const ALL_COMPETENCY_KEYS: CompetencyKey[] = [
  "emotionalIntelligence",
  "relationshipIntelligence",
  "criticalThinkingDiscernment",
  "adaptabilityLearningAgility",
  "humanCenteredDecisionMaking",
];
