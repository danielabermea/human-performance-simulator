import { generateFeedbackReport } from "../src/lib/feedback/feedbackGenerator";
import { createInitialConversationMetrics } from "../src/lib/feedback/conversationMetrics";
import { createInitialScores } from "../src/lib/feedback/hacfCompetencies";
import { ops_resistant_leader } from "../src/lib/scenarios";
import { MessageTurn } from "../src/lib/feedback/coachingFeedback";
import { processUserMessage } from "../src/lib/simulation/processMessage";

const transcript: MessageTurn[] = [
  {
    role: "assistant",
    content:
      "Thanks for making time. I've got about twenty minutes. Go ahead, but my team doesn't have much bandwidth for another big change right now.",
  },
];

const userMessages = [
  "I hear you - capacity is tight and your team is already stretched. Before I go further, what would make any new initiative feel realistic from your side?",
  "That's a fair concern. I'm not asking for a full rollout - I'm proposing we test this with one team over six weeks, with a clear stop point if workload spikes. The assumption is we'd pause one low-value recurring report to free capacity. Does that trade-off sound worth exploring?",
  "I'd want your ops lead as co-owner - not something dropped on the team. If we move forward, we build safeguards together. What would help you feel comfortable taking a small step?",
];

let state = structuredClone(ops_resistant_leader.initialState);
let metrics = createInitialConversationMetrics();
let executiveScores = createInitialScores();
const initialState = structuredClone(state);

for (const message of userMessages) {
  transcript.push({ role: "user", content: message });
  const result = processUserMessage(
    ops_resistant_leader,
    state,
    metrics,
    executiveScores,
    transcript.slice(0, -1),
    message
  );
  state = result.state;
  metrics = result.metrics;
  executiveScores = result.executiveScores;
}

const finalState = {
  ...state,
  trust: 68,
  resistance: 42,
  ruptureLevel: 18,
  goalProgress: 52,
  readinessScore: 71,
  psychologicalSafety: 72,
  perceivedRespect: 70,
  conversationStatus: "concluded" as const,
  closureReason: "commitment" as const,
  endType: "concluded" as const,
};

const report = generateFeedbackReport(
  ops_resistant_leader,
  finalState,
  metrics,
  executiveScores,
  transcript,
  initialState
);

console.log(JSON.stringify(report, null, 2));
