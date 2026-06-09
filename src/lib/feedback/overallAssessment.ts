import { SessionSummary } from "./coachingFeedback";
import { ScenarioState } from "../simulation/types";

export type OutcomeLabel = "Aligned" | "Partially aligned" | "Unresolved";

export function mapSessionSummaryToOutcome(
  sessionSummary: SessionSummary,
  finalState: ScenarioState
): OutcomeLabel {
  if (
    sessionSummary === "strongAlignment" ||
    finalState.conversationStatus === "conditionallyAccepted" ||
    finalState.conversationStatus === "conclusion"
  ) {
    return "Aligned";
  }

  if (
    sessionSummary === "buildingTrust" ||
    sessionSummary === "cautiousEngagement" ||
    finalState.conversationStatus === "conditionallyAcceptedWin"
  ) {
    return "Partially aligned";
  }

  return "Unresolved";
}

export function buildOverallAssessment(
  outcome: OutcomeLabel,
  sessionSummary: SessionSummary,
  finalState: ScenarioState
): string {
  if (outcome === "Aligned") {
    if (finalState.closureReason === "commitment") {
      return "The conversation reached alignment. Your approach helped shift the discussion toward a constructive outcome, with the stakeholder willing to move forward in some form.";
    }
    return "The conversation reached alignment. The stakeholder became more open as you addressed concerns with clarity and directness, and the exchange ended on constructive footing.";
  }

  if (outcome === "Partially aligned") {
    if (sessionSummary === "buildingTrust") {
      return "The conversation is partially aligned. Trust improved in places, but the stakeholder still needed more clarity on impact, constraints, or next steps before fully committing.";
    }
    return "The conversation is partially aligned. The stakeholder stayed engaged but remained cautious; further acknowledgment of their constraints and a clearer proposal would strengthen alignment.";
  }

  if (finalState.conversationStatus === "lost") {
    return "The conversation remained unresolved. The relationship became strained before alignment could form; leading with empathy and repair would be the priority in a follow-up.";
  }

  if (finalState.closureReason === "decline") {
    return "The conversation concluded without alignment. The stakeholder declined to move forward; use this as coaching data on what would need to change in approach or framing.";
  }

  return "The conversation remained unresolved. Resistance stayed elevated relative to trust; clarity, collaborative framing, and direct acknowledgment of stakeholder concerns would help in a future exchange.";
}
