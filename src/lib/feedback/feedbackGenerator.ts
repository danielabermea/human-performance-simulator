import { CompetencyScores } from "./competencyScoring";
import {
  CoachingFeedback,
  formatOutcomeLabel,
  generateCoachingFeedback,
  mapStateToConversationOutcome,
  MessageTurn,
} from "./coachingFeedback";
import {
  calculateOverallScore,
  ExecutiveScores,
  interpretExecutiveScore,
} from "./executiveScoring";
import { ConversationMetrics } from "./conversationMetrics";
import { ConversationStatus, Scenario, ScenarioState } from "../simulation/types";

export type OutcomeLabel = "Lost" | "Conditionally Accepted" | "Session Ended" | "Won";
export type RelationshipOutcome = "Strong" | "Neutral" | "Damaged";
export type InfluenceOutcome = "High" | "Moderate" | "Low";
export type ConfidenceLevel = "High" | "Moderate" | "Low";

export type FinalStateSnapshot = {
  conversationStatus: ConversationStatus;
  trust: number;
  resistance: number;
  goalProgress: number;
  ruptureLevel: number;
  readinessScore: number;
  argumentFatigue: number;
  psychologicalSafety: number;
  perceivedRespect: number;
};

export type KeyMoment = CoachingFeedback["keyMoments"][number];

export type FeedbackReport = {
  outcome: OutcomeLabel;
  readinessScore: number;
  finalState: FinalStateSnapshot;
  relationshipOutcome: RelationshipOutcome;
  influenceOutcome: InfluenceOutcome;
  confidence: ConfidenceLevel;
  overallScore: number;
  overallLevel: ReturnType<typeof interpretExecutiveScore>;
  competencies: CompetencyScores;
  strengths: string[];
  developmentAreas: string[];
  scenarioInsights: string[];
  keyMoments: KeyMoment[];
};

function buildFinalStateSnapshot(state: ScenarioState): FinalStateSnapshot {
  return {
    conversationStatus: state.conversationStatus,
    trust: state.trust,
    resistance: state.resistance,
    goalProgress: state.goalProgress,
    ruptureLevel: state.ruptureLevel,
    readinessScore: state.readinessScore,
    argumentFatigue: state.argumentFatigue,
    psychologicalSafety: state.psychologicalSafety,
    perceivedRespect: state.perceivedRespect,
  };
}

function mapRelationshipQuality(
  quality: CoachingFeedback["relationshipQuality"]
): RelationshipOutcome {
  if (quality === "Weak") return "Damaged";
  if (quality === "Moderate") return "Neutral";
  return "Strong";
}

function mapInfluenceLevel(
  level: CoachingFeedback["influenceLevel"]
): InfluenceOutcome {
  if (level === "High") return "High";
  if (level === "Medium") return "Moderate";
  return "Low";
}

function mapConfidenceLevel(
  level: CoachingFeedback["confidenceLevel"]
): ConfidenceLevel {
  if (level === "High") return "High";
  if (level === "Medium") return "Moderate";
  return "Low";
}

function generateScenarioInsights(
  scenario: Scenario,
  metrics: ConversationMetrics,
  state: ScenarioState
): string[] {
  const insights: string[] = [];

  switch (scenario.hiddenMotivation) {
    case "team_capacity":
      if (metrics.hiddenMotivationAddressedCount >= 2) {
        insights.push(
          "You successfully identified and addressed the leader's underlying concern about team capacity—headcount, bandwidth, and burnout risk were central to earning movement."
        );
      } else if (metrics.hiddenMotivationAddressedCount === 1) {
        insights.push(
          "You touched on workload concerns but did not consistently anchor your proposal in realistic staffing and implementation burden."
        );
      } else {
        insights.push(
          "The operations leader's primary unstated concern was team capacity. Future conversations should lead with how the initiative fits existing workload, phasing, and coverage."
        );
      }
      break;
    default:
      break;
  }

  if (state.conversationStatus === "lost") {
    insights.push(
      "The relationship ruptured before influence could build. Prioritize repair and constraint acknowledgment before re-proposing the initiative."
    );
  }

  return insights.slice(0, 2);
}

export function generateFeedbackReport(
  scenario: Scenario,
  finalState: ScenarioState,
  metrics: ConversationMetrics,
  executiveScores: ExecutiveScores,
  transcript: MessageTurn[]
): FeedbackReport {
  const outcome = mapStateToConversationOutcome(finalState);

  const coaching = generateCoachingFeedback({
    outcome,
    executiveScores,
    finalState: {
      trust: finalState.trust,
      resistance: finalState.resistance,
      frustration: finalState.frustration,
      ruptureLevel: finalState.ruptureLevel,
      readinessScore: finalState.readinessScore,
    },
    transcript,
  });

  const competencies: CompetencyScores = { ...coaching.competencies };
  const overallScore = calculateOverallScore(executiveScores);
  const overallLevel = interpretExecutiveScore(overallScore);

  let strengths = [...coaching.strengths];
  if (strengths.length < 2) {
    strengths.push(
      "Maintained professional tone throughout a challenging stakeholder conversation."
    );
  }
  strengths = strengths.slice(0, 5);

  let developmentAreas = [...coaching.developmentAreas];
  if (developmentAreas.length === 0) {
    developmentAreas.push(
      "Continue refining how you translate operational empathy into concrete implementation plans."
    );
  }
  developmentAreas = developmentAreas.slice(0, 5);

  const scenarioInsights = [
    ...coaching.scenarioInsights,
    ...generateScenarioInsights(scenario, metrics, finalState),
  ].slice(0, 4);

  return {
    outcome: formatOutcomeLabel(outcome) as OutcomeLabel,
    readinessScore: finalState.readinessScore,
    finalState: buildFinalStateSnapshot(finalState),
    relationshipOutcome: mapRelationshipQuality(coaching.relationshipQuality),
    influenceOutcome: mapInfluenceLevel(coaching.influenceLevel),
    confidence: mapConfidenceLevel(coaching.confidenceLevel),
    overallScore,
    overallLevel,
    competencies,
    strengths,
    developmentAreas,
    scenarioInsights,
    keyMoments: coaching.keyMoments.slice(0, 8),
  };
}
