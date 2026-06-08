import { isExecutionMode } from "./executiveRealism";
import { MessageAnalysis, RelationshipTrajectory, ScenarioState } from "./types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function clampTrajectory(trajectory: RelationshipTrajectory): RelationshipTrajectory {
  return {
    skepticismBaseline: clamp(trajectory.skepticismBaseline, 0, 65),
    opennessPenalty: clamp(trajectory.opennessPenalty, 0, 55),
    peakRupture: clamp(trajectory.peakRupture, 0, 100),
    escalationMemoryTurns: clamp(trajectory.escalationMemoryTurns, 0, 2),
  };
}

/** How much positive content is dampened by accumulated skepticism */
export function evidenceTrustMultiplier(state: ScenarioState): number {
  const { skepticismBaseline, opennessPenalty, escalationMemoryTurns } =
    state.relationshipTrajectory;

  let multiplier = 1;

  if (state.trust >= 70) multiplier *= 1.35;
  else if (state.trust >= 55) multiplier *= 1.15;
  else if (state.trust < 40) multiplier *= 0.85;

  if (skepticismBaseline >= 40) multiplier *= 0.55;
  else if (skepticismBaseline >= 25) multiplier *= 0.75;

  if (opennessPenalty >= 30) multiplier *= 0.7;
  if (escalationMemoryTurns > 0) multiplier *= 0.5;

  if (state.ruptureLevel > 60) multiplier *= 0.65;

  return multiplier;
}

/** How much goal/collaboration gains are dampened */
export function collaborationMultiplier(state: ScenarioState): number {
  const { opennessPenalty, escalationMemoryTurns } = state.relationshipTrajectory;

  let multiplier = 1;

  if (state.trust >= 70) multiplier *= 1.25;
  if (opennessPenalty >= 20) multiplier *= 0.75;
  if (opennessPenalty >= 35) multiplier *= 0.55;
  if (escalationMemoryTurns > 0) multiplier *= 0.45;
  if (state.ruptureLevel > 55) multiplier *= 0.7;

  return multiplier;
}

function applyPeakRuptureMemory(
  state: ScenarioState,
  previousPeak: number
): ScenarioState {
  const next = { ...state, relationshipTrajectory: { ...state.relationshipTrajectory } };
  const trajectory = next.relationshipTrajectory;

  trajectory.peakRupture = Math.max(trajectory.peakRupture, next.ruptureLevel);

  if (trajectory.peakRupture >= 50 && previousPeak < 50) {
    trajectory.skepticismBaseline += 8;
    trajectory.opennessPenalty += 10;
  }

  if (trajectory.peakRupture >= 70 && previousPeak < 70) {
    trajectory.skepticismBaseline += 12;
    trajectory.opennessPenalty += 15;
  }

  if (next.ruptureLevel > 55) {
    trajectory.skepticismBaseline += 1;
    trajectory.opennessPenalty += 1;
  }

  next.relationshipTrajectory = clampTrajectory(trajectory);
  return next;
}

function applyEscalationMemoryTrigger(
  state: ScenarioState,
  analysis: MessageAnalysis
): ScenarioState {
  const next = { ...state, relationshipTrajectory: { ...state.relationshipTrajectory } };

  const triggered =
    analysis.tone.hasEscalationLanguage && next.ruptureLevel > 50;

  if (!triggered) return next;

  next.relationshipTrajectory.escalationMemoryTurns = Math.max(
    next.relationshipTrajectory.escalationMemoryTurns,
    2
  );
  next.resistance += 14;
  next.trust -= 12;
  next.frustration += 8;
  next.relationshipTrajectory.skepticismBaseline += 4;
  next.relationshipTrajectory.opennessPenalty += 10;

  next.relationshipTrajectory = clampTrajectory(next.relationshipTrajectory);
  return next;
}

function applyActiveEscalationMemory(state: ScenarioState): ScenarioState {
  if (state.relationshipTrajectory.escalationMemoryTurns <= 0) return state;

  const next = { ...state, relationshipTrajectory: { ...state.relationshipTrajectory } };

  next.resistance += 6;
  next.trust -= 5;
  next.goalProgress -= 4;

  next.relationshipTrajectory.escalationMemoryTurns -= 1;
  next.relationshipTrajectory = clampTrajectory(next.relationshipTrajectory);

  return next;
}

export function applyBehavioralMemory(
  state: ScenarioState,
  analysis: MessageAnalysis
): ScenarioState {
  const previousPeak = state.relationshipTrajectory.peakRupture;

  let next = applyActiveEscalationMemory(state);
  next = applyEscalationMemoryTrigger(next, analysis);
  next = applyPeakRuptureMemory(next, previousPeak);

  return next;
}

export function buildBehavioralMemoryPrompt(state: ScenarioState): string {
  const { skepticismBaseline, opennessPenalty, peakRupture, escalationMemoryTurns } =
    state.relationshipTrajectory;

  const lines: string[] = [
    "BEHAVIORAL MEMORY (CRITICAL — you do NOT reset emotionally between messages):",
    "Your relationship trajectory persists. Past rupture permanently shapes how you interpret this conversation.",
  ];

  if (peakRupture >= 50 || skepticismBaseline >= 20) {
    lines.push(
      "- High rupture history: skepticism is now your DEFAULT stance, not a reaction",
      "- Even neutral statements may feel like pressure — interpret them cautiously",
      "- You are less willing to accept proposals, trust numeric claims, or engage in collaborative planning",
      "- Confidence claims ('I promise', 'just trust me', 'I'm confident') are treated as unreliable"
    );
  }

  if (skepticismBaseline >= 30) {
    lines.push(
      `- Skepticism baseline is elevated (${skepticismBaseline}/65) — demand proof before moving forward`
    );
  }

  if (opennessPenalty >= 25) {
    lines.push(
      `- Openness penalty is active (${opennessPenalty}/55) — resist joint planning until trust is rebuilt`
    );
  }

  if (escalationMemoryTurns > 0) {
    lines.push(
      `- ESCALATION MEMORY ACTIVE (${escalationMemoryTurns} turn(s) remaining): sharply reduced openness after pressure language`,
      "- Do not soften quickly — the consultant must earn back credibility"
    );
  }

  if (state.trust >= 70) {
    lines.push(
      "- High trust: claims are more readily accepted as plausible",
      "- Fewer demands for evidence before engaging",
      "- Shift toward solution-oriented, collaborative responses"
    );
  } else if (state.trust < 45) {
    lines.push(
      "- Low trust: treat all claims as unverified until substantiated"
    );
  }

  return lines.join("\n");
}

export function buildDecisionShiftPrompt(state: ScenarioState): string {
  if (isExecutionMode(state)) {
    return `DECISION MODE — EXECUTION PLANNING (conditionally open, trust stable):
- Collaborate on how to implement safely — not whether the idea has merit
- Focus on phasing, staffing, metrics, rollback, and what gets deprioritized
- Ask planning questions; avoid reopening fundamental skepticism unless new risk appears`;
  }

  const trust = state.trust;

  if (trust < 45) {
    return `DECISION MODE — EVIDENCE FIRST (low trust):
- Prioritize proof, data, and sources before evaluating the proposal
- Challenge unsupported numbers and vague ROI claims
- Do not discuss implementation details until credibility is established`;
  }

  if (trust < 70) {
    return `DECISION MODE — FEASIBILITY EVALUATION (medium trust):
- Accept that some claims may be directionally valid — focus on operational feasibility
- Evaluate staffing, timeline, risk, and disruption to current operations
- Ask whether this can actually run alongside existing workload`;
  }

  return `DECISION MODE — OPTIMIZATION (high trust):
- Engage collaboratively on how to make the initiative work
- Focus on refining approach, phasing, and success criteria
- Less interrogation of basic claims — more joint problem-solving`;
}
