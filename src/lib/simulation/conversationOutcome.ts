import { READINESS_THRESHOLD } from "./readinessScoring";
import { ConversationStatus, ScenarioState } from "./types";

export const LOSS_THRESHOLD = {
  ruptureLevel: 75,
} as const;

export function isLossState(state: ScenarioState): boolean {
  const { ruptureLevel, trust, argumentFatigue, relationshipTrajectory } = state;

  if (ruptureLevel >= 75) return true;
  if (trust <= 25 && ruptureLevel >= 50) return true;
  if (argumentFatigue >= 90) return true;
  if (relationshipTrajectory.peakRupture >= 70 && trust <= 30) return true;

  return false;
}

/**
 * Deterministic state transitions after each message.
 * Priority: terminal sticky → loss → sticky conditional → active→conditional
 */
export function transitionConversationStatus(
  state: ScenarioState
): ConversationStatus {
  const current = state.conversationStatus;

  if (current === "userEnded" || current === "lost") {
    return current;
  }

  if (isLossState(state)) {
    return "lost";
  }

  if (current === "conditionallyAccepted") {
    return "conditionallyAccepted";
  }

  if (current === "active" && state.readinessScore >= READINESS_THRESHOLD) {
    return "conditionallyAccepted";
  }

  return "active";
}

export function markUserEnded(state: ScenarioState): ScenarioState {
  if (state.conversationStatus === "lost") {
    return state;
  }

  return {
    ...state,
    conversationStatus: "userEnded",
  };
}

export function isTerminalStatus(status: ConversationStatus): boolean {
  return status === "lost" || status === "userEnded";
}

export function isSimulationTerminated(state: ScenarioState): boolean {
  return isTerminalStatus(state.conversationStatus);
}

export function isInputAllowed(state: ScenarioState): boolean {
  return (
    state.conversationStatus === "active" ||
    state.conversationStatus === "conditionallyAccepted"
  );
}

export const ENDED_CONVERSATION_MESSAGE =
  "This conversation has ended. Review your coaching feedback below.";

export const USER_ENDED_MESSAGE =
  "You ended the simulation. Review your coaching feedback below.";
