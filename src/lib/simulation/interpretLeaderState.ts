import { ConversationStatus } from "./types";

export type LeaderStateInput = {
  conversationStatus: ConversationStatus;
};

export type LeaderPerception = {
  label: string;
  guidance: string;
};

export function interpretLeaderState(state: LeaderStateInput): LeaderPerception {
  if (state.conversationStatus === "conditionallyAccepted") {
    return {
      label: "Leader is cautiously open to this direction.",
      guidance:
        "Move into phased rollout, staffing, and safeguards—or end when ready.",
    };
  }

  if (state.conversationStatus === "active") {
    return {
      label: "Leader is evaluating your proposal.",
      guidance: "Focus on clarity, feasibility, and operational impact.",
    };
  }

  if (state.conversationStatus === "lost") {
    return {
      label: "The conversation has broken down.",
      guidance: "Simulation ended.",
    };
  }

  return {
    label: "Session ended.",
    guidance: "",
  };
}
