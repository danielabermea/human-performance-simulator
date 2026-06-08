import { ScenarioState } from "./types";

/** Minimum readiness score to enter conditionallyAccepted */
export const READINESS_THRESHOLD = 65;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateReadinessScore(state: ScenarioState): number {
  return clamp(
    0.35 * state.trust +
      0.25 * state.psychologicalSafety +
      0.15 * state.perceivedRespect +
      0.1 * (100 - state.resistance) +
      0.1 * (100 - state.ruptureLevel) -
      0.05 * state.cognitiveLoad
  );
}

export function isReadinessForConditionalAcceptance(state: ScenarioState): boolean {
  return state.readinessScore >= READINESS_THRESHOLD;
}
