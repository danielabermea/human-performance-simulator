import { ConversationMetrics } from "./conversationMetrics";
import { MessageAnalysis } from "../simulation/types";
import { ScenarioState } from "../simulation/types";

export function updateConversationMetrics(
  metrics: ConversationMetrics,
  analysis: MessageAnalysis,
  message: string,
  previousState: ScenarioState,
  nextState: ScenarioState
): ConversationMetrics {
  const next = { ...metrics };
  const { tone, contentNegative, contentQuality, goal } = analysis;

  next.userMessageCount += 1;

  if (tone.isEmpathetic) next.empathyCount += 1;
  if (analysis.metrics.hasValidation) next.validationCount += 1;
  if (tone.isHostile) next.hostileCount += 1;
  if (contentNegative.isDismissive) next.dismissiveCount += 1;
  if (tone.isAggressive) next.aggressiveCount += 1;

  next.questionCount += analysis.metrics.questionCount;

  if (contentQuality.answersObjections) next.objectionHandlingCount += 1;
  if (goal.addressesConcerns) next.addressesConcernCount += 1;

  if (analysis.metrics.evidenceScore > 0) {
    next.evidenceCount += analysis.metrics.evidenceScore;
  }

  if (analysis.metrics.specificityScore > 0) {
    next.specificityCount += analysis.metrics.specificityScore;
  }

  if (analysis.metrics.hasRapportBuilding) next.rapportBuildingCount += 1;
  if (analysis.metrics.isInterruptionAttempt) next.interruptionAttempts += 1;
  if (goal.remainsVague) next.vagueMessageCount += 1;

  if (analysis.addressesHiddenMotivation) {
    next.hiddenMotivationAddressedCount += 1;
  }

  const isRepairAttempt =
    (tone.isEmpathetic || analysis.metrics.hasValidation) &&
    (previousState.ruptureLevel > 40 ||
      previousState.frustration > 50 ||
      previousState.trust < 45);

  if (isRepairAttempt) {
    next.repairAttempts += 1;

    const ruptureImproved = nextState.ruptureLevel < previousState.ruptureLevel - 3;
    const trustImproved = nextState.trust > previousState.trust;
    const frustrationImproved =
      nextState.frustration < previousState.frustration;

    if (ruptureImproved || (trustImproved && frustrationImproved)) {
      next.successfulRepairs += 1;
    }
  }

  const facedPushback =
    previousState.resistance > 55 || previousState.frustration > 45;

  const adaptedAfterPushback =
    facedPushback &&
    (goal.providesEvidence ||
      goal.acknowledgesConstraints ||
      contentQuality.answersObjections ||
      analysis.addressesHiddenMotivation);

  if (adaptedAfterPushback) {
    next.postPushbackAdaptationCount += 1;
  }

  return next;
}
