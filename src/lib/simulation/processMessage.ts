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
import { analyzeMessage } from "./signals";
import { applyStateFromAnalysis } from "./state";
import { Scenario, ScenarioState } from "./types";

export type ProcessMessageResult = {
  state: ScenarioState;
  metrics: ConversationMetrics;
  executiveScores: ExecutiveScores;
  feedback: FeedbackReport | null;
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
      feedback: generateFeedbackReport(
        scenario,
        state,
        metrics,
        executiveScores,
        transcript
      ),
    };
  }

  const previousState = state;
  const analysis = analyzeMessage(message, scenario.hiddenMotivation);
  const nextState = applyStateFromAnalysis(state, analysis, message);
  const nextMetrics = updateConversationMetrics(
    metrics,
    analysis,
    message,
    previousState,
    nextState
  );
  const nextExecutiveScores = updateExecutiveScores(
    executiveScores,
    message,
    {
      trust: previousState.trust,
      resistance: previousState.resistance,
      ruptureLevel: previousState.ruptureLevel,
    }
  );

  const feedback = isSimulationTerminated(nextState)
    ? generateFeedbackReport(
        scenario,
        nextState,
        nextMetrics,
        nextExecutiveScores,
        transcript
      )
    : null;

  return {
    state: nextState,
    metrics: nextMetrics,
    executiveScores: nextExecutiveScores,
    feedback,
  };
}

export { createInitialConversationMetrics, createInitialScores };
