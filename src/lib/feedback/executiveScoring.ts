import {
  CompetencyScores,
  createInitialScores,
  interpretScore,
  calculateOverallScore,
} from "./hacfCompetencies";
import {
  TurnBehaviorSignals,
  updateScoresFromBehaviorSignals,
} from "./behaviorSignals";

export type ExecutiveScores = CompetencyScores;
export type ScoreLevel = ReturnType<typeof interpretScore>;

export { createInitialScores, interpretScore as interpretExecutiveScore, calculateOverallScore };

/** @deprecated Use TurnBehaviorSignals from behaviorSignals instead */
export type ExecutiveScoreState = {
  trust: number;
  resistance: number;
  ruptureLevel: number;
};

/**
 * Updates competency scores from behavioral inference signals for a single turn.
 * Keyword/phrase matching is intentionally not used.
 */
export function updateExecutiveScores(
  scores: CompetencyScores,
  signals: TurnBehaviorSignals
): CompetencyScores {
  return updateScoresFromBehaviorSignals(scores, signals);
}
