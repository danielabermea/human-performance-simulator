import { ConversationMetrics } from "./conversationMetrics";
import {
  ALL_COMPETENCY_KEYS,
  BehavioralLevel,
  CompetencyKey,
  CompetencyScores,
  HACF_COMPETENCY_LABELS,
  scoreToBehavioralLevel,
} from "./hacfCompetencies";
import {
  buildSessionBehaviorProfile,
  SessionBehaviorProfile,
  TurnBehaviorSignals,
} from "./behaviorSignals";
import { ScenarioState } from "../simulation/types";

export type CompetencyFeedback = {
  key: CompetencyKey;
  name: string;
  level: BehavioralLevel;
  assessmentInfluencers: string[];
};

function countCompetencySignals(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey
): { positive: number; negative: number } {
  let positive = 0;
  let negative = 0;

  for (const turn of profile.turns) {
    for (const label of collectShortLabelsForTurn(turn, competency, "positive")) {
      void label;
      positive += 1;
    }
    for (const label of collectShortLabelsForTurn(turn, competency, "negative")) {
      void label;
      negative += 1;
    }
  }

  return { positive, negative };
}

function collectShortLabelsForTurn(
  turn: TurnBehaviorSignals,
  competency: CompetencyKey,
  polarity: "positive" | "negative"
): string[] {
  const labels: string[] = [];

  if (competency === "emotionalIntelligence") {
    if (polarity === "positive") {
      if (turn.maintainedComposureUnderPressure) {
        labels.push("Stayed composed under pressure");
      }
      if (turn.recoveredAfterChallenge) {
        labels.push("Recovered constructively after challenge");
      }
    } else {
      if (turn.hostileOrPersonalAttack) labels.push("Used hostile language");
      if (turn.dismissiveOrAggressive) labels.push("Used dismissive language");
      if (turn.escalatedUnderPressure) labels.push("Escalated tone under pushback");
    }
  }

  if (competency === "relationshipIntelligence") {
    if (polarity === "positive") {
      if (turn.perspectiveEngagement) {
        labels.push("Engaged stakeholder perspective");
      }
      if (turn.stakeholderFirstReasoning || turn.acknowledgedStakeholderConcerns) {
        labels.push("Acknowledged workload concerns");
      }
      if (turn.invitedDialogue && turn.facedHighResistance) {
        labels.push("Invited dialogue during resistance");
      }
    } else {
      if (turn.hostileOrPersonalAttack) labels.push("Strained the relationship");
      if (turn.dismissiveOrAggressive) labels.push("Used pressuring language");
      if (turn.passiveOrNonDirective) labels.push("Left concerns unaddressed");
      if (turn.trustDelta <= -4) labels.push("Reduced stakeholder trust");
    }
  }

  if (competency === "criticalThinkingDiscernment") {
    if (polarity === "positive") {
      if (turn.reasonedUnderUncertainty) {
        labels.push("Reasoned under uncertainty");
      }
      if (turn.substantiveEngagement) {
        labels.push("Responded with specific detail");
      }
    } else {
      if (turn.remainedVagueUnderChallenge) {
        labels.push("Stayed vague when pressed for specifics");
      }
      if (turn.prematureSolutioning) {
        labels.push("Moved to solutions before concerns were understood");
      }
    }
  }

  if (competency === "adaptabilityLearningAgility") {
    if (polarity === "positive") {
      if (turn.reframedAfterPushback) {
        labels.push("Adjusted approach after pushback");
      }
    } else {
      if (turn.repeatedWithoutAdaptation) {
        labels.push("Repeated the same strategy despite concerns");
      } else if (
        turn.facedHighResistance &&
        !turn.reframedAfterPushback &&
        !turn.perspectiveEngagement
      ) {
        labels.push("Did not adapt when resistance appeared");
      }
      if (turn.passiveOrNonDirective) {
        labels.push("Did not adapt toward a decision");
      }
    }
  }

  if (competency === "humanCenteredDecisionMaking") {
    if (polarity === "positive") {
      if (turn.stakeholderFirstReasoning) {
        labels.push("Centered stakeholder constraints");
      }
      if (turn.safetyDelta >= 3) labels.push("Improved psychological safety");
    } else {
      if (turn.hostileOrPersonalAttack || turn.dismissiveOrAggressive) {
        labels.push("Overlooked people impact");
      }
      if (turn.prematureSolutioning) {
        labels.push("Advanced proposal before concerns were understood");
      }
      if (turn.passiveOrNonDirective) {
        labels.push("Did not address stakeholder impact");
      }
    }
  }

  return labels;
}

function splitTurns(turns: TurnBehaviorSignals[]): {
  early: TurnBehaviorSignals[];
  late: TurnBehaviorSignals[];
} {
  if (turns.length <= 1) {
    return { early: turns, late: [] };
  }
  const mid = Math.ceil(turns.length / 2);
  return { early: turns.slice(0, mid), late: turns.slice(mid) };
}

function conversationEndedInDisengagement(
  finalState: ScenarioState,
  profile: SessionBehaviorProfile
): boolean {
  return (
    finalState.conversationStatus === "lost" ||
    (finalState.trust < 50 && finalState.ruptureLevel >= 55) ||
    (finalState.conversationStatus === "userEnded" && finalState.readinessScore < 50) ||
    (profile.trustDelta <= -8 && finalState.ruptureLevel >= 50)
  );
}

function conversationEndedProductively(finalState: ScenarioState): boolean {
  return (
    finalState.conversationStatus === "concluded" ||
    finalState.conversationStatus === "conclusion" ||
    finalState.conversationStatus === "conditionallyAccepted" ||
    finalState.conversationStatus === "conditionallyAcceptedWin"
  );
}

function alignLevelWithBehavior(
  competency: CompetencyKey,
  score: number,
  profile: SessionBehaviorProfile,
  signalCount: number
): BehavioralLevel {
  let level = scoreToBehavioralLevel(score);

  if (signalCount < 1) {
    return "Not Yet Observed";
  }

  if (signalCount < 2 && level === "Demonstrated") {
    level = "Developing";
  }

  const personalAttacks = profile.turns.filter((t) => t.hostileOrPersonalAttack).length;
  const dismissiveTurns = profile.turns.filter(
    (t) => t.dismissiveOrAggressive && !t.hostileOrPersonalAttack
  ).length;

  if (
    (competency === "emotionalIntelligence" ||
      competency === "relationshipIntelligence" ||
      competency === "humanCenteredDecisionMaking") &&
    personalAttacks >= 1 &&
    level === "Demonstrated"
  ) {
    level = "Developing";
  }

  if (
    (competency === "relationshipIntelligence" ||
      competency === "humanCenteredDecisionMaking") &&
    dismissiveTurns >= 2 &&
    level === "Demonstrated"
  ) {
    level = "Developing";
  }

  if (
    competency === "adaptabilityLearningAgility" &&
    profile.reframingCount === 0 &&
    profile.escalationUnderPressureCount >= 1 &&
    level === "Demonstrated"
  ) {
    level = "Developing";
  }

  return level;
}

function buildRelationshipInfluencers(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState
): string[] {
  const influencers: string[] = [];
  const { early, late } = splitTurns(profile.turns);

  const earlyEngagement = early.some(
    (t) =>
      t.stakeholderFirstReasoning ||
      t.acknowledgedStakeholderConcerns ||
      t.perspectiveEngagement
  );
  const lateDismissals = late.filter(
    (t) => t.dismissiveOrAggressive || t.hostileOrPersonalAttack
  ).length;
  const trustErosionTurns = profile.turns.filter((t) => t.trustDelta <= -4).length;
  const sustainedEngagement =
    profile.perspectiveEngagementCount >= 2 && profile.trustDelta > 0;

  if (earlyEngagement && lateDismissals >= 1) {
    influencers.push("You acknowledged stakeholder concerns early in the conversation.");
    influencers.push(
      "Several later responses dismissed or minimized the stakeholder's concerns."
    );
  } else if (earlyEngagement && conversationEndedInDisengagement(finalState, profile)) {
    influencers.push("You acknowledged stakeholder concerns early in the conversation.");
  } else if (sustainedEngagement) {
    influencers.push(
      "You consistently engaged the stakeholder's perspective, and trust improved across the conversation."
    );
  } else if (lateDismissals >= 2) {
    influencers.push(
      "Multiple responses used dismissive or pressuring language throughout the conversation."
    );
  } else if (trustErosionTurns >= 2) {
    influencers.push("Trust eroded across several exchanges rather than recovering.");
  } else if (
    (profile.stakeholderFirstCount >= 1 || profile.acknowledgedConcernsCount >= 1) &&
    profile.perspectiveEngagementCount === 0
  ) {
    influencers.push(
      "You acknowledged constraints at points, but did not sustain perspective-taking as resistance grew."
    );
  }

  if (
    conversationEndedInDisengagement(finalState, profile) &&
    (earlyEngagement || profile.perspectiveEngagementCount >= 1)
  ) {
    influencers.push(
      "The conversation shifted from collaboration toward conflict and ultimately ended in disengagement."
    );
  } else if (
    conversationEndedInDisengagement(finalState, profile) &&
    influencers.length === 0
  ) {
    influencers.push(
      "The conversation ended with the stakeholder disengaged and relationship strain elevated."
    );
  } else if (
    conversationEndedProductively(finalState) &&
    profile.trustDelta > 5 &&
    influencers.length === 0
  ) {
    influencers.push(
      "Relationship cues — listening, acknowledgment, and repair — supported a productive close."
    );
  }

  return influencers;
}

function buildEmotionalInfluenceInfluencers(profile: SessionBehaviorProfile): string[] {
  const influencers: string[] = [];
  const { early, late } = splitTurns(profile.turns);

  const earlyComposure = early.filter((t) => t.maintainedComposureUnderPressure).length;
  const lateEscalation = late.filter(
    (t) => t.escalatedUnderPressure || t.dismissiveOrAggressive
  ).length;
  const hostileTurns = profile.turns.filter((t) => t.hostileOrPersonalAttack).length;
  const sustainedComposure =
    profile.composureUnderPressureCount >= 2 &&
    profile.escalationUnderPressureCount === 0;

  if (earlyComposure >= 1 && lateEscalation >= 1) {
    influencers.push("You remained composed early on, but tone escalated in later exchanges.");
  } else if (sustainedComposure) {
    influencers.push("You regulated tone and stayed composed during sustained pushback.");
  } else if (profile.escalationUnderPressureCount >= 2) {
    influencers.push("Tone escalated during multiple exchanges when the stakeholder pushed back.");
  } else if (hostileTurns >= 1) {
    influencers.push(
      "Hostile or personal language disrupted emotional regulation during the conversation."
    );
  } else if (profile.recoveryCount >= 1 && profile.escalationUnderPressureCount >= 1) {
    influencers.push(
      "You recovered after tense moments, though escalation still recurred later in the conversation."
    );
  }

  return influencers;
}

function buildCriticalThinkingInfluencers(profile: SessionBehaviorProfile): string[] {
  const influencers: string[] = [];

  if (
    profile.substantiveEngagementCount >= 2 &&
    profile.vagueUnderChallengeCount === 0
  ) {
    influencers.push(
      "You consistently responded with specific detail when operational questions were raised."
    );
  } else if (
    profile.vagueUnderChallengeCount >= 2 &&
    profile.substantiveEngagementCount < profile.vagueUnderChallengeCount
  ) {
    influencers.push(
      "Several responses stayed general when the stakeholder pressed for concrete information."
    );
  } else if (profile.reasonedJudgmentCount >= 2) {
    influencers.push(
      "You reasoned through trade-offs substantively while uncertainty and pushback were present."
    );
  }

  const prematureSolutioning = profile.turns.filter((t) => t.prematureSolutioning).length;
  if (prematureSolutioning >= 2) {
    influencers.push(
      "You moved toward solutions repeatedly before stakeholder concerns were fully understood."
    );
  } else if (
    profile.substantiveEngagementCount >= 1 &&
    profile.vagueUnderChallengeCount >= 1
  ) {
    influencers.push(
      "Your reasoning mixed substantive responses with stretches where detail was still needed."
    );
  }

  return influencers;
}

function buildAdaptabilityInfluencers(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState
): string[] {
  const influencers: string[] = [];
  const highResistanceTurns = profile.turns.filter((t) => t.facedHighResistance).length;

  if (profile.reframingCount >= 2) {
    influencers.push("You adjusted framing multiple times in response to stakeholder pushback.");
  } else if (profile.reframingCount === 1 && highResistanceTurns >= 2) {
    influencers.push(
      "You adapted once after pushback, but did not continue adjusting as resistance persisted."
    );
  } else if (
    highResistanceTurns >= 2 &&
    profile.reframingCount === 0 &&
    profile.perspectiveEngagementCount === 0
  ) {
    influencers.push(
      "You repeated a similar approach despite sustained resistance and did not reframe your case."
    );
  }

  if (
    conversationEndedProductively(finalState) &&
    profile.reframingCount >= 1 &&
    influencers.length === 0
  ) {
    influencers.push("Adjustments after pushback helped keep the conversation moving forward.");
  }

  return influencers;
}

function buildHumanCenteredInfluencers(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState
): string[] {
  const influencers: string[] = [];
  const { early, late } = splitTurns(profile.turns);

  const earlyStakeholderCentered = early.some((t) => t.stakeholderFirstReasoning);
  const latePeopleImpactMissed = late.filter(
    (t) =>
      t.hostileOrPersonalAttack ||
      t.dismissiveOrAggressive ||
      t.passiveOrNonDirective
  ).length;

  if (earlyStakeholderCentered && latePeopleImpactMissed >= 1) {
    influencers.push("You centered stakeholder constraints early in the conversation.");
    influencers.push(
      "Later responses overlooked people impact — through dismissive tone, passivity, or pressure."
    );
  } else if (profile.stakeholderFirstCount >= 2 && profile.safetyDelta > 0) {
    influencers.push(
      "You weighed stakeholder constraints and psychological safety alongside the proposal."
    );
  } else if (latePeopleImpactMissed >= 2) {
    influencers.push(
      "People impact was overlooked in multiple exchanges as the conversation progressed."
    );
  } else {
    const passiveCount = profile.turns.filter((t) => t.passiveOrNonDirective).length;
    if (passiveCount >= 2) {
      influencers.push(
        "Agreement without engaging stakeholder impact left concerns unaddressed."
      );
    }
  }

  if (
    conversationEndedInDisengagement(finalState, profile) &&
    earlyStakeholderCentered &&
    latePeopleImpactMissed >= 1
  ) {
    influencers.push(
      "Initial human-centered framing did not carry through as the conversation deteriorated."
    );
  }

  return influencers;
}

function buildAssessmentInfluencers(
  competency: CompetencyKey,
  profile: SessionBehaviorProfile,
  finalState: ScenarioState
): string[] {
  switch (competency) {
    case "relationshipIntelligence":
      return buildRelationshipInfluencers(profile, finalState);
    case "emotionalIntelligence":
      return buildEmotionalInfluenceInfluencers(profile);
    case "criticalThinkingDiscernment":
      return buildCriticalThinkingInfluencers(profile);
    case "adaptabilityLearningAgility":
      return buildAdaptabilityInfluencers(profile, finalState);
    case "humanCenteredDecisionMaking":
      return buildHumanCenteredInfluencers(profile, finalState);
  }
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

  const { positive, negative } = countCompetencySignals(profile, competency);
  const signalCount = Math.max(positive, negative);

  const level = alignLevelWithBehavior(competency, score, profile, signalCount);

  const assessmentInfluencers =
    level === "Not Yet Observed"
      ? []
      : buildAssessmentInfluencers(competency, profile, finalState);

  return {
    key: competency,
    name: HACF_COMPETENCY_LABELS[competency],
    level,
    assessmentInfluencers,
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

/** @deprecated Use CompetencyFeedback.assessmentInfluencers */
export type BehavioralEvidenceItem = {
  turnIndex: number;
  quote: string;
  observation: string;
  stakeholderEffect: string;
};
