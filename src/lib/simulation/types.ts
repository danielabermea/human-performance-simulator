export type ConversationStatus =
  | "active"
  | "conditionallyAccepted"
  | "lost"
  | "userEnded";

export type HiddenMotivationType =
  | "team_capacity"
  | "career_risk"
  | "budget_pressure"
  | "operational_stability"
  | "executive_visibility";

/** Persistent relationship memory — does not reset between messages */
export type RelationshipTrajectory = {
  /** Permanent floor of skepticism built from rupture history */
  skepticismBaseline: number;
  /** Reduces willingness to accept proposals and collaborate */
  opennessPenalty: number;
  /** Highest rupture reached in this conversation */
  peakRupture: number;
  /** Turns remaining with sharply reduced openness after escalation phrases */
  escalationMemoryTurns: number;
};

export type ScenarioState = {
  resistance: number;
  trust: number;
  frustration: number;
  psychologicalSafety: number;
  perceivedRespect: number;
  cognitiveLoad: number;
  ruptureLevel: number;
  goalProgress: number;
  conversationStatus: ConversationStatus;
  /** Soft acceptance readiness 0–100, recalculated each turn */
  readinessScore: number;
  relationshipTrajectory: RelationshipTrajectory;
  /** Recurring claim themes already raised — no duplicates */
  objectionMemory: string[];
  /** Cumulative argument pressure — never decreases */
  argumentFatigue: number;
};

export type Scenario = {
  id: string;
  systemPrompt: string;
  initialState: ScenarioState;
  hiddenMotivation: HiddenMotivationType;
};

export type ContentQualitySignals = {
  hasMetrics: boolean;
  hasPercentages: boolean;
  hasRoiDiscussion: boolean;
  hasTimelines: boolean;
  hasStaffingEstimates: boolean;
  hasResourceEstimates: boolean;
  hasImplementationPlan: boolean;
  answersObjections: boolean;
};

export type ContentNegativeSignals = {
  hasVagueClaims: boolean;
  hasBuzzwords: boolean;
  isDismissive: boolean;
  hasUnsupportedAssertions: boolean;
};

export type ToneSignals = {
  isEmpathetic: boolean;
  isAggressive: boolean;
  isHostile: boolean;
  isShort: boolean;
  hasEscalationLanguage: boolean;
  hasConfidenceClaim: boolean;
};

export type GoalSignals = {
  addressesConcerns: boolean;
  providesEvidence: boolean;
  acknowledgesConstraints: boolean;
  discussesRoi: boolean;
  answersQuestions: boolean;
  demonstratesOperationalUnderstanding: boolean;
  ignoresObjections: boolean;
  remainsVague: boolean;
  repeatsUnsupportedClaims: boolean;
  isPrematureSolutioning: boolean;
};

export type MetricSignals = {
  hasValidation: boolean;
  hasQuestion: boolean;
  questionCount: number;
  hasRapportBuilding: boolean;
  isInterruptionAttempt: boolean;
  specificityScore: number;
  evidenceScore: number;
};

export type MessageAnalysis = {
  contentQuality: ContentQualitySignals;
  contentNegative: ContentNegativeSignals;
  tone: ToneSignals;
  goal: GoalSignals;
  metrics: MetricSignals;
  addressesHiddenMotivation: boolean;
};

export function createInitialRelationshipTrajectory(): RelationshipTrajectory {
  return {
    skepticismBaseline: 0,
    opennessPenalty: 0,
    peakRupture: 0,
    escalationMemoryTurns: 0,
  };
}

export function createInitialArgumentState(): Pick<
  ScenarioState,
  "objectionMemory" | "argumentFatigue"
> {
  return {
    objectionMemory: [],
    argumentFatigue: 0,
  };
}
