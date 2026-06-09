import {
  SessionBehaviorProfile,
  calculateBehavioralCompetencyScores,
  buildSessionBehaviorProfile,
  TurnBehaviorSignals,
} from "./behaviorSignals";
import { CompetencyScores } from "./hacfCompetencies";
import { ScenarioState } from "../simulation/types";

export function calculateCompetencyScores(
  behaviorTurns: TurnBehaviorSignals[],
  finalState: ScenarioState,
  initialState: ScenarioState
): CompetencyScores {
  const profile = buildSessionBehaviorProfile(
    behaviorTurns,
    initialState,
    finalState
  );
  return calculateBehavioralCompetencyScores(profile, finalState, initialState);
}

export type { SessionBehaviorProfile };
