"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { FeedbackReport } from "@/lib/feedback";
import { HACF_COMPETENCY_DEFINITIONS, isDevelopmentPerformanceLevel } from "@/lib/feedback/hacfCompetencies";
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

function BriefIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
      {children}
    </span>
  );
}

function RoleIcon() {
  return (
    <BriefIcon>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3 5.5V13h10V5.5M2 5.5h12M5.5 5.5V4a2.5 2.5 0 015 0v1.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </BriefIcon>
  );
}

function StakeholderIcon() {
  return (
    <BriefIcon>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M3.5 13c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    </BriefIcon>
  );
}

function MindsetIcon() {
  return (
    <BriefIcon>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 2.5a4.5 4.5 0 00-4.5 4.5c0 1.6.8 3 2 3.8V12h5v-1.2c1.2-.8 2-2.2 2-3.8A4.5 4.5 0 008 2.5z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 13.5h3"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    </BriefIcon>
  );
}

function SuccessIcon() {
  return (
    <BriefIcon>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3 8.5l3 3 7-7"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </BriefIcon>
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

type BriefFieldProps = {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  className?: string;
};

function BriefField({ icon, label, children, className = "" }: BriefFieldProps) {
  return (
    <div className={`flex gap-3.5 ${className}`}>
      {icon}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="mt-1.5 text-sm leading-relaxed text-slate-700">{children}</div>
      </div>
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

type SimulationBriefCardProps = {
  expanded: boolean;
  onToggle: () => void;
  scenarioContext: NonNullable<ClientSimulationSession["scenarioContext"]>;
};

function SimulationBriefCard({
  expanded,
  onToggle,
  scenarioContext,
}: SimulationBriefCardProps) {
  return (
    <section className="sim-card-brief overflow-hidden" aria-label="Simulation brief">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50/80"
        aria-expanded={expanded}
      >
        <p className="text-sm font-medium text-slate-700">Simulation Brief</p>
        <span
          className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="grid gap-5 sm:grid-cols-2">
            <BriefField icon={<RoleIcon />} label="Role">
              {scenarioContext.userRoleLine}
            </BriefField>
            <BriefField icon={<StakeholderIcon />} label="Stakeholder">
              {scenarioContext.stakeholderName}, {scenarioContext.stakeholderRole}
            </BriefField>
            <BriefField icon={<MindsetIcon />} label="Stakeholder Mindset">
              <ul className="space-y-1.5">
                {scenarioContext.stakeholderMindset.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-slate-300" aria-hidden>
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </BriefField>
            <BriefField icon={<SuccessIcon />} label="Success Looks Like">
              <ul className="space-y-1.5">
                {scenarioContext.successLooksLike.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-slate-300" aria-hidden>
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </BriefField>
          </div>
        </div>
      )}
    </section>
  );
}

function ConversationSetupLine({ text }: { text: string }) {
  return (
    <p className="text-sm leading-snug text-slate-500" aria-label="Conversation setup">
      {text}
    </p>
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

function FeedbackBulletList({ items }: { items: string[] }) {
  return (
    <ul className="feedback-bullet-list mt-2 space-y-2 text-sm text-slate-700">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
      ))}
    </ul>
  );
}

function AccordionChevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className="shrink-0 text-[var(--primary)] transition-transform duration-200 group-open:rotate-180"
    >
      <path
        d="M4.5 6.75L9 11.25L13.5 6.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type CompetencyFeedbackItem = FeedbackReport["competencyFeedbacks"][number];

function CompetencyAccordion({ comp }: { comp: CompetencyFeedbackItem }) {
  const evidenceLabel = isDevelopmentPerformanceLevel(comp.level)
    ? "Observed Behaviors"
    : "Behavioral Indicators";

  return (
    <details className="feedback-accordion group sim-card overflow-hidden transition hover:border-slate-300">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-slate-900 transition group-hover:bg-slate-50/80">
        <span>
          {comp.name} — {comp.level}
        </span>
        <AccordionChevron />
      </summary>
      <div className="space-y-5 border-t border-slate-100 px-5 pb-5 pt-4 text-sm text-slate-700">
        <p className="leading-relaxed text-slate-600">
          {HACF_COMPETENCY_DEFINITIONS[comp.key]}
        </p>

        <div>
          <p className="font-medium text-slate-800">{evidenceLabel}</p>
          <FeedbackBulletList items={comp.behavioralIndicators} />
        </div>

        <div>
          <p className="font-medium text-slate-800">Key moment</p>
          {comp.keyMoment.quote ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="italic text-slate-600">
                &ldquo;{comp.keyMoment.quote}&rdquo;
              </p>
              <p className="mt-1.5 text-slate-600">{comp.keyMoment.context}</p>
            </div>
          ) : (
            <p className="mt-2 text-slate-600">{comp.keyMoment.context}</p>
          )}
        </div>
      </div>
    </details>
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
  const [briefExpanded, setBriefExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setBriefExpanded(true);
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
    setBriefExpanded(false);

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
          {!conversationEnded && scenarioContext && (
            <SimulationBriefCard
              expanded={briefExpanded}
              onToggle={() => setBriefExpanded((prev) => !prev)}
              scenarioContext={scenarioContext}
            />
          )}

          {!conversationEnded &&
            simulationSession &&
            !hasUserMessage &&
            simulationSession.conversationSetup && (
              <ConversationSetupLine text={simulationSession.conversationSetup} />
            )}

          {showConversationInsight && hasUserMessage && (
            <ConversationInsightCard
              headline={perception.label}
              body={perception.guidance}
            />
          )}

          <div
            className={`min-h-0 flex flex-col gap-3 ${
              feedback
                ? "max-h-[38dvh] shrink-0 overflow-y-auto sm:max-h-[42dvh]"
                : "flex-1 overflow-y-auto"
            }`}
          >
            {isBootstrapping && messages.length === 0 && (
              <div className="flex justify-center py-20">
                <LoadingIndicator />
              </div>
            )}

            {simulationSession && messages.length > 0 && firstAssistantIndex >= 0 && (
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
                if (isFirstAssistant) {
                  return null;
                }

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

          {feedback && (
            <div className="feedback-panel sim-card min-h-0 flex-1 space-y-8 p-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Coaching Reflection
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Narrative feedback grounded in what you did and how the
                  conversation unfolded.
                </p>
              </div>

              <section className="rounded-2xl bg-slate-50/80 p-5">
                <h3 className="text-sm font-medium text-slate-900">
                  Overall Assessment
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {feedback.outcome && (
                    <>
                      <span className="font-medium">{feedback.outcome}.</span>{" "}
                    </>
                  )}
                  {feedback.overallAssessment}
                </p>
              </section>

              {feedback.confidenceNote && (
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-sm leading-relaxed text-slate-700">
                    {feedback.confidenceNote}
                  </p>
                </section>
              )}

              {feedback.competencyFeedbacks.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-slate-900">Competencies</h3>
                {feedback.competencyFeedbacks.map((comp) => (
                  <CompetencyAccordion key={comp.key} comp={comp} />
                ))}
              </section>
              )}

              {feedback.strengths.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="text-sm font-medium text-slate-900">Strengths</h3>
                  <FeedbackBulletList items={feedback.strengths} />
                </section>
              )}

              {feedback.developmentAreas.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="text-sm font-medium text-slate-900">
                    Development Areas
                  </h3>
                  <FeedbackBulletList items={feedback.developmentAreas} />
                </section>
              )}

              {feedback.scenarioInsights.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="text-sm font-medium text-slate-900">
                    Scenario Insights
                  </h3>
                  <FeedbackBulletList items={feedback.scenarioInsights} />
                </section>
              )}
            </div>
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
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border-0 bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-slate-400 disabled:opacity-60"
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
