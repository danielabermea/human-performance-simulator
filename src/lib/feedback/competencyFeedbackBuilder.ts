import { ConversationMetrics } from "./conversationMetrics";
import {
  ALL_COMPETENCY_KEYS,
  BehavioralLevel,
  CompetencyKey,
  CompetencyScores,
  HACF_COMPETENCY_LABELS,
  isDevelopmentPerformanceLevel,
  isStrongPerformanceLevel,
  scoreToBehavioralLevel,
} from "./hacfCompetencies";
import {
  buildSessionBehaviorProfile,
  extractGroundedEvidence,
  KeyMoment,
  selectKeyMoment,
  SessionBehaviorProfile,
} from "./behaviorSignals";
import { ScenarioState } from "../simulation/types";

export type CompetencyFeedback = {
  key: CompetencyKey;
  name: string;
  level: BehavioralLevel;
  behavioralIndicators: string[];
  keyMoment: KeyMoment;
};

function alignLevelWithBehavior(
  competency: CompetencyKey,
  score: number,
  profile: SessionBehaviorProfile
): BehavioralLevel {
  const level = scoreToBehavioralLevel(score);
  const personalAttacks = profile.turns.filter((t) => t.hostileOrPersonalAttack).length;
  const dismissiveTurns = profile.turns.filter(
    (t) => t.dismissiveOrAggressive && !t.hostileOrPersonalAttack
  ).length;
  const escalations = profile.escalationUnderPressureCount;

  if (personalAttacks === 0 && dismissiveTurns === 0 && escalations === 0) {
    return level;
  }

  switch (competency) {
    case "emotionalIntelligence":
      if (personalAttacks >= 1) {
        return personalAttacks >= 2 ? "Emerging" : "Developing";
      }
      if (dismissiveTurns >= 1) {
        return dismissiveTurns >= 2 ? "Developing" : "Competent";
      }
      if (escalations >= 2 && isStrongPerformanceLevel(level)) {
        return "Competent";
      }
      break;
    case "relationshipIntelligence":
    case "humanCenteredDecisionMaking":
      if (personalAttacks >= 1 && isStrongPerformanceLevel(level)) {
        return personalAttacks >= 2 ? "Developing" : "Competent";
      }
      if (personalAttacks >= 2) {
        return "Developing";
      }
      if (dismissiveTurns >= 2 && isStrongPerformanceLevel(level)) {
        return "Competent";
      }
      break;
    case "criticalThinkingDiscernment":
      if (profile.vagueUnderChallengeCount >= 2 && isStrongPerformanceLevel(level)) {
        return "Competent";
      }
      break;
    case "adaptabilityLearningAgility":
      if (
        profile.reframingCount === 0 &&
        escalations >= 1 &&
        isStrongPerformanceLevel(level)
      ) {
        return "Competent";
      }
      break;
  }

  return level;
}

function buildSingleCompetencyFeedback(
  competency: CompetencyKey,
  score: number,
  metrics: ConversationMetrics,
  finalState: ScenarioState,
  initialState: ScenarioState
): CompetencyFeedback {
  const profile = buildSessionBehaviorProfile(
    metrics.behaviorTurns,
    initialState,
    finalState
  );
  const level = alignLevelWithBehavior(competency, score, profile);

  const evidenceBullets = extractGroundedEvidence(profile, competency, level);
  let behavioralIndicators = evidenceBullets.map((b) => b.text);

  if (behavioralIndicators.length < 2) {
    const fallback = isDevelopmentPerformanceLevel(level)
      ? "This area reflects missed opportunities to keep the conversation constructive under pressure."
      : isStrongPerformanceLevel(level)
        ? "Your approach showed effective patterns in how you handled stakeholder pushback."
        : "Communication patterns across the conversation informed this assessment.";
    behavioralIndicators = [...behavioralIndicators, fallback].slice(0, 3);
  }

  const keyMoment = selectKeyMoment(profile, competency, level, evidenceBullets);

  return {
    key: competency,
    name: HACF_COMPETENCY_LABELS[competency],
    level,
    behavioralIndicators: behavioralIndicators.slice(0, 3),
    keyMoment,
  };
}

export function buildCompetencyFeedbacks(
  scores: CompetencyScores,
  metrics: ConversationMetrics,
  finalState: ScenarioState,
  initialState: ScenarioState
): CompetencyFeedback[] {
  return ALL_COMPETENCY_KEYS.map((key) =>
    buildSingleCompetencyFeedback(key, scores[key], metrics, finalState, initialState)
  );
}

/** @deprecated Use CompetencyFeedback.behavioralIndicators */
export type BehavioralEvidenceItem = {
  turnIndex: number;
  quote: string;
  observation: string;
  stakeholderEffect: string;
};
