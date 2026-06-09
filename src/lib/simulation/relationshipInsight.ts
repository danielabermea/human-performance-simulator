import { ConversationStatus } from "./types";

export type RelationshipInsightInput = {
  conversationStatus: ConversationStatus;
  trust: number;
  resistance: number;
  ruptureLevel: number;
  psychologicalSafety: number;
  perceivedRespect: number;
  negativeBehaviorStreak: number;
  previousTrust?: number;
  previousResistance?: number;
  previousSafety?: number;
  previousRespect?: number;
  lastTurnDisrespectful?: boolean;
};

export type RelationshipInsight = {
  label: string;
  guidance: string;
};

function delta(current: number, previous?: number): number {
  if (previous === undefined) return 0;
  return current - previous;
}

function willingnessToEngage(state: RelationshipInsightInput): number {
  return (
    (state.trust + state.psychologicalSafety + state.perceivedRespect) / 3 -
    state.ruptureLevel * 0.35
  );
}

function relationshipIsDeteriorating(state: RelationshipInsightInput): boolean {
  return (
    state.lastTurnDisrespectful === true ||
    state.negativeBehaviorStreak >= 2 ||
    state.ruptureLevel >= 45 ||
    state.trust < 40 ||
    state.psychologicalSafety < 40 ||
    state.perceivedRespect < 40 ||
    delta(state.trust, state.previousTrust) <= -5 ||
    delta(state.psychologicalSafety, state.previousSafety) <= -5 ||
    delta(state.perceivedRespect, state.previousRespect) <= -5
  );
}

function canShowPositiveInsight(state: RelationshipInsightInput): boolean {
  return (
    !relationshipIsDeteriorating(state) &&
    state.negativeBehaviorStreak === 0 &&
    state.ruptureLevel < 40 &&
    state.trust >= 48 &&
    state.psychologicalSafety >= 45 &&
    state.perceivedRespect >= 45 &&
    willingnessToEngage(state) >= 35
  );
}

export function interpretRelationshipInsight(
  state: RelationshipInsightInput
): RelationshipInsight {
  if (state.conversationStatus === "lost") {
    return {
      label: "The conversation has stalled",
      guidance:
        "The relationship broke down before alignment could form. Repair, empathy, and acknowledgment would be needed to reopen dialogue.",
    };
  }

  if (
    state.conversationStatus === "userEnded" ||
    state.conversationStatus === "concluded"
  ) {
    return {
      label: "Session ended",
      guidance: "",
    };
  }

  if (state.lastTurnDisrespectful || state.negativeBehaviorStreak >= 2) {
    if (state.negativeBehaviorStreak >= 3 || state.ruptureLevel >= 55) {
      return {
        label: "The relationship is beginning to deteriorate",
        guidance:
          "Repeated dismissive or hostile communication is eroding trust. The conversation may stall without a reset.",
      };
    }

    return {
      label: "They feel their concerns are not being heard",
      guidance:
        "Resistance is increasing. Slow down, acknowledge their perspective, and address how you're showing up — not just the proposal.",
    };
  }

  if (relationshipIsDeteriorating(state)) {
    if (delta(state.resistance, state.previousResistance) >= 5) {
      return {
        label: "Resistance is increasing",
        guidance:
          "Trust and willingness to engage are slipping. Name their concerns before advancing your position.",
      };
    }

    if (state.ruptureLevel >= 50 || willingnessToEngage(state) < 30) {
      return {
        label: "The relationship is beginning to deteriorate",
        guidance:
          "Respect and psychological safety are low. The conversation may stall without a reset in tone.",
      };
    }

    return {
      label: "They're still evaluating",
      guidance: "More clarity is needed — and how you communicate matters as much as what you propose.",
    };
  }

  if (
    canShowPositiveInsight(state) &&
    (state.conversationStatus === "conditionallyAccepted" ||
      state.conversationStatus === "conclusion")
  ) {
    return {
      label: "Alignment is taking shape",
      guidance:
        "Momentum is building. Stay collaborative and move toward concrete next steps together.",
    };
  }

  if (
    canShowPositiveInsight(state) &&
    state.conversationStatus === "conditionallyAcceptedWin"
  ) {
    return {
      label: "They're opening up",
      guidance:
        "Trust is growing. Keep acknowledging their concerns and inviting their perspective.",
    };
  }

  if (
    canShowPositiveInsight(state) &&
    delta(state.trust, state.previousTrust) >= 4 &&
    state.trust >= 50
  ) {
    return {
      label: "Trust is growing",
      guidance: "Your approach is landing. Stay grounded and collaborative — don't rush the close.",
    };
  }

  if (state.resistance > 55 && delta(state.resistance, state.previousResistance) >= 4) {
    return {
      label: "Resistance is increasing",
      guidance:
        "Slow down and name their concerns before advancing your position.",
    };
  }

  if (state.trust >= 52 && state.ruptureLevel < 35 && canShowPositiveInsight(state)) {
    return {
      label: "There's cautious openness",
      guidance:
        "Build on this momentum with thoughtful, human-centered communication.",
    };
  }

  return {
    label: "They're still evaluating",
    guidance:
      "Demonstrate understanding of their constraints. Ask clarifying questions rather than pushing for agreement.",
  };
}
