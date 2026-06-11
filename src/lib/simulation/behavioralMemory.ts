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
    negativeBehaviorStreak: clamp(trajectory.negativeBehaviorStreak, 0, 6),
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
    (analysis.tone.hasEscalationLanguage && next.ruptureLevel > 50) ||
    (analysis.tone.isHostile && next.ruptureLevel > 35) ||
    (analysis.tone.isBlameLanguage && next.ruptureLevel > 30);

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
    "BEHAVIORAL MEMORY (CRITICAL - you do NOT reset emotionally between messages):",
    "Your relationship trajectory persists. Past rupture permanently shapes how you interpret this conversation.",
  ];

  if (peakRupture >= 50 || skepticismBaseline >= 20) {
    lines.push(
      "- High rupture history: skepticism is now your DEFAULT stance, not a reaction",
      "- Even neutral statements may feel like pressure - interpret them cautiously",
      "- You are less willing to accept proposals, trust numeric claims, or engage in collaborative planning",
      "- Confidence claims ('I promise', 'just trust me', 'I'm confident') are treated as unreliable"
    );
  }

  if (skepticismBaseline >= 30) {
    lines.push(
      `- Skepticism baseline is elevated (${skepticismBaseline}/65) - stay guarded, state concerns, defer rather than interrogate`
    );
  }

  if (opennessPenalty >= 25) {
    lines.push(
      `- Openness penalty is active (${opennessPenalty}/55) - resist joint planning until trust is rebuilt`
    );
  }

  if (escalationMemoryTurns > 0) {
    lines.push(
      `- ESCALATION MEMORY ACTIVE (${escalationMemoryTurns} turn(s) remaining): sharply reduced openness after pressure language`,
      "- Do not soften quickly - the consultant must earn back credibility",
      "- Do NOT ask helpful coaching questions — challenge the communication pattern if it continues"
    );
  }

  if (state.relationshipTrajectory.negativeBehaviorStreak >= 1) {
    lines.push(
      `- RECENT DISRESPECT (${state.relationshipTrajectory.negativeBehaviorStreak} turn(s)): trust and respect are eroding`,
      "- Stop providing helpful coaching questions designed to move the proposal forward",
      "- Set boundaries, challenge the behavior, or express that the conversation is becoming difficult to engage with",
      '- Example lines: "I don\'t think we\'re having a productive conversation." / "If we\'re going to continue, we need to reset how we\'re approaching this."'
    );
  }

  if (state.trust >= 70) {
    lines.push(
      "- High trust: decide and co-design next steps — do not re-interrogate basics",
      "- Shift toward solution-oriented, collaborative responses"
    );
  } else if (state.trust < 45) {
    lines.push(
      "- Low trust: factual answers alone do not build trust — weight empathy, acknowledgment, and adaptation"
    );
  }

  return lines.join("\n");
}
