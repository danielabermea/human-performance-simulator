export type ConversationOutcome =
  | "won"
  | "lost"
  | "conditionallyAccepted"
  | "ended";

export type MessageTurn = {
  role: "user" | "assistant";
  content: string;
  stateSnapshot?: unknown;
};

export type FeedbackInput = {
  outcome: ConversationOutcome;
  executiveScores: {
    emotionalIntelligence: number;
    stakeholderManagement: number;
    executiveCommunication: number;
    adaptiveCommunication: number;
    influenceAndPersuasion: number;
  };
  finalState: {
    trust: number;
    resistance: number;
    frustration: number;
    ruptureLevel: number;
    readinessScore?: number;
  };
  transcript: MessageTurn[];
};

export type CoachingFeedback = {
  outcomeLabel: string;
  relationshipQuality: "Weak" | "Moderate" | "Strong" | "High";
  influenceLevel: "Low" | "Medium" | "High";
  confidenceLevel: "Low" | "Medium" | "High";
  competencies: {
    emotionalIntelligence: number;
    stakeholderManagement: number;
    executiveCommunication: number;
    adaptiveCommunication: number;
    influenceAndPersuasion: number;
  };
  strengths: string[];
  developmentAreas: string[];
  scenarioInsights: string[];
  keyMoments: {
    turnIndex: number;
    event: string;
    impact: string;
  }[];
};

export function generateCoachingFeedback(
  input: FeedbackInput
): CoachingFeedback {
  const { outcome, executiveScores, finalState, transcript } = input;

  const avgScore =
    Object.values(executiveScores).reduce((a, b) => a + b, 0) / 5;

  const relationshipQuality: CoachingFeedback["relationshipQuality"] =
    avgScore > 75
      ? "High"
      : avgScore > 60
        ? "Strong"
        : avgScore > 45
          ? "Moderate"
          : "Weak";

  const influenceLevel: CoachingFeedback["influenceLevel"] =
    finalState.trust > 70 ? "High" : finalState.trust > 50 ? "Medium" : "Low";

  const confidenceLevel: CoachingFeedback["confidenceLevel"] =
    finalState.ruptureLevel < 40
      ? "High"
      : finalState.ruptureLevel < 70
        ? "Medium"
        : "Low";

  const strengths: string[] = [];

  if (executiveScores.stakeholderManagement > 70) {
    strengths.push(
      "Connected proposal to stakeholder operational constraints effectively."
    );
  }

  if (executiveScores.emotionalIntelligence > 70) {
    strengths.push(
      "Demonstrated strong emotional awareness and responsiveness to resistance."
    );
  }

  if (executiveScores.executiveCommunication > 70) {
    strengths.push(
      "Used specific, operationally grounded language in discussions."
    );
  }

  if (finalState.trust > 65) {
    strengths.push(
      "Successfully built trust through structured engagement."
    );
  }

  const developmentAreas: string[] = [];

  if (executiveScores.executiveCommunication < 60) {
    developmentAreas.push(
      "Remained too high-level when stakeholder required operational specificity."
    );
  }

  if (executiveScores.influenceAndPersuasion < 60) {
    developmentAreas.push(
      "Relied on assertion rather than evidence-based persuasion."
    );
  }

  if (executiveScores.emotionalIntelligence < 60) {
    developmentAreas.push(
      "Used language that escalated tension rather than stabilizing trust."
    );
  }

  if (finalState.ruptureLevel > 60) {
    developmentAreas.push(
      "Failed to repair relationship effectively under pressure."
    );
  }

  const scenarioInsights: string[] = [];

  if (finalState.trust > 60 && finalState.resistance < 50) {
    scenarioInsights.push(
      "Key breakthrough occurred when operational constraints were acknowledged explicitly."
    );
  }

  if (finalState.ruptureLevel > 50) {
    scenarioInsights.push(
      "Escalation points were driven by lack of specificity and perceived dismissal of concerns."
    );
  }

  if (finalState.readinessScore && finalState.readinessScore > 65) {
    scenarioInsights.push(
      "Conversation shifted into execution mode when proposal became operationally concrete."
    );
  }

  const keyMoments: CoachingFeedback["keyMoments"] = [];

  transcript.forEach((t, i) => {
    if (t.role !== "user") return;

    const text = t.content.toLowerCase();

    if (text.includes("just do it") || text.includes("you're dumb")) {
      keyMoments.push({
        turnIndex: i,
        event: "Escalation trigger",
        impact: "Increased rupture and reduced stakeholder trust",
      });
    }

    if (text.includes("pilot") || text.includes("fte")) {
      keyMoments.push({
        turnIndex: i,
        event: "Operational specificity introduced",
        impact: "Improved stakeholder engagement and reduced resistance",
      });
    }

    if (text.includes("i understand") || text.includes("that makes sense")) {
      keyMoments.push({
        turnIndex: i,
        event: "Repair signal",
        impact: "Reduced rupture and improved trust trajectory",
      });
    }
  });

  return {
    outcomeLabel: outcome,
    relationshipQuality,
    influenceLevel,
    confidenceLevel,
    competencies: executiveScores,
    strengths,
    developmentAreas,
    scenarioInsights,
    keyMoments,
  };
}

export function formatOutcomeLabel(outcome: ConversationOutcome): string {
  switch (outcome) {
    case "won":
      return "Won";
    case "lost":
      return "Lost";
    case "conditionallyAccepted":
      return "Conditionally Accepted";
    case "ended":
      return "Session Ended";
  }
}

export function mapStateToConversationOutcome(state: {
  conversationStatus: string;
  readinessScore: number;
  trust: number;
}): ConversationOutcome {
  if (state.conversationStatus === "lost") return "lost";
  if (state.conversationStatus === "conditionallyAccepted") {
    return state.trust >= 70 && state.readinessScore >= 80
      ? "won"
      : "conditionallyAccepted";
  }
  if (state.conversationStatus === "userEnded") {
    return state.readinessScore >= 65 ? "conditionallyAccepted" : "ended";
  }
  return "ended";
}
