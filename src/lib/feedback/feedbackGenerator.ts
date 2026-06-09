import { calculateCompetencyScores } from "./competencyScoring";
import {
  buildCompetencyFeedbacks,
  CompetencyFeedback,
} from "./competencyFeedbackBuilder";
import {
  generateCoachingFeedback,
  mapStateToSessionSummary,
  MessageTurn,
} from "./coachingFeedback";
import { blendCompetencyScores } from "./hacfCompetencies";
import { ExecutiveScores } from "./executiveScoring";
import { ConversationMetrics } from "./conversationMetrics";
import { buildSessionBehaviorProfile } from "./behaviorSignals";
import {
  buildOverallAssessment,
  mapSessionSummaryToOutcome,
  OutcomeLabel,
} from "./overallAssessment";
import { buildScenarioInsights } from "./scenarioContext";
import { OpeningScenario } from "../simulation/openingScenarioGenerator";
import { StakeholderProfile } from "../simulation/stakeholderIdentity";
import { Scenario, ScenarioState } from "../simulation/types";

export type { CompetencyFeedback };

export type FeedbackReport = {
  overallAssessment: string;
  outcome: OutcomeLabel;
  competencyFeedbacks: CompetencyFeedback[];
  strengths: string[];
  developmentAreas: string[];
  scenarioInsights: string[];
};

export type FeedbackSessionContext = {
  stakeholder: StakeholderProfile;
  openingScenario: OpeningScenario;
};

export function generateFeedbackReport(
  scenario: Scenario,
  finalState: ScenarioState,
  metrics: ConversationMetrics,
  turnScores: ExecutiveScores,
  transcript: MessageTurn[],
  initialState?: ScenarioState,
  sessionContext?: FeedbackSessionContext
): FeedbackReport {
  const sessionSummary = mapStateToSessionSummary({
    conversationStatus: finalState.conversationStatus,
    readinessScore: finalState.readinessScore,
    trust: finalState.trust,
    ruptureLevel: finalState.ruptureLevel,
    resistance: finalState.resistance,
    closureReason: finalState.closureReason,
  });
  const baseline = initialState ?? scenario.initialState;

  const sessionScores = calculateCompetencyScores(
    metrics.behaviorTurns,
    finalState,
    baseline
  );
  const blendedScores = blendCompetencyScores(turnScores, sessionScores, 0.4);

  const coaching = generateCoachingFeedback({
    sessionSummary,
    competencies: blendedScores,
    finalState: {
      trust: finalState.trust,
      resistance: finalState.resistance,
      frustration: finalState.frustration,
      ruptureLevel: finalState.ruptureLevel,
      readinessScore: finalState.readinessScore,
      psychologicalSafety: finalState.psychologicalSafety,
      perceivedRespect: finalState.perceivedRespect,
      conversationStatus: finalState.conversationStatus,
      closureReason: finalState.closureReason,
    },
    transcript,
    behaviorTurns: metrics.behaviorTurns,
  });

  const competencyFeedbacks = buildCompetencyFeedbacks(
    blendedScores,
    metrics,
    finalState,
    baseline
  );

  const outcome = mapSessionSummaryToOutcome(sessionSummary, finalState);
  const overallAssessment = buildOverallAssessment(
    outcome,
    sessionSummary,
    finalState
  );

  const profile = buildSessionBehaviorProfile(
    metrics.behaviorTurns,
    baseline,
    finalState
  );

  const scenarioInsights =
    sessionContext !== undefined
      ? buildScenarioInsights(
          sessionContext.stakeholder,
          sessionContext.openingScenario,
          finalState,
          profile,
          sessionSummary
        )
      : [
          "Alicia's main concern was whether the initiative would create more work for an already stretched team.",
          "Trust increased when you acknowledged capacity concerns directly.",
          "The conversation improved when you shifted from convincing to collaborating.",
        ];

  return {
    overallAssessment,
    outcome,
    competencyFeedbacks,
    strengths: coaching.strengths,
    developmentAreas: coaching.developmentAreas,
    scenarioInsights,
  };
}
