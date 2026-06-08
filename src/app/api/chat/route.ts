import OpenAI from "openai";
import { generateFeedbackReport, FeedbackReport } from "@/lib/feedback";
import {
  buildSystemPrompt,
  ops_resistant_leader,
  processUserMessage,
} from "@/lib/scenarios";
import {
  ENDED_CONVERSATION_MESSAGE,
  isSimulationTerminated,
  markUserEnded,
  USER_ENDED_MESSAGE,
} from "@/lib/simulation/conversationOutcome";
import {
  getSimulationSession,
  pruneSessions,
  resetSimulationSession,
  SimulationSession,
} from "@/lib/simulation/sessionStore";
import { ChatMessage } from "@/lib/prompts";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function syncTranscript(session: SimulationSession, messages: ChatMessage[]): void {
  session.transcript = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function buildFeedback(
  session: SimulationSession,
  existing: FeedbackReport | null
): FeedbackReport {
  return (
    existing ??
    generateFeedbackReport(
      ops_resistant_leader,
      session.state,
      session.metrics,
      session.executiveScores,
      session.transcript
    )
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, sessionId, reset, endSimulation } = body as {
    messages?: ChatMessage[];
    sessionId?: string;
    reset?: boolean;
    endSimulation?: boolean;
  };

  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = reset
    ? resetSimulationSession(sessionId)
    : getSimulationSession(sessionId);

  pruneSessions(sessionId);

  if (endSimulation) {
    session.state = markUserEnded(session.state);
    const feedback = buildFeedback(session, null);

    return Response.json({
      message: USER_ENDED_MESSAGE,
      state: session.state,
      feedback,
      conversationEnded: true,
    });
  }

  const chatMessages = messages ?? [];
  const lastMessage = chatMessages[chatMessages.length - 1]?.content ?? "";

  syncTranscript(session, chatMessages);

  if (isSimulationTerminated(session.state)) {
    const feedback = buildFeedback(session, null);
    return Response.json({
      message:
        session.state.conversationStatus === "userEnded"
          ? USER_ENDED_MESSAGE
          : ENDED_CONVERSATION_MESSAGE,
      state: session.state,
      feedback,
      conversationEnded: true,
    });
  }

  const result = processUserMessage(
    ops_resistant_leader,
    session.state,
    session.metrics,
    session.executiveScores,
    session.transcript,
    lastMessage
  );

  session.state = result.state;
  session.metrics = result.metrics;
  session.executiveScores = result.executiveScores;

  const conversationEnded = isSimulationTerminated(session.state);
  const feedback = conversationEnded ? buildFeedback(session, result.feedback) : null;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(ops_resistant_leader, session.state),
      },
      ...chatMessages,
    ],
    max_tokens: session.state.conversationStatus === "lost" ? 120 : 600,
  });

  const assistantContent = completion.choices[0].message.content ?? "";
  if (assistantContent) {
    session.transcript.push({ role: "assistant", content: assistantContent });
  }

  return Response.json({
    message: assistantContent,
    state: session.state,
    feedback,
    conversationEnded,
  });
}
