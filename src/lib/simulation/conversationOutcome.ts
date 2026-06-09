import {
  meetsApprovalThreshold,
  meetsConclusionCriteria,
  meetsPartialWinOnlyCriteria,
} from "./executiveReadiness";
import { ClosureReason, ConversationStatus, EndType, ScenarioState } from "./types";

export const LOSS_THRESHOLD = {
  ruptureLevel: 65,
} as const;

function isWinStatus(status: ConversationStatus): boolean {
  return (
    status === "conditionallyAccepted" ||
    status === "conditionallyAcceptedWin" ||
    status === "conclusion"
  );
}

function shouldDowngradeFromWin(state: ScenarioState): boolean {
  const { negativeBehaviorStreak } = state.relationshipTrajectory;

  return (
    state.ruptureLevel >= 40 ||
    state.trust < 42 ||
    state.psychologicalSafety < 42 ||
    state.perceivedRespect < 42 ||
    negativeBehaviorStreak >= 1 ||
    state.relationshipTrajectory.peakRupture >= 45
  );
}

function relationshipIsHealthyEnoughForWin(state: ScenarioState): boolean {
  return (
    state.trust >= 48 &&
    state.psychologicalSafety >= 45 &&
    state.perceivedRespect >= 45 &&
    state.ruptureLevel < 40 &&
    state.relationshipTrajectory.negativeBehaviorStreak === 0
  );
}

export function isLossState(state: ScenarioState): boolean {
  const {
    ruptureLevel,
    trust,
    argumentFatigue,
    relationshipTrajectory,
    psychologicalSafety,
    perceivedRespect,
  } = state;

  if (ruptureLevel >= LOSS_THRESHOLD.ruptureLevel) return true;
  if (trust <= 25 && ruptureLevel >= 40) return true;
  if (psychologicalSafety <= 25 && ruptureLevel >= 35) return true;
  if (perceivedRespect <= 25 && ruptureLevel >= 35) return true;
  if (trust <= 20 && perceivedRespect <= 30) return true;
  if (argumentFatigue >= 90) return true;
  if (relationshipTrajectory.peakRupture >= 60 && trust <= 35) return true;
  if (
    relationshipTrajectory.peakRupture >= 50 &&
    psychologicalSafety <= 30 &&
    perceivedRespect <= 30
  ) {
    return true;
  }
  if (
    relationshipTrajectory.negativeBehaviorStreak >= 3 &&
    ruptureLevel >= 45
  ) {
    return true;
  }

  return false;
}

/**
 * Deterministic state transitions after each message.
 * Priority: terminal sticky → loss → downgrade from win → approval → conclusion → partial win
 */
export function transitionConversationStatus(
  state: ScenarioState
): ConversationStatus {
  const current = state.conversationStatus;

  if (current === "userEnded" || current === "lost" || current === "concluded") {
    return current;
  }

  if (isLossState(state)) {
    return "lost";
  }

  if (isWinStatus(current) && shouldDowngradeFromWin(state)) {
    return "active";
  }

  if (meetsApprovalThreshold(state) && relationshipIsHealthyEnoughForWin(state)) {
    return "conditionallyAccepted";
  }

  if (current === "conditionallyAccepted" && relationshipIsHealthyEnoughForWin(state)) {
    return "conditionallyAccepted";
  }

  if (meetsConclusionCriteria(state) && relationshipIsHealthyEnoughForWin(state)) {
    return "conclusion";
  }

  if (current === "conclusion" && relationshipIsHealthyEnoughForWin(state)) {
    return "conclusion";
  }

  if (
    current === "conditionallyAcceptedWin" &&
    relationshipIsHealthyEnoughForWin(state)
  ) {
    return "conditionallyAcceptedWin";
  }

  if (
    meetsPartialWinOnlyCriteria(state) &&
    relationshipIsHealthyEnoughForWin(state)
  ) {
    return "conditionallyAcceptedWin";
  }

  return "active";
}

export function markUserEnded(state: ScenarioState): ScenarioState {
  if (state.conversationStatus === "lost" || state.conversationStatus === "concluded") {
    return state;
  }

  return {
    ...state,
    conversationStatus: "userEnded",
    endType: "manual" as EndType,
  };
}

export function markConcluded(
  state: ScenarioState,
  reason: ClosureReason
): ScenarioState {
  if (
    state.conversationStatus === "lost" ||
    state.conversationStatus === "userEnded" ||
    state.conversationStatus === "concluded"
  ) {
    return state;
  }

  return {
    ...state,
    conversationStatus: "concluded",
    closureReason: reason,
    endType: "concluded",
  };
}

export function markLost(state: ScenarioState): ScenarioState {
  if (isTerminalStatus(state.conversationStatus)) {
    return state;
  }

  return {
    ...state,
    conversationStatus: "lost",
    endType: "lost",
  };
}

export function isTerminalStatus(status: ConversationStatus): boolean {
  return status === "lost" || status === "userEnded" || status === "concluded";
}

export function isSimulationTerminated(state: ScenarioState): boolean {
  return isTerminalStatus(state.conversationStatus);
}

export function isInputAllowed(state: ScenarioState): boolean {
  return (
    state.conversationStatus === "active" ||
    state.conversationStatus === "conditionallyAccepted" ||
    state.conversationStatus === "conditionallyAcceptedWin" ||
    state.conversationStatus === "conclusion"
  );
}

export const ENDED_CONVERSATION_MESSAGE =
  "This conversation has ended. Review your coaching feedback below.";

export const USER_ENDED_MESSAGE =
  "You ended the simulation. Review your coaching feedback below.";

export const CLOSURE_ENDED_MESSAGE =
  "The conversation reached a natural conclusion. Review your coaching feedback below.";

export const RELATIONSHIP_BREAKDOWN_MESSAGES = [
  "I don't think we're having a productive conversation right now.",
  "I'm trying to understand your proposal, but this is becoming difficult to engage with.",
  "If we're going to continue, we need to reset how we're approaching this discussion.",
  "I'm not willing to keep going like this. We can pick this up another time if the tone changes.",
] as const;

export function pickRelationshipBreakdownMessage(state: ScenarioState): string {
  const index =
    state.relationshipTrajectory.negativeBehaviorStreak >= 3
      ? 3
      : state.ruptureLevel >= 60
        ? 2
        : state.perceivedRespect <= 30
          ? 1
          : 0;

  return RELATIONSHIP_BREAKDOWN_MESSAGES[index];
}
