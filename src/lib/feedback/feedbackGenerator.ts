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
import {
  assessFeedbackEvidence,
  buildLowConfidenceNote,
  AssessmentConfidence,
  INSUFFICIENT_EVIDENCE_ASSESSMENT,
} from "./assessmentEvidence";
import { OpeningScenario } from "../simulation/openingScenarioGenerator";
import { ALICIA_MORGAN, StakeholderProfile } from "../simulation/stakeholderIdentity";
import { Scenario, ScenarioState } from "../simulation/types";

export type { CompetencyFeedback, AssessmentConfidence };

export type FeedbackReport = {
  overallAssessment: string;
  outcome: OutcomeLabel | null;
  assessmentConfidence: AssessmentConfidence;
  confidenceNote?: string;
  competencyFeedbacks: CompetencyFeedback[];
  strengths: string[];
  developmentAreas: string[];
  scenarioInsights: string[];
};

function buildInsufficientEvidenceReport(): FeedbackReport {
  return {
    overallAssessment: INSUFFICIENT_EVIDENCE_ASSESSMENT,
    outcome: null,
    assessmentConfidence: "none",
    competencyFeedbacks: [],
    strengths: [],
    developmentAreas: [],
    scenarioInsights: [],
  };
}

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
  const evidence = assessFeedbackEvidence(transcript);

  if (evidence.confidence === "none") {
    return buildInsufficientEvidenceReport();
  }

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

  const scenarioInsights = buildScenarioInsights(
    sessionContext?.stakeholder ?? ALICIA_MORGAN,
    finalState,
    profile,
    sessionSummary,
    transcript
  );

  return {
    overallAssessment,
    outcome,
    assessmentConfidence: evidence.confidence,
    confidenceNote:
      evidence.confidence === "low" ? buildLowConfidenceNote(evidence) : undefined,
    competencyFeedbacks,
    strengths: coaching.strengths,
    developmentAreas: coaching.developmentAreas,
    scenarioInsights,
  };
}
