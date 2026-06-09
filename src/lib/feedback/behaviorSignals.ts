import { MessageAnalysis, ScenarioState } from "../simulation/types";
import { CompetencyKey, CompetencyScores, BehavioralLevel, isDevelopmentPerformanceLevel, isStrongPerformanceLevel } from "./hacfCompetencies";

/** Implicit behavioral signals extracted per user turn - no empathy keyword matching */
export type TurnBehaviorSignals = {
  turnIndex: number;
  quote: string;

  // Stakeholder state movement after this message
  trustDelta: number;
  resistanceDelta: number;
  ruptureDelta: number;
  frustrationDelta: number;
  safetyDelta: number;
  respectDelta: number;

  // Context when message was sent
  facedHighResistance: boolean;
  facedHighRupture: boolean;
  facedHighFrustration: boolean;

  // Positive behavioral inferences (trajectory + structure, not phrase matching)
  maintainedComposureUnderPressure: boolean;
  invitedDialogue: boolean;
  substantiveEngagement: boolean;
  reducedStakeholderDefensiveness: boolean;
  trustIncreased: boolean;
  alignmentShift: boolean;
  reframedAfterPushback: boolean;
  reasonedUnderUncertainty: boolean;
  perspectiveEngagement: boolean;
  stakeholderFirstReasoning: boolean;
  toneStabilized: boolean;
  recoveredAfterChallenge: boolean;

  // Negative behavioral signals (harmful interaction patterns)
  escalatedUnderPressure: boolean;
  dismissiveOrAggressive: boolean;
  hostileOrPersonalAttack: boolean;
  passiveOrNonDirective: boolean;
  repeatedWithoutAdaptation: boolean;
  interruptedFlow: boolean;
  remainedVagueUnderChallenge: boolean;
  prematureSolutioning: boolean;
};

export type SessionBehaviorProfile = {
  turns: TurnBehaviorSignals[];
  userMessageCount: number;

  trustDelta: number;
  resistanceDelta: number;
  ruptureDelta: number;
  safetyDelta: number;

  composureUnderPressureCount: number;
  escalationUnderPressureCount: number;
  dialogueInvitationCount: number;
  substantiveEngagementCount: number;
  defensivenessReductionCount: number;
  trustBuildingCount: number;
  alignmentShiftCount: number;
  reframingCount: number;
  reasonedJudgmentCount: number;
  perspectiveEngagementCount: number;
  stakeholderFirstCount: number;
  toneStabilizationCount: number;
  recoveryCount: number;
  negativeInteractionCount: number;
  vagueUnderChallengeCount: number;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function underPressure(state: ScenarioState): boolean {
  return state.resistance > 55 || state.ruptureLevel > 50 || state.frustration > 45;
}

function messageSubstance(analysis: MessageAnalysis): boolean {
  return (
    analysis.metrics.specificityScore >= 3 ||
    analysis.metrics.evidenceScore >= 2 ||
    analysis.goal.providesEvidence
  );
}

function strategyShift(
  message: string,
  previousUserMessage: string | undefined,
  analysis: MessageAnalysis,
  facedPushback: boolean
): boolean {
  if (!facedPushback || !previousUserMessage) return false;

  const prevQuestions = (previousUserMessage.match(/\?/g) ?? []).length;
  const currQuestions = analysis.metrics.questionCount;
  const lengthRatio = message.length / Math.max(previousUserMessage.length, 1);

  return (
    currQuestions > prevQuestions ||
    lengthRatio < 0.75 ||
    lengthRatio > 1.4
  );
}

export function extractTurnBehaviorSignals(
  turnIndex: number,
  message: string,
  analysis: MessageAnalysis,
  previousState: ScenarioState,
  nextState: ScenarioState,
  previousUserMessage?: string,
  previousTurn?: TurnBehaviorSignals
): TurnBehaviorSignals {
  const trustDelta = nextState.trust - previousState.trust;
  const resistanceDelta = previousState.resistance - nextState.resistance;
  const ruptureDelta = nextState.ruptureLevel - previousState.ruptureLevel;
  const frustrationDelta = previousState.frustration - nextState.frustration;
  const safetyDelta = nextState.psychologicalSafety - previousState.psychologicalSafety;
  const respectDelta = nextState.perceivedRespect - previousState.perceivedRespect;

  const facedHighResistance = previousState.resistance > 55;
  const facedHighRupture = previousState.ruptureLevel > 50;
  const facedHighFrustration = previousState.frustration > 45;
  const pressure = underPressure(previousState);

  const dismissiveOrAggressive =
    analysis.tone.isDismissive ||
    analysis.tone.isAggressive ||
    analysis.tone.isHostile ||
    analysis.tone.isBlameLanguage ||
    analysis.tone.isPressureTactic ||
    analysis.tone.isPersonalAttack;

  const hostileOrPersonalAttack =
    analysis.tone.isHostile ||
    analysis.tone.isPersonalAttack ||
    analysis.tone.isBlameLanguage;

  const invitedDialogue =
    analysis.metrics.questionCount >= 1 &&
    !dismissiveOrAggressive &&
    !analysis.metrics.isInterruptionAttempt;

  const substantiveEngagement =
    messageSubstance(analysis) && !analysis.goal.remainsVague;

  // EI: internal regulation only - no stakeholder outcome required
  const maintainedComposureUnderPressure =
    pressure &&
    !dismissiveOrAggressive &&
    !analysis.tone.hasEscalationLanguage &&
    !analysis.tone.isHostile;

  const passiveOrNonDirective =
    pressure &&
    !dismissiveOrAggressive &&
    !invitedDialogue &&
    !substantiveEngagement &&
    message.trim().length <= 80 &&
    /^(yeah|yes|yep|for sure|sure|ok|okay|sounds good|got it|fair enough|will do|absolutely)\b/i.test(
      message.trim()
    );

  const escalatedUnderPressure =
    pressure &&
    !passiveOrNonDirective &&
    (dismissiveOrAggressive || analysis.tone.hasEscalationLanguage);

  // RI: external stakeholder state movement
  const reducedStakeholderDefensiveness =
    resistanceDelta >= 3 ||
    (trustDelta >= 3 && frustrationDelta >= 2) ||
    ruptureDelta <= -4;

  const trustIncreased = trustDelta >= 4;
  const alignmentShift = resistanceDelta >= 5 && trustDelta >= 2;
  const reframedAfterPushback =
    pressure && strategyShift(message, previousUserMessage, analysis, true);

  const reasonedUnderUncertainty =
    !analysis.contentNegative.isDismissive &&
    !analysis.goal.isPrematureSolutioning &&
    substantiveEngagement &&
    pressure;

  const perspectiveEngagement =
    invitedDialogue && (substantiveEngagement || trustDelta >= 0) && pressure;

  const repeatedWithoutAdaptation =
    pressure &&
    !reframedAfterPushback &&
    !perspectiveEngagement &&
    !trustIncreased &&
    !reducedStakeholderDefensiveness &&
    !dismissiveOrAggressive &&
    Boolean(previousUserMessage) &&
    !strategyShift(message, previousUserMessage, analysis, true);

  const stakeholderFirstReasoning =
    pressure &&
    substantiveEngagement &&
    !dismissiveOrAggressive &&
    (trustIncreased || safetyDelta >= 3 || reducedStakeholderDefensiveness);

  const toneStabilized =
    pressure &&
    !dismissiveOrAggressive &&
    !analysis.tone.hasEscalationLanguage;

  const recoveredAfterChallenge =
    previousTurn !== undefined &&
    (previousTurn.escalatedUnderPressure || previousTurn.dismissiveOrAggressive) &&
    maintainedComposureUnderPressure;

  return {
    turnIndex,
    quote: message.trim(),
    trustDelta,
    resistanceDelta,
    ruptureDelta,
    frustrationDelta,
    safetyDelta,
    respectDelta,
    facedHighResistance,
    facedHighRupture,
    facedHighFrustration,
    maintainedComposureUnderPressure,
    invitedDialogue,
    substantiveEngagement,
    reducedStakeholderDefensiveness,
    trustIncreased,
    alignmentShift,
    reframedAfterPushback,
    reasonedUnderUncertainty,
    perspectiveEngagement,
    stakeholderFirstReasoning,
    toneStabilized,
    recoveredAfterChallenge,
    escalatedUnderPressure,
    dismissiveOrAggressive,
    hostileOrPersonalAttack,
    passiveOrNonDirective,
    repeatedWithoutAdaptation,
    interruptedFlow: analysis.metrics.isInterruptionAttempt,
    remainedVagueUnderChallenge:
      pressure && (analysis.goal.remainsVague || analysis.contentNegative.isDismissive),
    prematureSolutioning: analysis.goal.isPrematureSolutioning,
  };
}

export function buildSessionBehaviorProfile(
  turns: TurnBehaviorSignals[],
  initialState: ScenarioState,
  finalState: ScenarioState
): SessionBehaviorProfile {
  const count = (predicate: (t: TurnBehaviorSignals) => boolean) =>
    turns.filter(predicate).length;

  return {
    turns,
    userMessageCount: turns.length,
    trustDelta: finalState.trust - initialState.trust,
    resistanceDelta: initialState.resistance - finalState.resistance,
    ruptureDelta: finalState.ruptureLevel - initialState.ruptureLevel,
    safetyDelta: finalState.psychologicalSafety - initialState.psychologicalSafety,
    composureUnderPressureCount: count((t) => t.maintainedComposureUnderPressure),
    escalationUnderPressureCount: count((t) => t.escalatedUnderPressure),
    dialogueInvitationCount: count((t) => t.invitedDialogue),
    substantiveEngagementCount: count((t) => t.substantiveEngagement),
    defensivenessReductionCount: count((t) => t.reducedStakeholderDefensiveness),
    trustBuildingCount: count((t) => t.trustIncreased),
    alignmentShiftCount: count((t) => t.alignmentShift),
    reframingCount: count((t) => t.reframedAfterPushback),
    reasonedJudgmentCount: count((t) => t.reasonedUnderUncertainty),
    perspectiveEngagementCount: count((t) => t.perspectiveEngagement),
    stakeholderFirstCount: count((t) => t.stakeholderFirstReasoning),
    toneStabilizationCount: count((t) => t.toneStabilized),
    recoveryCount: count((t) => t.recoveredAfterChallenge),
    negativeInteractionCount: count(
      (t) => t.dismissiveOrAggressive || t.escalatedUnderPressure || t.interruptedFlow
    ),
    vagueUnderChallengeCount: count((t) => t.remainedVagueUnderChallenge),
  };
}

function ratioContribution(count: number, messages: number, weight: number): number {
  if (messages === 0) return 0;
  return Math.min(weight, (count / messages) * weight * 2.5);
}

function trajectoryBonus(delta: number, scale: number, cap: number): number {
  if (delta <= 0) return 0;
  return Math.min(cap, delta * scale);
}

/** Session-level competency scores from behavioral inference - not keyword counts */
export function calculateBehavioralCompetencyScores(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  _initialState: ScenarioState
): CompetencyScores {
  const messages = Math.max(profile.userMessageCount, 1);
  const pressureTurns = profile.turns.filter(
    (t) => t.facedHighResistance || t.facedHighRupture || t.facedHighFrustration
  ).length;

  // EI: internal regulation only - no trust/resistance/rupture trajectory
  const emotionalIntelligence = clamp(
    42 +
      ratioContribution(profile.composureUnderPressureCount, Math.max(pressureTurns, 1), 26) +
      ratioContribution(profile.toneStabilizationCount, messages, 22) +
      ratioContribution(profile.recoveryCount, messages, 16) +
      (profile.escalationUnderPressureCount === 0 && pressureTurns >= 2 ? 10 : 0) -
      profile.escalationUnderPressureCount * 16 -
      profile.negativeInteractionCount * 9
  );

  // RI: external stakeholder impact only
  const relationshipIntelligence = clamp(
    40 +
      ratioContribution(profile.perspectiveEngagementCount, messages, 18) +
      ratioContribution(profile.defensivenessReductionCount, messages, 20) +
      ratioContribution(profile.dialogueInvitationCount, messages, 10) +
      ratioContribution(profile.trustBuildingCount, messages, 12) +
      trajectoryBonus(profile.trustDelta, 0.35, 18) +
      trajectoryBonus(profile.resistanceDelta, 0.3, 14) +
      trajectoryBonus(-profile.ruptureDelta, 0.25, 10) +
      finalState.perceivedRespect * 0.12 +
      finalState.trust * 0.08 -
      profile.negativeInteractionCount * 10 -
      (finalState.ruptureLevel > 60 ? 12 : 0)
  );

  const criticalThinkingDiscernment = clamp(
    42 +
      ratioContribution(profile.reasonedJudgmentCount, messages, 24) +
      ratioContribution(profile.substantiveEngagementCount, messages, 16) +
      (profile.vagueUnderChallengeCount === 0 ? 8 : 0) -
      profile.vagueUnderChallengeCount * 12 -
      profile.negativeInteractionCount * 6
  );

  const adaptabilityLearningAgility = clamp(
    40 +
      ratioContribution(profile.reframingCount, messages, 22) +
      ratioContribution(profile.alignmentShiftCount, messages, 18) +
      trajectoryBonus(profile.resistanceDelta, 0.3, 15) +
      (profile.reframingCount > 0 && profile.resistanceDelta > 0 ? 8 : 0) -
      profile.vagueUnderChallengeCount * 10 -
      (profile.reframingCount === 0 && finalState.resistance > 55 ? 12 : 0)
  );

  const humanCenteredDecisionMaking = clamp(
    40 +
      ratioContribution(profile.stakeholderFirstCount, messages, 22) +
      ratioContribution(profile.trustBuildingCount, messages, 12) +
      trajectoryBonus(profile.safetyDelta, 0.35, 14) +
      finalState.goalProgress * 0.2 +
      Math.max(0, profile.trustDelta) * 0.15 -
      profile.negativeInteractionCount * 10 -
      (finalState.ruptureLevel > 70 ? 15 : 0)
  );

  return {
    emotionalIntelligence,
    relationshipIntelligence,
    criticalThinkingDiscernment,
    adaptabilityLearningAgility,
    humanCenteredDecisionMaking,
  };
}

/** Per-turn score nudges from behavioral signals - replaces keyword executive scoring */
export function updateScoresFromBehaviorSignals(
  scores: CompetencyScores,
  signals: TurnBehaviorSignals
): CompetencyScores {
  const next = { ...scores };

  // EI: internal regulation under pressure only
  if (signals.maintainedComposureUnderPressure) next.emotionalIntelligence += 5;
  if (signals.toneStabilized) next.emotionalIntelligence += 4;
  if (signals.recoveredAfterChallenge) next.emotionalIntelligence += 6;
  if (signals.escalatedUnderPressure) next.emotionalIntelligence -= 9;
  if (signals.dismissiveOrAggressive) next.emotionalIntelligence -= 7;

  // RI: external stakeholder impact only
  if (signals.perspectiveEngagement) next.relationshipIntelligence += 5;
  if (signals.reducedStakeholderDefensiveness) next.relationshipIntelligence += 5;
  if (signals.trustIncreased) next.relationshipIntelligence += 4;
  if (signals.alignmentShift) next.relationshipIntelligence += 4;
  if (signals.invitedDialogue && signals.facedHighResistance) {
    next.relationshipIntelligence += 3;
  }
  if (signals.dismissiveOrAggressive) next.relationshipIntelligence -= 8;
  if (signals.interruptedFlow) next.relationshipIntelligence -= 5;

  // CT: reasoning under uncertainty
  if (signals.reasonedUnderUncertainty) next.criticalThinkingDiscernment += 6;
  if (signals.substantiveEngagement) next.criticalThinkingDiscernment += 3;
  if (signals.remainedVagueUnderChallenge) next.criticalThinkingDiscernment -= 6;
  if (signals.prematureSolutioning) next.criticalThinkingDiscernment -= 4;

  // AL: adaptation after resistance
  if (signals.reframedAfterPushback) next.adaptabilityLearningAgility += 6;
  if (signals.alignmentShift) next.adaptabilityLearningAgility += 5;
  if (signals.facedHighResistance && signals.invitedDialogue) {
    next.adaptabilityLearningAgility += 3;
  }
  if (signals.remainedVagueUnderChallenge && signals.facedHighResistance) {
    next.adaptabilityLearningAgility -= 5;
  }

  // HCDM: people-first reasoning via stakeholder impact trajectory
  if (signals.stakeholderFirstReasoning) next.humanCenteredDecisionMaking += 6;
  if (signals.trustIncreased && signals.substantiveEngagement) {
    next.humanCenteredDecisionMaking += 4;
  }
  if (signals.dismissiveOrAggressive) next.humanCenteredDecisionMaking -= 7;

  for (const key of Object.keys(next) as (keyof CompetencyScores)[]) {
    next[key] = Math.max(0, Math.min(100, next[key]));
  }

  return next;
}

export type GroundedEvidenceBullet = {
  text: string;
  turnIndex: number;
};

export type KeyMoment = {
  turnIndex: number;
  quote: string;
  context: string;
};

function describeTrustImprovement(turn: TurnBehaviorSignals): string {
  if (turn.perspectiveEngagement) {
    return "The stakeholder became more open after you engaged their perspective before advancing your position.";
  }
  if (turn.stakeholderFirstReasoning) {
    return "Trust improved after you acknowledged their constraints before pushing the proposal forward.";
  }
  if (turn.invitedDialogue && turn.facedHighResistance) {
    return "The stakeholder softened when you opened dialogue instead of pressing your case under resistance.";
  }
  return "The stakeholder became more open following this exchange.";
}

function describeResistanceEase(turn: TurnBehaviorSignals): string {
  if (turn.reframedAfterPushback) {
    return "Resistance eased when you adjusted your framing after pushback.";
  }
  if (turn.substantiveEngagement) {
    return "Resistance eased when you clarified impact with concrete detail rather than broad claims.";
  }
  if (turn.perspectiveEngagement) {
    return "Resistance eased when you acknowledged their concern directly and invited dialogue.";
  }
  return "The stakeholder became less defensive after this response.";
}

function describeRuptureRepair(_turn: TurnBehaviorSignals): string {
  return "Tension in the conversation eased after you shifted toward a steadier, more collaborative tone.";
}

function describeAlignmentShift(turn: TurnBehaviorSignals): string {
  if (turn.reframedAfterPushback) {
    return "Your approach helped shift the conversation toward alignment after you reframed following resistance.";
  }
  return "Alignment improved following this exchange as the stakeholder became more willing to engage.";
}

function describeSafetyImprovement(turn: TurnBehaviorSignals): string {
  if (turn.stakeholderFirstReasoning) {
    return "The stakeholder seemed more comfortable engaging after you centered their constraints and concerns.";
  }
  return "The exchange felt safer for the stakeholder to speak openly about concerns.";
}

function describeRespectImprovement(_turn: TurnBehaviorSignals): string {
  return "The stakeholder appeared more respected and heard after you responded without dismissiveness.";
}

function firstSentence(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  const sentence = match ? match[0].trim() : trimmed;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max)}…`;
}

type EvidencePolarity = "positive" | "negative";

function evidencePolarityForLevel(
  level: BehavioralLevel,
  profile: SessionBehaviorProfile,
  competency: CompetencyKey
): EvidencePolarity {
  if (isStrongPerformanceLevel(level)) return "positive";
  if (isDevelopmentPerformanceLevel(level)) return "negative";

  return inferDominantPolarity(profile, competency);
}

function inferDominantPolarity(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey
): EvidencePolarity {
  switch (competency) {
    case "emotionalIntelligence":
      if (
        profile.escalationUnderPressureCount > profile.composureUnderPressureCount ||
        profile.negativeInteractionCount >= 2
      ) {
        return "negative";
      }
      return "positive";
    case "relationshipIntelligence":
      if (profile.trustDelta < 0 || profile.negativeInteractionCount >= 2) {
        return "negative";
      }
      return "positive";
    case "criticalThinkingDiscernment":
      if (
        profile.vagueUnderChallengeCount > profile.reasonedJudgmentCount ||
        profile.vagueUnderChallengeCount >= 2
      ) {
        return "negative";
      }
      return "positive";
    case "adaptabilityLearningAgility":
      if (
        profile.reframingCount === 0 &&
        (profile.escalationUnderPressureCount > 0 || profile.resistanceDelta < 0)
      ) {
        return "negative";
      }
      return "positive";
    case "humanCenteredDecisionMaking":
      if (profile.safetyDelta < 0 || profile.negativeInteractionCount >= 2) {
        return "negative";
      }
      return "positive";
  }
}

function collectPositiveEvidenceBullets(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey
): GroundedEvidenceBullet[] {
  const bullets: GroundedEvidenceBullet[] = [];

  for (const turn of profile.turns) {
    const t = turn.turnIndex;

    if (competency === "emotionalIntelligence") {
      if (turn.maintainedComposureUnderPressure) {
        bullets.push({
          turnIndex: t,
          text: "You stayed composed and non-defensive while the stakeholder pushed back.",
        });
      }
      if (turn.toneStabilized) {
        bullets.push({
          turnIndex: t,
          text: "Your tone stayed steady during a high-pressure exchange, without escalation language.",
        });
      }
      if (turn.recoveredAfterChallenge) {
        bullets.push({
          turnIndex: t,
          text: "After a tense moment, you returned to a grounded, non-defensive response.",
        });
      }
    }

    if (competency === "relationshipIntelligence") {
      if (turn.trustDelta >= 3) {
        bullets.push({ turnIndex: t, text: describeTrustImprovement(turn) });
      }
      if (turn.resistanceDelta >= 3) {
        bullets.push({ turnIndex: t, text: describeResistanceEase(turn) });
      }
      if (turn.ruptureDelta <= -3) {
        bullets.push({ turnIndex: t, text: describeRuptureRepair(turn) });
      }
      if (turn.perspectiveEngagement) {
        bullets.push({
          turnIndex: t,
          text: "You engaged the stakeholder's perspective with questions before advancing your position.",
        });
      }
      if (turn.invitedDialogue && turn.facedHighResistance) {
        bullets.push({
          turnIndex: t,
          text: "You opened dialogue during elevated resistance instead of pushing your case.",
        });
      }
    }

    if (competency === "criticalThinkingDiscernment") {
      if (turn.reasonedUnderUncertainty) {
        bullets.push({
          turnIndex: t,
          text: "You reasoned with substance while pushback and uncertainty were present.",
        });
      }
      if (turn.substantiveEngagement && !turn.reasonedUnderUncertainty) {
        bullets.push({
          turnIndex: t,
          text: "You grounded your message in specific detail rather than broad claims.",
        });
      }
    }

    if (competency === "adaptabilityLearningAgility") {
      if (turn.reframedAfterPushback) {
        bullets.push({
          turnIndex: t,
          text: "You changed your framing or strategy after resistance rather than repeating yourself.",
        });
      }
      if (turn.alignmentShift) {
        bullets.push({ turnIndex: t, text: describeAlignmentShift(turn) });
      }
    }

    if (competency === "humanCenteredDecisionMaking") {
      if (turn.stakeholderFirstReasoning) {
        bullets.push({
          turnIndex: t,
          text: "You led with stakeholder constraints and people impact before advancing the proposal.",
        });
      }
      if (turn.safetyDelta >= 3) {
        bullets.push({ turnIndex: t, text: describeSafetyImprovement(turn) });
      }
      if (turn.respectDelta >= 3) {
        bullets.push({ turnIndex: t, text: describeRespectImprovement(turn) });
      }
    }
  }

  return bullets;
}

function collectNegativeEvidenceBullets(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey
): GroundedEvidenceBullet[] {
  const bullets: GroundedEvidenceBullet[] = [];

  for (const turn of profile.turns) {
    const t = turn.turnIndex;

    if (competency === "emotionalIntelligence") {
      if (turn.hostileOrPersonalAttack) {
        bullets.push({
          turnIndex: t,
          text: "Hostile or personal language shifted the conversation away from the initiative.",
        });
      } else if (turn.dismissiveOrAggressive) {
        bullets.push({
          turnIndex: t,
          text: "Dismissive or pressuring language made the stakeholder more guarded.",
        });
      } else if (turn.passiveOrNonDirective) {
        bullets.push({
          turnIndex: t,
          text: "Short agreement without a next step did not move the conversation forward.",
        });
      } else if (turn.escalatedUnderPressure) {
        bullets.push({
          turnIndex: t,
          text: "Your tone became more pressuring while the stakeholder was pushing back.",
        });
      }
    }

    if (competency === "relationshipIntelligence") {
      if (turn.hostileOrPersonalAttack) {
        bullets.push({
          turnIndex: t,
          text: "This response strained the relationship and reduced willingness to collaborate.",
        });
      } else if (turn.dismissiveOrAggressive) {
        bullets.push({
          turnIndex: t,
          text: "This response damaged rapport and made the stakeholder more guarded.",
        });
      } else if (turn.passiveOrNonDirective) {
        bullets.push({
          turnIndex: t,
          text: "Agreeing without engaging the stakeholder's concerns left key relationship questions unresolved.",
        });
      } else if (turn.trustDelta <= -4) {
        bullets.push({
          turnIndex: t,
          text: "Trust dropped after this exchange, signaling relationship strain.",
        });
      } else if (turn.resistanceDelta <= -4) {
        bullets.push({
          turnIndex: t,
          text: "The stakeholder became more defensive after this response.",
        });
      }
    }

    if (competency === "criticalThinkingDiscernment") {
      if (turn.remainedVagueUnderChallenge) {
        bullets.push({
          turnIndex: t,
          text: "Your response stayed vague when the stakeholder asked for specifics.",
        });
      }
      if (turn.prematureSolutioning) {
        bullets.push({
          turnIndex: t,
          text: "You moved to solutions before the stakeholder's concerns were fully understood.",
        });
      }
    }

    if (competency === "adaptabilityLearningAgility") {
      if (turn.repeatedWithoutAdaptation) {
        bullets.push({
          turnIndex: t,
          text: "You continued with the same approach without adjusting when resistance appeared.",
        });
      } else if (
        turn.facedHighResistance &&
        !turn.reframedAfterPushback &&
        !turn.perspectiveEngagement
      ) {
        bullets.push({
          turnIndex: t,
          text: "You repeated your position without adjusting when resistance appeared.",
        });
      } else if (turn.passiveOrNonDirective) {
        bullets.push({
          turnIndex: t,
          text: "You answered without adapting toward a decision or agreement.",
        });
      } else if (turn.remainedVagueUnderChallenge) {
        bullets.push({
          turnIndex: t,
          text: "You did not adapt with clearer reasoning when the stakeholder pressed for detail.",
        });
      }
    }

    if (competency === "humanCenteredDecisionMaking") {
      if (turn.hostileOrPersonalAttack) {
        bullets.push({
          turnIndex: t,
          text: "People impact and respect were overlooked in this exchange.",
        });
      } else if (turn.dismissiveOrAggressive) {
        bullets.push({
          turnIndex: t,
          text: "People impact and respect were overlooked in favor of pushing the proposal.",
        });
      } else if (turn.prematureSolutioning) {
        bullets.push({
          turnIndex: t,
          text: "You moved to solutions before the stakeholder's concerns were fully understood.",
        });
      } else if (turn.passiveOrNonDirective) {
        bullets.push({
          turnIndex: t,
          text: "You did not address stakeholder impact before moving toward closure.",
        });
      } else if (turn.safetyDelta <= -4) {
        bullets.push({
          turnIndex: t,
          text: "The stakeholder seemed less safe raising concerns after this exchange.",
        });
      }
    }
  }

  return bullets;
}

export function extractGroundedEvidence(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey,
  level: BehavioralLevel
): GroundedEvidenceBullet[] {
  const polarity = evidencePolarityForLevel(level, profile, competency);
  const bullets =
    polarity === "positive"
      ? collectPositiveEvidenceBullets(profile, competency)
      : collectNegativeEvidenceBullets(profile, competency);

  const deduped = bullets.filter(
    (b, i, arr) => arr.findIndex((x) => x.text === b.text) === i
  );

  if (deduped.length >= 2) return deduped.slice(0, 3);

  return addSessionTrajectoryBullets(competency, profile, deduped, polarity).slice(0, 3);
}

function addSessionTrajectoryBullets(
  competency: CompetencyKey,
  profile: SessionBehaviorProfile,
  existing: GroundedEvidenceBullet[],
  polarity: EvidencePolarity
): GroundedEvidenceBullet[] {
  const extra: GroundedEvidenceBullet[] = [];

  if (polarity === "positive") {
    if (
      competency === "relationshipIntelligence" &&
      profile.trustDelta >= 5 &&
      existing.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "Over the conversation, the stakeholder grew more willing to engage as rapport improved.",
      });
    }

    if (
      competency === "relationshipIntelligence" &&
      profile.resistanceDelta >= 5 &&
      existing.length + extra.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "Resistance softened across the conversation as your approach addressed stakeholder concerns.",
      });
    }

    if (
      competency === "adaptabilityLearningAgility" &&
      profile.reframingCount >= 1 &&
      profile.resistanceDelta >= 3 &&
      existing.length + extra.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "The stakeholder became more open after you adapted your approach mid-conversation.",
      });
    }

    if (
      competency === "emotionalIntelligence" &&
      profile.escalationUnderPressureCount === 0 &&
      profile.composureUnderPressureCount >= 2 &&
      existing.length + extra.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "You maintained composure throughout sustained pushback without escalating tone.",
      });
    }

    if (
      competency === "humanCenteredDecisionMaking" &&
      profile.safetyDelta >= 5 &&
      existing.length + extra.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "The stakeholder seemed more comfortable raising concerns as the conversation progressed.",
      });
    }
  } else {
    if (
      competency === "emotionalIntelligence" &&
      profile.escalationUnderPressureCount > 0 &&
      existing.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "Tone escalated under pressure, making it harder for the stakeholder to stay engaged.",
      });
    }

    if (
      competency === "relationshipIntelligence" &&
      profile.trustDelta < 0 &&
      existing.length + extra.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "Trust eroded across the conversation as exchanges became harder to engage with.",
      });
    }

    if (
      competency === "adaptabilityLearningAgility" &&
      profile.reframingCount === 0 &&
      profile.resistanceDelta < 0 &&
      existing.length + extra.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "You missed opportunities to adjust your approach when resistance persisted.",
      });
    }

    if (
      competency === "humanCenteredDecisionMaking" &&
      profile.safetyDelta < 0 &&
      existing.length + extra.length < 3
    ) {
      extra.push({
        turnIndex: -1,
        text: "The stakeholder seemed less comfortable raising concerns as the conversation progressed.",
      });
    }
  }

  if (existing.length + extra.length === 0) {
    extra.push({
      turnIndex: -1,
      text:
        polarity === "positive"
          ? "Your overall approach in this conversation supported this rating."
          : "Patterns across the conversation revealed development opportunities in this area.",
    });
  }

  return [...existing, ...extra];
}

type MomentEvidence = {
  turnIndex: number;
  quote: string;
  context: string;
  score: number;
};

function extractPositiveMomentEvidence(
  turn: TurnBehaviorSignals,
  competency: CompetencyKey
): MomentEvidence | null {
  const quote = firstSentence(turn.quote);
  let context: string | null = null;
  let score = 0;

  switch (competency) {
    case "emotionalIntelligence":
      if (turn.recoveredAfterChallenge) {
        score = 8;
        context =
          "You recovered composure after tension, which kept the conversation recoverable.";
      } else if (turn.maintainedComposureUnderPressure) {
        score = 6;
        context =
          "This moment reflects steady emotional regulation when the stakeholder challenged you.";
      } else if (turn.toneStabilized) {
        score = 4;
        context = "Your tone stayed steady during a high-pressure exchange.";
      }
      break;
    case "relationshipIntelligence":
      if (turn.perspectiveEngagement) {
        score = 8;
        context =
          "Engaging the stakeholder's perspective here helped keep the dialogue constructive.";
      } else if (turn.reducedStakeholderDefensiveness) {
        score = 7;
        context =
          "This exchange reduced defensiveness and opened space for further dialogue.";
      } else if (turn.invitedDialogue && turn.facedHighResistance) {
        score = 5;
        context = "Opening dialogue under resistance helped maintain engagement.";
      }
      break;
    case "criticalThinkingDiscernment":
      if (turn.reasonedUnderUncertainty) {
        score = 8;
        context =
          "This moment shows thoughtful reasoning when the stakeholder pressed for clarity.";
      } else if (turn.substantiveEngagement) {
        score = 5;
        context = "You grounded your message in specific detail rather than broad claims.";
      }
      break;
    case "adaptabilityLearningAgility":
      if (turn.reframedAfterPushback) {
        score = 8;
        context =
          "You adapted your framing after pushback rather than repeating the same argument.";
      } else if (turn.alignmentShift) {
        score = 6;
        context = "Adjusting here helped move the discussion toward alignment.";
      }
      break;
    case "humanCenteredDecisionMaking":
      if (turn.stakeholderFirstReasoning) {
        score = 8;
        context =
          "You prioritized stakeholder constraints before advancing the proposal.";
      } else if (turn.safetyDelta >= 3) {
        score = 5;
        context = "This response made it easier for the stakeholder to raise concerns openly.";
      }
      break;
  }

  if (!context || score <= 0) return null;

  return { turnIndex: turn.turnIndex, quote, context, score };
}

function extractNegativeMomentEvidence(
  turn: TurnBehaviorSignals,
  competency: CompetencyKey
): MomentEvidence | null {
  const quote = firstSentence(turn.quote);
  let context: string | null = null;
  let score = 0;

  switch (competency) {
    case "emotionalIntelligence":
      if (turn.hostileOrPersonalAttack) {
        score = 10;
        context =
          "The conversation shifted from discussing concerns to attacking the stakeholder, increasing defensiveness and reducing trust.";
      } else if (turn.dismissiveOrAggressive) {
        score = 8;
        context =
          "Dismissive or pressuring language made the stakeholder more guarded under pushback.";
      } else if (turn.passiveOrNonDirective) {
        score = 6;
        context =
          "You agreed without moving the conversation toward a decision or clear next step.";
      } else if (turn.escalatedUnderPressure) {
        score = 5;
        context =
          "Your tone became more pressuring under pushback, which reduced openness.";
      }
      break;
    case "relationshipIntelligence":
      if (turn.hostileOrPersonalAttack) {
        score = 10;
        context =
          "This exchange strained the relationship and reduced the stakeholder's willingness to collaborate.";
      } else if (turn.dismissiveOrAggressive) {
        score = 8;
        context =
          "This response damaged rapport and made the stakeholder more guarded.";
      } else if (turn.passiveOrNonDirective) {
        score = 6;
        context =
          "Agreeing without exploring the stakeholder's concerns left relationship questions unresolved.";
      } else if (turn.trustDelta <= -4) {
        score = 4;
        context = "Trust decreased after this exchange.";
      }
      break;
    case "criticalThinkingDiscernment":
      if (turn.remainedVagueUnderChallenge) {
        score = 8;
        context =
          "Staying vague here missed an opportunity to address the stakeholder's request for specifics.";
      } else if (turn.prematureSolutioning) {
        score = 6;
        context =
          "You moved to solutions before the stakeholder's concerns were fully understood.";
      } else if (turn.passiveOrNonDirective) {
        score = 5;
        context =
          "You continued answering at a surface level without clarifying the decision or trade-offs.";
      }
      break;
    case "adaptabilityLearningAgility":
      if (turn.repeatedWithoutAdaptation) {
        score = 8;
        context =
          "You continued with the same approach without adjusting when resistance appeared.";
      } else if (
        turn.facedHighResistance &&
        !turn.reframedAfterPushback &&
        !turn.perspectiveEngagement
      ) {
        score = 6;
        context =
          "You did not adjust your approach when resistance appeared, limiting progress in the conversation.";
      } else if (turn.passiveOrNonDirective) {
        score = 5;
        context =
          "You continued answering operational questions but did not move the conversation toward a decision or agreement.";
      }
      break;
    case "humanCenteredDecisionMaking":
      if (turn.hostileOrPersonalAttack) {
        score = 10;
        context =
          "This response overlooked stakeholder impact and respect, eroding psychological safety.";
      } else if (turn.dismissiveOrAggressive) {
        score = 8;
        context =
          "This response overlooked stakeholder impact in favor of pushing the proposal.";
      } else if (turn.prematureSolutioning) {
        score = 6;
        context =
          "You advanced the proposal before fully centering the stakeholder's people impact.";
      } else if (turn.passiveOrNonDirective) {
        score = 5;
        context =
          "You did not address stakeholder impact before moving toward closure.";
      }
      break;
  }

  if (!context || score <= 0) return null;

  return { turnIndex: turn.turnIndex, quote, context, score };
}

export function selectKeyMoment(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey,
  level: BehavioralLevel,
  evidenceBullets: GroundedEvidenceBullet[] = []
): KeyMoment {
  const polarity = evidencePolarityForLevel(level, profile, competency);
  const extract =
    polarity === "positive" ? extractPositiveMomentEvidence : extractNegativeMomentEvidence;

  let best: MomentEvidence | undefined;

  for (const turn of profile.turns) {
    const evidence = extract(turn, competency);
    if (!evidence) continue;
    if (!best || evidence.score > best.score) {
      best = evidence;
    }
  }

  if (!best) {
    const anchored = evidenceBullets.find((bullet) => bullet.turnIndex >= 0);
    if (anchored) {
      const turn = profile.turns.find((item) => item.turnIndex === anchored.turnIndex);
      if (turn) {
        const evidence = extract(turn, competency);
        if (evidence) {
          best = evidence;
        }
      }
    }
  }

  if (!best) {
    return {
      turnIndex: -1,
      quote: "",
      context:
        polarity === "positive"
          ? "No single exchange stood out; this level reflects constructive patterns across the conversation."
          : "No single exchange stood out; this level reflects missed opportunities across the conversation.",
    };
  }

  return {
    turnIndex: best.turnIndex,
    quote: best.quote,
    context: best.context,
  };
}

/** Internal only — not shown in user-facing feedback */
export function buildShortReasoning(
  competency: CompetencyKey,
  level: string,
  profile: SessionBehaviorProfile,
  evidenceCount: number
): string {
  void competency;
  void level;
  void profile;
  void evidenceCount;
  return "";
}

/** @deprecated Use extractGroundedEvidence */
export type BehavioralEvidenceObservation = {
  turnIndex: number;
  quote: string;
  observation: string;
  stakeholderEffect: string;
  competency: CompetencyKey;
  isNegative?: boolean;
};

/** @deprecated Use extractGroundedEvidence */
export function extractBehavioralEvidence(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey,
  level: BehavioralLevel = "Competent"
): BehavioralEvidenceObservation[] {
  return extractGroundedEvidence(profile, competency, level).map((b) => ({
    turnIndex: b.turnIndex,
    quote: "",
    competency,
    observation: b.text,
    stakeholderEffect: "",
  }));
}

/** @deprecated Use buildShortReasoning */
export function buildBehavioralReasoning(
  competency: CompetencyKey,
  level: string,
  profile: SessionBehaviorProfile,
  positiveCount: number,
  _negativeCount: number
): string {
  return buildShortReasoning(competency, level, profile, positiveCount);
}
