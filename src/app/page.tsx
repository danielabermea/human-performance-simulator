"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CoachingSuggestion, FeedbackReport, GrowthOpportunity, SkillHighlight } from "@/lib/feedback";
import { ChatMessage } from "@/lib/prompts";
import { ClientSimulationSession } from "@/lib/simulation/clientSession";
import { interpretLeaderState } from "@/lib/simulation/interpretLeaderState";
import { ConversationStatus } from "@/lib/simulation/types";

const TERMINAL_CONVERSATION_STATUSES: ConversationStatus[] = [
  "lost",
  "concluded",
  "userEnded",
];

function isTerminalConversationStatus(
  status: ConversationStatus | undefined
): boolean {
  return status !== undefined && TERMINAL_CONVERSATION_STATUSES.includes(status);
}

const CONTENT_MAX = "max-w-[900px]";
const TEXTAREA_MIN_HEIGHT_PX = 44;
const TEXTAREA_MAX_HEIGHT_PX = 200;

function openingMessageFromSession(session: ClientSimulationSession): ChatMessage {
  return { role: "assistant", content: session.initialPrompt };
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      <span className="loading-dot h-2 w-2 rounded-full bg-slate-300" />
      <span className="loading-dot h-2 w-2 rounded-full bg-slate-300" />
      <span className="loading-dot h-2 w-2 rounded-full bg-slate-300" />
    </div>
  );
}

function StakeholderAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700 ring-1 ring-slate-200 ${sizeClass}`}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}

type LeaderSnapshot = {
  trust: number;
  resistance: number;
  ruptureLevel: number;
  psychologicalSafety: number;
  perceivedRespect: number;
  negativeBehaviorStreak: number;
};

function SimulationSetupCard({
  scenarioContext,
}: {
  scenarioContext: NonNullable<ClientSimulationSession["scenarioContext"]>;
}) {
  const stakeholderFirstName =
    scenarioContext.stakeholderName.split(/\s+/)[0] ?? scenarioContext.stakeholderName;

  return (
    <section
      className="sim-card-brief space-y-5 px-5 py-4"
      aria-label="Simulation setup"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Scenario
        </p>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-700">
          {scenarioContext.scenarioNarrative.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-slate-300" aria-hidden>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Stakeholder
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {scenarioContext.stakeholderName}
          </p>
          <p className="text-sm text-slate-600">{scenarioContext.stakeholderRole}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            What {stakeholderFirstName} Cares About
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {scenarioContext.stakeholderCaresAbout.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-slate-300" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function OpeningMessageCard({
  name,
  role,
  content,
}: {
  name: string;
  role: string;
  content: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="flex gap-3">
        <StakeholderAvatar name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{role}</p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
            {content}
          </p>
        </div>
      </div>
    </article>
  );
}

function ConversationInsightCard({
  headline,
  body,
}: {
  headline: string;
  body: string;
}) {
  return (
    <aside
      className="sim-card-brief border-slate-200 bg-slate-50/50 px-4 py-3.5"
      aria-label="Conversation insight"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Conversation insight
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-slate-800">
        {headline}
      </p>
      {body && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
      )}
    </aside>
  );
}

function WhatWorkedList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2.5 text-sm text-slate-700">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`} className="flex gap-2.5">
          <span className="shrink-0 text-emerald-600" aria-hidden>
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StrengthenConversationList({ items }: { items: CoachingSuggestion[] }) {
  return (
    <ul className="mt-2 space-y-5 text-sm text-slate-700">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.observed.slice(0, 24)}`}
          className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Observed
            </p>
            <p className="mt-1 leading-relaxed">{item.observed}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Try Instead
            </p>
            <p className="mt-1 leading-relaxed text-slate-800">
              &ldquo;{item.suggestedAlternative}&rdquo;
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Why
            </p>
            <p className="mt-1 leading-relaxed text-slate-600">{item.explanation}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ConversationReflectionPanel() {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-sm">
      <h3 className="text-sm font-medium text-slate-900">Conversation Reflection</h3>
      <div className="mt-4 space-y-3 leading-relaxed text-slate-700">
        <p className="font-medium text-slate-900">No coaching available yet.</p>
        <p>You ended the simulation before sending a response.</p>
        <p>
          Engage in a short conversation with the stakeholder to receive personalized
          coaching and feedback.
        </p>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Conversation length: Not enough evidence
      </p>
    </section>
  );
}

function SkillHighlightCard({ highlight }: { highlight: SkillHighlight }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Biggest Strength
      </p>
      <h4 className="mt-2 font-medium text-slate-900">{highlight.skillName}</h4>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Observed
          </dt>
          <dd className="mt-1 leading-relaxed text-slate-700">{highlight.observed}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Why It Matters
          </dt>
          <dd className="mt-1 leading-relaxed text-slate-600">{highlight.whyItMatters}</dd>
        </div>
      </dl>
    </section>
  );
}

function GrowthOpportunityCard({ opportunity }: { opportunity: GrowthOpportunity }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Growth Opportunity
      </p>
      <h4 className="mt-2 font-medium text-slate-900">{opportunity.skillName}</h4>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Observed
          </dt>
          <dd className="mt-1 leading-relaxed text-slate-700">{opportunity.observed}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Try Instead
          </dt>
          <dd className="mt-1 leading-relaxed text-slate-800">
            &ldquo;{opportunity.tryInstead}&rdquo;
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Why It Matters
          </dt>
          <dd className="mt-1 leading-relaxed text-slate-600">{opportunity.whyItMatters}</dd>
        </div>
      </dl>
    </section>
  );
}

function TranscriptThread({
  messages,
  firstAssistantIndex,
  stakeholderName,
  stakeholderRole,
  isLoading,
  messagesEndRef,
}: {
  messages: ChatMessage[];
  firstAssistantIndex: number;
  stakeholderName: string;
  stakeholderRole: string;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      {messages.length > 0 && firstAssistantIndex >= 0 && (
        <OpeningMessageCard
          name={stakeholderName}
          role={stakeholderRole}
          content={messages[firstAssistantIndex].content}
        />
      )}

      {messages.map((msg, i) => {
        const isAssistant = msg.role === "assistant";
        const isFirstAssistant = i === firstAssistantIndex;

        if (isAssistant) {
          if (isFirstAssistant) return null;

          return (
            <article key={i} className="max-w-[92%]">
              <p className="mb-1 text-xs font-medium text-slate-500">
                {stakeholderName}
              </p>
              <div className="rounded-xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                  {msg.content}
                </p>
              </div>
            </article>
          );
        }

        return (
          <div key={i} className="flex justify-end pl-12 sm:pl-20">
            <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[var(--user-bubble)] px-4 py-3 text-[15px] leading-relaxed text-[var(--user-text)]">
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="max-w-[92%] rounded-xl border border-slate-200 bg-white px-4 py-3">
          <LoadingIndicator />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default function Home() {
  const [simulationSession, setSimulationSession] =
    useState<ClientSimulationSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>("active");
  const [leaderSnapshot, setLeaderSnapshot] = useState<LeaderSnapshot>({
    trust: 50,
    resistance: 60,
    ruptureLevel: 0,
    psychologicalSafety: 60,
    perceivedRespect: 60,
    negativeBehaviorStreak: 0,
  });
  const [previousLeaderSnapshot, setPreviousLeaderSnapshot] =
    useState<LeaderSnapshot | null>(null);
  const [lastTurnDisrespectful, setLastTurnDisrespectful] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, TEXTAREA_MIN_HEIGHT_PX),
      TEXTAREA_MAX_HEIGHT_PX
    );
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  const inputEnabled =
    simulationSession !== null &&
    !conversationEnded &&
    (conversationStatus === "active" ||
      conversationStatus === "conditionallyAccepted" ||
      conversationStatus === "conditionallyAcceptedWin" ||
      conversationStatus === "conclusion");

  const applySimulationSession = useCallback((session: ClientSimulationSession) => {
    setSimulationSession(session);
    setMessages([openingMessageFromSession(session)]);
    setInput("");
    setError(null);
    setFeedback(null);
    setConversationEnded(false);
    setConversationStatus("active");
    setLeaderSnapshot({
      trust: 50,
      resistance: 60,
      ruptureLevel: 0,
      psychologicalSafety: 60,
      perceivedRespect: 60,
      negativeBehaviorStreak: 0,
    });
    setPreviousLeaderSnapshot(null);
    setLastTurnDisrespectful(false);
  }, []);

  const bootstrapSimulation = useCallback(async () => {
    setIsBootstrapping(true);
    setError(null);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start simulation");
      }

      applySimulationSession(data as ClientSimulationSession);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start simulation"
      );
    } finally {
      setIsBootstrapping(false);
    }
  }, [applySimulationSession]);

  useEffect(() => {
    bootstrapSimulation();
  }, [bootstrapSimulation]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function syncStateFromResponse(state: {
    conversationStatus?: ConversationStatus;
    trust?: number;
    resistance?: number;
    ruptureLevel?: number;
    psychologicalSafety?: number;
    perceivedRespect?: number;
    relationshipTrajectory?: { negativeBehaviorStreak?: number };
  }) {
    if (state.conversationStatus) {
      setConversationStatus(state.conversationStatus);
      if (isTerminalConversationStatus(state.conversationStatus)) {
        setConversationEnded(true);
      }
    }

    if (
      state.trust !== undefined &&
      state.resistance !== undefined &&
      state.ruptureLevel !== undefined
    ) {
      setPreviousLeaderSnapshot(leaderSnapshot);
      setLeaderSnapshot({
        trust: state.trust,
        resistance: state.resistance,
        ruptureLevel: state.ruptureLevel,
        psychologicalSafety: state.psychologicalSafety ?? leaderSnapshot.psychologicalSafety,
        perceivedRespect: state.perceivedRespect ?? leaderSnapshot.perceivedRespect,
        negativeBehaviorStreak:
          state.relationshipTrajectory?.negativeBehaviorStreak ??
          leaderSnapshot.negativeBehaviorStreak,
      });
    }
  }

  function startNewSimulation() {
    void bootstrapSimulation();
  }

  async function handleEndSimulation() {
    if (isLoading || conversationEnded || !simulationSession) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: simulationSession.sessionId,
          endSimulation: true,
        }),
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
    if (!trimmed || isLoading || !inputEnabled || !simulationSession) return;

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
        body: JSON.stringify({
          messages: updatedMessages,
          sessionId: simulationSession.sessionId,
        }),
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
      if (typeof data.lastTurnDisrespectful === "boolean") {
        setLastTurnDisrespectful(data.lastTurnDisrespectful);
      }
      if (data.feedback) setFeedback(data.feedback);
      if (
        data.conversationEnded ||
        isTerminalConversationStatus(data.state?.conversationStatus)
      ) {
        setConversationEnded(true);
      }
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

  const perception = interpretLeaderState({
    conversationStatus,
    trust: leaderSnapshot.trust,
    resistance: leaderSnapshot.resistance,
    ruptureLevel: leaderSnapshot.ruptureLevel,
    psychologicalSafety: leaderSnapshot.psychologicalSafety,
    perceivedRespect: leaderSnapshot.perceivedRespect,
    negativeBehaviorStreak: leaderSnapshot.negativeBehaviorStreak,
    previousTrust: previousLeaderSnapshot?.trust,
    previousResistance: previousLeaderSnapshot?.resistance,
    previousSafety: previousLeaderSnapshot?.psychologicalSafety,
    previousRespect: previousLeaderSnapshot?.perceivedRespect,
    lastTurnDisrespectful,
  });

  const showConversationInsight =
    perception.guidance.length > 0 && !conversationEnded;

  const scenarioContext = simulationSession?.scenarioContext;
  const stakeholderName = simulationSession?.stakeholder.name ?? "";
  const stakeholderRole =
    scenarioContext?.stakeholderRole ?? simulationSession?.stakeholder.role ?? "";
  const hasUserMessage = messages.some((msg) => msg.role === "user");
  const firstAssistantIndex = messages.findIndex((msg) => msg.role === "assistant");

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className={`mx-auto flex w-full min-h-0 flex-1 flex-col px-6 py-8 sm:px-8 sm:py-10 ${CONTENT_MAX}`}
      >
        <header className="mb-6 flex shrink-0 flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl space-y-3">
            <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900 sm:text-[2rem]">
              Human Amplified Simulator
            </h1>
            <p className="text-base leading-relaxed text-slate-500">
              Practice real-world stakeholder conversations with AI simulation.
              Build emotional intelligence, adaptability, and alignment skills.
            </p>
            {isBootstrapping && !simulationSession && (
              <p className="text-sm text-slate-400">Preparing simulation…</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {!conversationEnded && simulationSession && (
              <button
                type="button"
                onClick={handleEndSimulation}
                disabled={isLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                End &amp; get feedback
              </button>
            )}
            {conversationEnded && (
              <button
                type="button"
                onClick={startNewSimulation}
                disabled={isBootstrapping}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                Try again
              </button>
            )}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4">
          {!conversationEnded && scenarioContext && !hasUserMessage && (
            <SimulationSetupCard scenarioContext={scenarioContext} />
          )}

          {showConversationInsight && hasUserMessage && (
            <ConversationInsightCard
              headline={perception.label}
              body={perception.guidance}
            />
          )}

          {isBootstrapping && messages.length === 0 && (
            <div className="flex flex-1 justify-center py-20">
              <LoadingIndicator />
            </div>
          )}

          {feedback ? (
            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2 lg:items-start">
              <section className="flex min-h-0 flex-col gap-3 lg:sticky lg:top-8 lg:max-h-[calc(100dvh-8rem)]">
                <h2 className="text-sm font-medium text-slate-900">Conversation</h2>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white/60 p-4">
                  {simulationSession && (
                    <TranscriptThread
                      messages={messages}
                      firstAssistantIndex={firstAssistantIndex}
                      stakeholderName={stakeholderName}
                      stakeholderRole={stakeholderRole}
                      isLoading={isLoading}
                      messagesEndRef={messagesEndRef}
                    />
                  )}
                </div>
              </section>

              <div className="feedback-panel min-h-0 space-y-6 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
                {feedback.coachingAvailable ? (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Coaching</h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        Here&apos;s what you did well, what you could say differently,
                        and where to focus next.
                      </p>
                    </div>

                    {feedback.confidenceNote && (
                      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        {feedback.confidenceNote}
                      </p>
                    )}

                    {feedback.whatWorked.length > 0 && (
                      <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                        <h3 className="text-sm font-medium text-slate-900">What Worked</h3>
                        <WhatWorkedList items={feedback.whatWorked} />
                      </section>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                      <h3 className="text-sm font-medium text-slate-900">
                        What Could Strengthen the Conversation
                      </h3>
                      <StrengthenConversationList items={feedback.strengthenConversation} />
                    </section>

                    {feedback.biggestStrength && (
                      <SkillHighlightCard highlight={feedback.biggestStrength} />
                    )}

                    {feedback.growthOpportunity && (
                      <GrowthOpportunityCard opportunity={feedback.growthOpportunity} />
                    )}
                  </>
                ) : (
                  <ConversationReflectionPanel />
                )}
              </div>
            </div>
          ) : (
            messages.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                {simulationSession && firstAssistantIndex >= 0 && (
                  <OpeningMessageCard
                    name={stakeholderName}
                    role={stakeholderRole}
                    content={messages[firstAssistantIndex].content}
                  />
                )}

                {messages.map((msg, i) => {
                  const isAssistant = msg.role === "assistant";
                  const isFirstAssistant = i === firstAssistantIndex;

                  if (isAssistant) {
                    if (isFirstAssistant) return null;

                    return (
                      <article key={i} className="max-w-[92%]">
                        <p className="mb-1 text-xs font-medium text-slate-500">
                          {stakeholderName}
                        </p>
                        <div className="rounded-xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                            {msg.content}
                          </p>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <div key={i} className="flex justify-end pl-12 sm:pl-20">
                      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[var(--user-bubble)] px-4 py-3 text-[15px] leading-relaxed text-[var(--user-text)]">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="max-w-[92%] rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <LoadingIndicator />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )
          )}
        </main>
      </div>

      {!conversationEnded && simulationSession && (
        <div className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-[var(--background)] px-6 pb-5 pt-3 sm:px-8">
          <form
            onSubmit={handleSubmit}
            className={`mx-auto flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm ${CONTENT_MAX}`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response…"
              rows={1}
              disabled={isLoading || !inputEnabled}
              className="min-h-[44px] max-h-[200px] flex-1 resize-none overflow-y-hidden rounded-lg border-0 bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !inputEnabled}
              className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>

          {error && (
            <p className={`mx-auto mt-3 text-sm text-red-600 ${CONTENT_MAX}`}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
