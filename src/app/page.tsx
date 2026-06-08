"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FeedbackReport } from "@/lib/feedback";
import { ChatMessage } from "@/lib/prompts";
import { interpretLeaderState } from "@/lib/simulation/interpretLeaderState";
import { ConversationStatus } from "@/lib/simulation/types";

const OPENING_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Thanks for making time. I've got about twenty minutes before my next ops review. I understand you want to talk about a new initiative—go ahead, but I'll be honest, we've been down this road before and my team doesn't have a lot of bandwidth for another big change right now.",
};

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      <span className="loading-dot h-2 w-2 rounded-full bg-zinc-400" />
      <span className="loading-dot h-2 w-2 rounded-full bg-zinc-400" />
      <span className="loading-dot h-2 w-2 rounded-full bg-zinc-400" />
    </div>
  );
}

const BANNER_STYLE: Record<ConversationStatus, string> = {
  active: "border-zinc-200 bg-zinc-50",
  conditionallyAccepted: "border-emerald-200 bg-emerald-50",
  lost: "border-red-200 bg-red-50",
  userEnded: "border-zinc-200 bg-zinc-50",
};

const BANNER_TEXT_STYLE: Record<ConversationStatus, string> = {
  active: "text-zinc-700",
  conditionallyAccepted: "text-emerald-900",
  lost: "text-red-900",
  userEnded: "text-zinc-700",
};

export default function Home() {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>("active");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const inputEnabled =
    !conversationEnded &&
    (conversationStatus === "active" ||
      conversationStatus === "conditionallyAccepted");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function syncStateFromResponse(state: {
    conversationStatus?: ConversationStatus;
  }) {
    if (state.conversationStatus) {
      setConversationStatus(state.conversationStatus);
    }
  }

  function startNewSimulation() {
    setSessionId(crypto.randomUUID());
    setMessages([OPENING_MESSAGE]);
    setInput("");
    setError(null);
    setFeedback(null);
    setConversationEnded(false);
    setConversationStatus("active");
  }

  async function handleEndSimulation() {
    if (isLoading || conversationEnded) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, endSimulation: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      if (data.state) syncStateFromResponse(data.state);
      if (data.feedback) setFeedback(data.feedback);
      setConversationEnded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end simulation");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading || !inputEnabled) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      }

      if (data.state) syncStateFromResponse(data.state);
      if (data.feedback) setFeedback(data.feedback);
      if (data.conversationEnded) setConversationEnded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const perception = interpretLeaderState({ conversationStatus });
  const showPerceptionBanner =
    perception.guidance.length > 0 &&
    (!conversationEnded || conversationStatus === "lost");

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Influence Simulator
            </h1>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Practice proposing an initiative to a skeptical senior operations
              leader
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!conversationEnded && (
              <button
                type="button"
                onClick={handleEndSimulation}
                disabled={isLoading}
                className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                End &amp; get feedback
              </button>
            )}
            {conversationEnded && (
              <button
                type="button"
                onClick={startNewSimulation}
                className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </header>

      {showPerceptionBanner && (
        <div
          className={`shrink-0 border-b px-4 py-2 sm:px-6 ${BANNER_STYLE[conversationStatus]}`}
        >
          <div className={`mx-auto max-w-2xl text-sm ${BANNER_TEXT_STYLE[conversationStatus]}`}>
            <p className="font-medium">{perception.label}</p>
            <p className="mt-0.5">{perception.guidance}</p>
          </div>
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "rounded-br-md bg-[var(--user-bubble)] text-[var(--user-text)]"
                      : "rounded-bl-md border border-[var(--border)] bg-[var(--ai-bubble)] text-[var(--ai-text)]"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <p className="mb-1 text-xs font-medium text-zinc-500">
                      Senior Ops Leader
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--ai-bubble)] px-4 py-2 shadow-sm">
                  <p className="mb-1 text-xs font-medium text-zinc-500">
                    Senior Ops Leader
                  </p>
                  <LoadingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {feedback && (
          <div className="shrink-0 border-t border-[var(--border)] bg-zinc-50 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-2xl space-y-4">
              <h2 className="text-base font-semibold">Coaching Feedback</h2>
              <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                <p>
                  <span className="font-medium">Outcome:</span> {feedback.outcome}
                </p>
                <p>
                  <span className="font-medium">Relationship:</span>{" "}
                  {feedback.relationshipOutcome}
                </p>
                <p>
                  <span className="font-medium">Influence:</span>{" "}
                  {feedback.influenceOutcome}
                </p>
                <p>
                  <span className="font-medium">Confidence:</span>{" "}
                  {feedback.confidence}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Competencies</h3>
                <p className="mb-2 text-sm text-zinc-700">
                  <span className="font-medium">Overall:</span>{" "}
                  {feedback.overallScore} ({feedback.overallLevel})
                </p>
                <ul className="space-y-1 text-sm text-zinc-700">
                  {Object.entries(feedback.competencies).map(([key, score]) => (
                    <li key={key} className="flex justify-between gap-4">
                      <span className="capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span>{score}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Strengths</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {feedback.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Development Areas</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {feedback.developmentAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Scenario Insights</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {feedback.scenarioInsights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              {feedback.keyMoments.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Key Moments</h3>
                  <ul className="space-y-2 text-sm text-zinc-700">
                    {feedback.keyMoments.map((moment) => (
                      <li key={`${moment.turnIndex}-${moment.event}`}>
                        <span className="font-medium">{moment.event}</span>
                        <span className="text-zinc-500">
                          {" "}
                          (turn {moment.turnIndex + 1})
                        </span>
                        <p className="mt-0.5 text-zinc-600">{moment.impact}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-2xl items-end gap-3"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              rows={1}
              disabled={isLoading || !inputEnabled}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-zinc-50 px-4 py-3 text-[15px] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !inputEnabled}
              className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>

          {error && (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
