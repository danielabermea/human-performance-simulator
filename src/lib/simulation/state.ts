import {
  isRelationshipNegativeAnalysis,
} from "./signals";
import {
  isTerminalStatus,
  transitionConversationStatus,
} from "./conversationOutcome";
import {
  calculateExecutiveReadinessScore,
  mergeOperationalCompletenessFromAnalysis,
} from "./executiveReadiness";
import {
  analyzeObjections,
  calculateFatigueIncrease,
  fatigueEvidenceMultiplier,
  fatigueGoalProgressMultiplier,
  mergeObjectionMemory,
} from "./argumentFatigue";
import {
  applyBehavioralMemory,
  collaborationMultiplier,
  evidenceTrustMultiplier,
} from "./behavioralMemory";
import { analyzeMessage } from "./signals";
import { MessageAnalysis, Scenario, ScenarioState } from "./types";

export { LOSS_THRESHOLD } from "./conversationOutcome";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function clampState(state: ScenarioState): ScenarioState {
  return {
    resistance: clamp(state.resistance),
    trust: clamp(state.trust),
    frustration: clamp(state.frustration),
    psychologicalSafety: clamp(state.psychologicalSafety),
    perceivedRespect: clamp(state.perceivedRespect),
    cognitiveLoad: clamp(state.cognitiveLoad),
    ruptureLevel: clamp(state.ruptureLevel),
    goalProgress: clamp(state.goalProgress),
    conversationStatus: state.conversationStatus,
    readinessScore: clamp(state.readinessScore),
    operationalCompleteness: { ...state.operationalCompleteness },
    argumentFatigue: clamp(state.argumentFatigue),
    objectionMemory: [...state.objectionMemory],
    relationshipTrajectory: {
      ...state.relationshipTrajectory,
      skepticismBaseline: clamp(state.relationshipTrajectory.skepticismBaseline),
      opennessPenalty: clamp(state.relationshipTrajectory.opennessPenalty),
      peakRupture: clamp(state.relationshipTrajectory.peakRupture),
      escalationMemoryTurns: Math.max(
        0,
        Math.min(2, state.relationshipTrajectory.escalationMemoryTurns)
      ),
      negativeBehaviorStreak: Math.max(
        0,
        Math.min(6, state.relationshipTrajectory.negativeBehaviorStreak)
      ),
    },
  };
}

function applyArgumentFatigueEffects(
  state: ScenarioState,
  analysis: MessageAnalysis,
  message: string
): ScenarioState {
  const extraction = analyzeObjections(
    message,
    analysis,
    state.objectionMemory
  );

  const fatigueIncrease = calculateFatigueIncrease(extraction);

  const next: ScenarioState = {
    ...state,
    objectionMemory: mergeObjectionMemory(
      state.objectionMemory,
      extraction.categories
    ),
    argumentFatigue: clamp(state.argumentFatigue + fatigueIncrease),
  };

  if (fatigueIncrease > 0) {
    next.frustration += Math.min(8, Math.round(fatigueIncrease / 4));
    next.cognitiveLoad += Math.min(6, Math.round(fatigueIncrease / 5));

    if (next.argumentFatigue > 30) {
      next.resistance += 2;
    }
    if (next.argumentFatigue > 70) {
      next.resistance += 3;
      next.trust -= 2;
    }
  }

  return next;
}

function applyContentQualityEffects(
  state: ScenarioState,
  analysis: MessageAnalysis
): ScenarioState {
  const next = { ...state };

  const positiveCount = Object.values(analysis.contentQuality).filter(Boolean).length;
  const negativeCount = Object.values(analysis.contentNegative).filter(Boolean).length;
  const evidenceMultiplier =
    evidenceTrustMultiplier(state) * fatigueEvidenceMultiplier(state.argumentFatigue);

  if (positiveCount > 0 && !isRelationshipNegativeAnalysis(analysis)) {
    next.resistance -= Math.round(4 * positiveCount * evidenceMultiplier);
    next.trust += Math.round(3 * positiveCount * evidenceMultiplier);
    next.frustration -= Math.min(Math.round(2 * positiveCount * evidenceMultiplier), 6);
    next.cognitiveLoad -= Math.min(positiveCount, 3);
  }

  if (negativeCount > 0) {
    next.resistance += 4 * negativeCount;
    next.frustration += 3 * negativeCount;
    next.trust -= Math.min(2 * negativeCount, 8);
  }

  if (
    analysis.tone.hasConfidenceClaim &&
    (state.ruptureLevel > 50 || state.relationshipTrajectory.skepticismBaseline >= 25)
  ) {
    next.trust -= 8;
    next.resistance += 6;
    next.frustration += 5;
  }

  return next;
}

function applyGoalProgressEffects(
  state: ScenarioState,
  analysis: MessageAnalysis
): ScenarioState {
  const next = { ...state };
  const { goal } = analysis;
  const collabMultiplier =
    collaborationMultiplier(state) * fatigueGoalProgressMultiplier(state.argumentFatigue);

  const { metrics } = analysis;
  let goalDelta = 0;

  if (analysis.tone.isEmpathetic) goalDelta += 12;
  if (metrics.hasValidation) goalDelta += 10;
  if (metrics.hasRapportBuilding) goalDelta += 8;
  if (metrics.hasQuestion && metrics.questionCount <= 2) goalDelta += 6;
  if (goal.addressesConcerns) goalDelta += 12;
  if (goal.acknowledgesConstraints) goalDelta += 14;
  if (goal.answersQuestions) goalDelta += 8;
  if (goal.ownerDefined) goalDelta += 2;
  if (goal.pilotScopeDefined) goalDelta += 2;
  if (goal.rollbackExists) goalDelta += 2;
  if (goal.kpiSetDefined) goalDelta += 2;
  if (goal.timelineDirectionallyDefined) goalDelta += 2;
  if (goal.providesEvidence) goalDelta += 3;
  if (goal.demonstratesOperationalUnderstanding) goalDelta += 2;

  if (goal.ignoresObjections) goalDelta -= 10;
  if (goal.remainsVague) goalDelta -= 8;
  if (goal.repeatsUnsupportedClaims) goalDelta -= 12;
  if (goal.isPrematureSolutioning) goalDelta -= 9;

  if (isRelationshipNegativeAnalysis(analysis)) {
    goalDelta -= 18;
  }

  if (analysis.addressesHiddenMotivation) {
    goalDelta += 12;
    next.trust += Math.round(8 * collabMultiplier);
    next.resistance -= Math.round(10 * collabMultiplier);
    next.psychologicalSafety += 5;
  }

  next.goalProgress += Math.round(goalDelta * collabMultiplier);
  return next;
}

function applyNegativeBehaviorStreak(
  state: ScenarioState,
  analysis: MessageAnalysis
): ScenarioState {
  const next = {
    ...state,
    relationshipTrajectory: { ...state.relationshipTrajectory },
  };

  if (isRelationshipNegativeAnalysis(analysis)) {
    next.relationshipTrajectory.negativeBehaviorStreak += 1;
    if (next.relationshipTrajectory.negativeBehaviorStreak >= 2) {
      next.trust -= 5;
      next.perceivedRespect -= 6;
      next.psychologicalSafety -= 6;
    }
  } else if (
    analysis.tone.isEmpathetic &&
    (analysis.goal.acknowledgesConstraints || analysis.goal.addressesConcerns)
  ) {
    next.relationshipTrajectory.negativeBehaviorStreak = Math.max(
      0,
      next.relationshipTrajectory.negativeBehaviorStreak - 1
    );
  }

  return next;
}

function applyToneAndRuptureEffects(
  state: ScenarioState,
  analysis: MessageAnalysis
): ScenarioState {
  const { tone } = analysis;
  const next = { ...state };
  const { skepticismBaseline, peakRupture } = state.relationshipTrajectory;
  const repairFactor = skepticismBaseline >= 30 ? 0.45 : skepticismBaseline >= 15 ? 0.7 : 1;
  const relationshipNegative = isRelationshipNegativeAnalysis(analysis);

  if (tone.isShort && !tone.isEmpathetic) {
    next.resistance += 3;
    next.frustration += 2;
    next.cognitiveLoad += 2;
  }

  if (relationshipNegative) {
    next.ruptureLevel += tone.isHostile ? 28 : 22;
    next.trust -= tone.isHostile ? 18 : 14;
    next.psychologicalSafety -= tone.isHostile ? 22 : 18;
    next.perceivedRespect -= tone.isHostile ? 22 : 18;
    next.frustration += 12;
    next.resistance += 8;
    next.goalProgress -= 12;
  }

  if (tone.isEmpathetic && !relationshipNegative) {
    next.ruptureLevel -= Math.round(15 * repairFactor);
    next.trust += Math.round(8 * repairFactor);
    next.psychologicalSafety += Math.round(10 * repairFactor);
    next.perceivedRespect += Math.round(12 * repairFactor);
    next.resistance -= Math.round(5 * repairFactor);
    next.frustration -= Math.round(5 * repairFactor);
  }

  if (!relationshipNegative) {
    const ruptureDecay = peakRupture >= 70 ? 0 : peakRupture >= 50 ? 1 : 2;
    next.ruptureLevel -= ruptureDecay;
  }

  return next;
}

export function applyStateFromAnalysis(
  state: ScenarioState,
  analysis: MessageAnalysis,
  message: string
): ScenarioState {
  if (isTerminalStatus(state.conversationStatus)) {
    return state;
  }

  let next = { ...state };
  next.operationalCompleteness = mergeOperationalCompletenessFromAnalysis(
    next.operationalCompleteness,
    analysis
  );
  next = applyArgumentFatigueEffects(next, analysis, message);
  next = applyContentQualityEffects(next, analysis);
  next = applyGoalProgressEffects(next, analysis);
  next = applyToneAndRuptureEffects(next, analysis);
  next = applyNegativeBehaviorStreak(next, analysis);
  next = applyBehavioralMemory(next, analysis);
  next = clampState(next);
  next.readinessScore = calculateExecutiveReadinessScore(next);
  next.conversationStatus = transitionConversationStatus(next);

  return next;
}

export function updateStateFromMessage(
  scenario: Scenario,
  state: ScenarioState,
  message: string
): ScenarioState {
  const analysis = analyzeMessage(message, scenario.hiddenMotivation);
  return applyStateFromAnalysis(state, analysis, message);
}
