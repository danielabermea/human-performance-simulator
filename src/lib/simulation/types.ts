export type OperationalCompletenessProfile = {
  ownerDefined: boolean;
  pilotScopeDefined: boolean;
  rollbackExists: boolean;
  kpiSetDefined: boolean;
  timelineDirectionallyDefined: boolean;
};

/** @deprecated Use OperationalCompletenessProfile */
export type FeasibilityProfile = OperationalCompletenessProfile;

export type ClosureReason = "commitment" | "decline" | "wrapUp";

export type EndType = "manual" | "lost" | "concluded";

export type ConversationStatus =
  | "active"
  | "conditionallyAccepted"
  | "conditionallyAcceptedWin"
  | "conclusion"
  | "lost"
  | "userEnded"
  | "concluded";

export type HiddenMotivationType =
  | "team_capacity"
  | "career_risk"
  | "budget_pressure"
  | "operational_stability"
  | "executive_visibility";

/** Persistent relationship memory - does not reset between messages */
export type RelationshipTrajectory = {
  /** Permanent floor of skepticism built from rupture history */
  skepticismBaseline: number;
  /** Reduces willingness to accept proposals and collaborate */
  opennessPenalty: number;
  /** Highest rupture reached in this conversation */
  peakRupture: number;
  /** Turns remaining with sharply reduced openness after escalation phrases */
  escalationMemoryTurns: number;
  /** Consecutive turns with disrespectful or hostile communication */
  negativeBehaviorStreak: number;
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
  /** Cumulative operational completeness earned across the conversation */
  operationalCompleteness: OperationalCompletenessProfile;
  relationshipTrajectory: RelationshipTrajectory;
  /** Recurring claim themes already raised - no duplicates */
  objectionMemory: string[];
  /** Cumulative argument pressure - never decreases */
  argumentFatigue: number;
  /** Set when the conversation ends via natural closure detection */
  closureReason?: ClosureReason;
  /** How the session terminated - runtime gate, not a score outcome */
  endType?: EndType;
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
  isDismissive: boolean;
  isBlameLanguage: boolean;
  isPressureTactic: boolean;
  isPersonalAttack: boolean;
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
  ownerDefined: boolean;
  pilotScopeDefined: boolean;
  rollbackExists: boolean;
  kpiSetDefined: boolean;
  timelineDirectionallyDefined: boolean;
};

export type MetricSignals = {
  hasValidation: boolean;
  hasQuestion: boolean;
  questionCount: number;
  hasRapportBuilding: boolean;
  isInterruptionAttempt: boolean;
  specificityScore: number;
  evidenceScore: number;
  showsCriticalThinking: boolean;
  showsAdaptability: boolean;
  showsHumanCenteredThinking: boolean;
  showsSynthesis: boolean;
  /** Explores stakeholder viewpoint with curiosity, not mere concern references */
  showsPerspectiveCuriosity: boolean;
  /** Argues prior coverage, proves correctness, or reframes pushback as misunderstanding */
  isDefensiveRebuttal: boolean;
  /** Recognizes workload, constraints, team impact, or competing priorities */
  showsStakeholderAcknowledgment: boolean;
};

export type MessageAnalysis = {
  contentQuality: ContentQualitySignals;
  contentNegative: ContentNegativeSignals;
  tone: ToneSignals;
  goal: GoalSignals;
  metrics: MetricSignals;
  addressesHiddenMotivation: boolean;
};

export function createInitialOperationalCompleteness(): OperationalCompletenessProfile {
  return {
    ownerDefined: false,
    pilotScopeDefined: false,
    rollbackExists: false,
    kpiSetDefined: false,
    timelineDirectionallyDefined: false,
  };
}

/** @deprecated Use createInitialOperationalCompleteness */
export function createInitialFeasibilityProfile(): OperationalCompletenessProfile {
  return createInitialOperationalCompleteness();
}

export function createInitialRelationshipTrajectory(): RelationshipTrajectory {
  return {
    skepticismBaseline: 0,
    opennessPenalty: 0,
    peakRupture: 0,
    escalationMemoryTurns: 0,
    negativeBehaviorStreak: 0,
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
