import { ConversationMetrics } from "./conversationMetrics";
import { ScenarioState } from "../simulation/types";

export type CompetencyScores = {
  emotionalIntelligence: number;
  stakeholderManagement: number;
  executiveCommunication: number;
  adaptiveCommunication: number;
  influenceAndPersuasion: number;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioScore(count: number, perMessage: number, weight = 12): number {
  return Math.min(100, count * weight + perMessage * 8);
}

export function calculateCompetencyScores(
  metrics: ConversationMetrics,
  finalState: ScenarioState,
  initialState: ScenarioState
): CompetencyScores {
  const messages = Math.max(metrics.userMessageCount, 1);

  const trustDelta = finalState.trust - initialState.trust;
  const resistanceDelta = initialState.resistance - finalState.resistance;
  const goalProgress = finalState.goalProgress;

  const emotionalIntelligence = clamp(
    ratioScore(metrics.empathyCount, metrics.empathyCount / messages) * 0.35 +
      ratioScore(metrics.validationCount, metrics.validationCount / messages) *
        0.25 +
      ratioScore(metrics.repairAttempts, metrics.repairAttempts / messages) *
        0.2 +
      ratioScore(metrics.successfulRepairs, metrics.successfulRepairs / messages) *
        0.2 +
      finalState.psychologicalSafety * 0.15 -
      metrics.hostileCount * 18 -
      metrics.dismissiveCount * 10 -
      metrics.aggressiveCount * 12
  );

  const stakeholderManagement = clamp(
    ratioScore(metrics.addressesConcernCount, 0) * 0.25 +
      ratioScore(metrics.objectionHandlingCount, 0) * 0.25 +
      ratioScore(metrics.rapportBuildingCount, 0) * 0.15 +
      finalState.perceivedRespect * 0.2 +
      finalState.trust * 0.15 -
      metrics.interruptionAttempts * 15 -
      metrics.hostileCount * 20 -
      (finalState.ruptureLevel > 60 ? 15 : 0)
  );

  const executiveCommunication = clamp(
    ratioScore(metrics.specificityCount, metrics.specificityCount / messages) *
      0.35 +
      ratioScore(metrics.evidenceCount, metrics.evidenceCount / messages) * 0.35 +
      (messages <= 8 ? 10 : 0) +
      (metrics.vagueMessageCount === 0 ? 15 : 0) -
      metrics.vagueMessageCount * 12 -
      (metrics.userMessageCount > 0
        ? (metrics.vagueMessageCount / metrics.userMessageCount) * 40
        : 0)
  );

  const adaptiveCommunication = clamp(
    ratioScore(metrics.postPushbackAdaptationCount, 0) * 0.4 +
      ratioScore(metrics.objectionHandlingCount, 0) * 0.25 +
      ratioScore(metrics.repairAttempts, 0) * 0.2 +
      (resistanceDelta > 0 ? Math.min(25, resistanceDelta * 0.4) : 0) -
      metrics.dismissiveCount * 12 -
      (metrics.postPushbackAdaptationCount === 0 && finalState.resistance > 55
        ? 20
        : 0)
  );

  const influenceAndPersuasion = clamp(
    goalProgress * 0.35 +
      Math.max(0, trustDelta) * 0.25 +
      Math.max(0, resistanceDelta) * 0.2 +
      ratioScore(metrics.hiddenMotivationAddressedCount, 0) * 0.15 +
      (finalState.conversationStatus === "conditionallyAccepted" ? 12 : 0) -
      (finalState.conversationStatus === "lost" ? 25 : 0) -
      metrics.aggressiveCount * 10
  );

  return {
    emotionalIntelligence,
    stakeholderManagement,
    executiveCommunication,
    adaptiveCommunication,
    influenceAndPersuasion,
  };
}
