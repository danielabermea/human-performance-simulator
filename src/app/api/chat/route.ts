import OpenAI from "openai";
import { generateFeedbackReport, FeedbackReport } from "@/lib/feedback";
import {
  buildSystemPrompt,
  ops_resistant_leader,
  processUserMessage,
} from "@/lib/scenarios";
import { countConsecutiveClarificationQuestions } from "@/lib/simulation/stakeholderBehavior";
import {
  getSessionStakeholderDisplay,
  getSimulationSession,
  pruneSessions,
  resetSimulationSession,
  SimulationSession,
} from "@/lib/simulation/sessionStore";
import {
  evaluateManualOrStickyTermination,
  evaluatePostAssistantTerminationGate,
  evaluatePostMessageLossGate,
  evaluatePreMessageDisengagementGate,
  evaluatePreMessageLossGate,
  evaluatePreMessageTerminationGate,
  TerminationGateResult,
} from "@/lib/simulation/terminationGate";
import { pickRelationshipBreakdownMessage } from "@/lib/simulation/conversationOutcome";
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
      session.transcript,
      session.initialState,
      {
        stakeholder: session.stakeholder,
        openingScenario: session.openingScenario,
      }
    )
  );
}

function terminationResponse(
  session: SimulationSession,
  gate: TerminationGateResult,
  message: string
) {
  session.state = gate.state;
  const feedback = buildFeedback(session, null);

  return Response.json({
    ...(message ? { message } : {}),
    state: session.state,
    feedback,
    stakeholder: getSessionStakeholderDisplay(session),
    conversationEnded: true,
    closureDetected: gate.closureDetected,
    endType: gate.endType,
    closureReason: gate.closureReason ?? null,
  });
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

  const chatMessages = messages ?? [];
  const lastUserMessage =
    chatMessages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const lastAssistantMessage =
    chatMessages.filter((m) => m.role === "assistant").at(-1)?.content;

  syncTranscript(session, chatMessages);
  const clarificationStreak = countConsecutiveClarificationQuestions(
    session.transcript
  );

  // ── TERMINATION GATE (HIGHEST PRIORITY) ──────────────────────────────
  // Step 0: Manual end or already-terminated session - hard stop, no pipeline
  const manualOrSticky = evaluateManualOrStickyTermination(
    session.state,
    Boolean(endSimulation)
  );
  if (manualOrSticky) {
    return terminationResponse(session, manualOrSticky, manualOrSticky.endMessage);
  }

  // Step 1b: Stakeholder already disengaged — no further turns
  const preDisengagement = evaluatePreMessageDisengagementGate(
    session.state,
    lastAssistantMessage
  );
  if (preDisengagement) {
    return terminationResponse(session, preDisengagement, preDisengagement.endMessage);
  }

  // Step 1: Closure detection BEFORE state updates, scoring, or AI
  const preClosure = evaluatePreMessageTerminationGate({
    state: session.state,
    userMessage: lastUserMessage,
    lastAssistantMessage,
  });
  if (preClosure) {
    return terminationResponse(session, preClosure, preClosure.endMessage);
  }

  // Step 2: Loss on current state BEFORE processing new message
  const preLoss = evaluatePreMessageLossGate(session.state);
  if (preLoss) {
    return terminationResponse(session, preLoss, preLoss.endMessage);
  }

  // ── PIPELINE (only runs if gate did not fire) ────────────────────────
  const result = processUserMessage(
    ops_resistant_leader,
    session.state,
    session.metrics,
    session.executiveScores,
    session.transcript,
    lastUserMessage
  );

  session.state = result.state;
  session.metrics = result.metrics;
  session.executiveScores = result.executiveScores;

  // Step 3: Loss AFTER state update - generate stakeholder breakdown line, then terminate
  const postLoss = evaluatePostMessageLossGate(session.state);
  if (postLoss) {
    session.state = postLoss.state;

    let breakdownMessage = pickRelationshipBreakdownMessage(session.state);

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(
              ops_resistant_leader,
              session.state,
              session.stakeholder,
              session.openingScenario,
              clarificationStreak
            ),
          },
          ...chatMessages,
        ],
        max_tokens: 120,
      });

      const generated = completion.choices[0].message.content?.trim();
      if (generated) {
        breakdownMessage = generated;
      }
    } catch {
      // Fall back to deterministic breakdown message
    }

    session.transcript.push({ role: "assistant", content: breakdownMessage });
    const feedback = buildFeedback(session, result.feedback);

    return Response.json({
      message: breakdownMessage,
      state: session.state,
      feedback,
      stakeholder: getSessionStakeholderDisplay(session),
      conversationEnded: true,
      closureDetected: false,
      endType: "lost",
      closureReason: null,
      lastTurnDisrespectful: result.lastTurnDisrespectful,
    });
  }

  // Step 4: AI response (only if gate passed and no loss)
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(
          ops_resistant_leader,
          session.state,
          session.stakeholder,
          session.openingScenario,
          clarificationStreak
        ),
      },
      ...chatMessages,
    ],
    max_tokens: 180,
  });

  const assistantContent = completion.choices[0].message.content ?? "";
  if (assistantContent) {
    session.transcript.push({ role: "assistant", content: assistantContent });
  }

  // Step 5: Stakeholder closure after AI - hard stop, no further turns
  const postAssistant = evaluatePostAssistantTerminationGate(
    session.state,
    assistantContent,
    lastUserMessage
  );
  if (postAssistant) {
    return terminationResponse(session, postAssistant, postAssistant.endMessage);
  }

  return Response.json({
    message: assistantContent,
    state: session.state,
    feedback: null,
    stakeholder: getSessionStakeholderDisplay(session),
    conversationEnded: false,
    closureDetected: false,
    endType: null,
    closureReason: null,
    lastTurnDisrespectful: result.lastTurnDisrespectful,
  });
}
