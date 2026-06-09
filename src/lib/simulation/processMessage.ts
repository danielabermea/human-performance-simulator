import {
  createInitialConversationMetrics,
  ConversationMetrics,
} from "../feedback/conversationMetrics";
import { MessageTurn } from "../feedback/coachingFeedback";
import {
  createInitialScores,
  ExecutiveScores,
  updateExecutiveScores,
} from "../feedback/executiveScoring";
import { updateConversationMetrics } from "../feedback/metricsUpdater";
import { generateFeedbackReport, FeedbackReport } from "../feedback/feedbackGenerator";
import { isSimulationTerminated } from "./conversationOutcome";
import { isRelationshipNegativeAnalysis, analyzeMessage } from "./signals";
import { applyStateFromAnalysis } from "./state";
import { Scenario, ScenarioState } from "./types";

export type ProcessMessageResult = {
  state: ScenarioState;
  metrics: ConversationMetrics;
  executiveScores: ExecutiveScores;
  feedback: FeedbackReport | null;
  lastTurnDisrespectful: boolean;
};

export function processUserMessage(
  scenario: Scenario,
  state: ScenarioState,
  metrics: ConversationMetrics,
  executiveScores: ExecutiveScores,
  transcript: MessageTurn[],
  message: string
): ProcessMessageResult {
  if (isSimulationTerminated(state)) {
    return {
      state,
      metrics,
      executiveScores,
      lastTurnDisrespectful: false,
      feedback: generateFeedbackReport(
        scenario,
        state,
        metrics,
        executiveScores,
        transcript,
        scenario.initialState
      ),
    };
  }

  const previousState = state;
  const analysis = analyzeMessage(message, scenario.hiddenMotivation);
  const nextState = applyStateFromAnalysis(state, analysis, message);

  const userTurnIndex = transcript.filter((t) => t.role === "user").length;
  const previousUserMessage = transcript
    .filter((t) => t.role === "user")
    .at(-1)?.content;

  const nextMetrics = updateConversationMetrics(
    metrics,
    analysis,
    message,
    previousState,
    nextState,
    userTurnIndex,
    previousUserMessage
  );

  const latestSignals = nextMetrics.behaviorTurns.at(-1);
  const nextExecutiveScores = latestSignals
    ? updateExecutiveScores(executiveScores, latestSignals)
    : executiveScores;

  const feedback = isSimulationTerminated(nextState)
    ? generateFeedbackReport(
        scenario,
        nextState,
        nextMetrics,
        nextExecutiveScores,
        transcript,
        scenario.initialState
      )
    : null;

  return {
    state: nextState,
    metrics: nextMetrics,
    executiveScores: nextExecutiveScores,
    lastTurnDisrespectful: isRelationshipNegativeAnalysis(analysis),
    feedback,
  };
}

export { createInitialConversationMetrics, createInitialScores };
