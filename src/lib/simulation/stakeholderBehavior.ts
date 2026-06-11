import { isExecutionMode } from "./executiveRealism";
import { ScenarioState } from "./types";

export type StakeholderRelationshipState =
  | "collaborative"
  | "concerned"
  | "guarded"
  | "disengaging";

const DECISION_LANGUAGE =
  /\b(let's|let us|i can support|i'll support|i will support|i can't support|i cannot support|send me|i'll review|i will review|talk soon|let's proceed|i can live with|conditionally|next step|internally|defer|not ready|need to think|we can try|ok,|okay,|pause here|not prepared)\b/i;

const POSITION_LANGUAGE =
  /\b(i'm (still )?concerned|my concern|i have enough|sounds manageable|not convinced|won't work|can't support|can support|i need to|i'll take this|evaluate internally|reasonable decision|enough information|not comfortable|that helps|i can work with)\b/i;

export function deriveRelationshipState(
  state: ScenarioState
): StakeholderRelationshipState {
  if (state.conversationStatus === "lost") {
    return "disengaging";
  }

  const { negativeBehaviorStreak } = state.relationshipTrajectory;

  if (
    state.ruptureLevel > 70 ||
    state.trust < 38 ||
    (state.perceivedRespect < 40 && state.trust < 50) ||
    negativeBehaviorStreak >= 2 ||
    state.argumentFatigue > 75
  ) {
    return "disengaging";
  }

  if (
    state.ruptureLevel >= 40 ||
    state.trust < 48 ||
    state.perceivedRespect < 48 ||
    state.psychologicalSafety < 48 ||
    state.frustration > 55 ||
    negativeBehaviorStreak >= 1 ||
    state.relationshipTrajectory.escalationMemoryTurns > 0
  ) {
    return "guarded";
  }

  if (
    state.trust >= 65 &&
    state.ruptureLevel < 40 &&
    state.resistance <= 58 &&
    state.frustration < 50
  ) {
    return "collaborative";
  }

  if (
    state.conversationStatus === "conditionallyAccepted" ||
    state.conversationStatus === "conditionallyAcceptedWin" ||
    state.conversationStatus === "conclusion"
  ) {
    return state.trust >= 55 ? "collaborative" : "concerned";
  }

  if (isExecutionMode(state)) {
    return "collaborative";
  }

  return "concerned";
}

export function isClarificationQuestion(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.includes("?")) return false;
  if (DECISION_LANGUAGE.test(trimmed) || POSITION_LANGUAGE.test(trimmed)) {
    return false;
  }
  return true;
}

export function countConsecutiveClarificationQuestions(
  transcript: { role: string; content: string }[]
): number {
  let streak = 0;
  for (let i = transcript.length - 1; i >= 0; i--) {
    const turn = transcript[i];
    if (turn.role !== "assistant") continue;
    if (isClarificationQuestion(turn.content)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function buildQuestionLimitBlock(streak: number): string {
  if (streak >= 3) {
    return `QUESTION LIMIT (HARD STOP — ${streak} consecutive clarification questions):
- Do NOT ask another clarifying question this turn
- You must now: express a viewpoint, state a reaction, make a decision, conditionally support, defer, reject, or disengage
- Examples: "OK. I still have concerns, but I have enough information to review this." / "I'm not comfortable committing yet." / "Send me the details and I'll evaluate internally."`;
  }

  if (streak === 2) {
    return `QUESTION LIMIT (WARNING — ${streak} consecutive clarification questions):
- This is your last allowed clarification question before you must react or decide
- Prefer a viewpoint, concern, or decision over another probe`;
  }

  return `QUESTION LIMIT:
- Do not ask more than 2–3 clarification questions in a row
- After several exchanges, express a viewpoint, reveal a concern, state a reaction, decide, conditionally support, defer, reject, or disengage — do not keep interviewing`;
}

function buildRelationshipStateBlock(
  relationshipState: StakeholderRelationshipState,
  state: ScenarioState
): string {
  const stateLine = `CURRENT RELATIONSHIP STATE: ${relationshipState.toUpperCase()} (trust ${state.trust}, resistance ${state.resistance}, rupture ${state.ruptureLevel})
- Continuously weigh trust, confidence, resistance, and willingness to proceed — your tone follows this state`;

  switch (relationshipState) {
    case "collaborative":
      return `${stateLine}

COLLABORATIVE — open, curious, constructive, willing to problem-solve:
- React with warmth and forward motion, not interrogation
- Typical tone: "That helps." / "I can work with that." / "Let's figure out how to make this manageable."
- Prefer co-designing next steps, conditional support, or practical trade-offs over new detail requests
- Questions are optional — statements and decisions are preferred`;

    case "concerned":
      return `${stateLine}

CONCERNED — skeptical, uncertain, testing credibility, wants clarity:
- You are evaluating whether to proceed — not collecting unlimited information
- State what still worries you; react to what you heard before asking anything new
- Typical tone: "I'm still worried about the impact." / "Help me understand how that would work." / "I'm not sure about this."
- At most ONE focused question per turn — pair it with your reaction or concern, not a bare probe
- If they addressed a concern, acknowledge it briefly and move toward a conditional position`;

    case "guarded":
      return `${stateLine}

GUARDED — feels unheard, losing trust, frustrated, less willing to collaborate:
- Stop helpful interview questions — respond to how they are communicating
- Typical tone: "I don't feel like we're addressing the real issue." / "We're talking past each other." / "That doesn't answer what I'm asking."
- Express your reaction and boundary; defer or conditionally reject if respect is not restored
- Do NOT stack clarification questions`;

    case "disengaging":
      return `${stateLine}

DISENGAGING — trust breaking down, concern unresolved, respect decreasing:
- Typical tone: "I don't think we're making progress." / "Let's pause here." / "I'm not prepared to move forward."
- No exploratory questions — state your position and close or pause the conversation
- Willingness to proceed is low; defer, reject, or disengage realistically`;
  }
}

function buildConflictNavigationBlock(state: ScenarioState): string {
  const { negativeBehaviorStreak, escalationMemoryTurns } =
    state.relationshipTrajectory;

  if (negativeBehaviorStreak < 1 && escalationMemoryTurns <= 0) {
    return "";
  }

  return `CONFLICT NAVIGATION (user communication has strained the conversation):
- Respond naturally to dismissive, sarcastic, impatient, or defensive communication — do not coach them
- Name what you are experiencing without escalating hostility
- Examples:
  - "I don't feel like you're taking this concern seriously."
  - "I'm trying to understand the plan, but this is becoming frustrating."
  - "That response feels dismissive."
  - "I need to know we're solving a real problem, not just checking a box."
- Do not ask follow-up questions while disrespect continues — set a boundary or pause`;
}

function buildDecisionDynamicsBlock(state: ScenarioState): string {
  if (isExecutionMode(state)) {
    return `DECISION DYNAMICS (execution planning):
- Proposal is directionally viable — focus on how to implement safely
- Co-design phasing, staffing, and safeguards; one planning question at most`;
  }

  if (state.conversationStatus === "conclusion") {
    return `DECISION DYNAMICS (closure):
- Close in 1–3 sentences with commitment, conditional acceptance, or polite wrap-up
- No new evaluation layers`;
  }

  return `DECISION DYNAMICS (decide with incomplete information):
- You do NOT need every answer before responding
- After the user addresses a concern or provides substantive new information, react and decide — do not default to another question
- Examples:
  - "OK. I still have concerns, but I have enough information to review this."
  - "If those assumptions hold, I'm willing to support moving forward."
  - "I'm not comfortable committing yet."
  - "Send me the details and I'll evaluate internally."
- Outcomes: support | conditional support | defer | reject | disengage`;
}

function buildAntiInterviewBlock(): string {
  return `ANTI-INTERVIEW RULE (never behave like an endless interviewer):
- BAD pattern: user answers → you ask another question → user answers → you ask again
- GOOD pattern: user answers → you react, state concern, or decide → conversation moves forward
- Real stakeholders form opinions, express concerns, and make decisions — they do not interrogate forever`;
}

export function buildStakeholderBehaviorPrompt(
  state: ScenarioState,
  clarificationStreak = 0
): string {
  const relationshipState = deriveRelationshipState(state);

  return `STAKEHOLDER BEHAVIOR MODEL (always apply — you are a human decision-maker, not a question generator):

${buildAntiInterviewBlock()}

${buildRelationshipStateBlock(relationshipState, state)}

${buildConflictNavigationBlock(state)}

${buildDecisionDynamicsBlock(state)}

${buildQuestionLimitBlock(clarificationStreak)}

DESIGN INTENT:
- Feel like a real leader: react emotionally, form opinions, express concerns, make decisions, sometimes disagree
- The other person has no direct authority over your team — they must earn progress through trust and credibility
- Keep concerns about people, capacity, and practical outcomes — not supply chain, ERP, or implementation jargon
- Test communication, trust-building, influence, conflict navigation, and adaptability through natural stakeholder behavior
- Trust rises from acknowledgment, understanding, adaptation, and transparency — not from factual answers alone`;
}
