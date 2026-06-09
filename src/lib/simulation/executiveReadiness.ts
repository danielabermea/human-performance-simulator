import {
  MessageAnalysis,
  OperationalCompletenessProfile,
  ScenarioState,
} from "./types";

export const CONCLUSION_READINESS_MIN = 65;
/** @deprecated Relationship-based closure - no longer requires execution pillars */
export const CONCLUSION_CORE_PILLARS_REQUIRED = 4;

export const DECISION_CLOSURE_RUPTURE_HIGH = 70;
export const DECISION_CLOSURE_TRUST_LOW = 50;

export const PARTIAL_WIN_READINESS_MIN = 55;
export const PARTIAL_WIN_READINESS_MAX = 69;

export const APPROVAL_TRUST_MIN = 70;
export const APPROVAL_RUPTURE_MAX = 40;
export const APPROVAL_RESISTANCE_MAX = 55;
export const APPROVAL_PSYCHOLOGICAL_SAFETY_MIN = 55;
export const APPROVAL_READINESS_MIN = 70;

/** User has acknowledged concerns, demonstrated understanding, proposed a path */
export const BEHAVIORAL_ALIGNMENT_GOAL_MIN = 40;

/** @deprecated Operational completeness is tracked but no longer gates wins */
export const APPROVAL_OPERATIONAL_SCORE_MIN = 75;

/** @deprecated Use relationship-based win criteria */
export const FULL_WIN_PILLARS_REQUIRED = 2;
/** @deprecated Use PARTIAL_WIN_READINESS_MIN */
export const READINESS_THRESHOLD = PARTIAL_WIN_READINESS_MIN;
/** @deprecated Use APPROVAL_TRUST_MIN */
export const FULL_WIN_TRUST_MIN = APPROVAL_TRUST_MIN;
/** @deprecated Use APPROVAL_RUPTURE_MAX */
export const FULL_WIN_RUPTURE_MAX = APPROVAL_RUPTURE_MAX;

const CORE_EXECUTION_PILLARS: (keyof OperationalCompletenessProfile)[] = [
  "ownerDefined",
  "pilotScopeDefined",
  "rollbackExists",
  "kpiSetDefined",
];

const COMPLETENESS_CRITERIA: (keyof OperationalCompletenessProfile)[] = [
  ...CORE_EXECUTION_PILLARS,
  "timelineDirectionallyDefined",
];

export function countCoreExecutionPillars(
  profile: OperationalCompletenessProfile
): number {
  return CORE_EXECUTION_PILLARS.filter((key) => profile[key]).length;
}

/** @deprecated Use meetsConclusionCriteria(state) - pillars no longer gate closure */
export function hasDecisionClosurePillars(
  profile: OperationalCompletenessProfile
): boolean {
  return countCoreExecutionPillars(profile) >= CONCLUSION_CORE_PILLARS_REQUIRED;
}

/** High relationship risk - may justify ONE focused detail ask during closure */
export function isHighRiskForDetailEscalation(state: ScenarioState): boolean {
  return (
    state.ruptureLevel > DECISION_CLOSURE_RUPTURE_HIGH ||
    state.trust < DECISION_CLOSURE_TRUST_LOW
  );
}

export function hasMetBehavioralAlignmentBar(state: ScenarioState): boolean {
  return state.goalProgress >= BEHAVIORAL_ALIGNMENT_GOAL_MIN;
}

/** Positive conclusion - trust stable, resistance managed, relationship execution-ready */
export function meetsConclusionCriteria(state: ScenarioState): boolean {
  if (hasMetBehavioralAlignmentBar(state)) {
    return (
      state.trust >= 60 &&
      state.ruptureLevel <= 55 &&
      state.psychologicalSafety >= 50 &&
      state.resistance <= 60
    );
  }

  return (
    state.trust >= CONCLUSION_READINESS_MIN &&
    state.ruptureLevel <= 50 &&
    state.psychologicalSafety >= APPROVAL_PSYCHOLOGICAL_SAFETY_MIN &&
    state.readinessScore >= CONCLUSION_READINESS_MIN &&
    state.resistance <= APPROVAL_RESISTANCE_MAX
  );
}

export function calculateOperationalCompletenessScore(
  profile: OperationalCompletenessProfile
): number {
  const met = COMPLETENESS_CRITERIA.filter((key) => profile[key]).length;
  return Math.round((met / COMPLETENESS_CRITERIA.length) * 100);
}

/** @deprecated Use calculateOperationalCompletenessScore */
export function countFeasibilityPillars(
  profile: OperationalCompletenessProfile
): number {
  return COMPLETENESS_CRITERIA.filter((key) => profile[key]).length;
}

export function mergeOperationalCompletenessFromAnalysis(
  profile: OperationalCompletenessProfile,
  analysis: MessageAnalysis
): OperationalCompletenessProfile {
  const { goal } = analysis;
  return {
    ownerDefined: profile.ownerDefined || goal.ownerDefined,
    pilotScopeDefined: profile.pilotScopeDefined || goal.pilotScopeDefined,
    rollbackExists: profile.rollbackExists || goal.rollbackExists,
    kpiSetDefined: profile.kpiSetDefined || goal.kpiSetDefined,
    timelineDirectionallyDefined:
      profile.timelineDirectionallyDefined || goal.timelineDirectionallyDefined,
  };
}

/** @deprecated Use mergeOperationalCompletenessFromAnalysis */
export const mergeFeasibilityFromAnalysis = mergeOperationalCompletenessFromAnalysis;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Executive readiness - relationship quality and emotional intelligence under pressure */
export function calculateExecutiveReadinessScore(state: ScenarioState): number {
  return clamp(
    0.35 * state.trust +
      0.25 * state.psychologicalSafety +
      0.2 * state.perceivedRespect +
      0.1 * (100 - state.resistance) +
      0.1 * (100 - state.ruptureLevel) -
      0.05 * state.cognitiveLoad
  );
}

/** Full alignment - resistance stabilized, trust high, relationship aligned */
export function meetsApprovalThreshold(state: ScenarioState): boolean {
  if (hasMetBehavioralAlignmentBar(state)) {
    return (
      state.trust >= 65 &&
      state.ruptureLevel <= 45 &&
      state.resistance <= 55 &&
      state.psychologicalSafety >= 50
    );
  }

  return (
    state.trust >= APPROVAL_TRUST_MIN &&
    state.ruptureLevel <= APPROVAL_RUPTURE_MAX &&
    state.resistance <= APPROVAL_RESISTANCE_MAX &&
    state.psychologicalSafety >= APPROVAL_PSYCHOLOGICAL_SAFETY_MIN &&
    state.readinessScore >= APPROVAL_READINESS_MIN
  );
}

/** @deprecated Use meetsApprovalThreshold */
export const meetsFullWinCriteria = meetsApprovalThreshold;

export function meetsPartialWinCriteria(state: ScenarioState): boolean {
  return (
    state.readinessScore >= PARTIAL_WIN_READINESS_MIN &&
    state.readinessScore <= PARTIAL_WIN_READINESS_MAX &&
    state.trust >= 50 &&
    state.ruptureLevel <= 60
  );
}

/** Partial alignment - movement toward trust without full conditional acceptance */
export function meetsPartialWinOnlyCriteria(state: ScenarioState): boolean {
  return (
    meetsPartialWinCriteria(state) &&
    !meetsConclusionCriteria(state) &&
    !meetsApprovalThreshold(state)
  );
}
