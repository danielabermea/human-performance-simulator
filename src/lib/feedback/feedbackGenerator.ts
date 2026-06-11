import {
  buildStrengthenConversation,
  buildWhatWorked,
  buildGrowthOpportunity,
  CoachingSuggestion,
  GrowthOpportunity,
} from "./coachingPoints";
import { buildBiggestStrength, SkillHighlight } from "./skillHighlights";
import { MessageTurn } from "./coachingFeedback";
import { ExecutiveScores } from "./executiveScoring";
import { ConversationMetrics } from "./conversationMetrics";
import { buildSessionBehaviorProfile } from "./behaviorSignals";
import {
  assessFeedbackEvidence,
  buildLowConfidenceNote,
  AssessmentConfidence,
} from "./assessmentEvidence";
import { OpeningScenario } from "../simulation/openingScenarioGenerator";
import { StakeholderProfile } from "../simulation/stakeholderIdentity";
import { Scenario, ScenarioState } from "../simulation/types";

export type { AssessmentConfidence, CoachingSuggestion, SkillHighlight, GrowthOpportunity };

export type FeedbackReport = {
  assessmentConfidence: AssessmentConfidence;
  coachingAvailable: boolean;
  confidenceNote?: string;
  whatWorked: string[];
  strengthenConversation: CoachingSuggestion[];
  biggestStrength: SkillHighlight | null;
  growthOpportunity: GrowthOpportunity | null;
};

function buildInsufficientEvidenceReport(): FeedbackReport {
  return {
    assessmentConfidence: "none",
    coachingAvailable: false,
    whatWorked: [],
    strengthenConversation: [],
    biggestStrength: null,
    growthOpportunity: null,
  };
}

export type FeedbackSessionContext = {
  stakeholder: StakeholderProfile;
  openingScenario: OpeningScenario;
};

function stakeholderFirstName(stakeholder: StakeholderProfile): string {
  return stakeholder.fullName.split(/\s+/)[0] ?? stakeholder.fullName;
}

export function generateFeedbackReport(
  scenario: Scenario,
  finalState: ScenarioState,
  metrics: ConversationMetrics,
  _turnScores: ExecutiveScores,
  transcript: MessageTurn[],
  initialState?: ScenarioState,
  sessionContext?: FeedbackSessionContext
): FeedbackReport {
  const evidence = assessFeedbackEvidence(transcript);

  if (evidence.userMessageCount === 0) {
    return buildInsufficientEvidenceReport();
  }

  const baseline = initialState ?? scenario.initialState;
  const name = sessionContext
    ? stakeholderFirstName(sessionContext.stakeholder)
    : "the stakeholder";

  const profile = buildSessionBehaviorProfile(
    metrics.behaviorTurns,
    baseline,
    finalState
  );

  const whatWorked = buildWhatWorked(profile, finalState);
  const strengthenConversation = buildStrengthenConversation(
    profile,
    finalState,
    name
  );

  const excludeTryInstead = strengthenConversation.map((s) => s.suggestedAlternative);

  return {
    assessmentConfidence: evidence.confidence,
    coachingAvailable: true,
    confidenceNote:
      evidence.confidence === "low" ? buildLowConfidenceNote(evidence) : undefined,
    whatWorked,
    strengthenConversation,
    biggestStrength: buildBiggestStrength(profile, finalState, name),
    growthOpportunity: buildGrowthOpportunity(
      profile,
      finalState,
      name,
      excludeTryInstead
    ),
  };
}
