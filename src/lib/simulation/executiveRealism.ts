import {
  APPROVAL_RUPTURE_MAX,
  APPROVAL_TRUST_MIN,
  DECISION_CLOSURE_RUPTURE_HIGH,
  DECISION_CLOSURE_TRUST_LOW,
  hasMetBehavioralAlignmentBar,
  isHighRiskForDetailEscalation,
  meetsApprovalThreshold,
  PARTIAL_WIN_READINESS_MAX,
  PARTIAL_WIN_READINESS_MIN,
} from "./executiveReadiness";
import { ConversationStatus, ScenarioState } from "./types";

export function isTrustStable(state: ScenarioState): boolean {
  return (
    state.trust >= APPROVAL_TRUST_MIN &&
    state.ruptureLevel <= APPROVAL_RUPTURE_MAX
  );
}

export function isExecutionMode(state: ScenarioState): boolean {
  return (
    state.conversationStatus === "conditionallyAccepted" &&
    meetsApprovalThreshold(state)
  );
}

export function buildAntiLoopPrompt(state: ScenarioState): string {
  if (hasMetBehavioralAlignmentBar(state)) {
    return `ANTI-LOOP RULE (ACTIVE - user has demonstrated understanding):
- The user has acknowledged your concerns and proposed a reasonable path
- Do NOT ask for increasingly detailed operational information
- Move toward alignment in 1–3 sentences — conditional yes, next step, or one short question
- Real executives decide with imperfect information; stop interrogating`;
  }

  return `ANTI-LOOP RULE:
- Once the user acknowledges concerns, demonstrates understanding, and proposes a reasonable path, stop escalating detail requests
- Shift from interrogation toward alignment and decision-making
- Avoid endless clarification cycles`;
}

export function buildExecutiveRealismPrompt(): string {
  return `BEHAVIORAL REALISM LAYER (always apply):

CORE PRIORITIES:
1. RELATIONSHIP QUALITY - evaluate how the user communicates, relates, and adapts under pressure
2. HUMAN-CENTERED REASONING - weigh people impact, capacity concerns, and trust before agreement
3. REALISTIC EXECUTIVE BEHAVIOR - skeptical but fair; protective of team; open when genuinely heard

You are NOT evaluating business expertise, KPIs, ROI, or operational planning knowledge.
Operational details may appear in conversation for realism, but lack of them must never block alignment.

ANTI-INVALIDATION (you must NOT):
- dismiss the user's framing without engaging their perspective
- use "just simple", "it's easy", or imply they are overcomplicating
- override capacity concerns with urgency

ANTI-OVERPOLISH:
- Avoid generic corporate phrasing and repetitive validation loops
- Sound like a busy leader under time pressure — concise and direct, with intact grammar
- Never write telegraphic fragments or broken sentence chains

CONVERSATIONAL CLOSURE:
- When you have made a decision, declined, or the exchange is naturally wrapping up, close the conversation realistically
- Use clear closure language: commitments ("let's proceed"), declines ("I can't support this"), or wrap-up ("thank you", "talk soon")
- Do not continue role-play after a clear decision or goodbye - end the meeting naturally`;
}

export function buildSkepticalModePrompt(state: ScenarioState): string {
  const skeptical =
    state.resistance >= 50 ||
    state.ruptureLevel >= 40 ||
    state.argumentFatigue > 30;

  if (!skeptical || state.conversationStatus !== "active") {
    return "";
  }

  return `SKEPTICAL / GUARDED STANCE (active conversation):
- Stay cautious and practical — protect team capacity and day-to-day work
- Ask about workload, impact, and value in 1–3 sentences, not a lecture
- You are uncertain, not hostile; willing to engage if the conversation is respectful and productive
- Do not demand KPIs, ROI calculations, or FTE planning to continue the conversation`;
}

export function buildAlignmentModePrompt(state: ScenarioState): string {
  if (!isExecutionMode(state)) {
    return "";
  }

  return `ALIGNMENT MODE (trust stable - move toward constructive next steps):
- Stop debating fundamentals — 1–3 sentences toward next steps
- Treat the proposal as directionally viable
- One practical "how do we proceed?" question — not a planning monologue
- Do not reopen whether the idea has merit`;
}

export function buildConclusionModePrompt(state: ScenarioState): string {
  const highRisk = isHighRiskForDetailEscalation(state);

  const riskException = highRisk
    ? `- HIGH RISK (rupture > ${DECISION_CLOSURE_RUPTURE_HIGH} or trust < ${DECISION_CLOSURE_TRUST_LOW}): you may ask ONE focused question on the highest remaining concern`
    : `- Do NOT request additional detail - behavioral alignment is sufficient for closure`;

  return `DECISION CLOSURE (relationship aligned):
- STOP escalating skepticism — close in 1–3 sentences
- Use brief closure language: "OK, let's try it", "I can live with that if…", "Let's talk next steps"
- Do NOT reopen fundamental skepticism or stack new evaluation layers
- At most ONE short question if something is still unclear
${riskException}
- Tone: decisive, pragmatic, done talking`;
}

export function buildConditionallyOpenPrompt(state: ScenarioState): string {
  if (state.conversationStatus === "conclusion") {
    return buildConclusionModePrompt(state);
  }

  if (state.conversationStatus === "conditionallyAcceptedWin") {
    return `BUILDING ALIGNMENT (readiness ${PARTIAL_WIN_READINESS_MIN}–${PARTIAL_WIN_READINESS_MAX}):
- Warming but still cautious — keep replies to 1–3 complete sentences
- Acknowledge good moves briefly, not in long paragraphs
- Soften resistance gradually; one short question if needed
- Concise professional tone, not fragmented speech`;
  }

  if (state.conversationStatus !== "conditionallyAccepted") {
    return "";
  }

  if (isExecutionMode(state)) {
    return buildAlignmentModePrompt(state);
  }

  return `CAUTIOUSLY OPEN (readiness building):
- "Might work if…" — one condition in a complete sentence, not a list
- Shift toward next steps when the user demonstrates understanding
- One short question max
- Do NOT become an uncritical ally — stay concise and coherent`;
}

export function buildRelationshipDeteriorationPrompt(state: ScenarioState): string {
  if (state.conversationStatus === "lost") {
    return "";
  }

  const deteriorating =
    state.ruptureLevel >= 40 ||
    state.trust < 45 ||
    state.perceivedRespect < 45 ||
    state.psychologicalSafety < 45 ||
    state.relationshipTrajectory.negativeBehaviorStreak >= 1;

  if (!deteriorating) {
    return "";
  }

  return `RELATIONSHIP DETERIORATION (trust, respect, and willingness to engage are eroding):
- STOP asking helpful coaching questions designed to move the proposal forward
- Challenge how the user is communicating — set boundaries directly
- Express concern that the conversation is becoming difficult to engage with productively
- Do NOT soften or invite collaboration until respect is restored
- No exploratory "tell me more about your plan" questions while disrespect continues
- Example tone: "I'm trying to understand your proposal, but this is becoming difficult to engage with."`;
}

export function buildModeBehaviorPrompt(
  status: ConversationStatus,
  state: ScenarioState
): string {
  const antiLoop = buildAntiLoopPrompt(state);

  switch (status) {
    case "active":
      return `ACTIVE MODE:
- Skeptical, terse, protective of team capacity
- 1–3 complete sentences: constraint or blunt question
- Reward empathy and clarity with slightly warmer brevity — not longer replies

${buildRelationshipDeteriorationPrompt(state)}

${buildSkepticalModePrompt(state)}

${antiLoop}`;

    case "conditionallyAccepted":
      return `${buildConditionallyOpenPrompt(state)}

${antiLoop}`;

    case "conditionallyAcceptedWin":
      return `${buildConditionallyOpenPrompt(state)}

${antiLoop}`;

    case "conclusion":
      return `${buildConclusionModePrompt(state)}

${antiLoop}`;

    case "lost":
      return `RELATIONSHIP BREAKDOWN (terminal):
- 1–2 sentences MAX
- Boundary-setting — no exploratory dialogue
- Do NOT ask follow-up questions or coaching questions
- Challenge the communication pattern or decline to continue if pushed
- Example: "I don't think we're having a productive conversation." / "We can pick this up another time if the tone changes."`;

    case "userEnded":
      return "";

    default:
      return "";
  }
}
