import { ConversationMetrics } from "./conversationMetrics";
import { extractTurnBehaviorSignals } from "./behaviorSignals";
import { MessageAnalysis, ScenarioState } from "../simulation/types";

export function updateConversationMetrics(
  metrics: ConversationMetrics,
  analysis: MessageAnalysis,
  message: string,
  previousState: ScenarioState,
  nextState: ScenarioState,
  turnIndex: number,
  previousUserMessage?: string
): ConversationMetrics {
  const signals = extractTurnBehaviorSignals(
    turnIndex,
    message,
    analysis,
    previousState,
    nextState,
    previousUserMessage,
    metrics.behaviorTurns.at(-1)
  );

  return {
    ...metrics,
    userMessageCount: metrics.userMessageCount + 1,
    behaviorTurns: [...metrics.behaviorTurns, signals],
    hiddenMotivationAddressedCount:
      metrics.hiddenMotivationAddressedCount +
      (analysis.addressesHiddenMotivation ? 1 : 0),
  };
}
