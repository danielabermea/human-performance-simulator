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
  | "Emerging"
  | "Developing"
  | "Competent"
  | "Strong"
  | "Advanced";

export const BEHAVIORAL_LEVEL_ORDER: BehavioralLevel[] = [
  "Emerging",
  "Developing",
  "Competent",
  "Strong",
  "Advanced",
];

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

/** Convert internal 0–100 score to 5-level behavioral scale for presentation */
export function scoreToBehavioralLevel(score: number): BehavioralLevel {
  if (score >= 81) return "Advanced";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Competent";
  if (score >= 35) return "Developing";
  return "Emerging";
}

export function isStrongPerformanceLevel(level: BehavioralLevel): boolean {
  return level === "Strong" || level === "Advanced";
}

export function isDevelopmentPerformanceLevel(level: BehavioralLevel): boolean {
  return level === "Emerging" || level === "Developing";
}

export function behavioralLevelToNumber(level: BehavioralLevel): 1 | 2 | 3 | 4 | 5 {
  const index = BEHAVIORAL_LEVEL_ORDER.indexOf(level);
  return (index + 1) as 1 | 2 | 3 | 4 | 5;
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
