import { TurnBehaviorSignals } from "./behaviorSignals";

export type ConversationMetrics = {
  userMessageCount: number;
  /** Per-turn behavioral signals used for competency inference */
  behaviorTurns: TurnBehaviorSignals[];
  /** Legacy counters retained for scenario insights - not used for competency scoring */
  hiddenMotivationAddressedCount: number;
};

export function createInitialConversationMetrics(): ConversationMetrics {
  return {
    userMessageCount: 0,
    behaviorTurns: [],
    hiddenMotivationAddressedCount: 0,
  };
}
