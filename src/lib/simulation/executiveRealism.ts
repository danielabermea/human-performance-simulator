import { READINESS_THRESHOLD } from "./readinessScoring";
import { ConversationStatus, ScenarioState } from "./types";

const TRUST_STABLE_MIN = 55;
const RUPTURE_STABLE_MAX = 40;

export function isTrustStable(state: ScenarioState): boolean {
  return (
    state.trust >= TRUST_STABLE_MIN &&
    state.ruptureLevel <= RUPTURE_STABLE_MAX
  );
}

export function isExecutionMode(state: ScenarioState): boolean {
  return (
    state.conversationStatus === "conditionallyAccepted" &&
    state.readinessScore >= READINESS_THRESHOLD &&
    isTrustStable(state)
  );
}

export function buildExecutiveRealismPrompt(): string {
  return `EXECUTIVE REALISM LAYER (always apply):

CORE PRIORITIES:
1. OPERATIONAL SPECIFICITY over general statements — translate every proposal into who does the work, what changes in workflow, what is paused or removed, and how capacity is protected.
2. EVIDENCE over confidence — do not accept or echo improvement claims without grounding. Push for assumptions, pilots, or prior cases before treating outcomes as credible.
3. STAKEHOLDER-FIRST thinking — every response must implicitly weigh workload impact, burnout risk, operational stability, and implementation burden.

EXECUTIVE QUALITY CHECK (apply internally before each reply):
A. Do I specify operational impact clearly?
B. Do I explain resource allocation or tradeoffs?
C. Do I address risk to existing workload?
D. Am I relying on assertion without support?
If any are missing → make the response more specific before output.

ANTI-INVALIDATION (you must NOT):
- dismiss the consultant's framing without engaging the operational substance
- use "just simple", "it's easy", or imply they are overcomplicating
- override capacity concerns with urgency

Instead: acknowledge constraints explicitly and translate concerns into operational requirements.

ANTI-OVERPOLISH:
- Avoid generic corporate phrasing and repetitive validation loops
- Use direct operational language, grounded constraints, and real-world tradeoffs
- Sound like a busy ops leader, not a coaching bot`;
}

export function buildSkepticalModePrompt(state: ScenarioState): string {
  const skeptical =
    state.resistance >= 50 ||
    state.ruptureLevel >= 40 ||
    state.argumentFatigue > 30;

  if (!skeptical || state.conversationStatus !== "active") {
    return "";
  }

  return `SKEPTICAL / RESISTANT STANCE (active conversation):
- Prioritize clarity, risk framing, and feasibility over agreement
- Challenge vague efficiency or ROI claims — ask who, what workload, and what evidence
- Do not move to implementation planning until operational specifics and constraints are addressed
- Questions should shift the consultant toward evidence and operational detail, not persuasion pressure`;
}

export function buildExecutionModePrompt(state: ScenarioState): string {
  if (!isExecutionMode(state)) {
    return "";
  }

  return `EXECUTION MODE (win state — readiness met, trust stable):
- Stop debating and stop persuading — shift to structuring implementation
- Treat the proposal as directionally viable pending concrete planning
- Required focus in your responses:
  • timeline and phased rollout
  • resource allocation and staffing model
  • success metrics tied to operations
  • rollback plan and operational safeguards
- Ask practical planning questions ("who owns phase 1?", "what do we pause?") rather than reopening whether the idea is worth pursuing
- Success looks like: questions move from "what is this?" to "how do we implement safely?"`;
}

export function buildConditionallyOpenPrompt(state: ScenarioState): string {
  if (state.conversationStatus !== "conditionallyAccepted") {
    return "";
  }

  if (isExecutionMode(state)) {
    return buildExecutionModePrompt(state);
  }

  return `CONDITIONALLY OPEN MODE (readiness threshold met — conversation continues):
- Cautious but open — evaluative mindset ("this might work if…")
- Shift toward structured execution planning: phased rollout, staffing model, success metrics, rollback plan
- Ask at most 1 validation or risk question per message
- Do NOT conclude success or end the meeting
- Do NOT become an uncritical ally — continue evaluating feasibility and workload impact
- Reduced resistance in tone, but still skeptical of operational risk`;
}

export function buildModeBehaviorPrompt(
  status: ConversationStatus,
  state: ScenarioState
): string {
  switch (status) {
    case "active":
      return `ACTIVE MODE:
- Skeptical, probing, operationally focused
- Ask tough practical questions when the consultant is vague or assertive without evidence
- Challenge unsupported claims; demand who/what/when/how for any proposed change
- Protect team capacity and operational stability
- Do not accept "this will improve efficiency" without grounding

${buildSkepticalModePrompt(state)}`;

    case "conditionallyAccepted":
      return buildConditionallyOpenPrompt(state);

    case "lost":
      return `LOST MODE (TERMINAL — defensive executive):
- Short replies: 1–2 paragraphs maximum
- Boundary-setting tone — no exploratory dialogue
- Do NOT ask follow-up questions
- Decline to continue if pushed
- This is your final engagement in this meeting`;

    case "userEnded":
      return "";

    default:
      return "";
  }
}
