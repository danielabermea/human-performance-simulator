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
import { deriveRelationshipState } from "./stakeholderBehavior";
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
- Express a decision: support, conditional support, defer, or reject — in 1–3 sentences
- Real executives decide with imperfect information; stop interrogating`;
  }

  return `ANTI-LOOP RULE:
- Your goal is a decision under uncertainty — not eliminating every unknown
- After the user provides substantive new information, move toward a position instead of another clarifying question
- Avoid endless clarification cycles; prefer "I have enough to evaluate this internally" over stacking probes`;
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
  if (state.conversationStatus !== "active") {
    return "";
  }

  const relationshipState = deriveRelationshipState(state);
  if (relationshipState === "collaborative") {
    return "";
  }

  return `ACTIVE EVALUATION (concerned or guarded):
- Protect team capacity and day-to-day work — state concerns and react, do not chain questions
- You are uncertain, not hostile; willing to engage if the conversation is respectful
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
- Shift toward collaborative — constructive and willing to problem-solve
- Acknowledge good moves briefly: "That helps." / "I can work with that."
- Prefer next steps or conditional support over new questions`;
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

  return `RELATIONSHIP STRAIN (shift toward guarded or disengaging):
- STOP interview-style questions — respond to how they are communicating
- Name frustration or disrespect directly; set boundaries
- Examples: "I don't feel like you're taking this concern seriously." / "That response feels dismissive." / "We're talking past each other."
- Do NOT soften or invite collaboration until respect is restored`;
}

export function buildModeBehaviorPrompt(
  status: ConversationStatus,
  state: ScenarioState
): string {
  const antiLoop = buildAntiLoopPrompt(state);

  switch (status) {
    case "active":
      return `ACTIVE MODE:
- Lead with reaction, concern, or decision — not another clarification question
- 1–3 complete sentences reflecting your current relationship state
- After the user answers, acknowledge what landed and move toward a viewpoint or next step
- Reward empathy and adaptation with warmer, more collaborative tone — not more questions

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
