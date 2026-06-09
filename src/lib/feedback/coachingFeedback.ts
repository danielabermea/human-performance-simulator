import { CompetencyScores } from "./hacfCompetencies";
import { TurnBehaviorSignals } from "./behaviorSignals";

export type SessionSummary =
  | "strongAlignment"
  | "buildingTrust"
  | "cautiousEngagement"
  | "relationshipStrained"
  | "sessionComplete";

export type OperationalCompletenessSnapshot = {
  ownerDefined: boolean;
  pilotScopeDefined: boolean;
  rollbackExists: boolean;
  kpiSetDefined: boolean;
  timelineDirectionallyDefined: boolean;
};

export type MessageTurn = {
  role: "user" | "assistant";
  content: string;
  stateSnapshot?: unknown;
};

export type FeedbackInput = {
  sessionSummary: SessionSummary;
  competencies: CompetencyScores;
  finalState: {
    trust: number;
    resistance: number;
    frustration: number;
    ruptureLevel: number;
    readinessScore?: number;
    psychologicalSafety?: number;
    perceivedRespect?: number;
    conversationStatus?: string;
    closureReason?: "commitment" | "decline" | "wrapUp";
  };
  transcript: MessageTurn[];
  behaviorTurns?: TurnBehaviorSignals[];
};

export type CoachingFeedback = {
  strengths: string[];
  developmentAreas: string[];
};

function summaryFromRelationshipState(state: {
  readinessScore: number;
  trust: number;
  ruptureLevel: number;
  resistance: number;
}): SessionSummary {
  if (state.trust >= 70 && state.ruptureLevel <= 40 && state.resistance <= 55) {
    return "strongAlignment";
  }
  if (state.readinessScore >= 55 && state.trust >= 50) {
    return "buildingTrust";
  }
  if (state.ruptureLevel > 60 || state.trust < 40) {
    return "relationshipStrained";
  }
  if (state.readinessScore >= 45) {
    return "cautiousEngagement";
  }
  return "sessionComplete";
}

export function mapStateToSessionSummary(state: {
  conversationStatus: string;
  readinessScore: number;
  trust: number;
  ruptureLevel: number;
  resistance: number;
  closureReason?: "commitment" | "decline" | "wrapUp";
}): SessionSummary {
  if (state.conversationStatus === "concluded") {
    if (state.closureReason === "decline") {
      return state.trust >= 45 ? "cautiousEngagement" : "relationshipStrained";
    }

    if (state.closureReason === "wrapUp") {
      return summaryFromRelationshipState(state);
    }

    return summaryFromRelationshipState(state);
  }

  if (state.conversationStatus === "lost") {
    return "relationshipStrained";
  }

  if (
    state.conversationStatus === "conditionallyAccepted" ||
    state.conversationStatus === "conclusion"
  ) {
    return "strongAlignment";
  }

  if (state.conversationStatus === "conditionallyAcceptedWin") {
    return "buildingTrust";
  }

  if (state.conversationStatus === "userEnded") {
    return summaryFromRelationshipState(state);
  }

  return "sessionComplete";
}

export function generateCoachingFeedback(input: FeedbackInput): CoachingFeedback {
  const { sessionSummary, competencies, finalState, behaviorTurns } = input;
  const c = competencies;

  const strengths: string[] = [];

  if (c.emotionalIntelligence > 70) {
    strengths.push(
      "Stayed composed and non-defensive when challenged, keeping the conversation workable under pressure."
    );
  }

  if (c.relationshipIntelligence > 70) {
    strengths.push(
      "Demonstrated perspective-taking and listening, helping the stakeholder feel heard rather than managed."
    );
  }

  if (c.criticalThinkingDiscernment > 70) {
    strengths.push(
      "Reasoned thoughtfully under uncertainty, weighing trade-offs instead of asserting unsupported claims."
    );
  }

  if (c.adaptabilityLearningAgility > 70) {
    strengths.push(
      "Adjusted communication in response to pushback, showing willingness to revise approach in real time."
    );
  }

  if (c.humanCenteredDecisionMaking > 70) {
    strengths.push(
      "Balanced people and performance, considering stakeholder impact, fairness, and shared ownership."
    );
  }

  if (
    finalState.trust >= 65 &&
    finalState.ruptureLevel <= 45 &&
    finalState.resistance <= 55
  ) {
    strengths.push(
      "Your approach helped shift the conversation toward alignment through relationship-building, not jargon or volume of detail."
    );
  }

  if (behaviorTurns?.some((t) => t.reframedAfterPushback)) {
    strengths.push(
      "Adapted framing after resistance rather than repeating the same argument."
    );
  }

  if (behaviorTurns?.some((t) => t.perspectiveEngagement)) {
    strengths.push(
      "Invited the stakeholder's perspective before advancing your proposal."
    );
  }

  const developmentAreas: string[] = [];

  if (c.emotionalIntelligence < 60) {
    developmentAreas.push(
      "Practice emotional regulation when challenged: notice defensive reactions and pause before responding."
    );
  }

  if (c.relationshipIntelligence < 60) {
    developmentAreas.push(
      "Strengthen perspective-taking: reflect stakeholder concerns before advancing your position."
    );
  }

  if (c.criticalThinkingDiscernment < 60) {
    developmentAreas.push(
      "Slow down to evaluate assumptions: distinguish facts from opinions and address unintended consequences."
    );
  }

  if (c.adaptabilityLearningAgility < 60) {
    developmentAreas.push(
      "When resistance rises, simplify and adjust rather than repeating your case."
    );
  }

  if (c.humanCenteredDecisionMaking < 60) {
    developmentAreas.push(
      "Center people in your reasoning: consider team impact, fairness, and long-term consequences."
    );
  }

  if (finalState.ruptureLevel > 55) {
    developmentAreas.push(
      "Prioritize relationship repair when tension rises: empathy and acknowledgment before re-proposing."
    );
  }

  if (sessionSummary === "relationshipStrained") {
    developmentAreas.push(
      "Lead with empathy and repair when alignment breaks down; re-establish safety before pushing the proposal."
    );
  }

  return {
    strengths: strengths.slice(0, 5),
    developmentAreas: developmentAreas.slice(0, 4),
  };
}
