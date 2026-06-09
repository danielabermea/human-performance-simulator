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

  const escalatedUnderPressure =
    pressure &&
    (dismissiveOrAggressive ||
      analysis.tone.hasEscalationLanguage ||
      ruptureDelta > 8);

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
      if (turn.dismissiveOrAggressive) {
        bullets.push({
          turnIndex: t,
          text: "Your language became dismissive or aggressive while the stakeholder was pushing back.",
        });
      }
      if (turn.escalatedUnderPressure) {
        bullets.push({
          turnIndex: t,
          text: "Your tone or framing escalated while stakeholder pushback was present.",
        });
      }
      if (turn.interruptedFlow && !turn.dismissiveOrAggressive) {
        bullets.push({
          turnIndex: t,
          text: "The exchange became harder to engage with when pressure increased.",
        });
      }
    }

    if (competency === "relationshipIntelligence") {
      if (turn.dismissiveOrAggressive) {
        bullets.push({
          turnIndex: t,
          text: "This response damaged rapport and made the stakeholder more guarded.",
        });
      }
      if (turn.trustDelta <= -4) {
        bullets.push({
          turnIndex: t,
          text: "Trust dropped after this exchange, signaling relationship strain.",
        });
      }
      if (turn.ruptureDelta >= 6) {
        bullets.push({
          turnIndex: t,
          text: "Tension spiked here, reducing willingness to collaborate.",
        });
      }
      if (turn.resistanceDelta <= -4) {
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
      if (
        turn.facedHighResistance &&
        !turn.reframedAfterPushback &&
        !turn.perspectiveEngagement
      ) {
        bullets.push({
          turnIndex: t,
          text: "You repeated your position without adjusting when resistance appeared.",
        });
      }
      if (turn.remainedVagueUnderChallenge) {
        bullets.push({
          turnIndex: t,
          text: "You did not adapt with clearer reasoning when the stakeholder pressed for detail.",
        });
      }
    }

    if (competency === "humanCenteredDecisionMaking") {
      if (turn.dismissiveOrAggressive) {
        bullets.push({
          turnIndex: t,
          text: "People impact and respect were overlooked in favor of pushing the proposal.",
        });
      }
      if (turn.safetyDelta <= -4) {
        bullets.push({
          turnIndex: t,
          text: "The stakeholder seemed less safe raising concerns after this exchange.",
        });
      }
      if (turn.respectDelta <= -4) {
        bullets.push({
          turnIndex: t,
          text: "The stakeholder appeared less respected or heard following this response.",
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

function positiveTurnScore(turn: TurnBehaviorSignals, competency: CompetencyKey): number {
  switch (competency) {
    case "emotionalIntelligence":
      return (
        (turn.maintainedComposureUnderPressure ? 3 : 0) +
        (turn.toneStabilized ? 2 : 0) +
        (turn.recoveredAfterChallenge ? 4 : 0)
      );
    case "relationshipIntelligence":
      return (
        (turn.trustDelta >= 3 ? turn.trustDelta : 0) +
        (turn.resistanceDelta >= 3 ? turn.resistanceDelta : 0) +
        (turn.perspectiveEngagement ? 4 : 0) +
        (turn.reducedStakeholderDefensiveness ? 3 : 0) +
        (turn.ruptureDelta <= -3 ? Math.abs(turn.ruptureDelta) : 0)
      );
    case "criticalThinkingDiscernment":
      return (
        (turn.reasonedUnderUncertainty ? 5 : 0) +
        (turn.substantiveEngagement ? 2 : 0)
      );
    case "adaptabilityLearningAgility":
      return (
        (turn.reframedAfterPushback ? 5 : 0) +
        (turn.alignmentShift ? 4 : 0) +
        (turn.resistanceDelta >= 3 ? turn.resistanceDelta : 0)
      );
    case "humanCenteredDecisionMaking":
      return (
        (turn.stakeholderFirstReasoning ? 5 : 0) +
        (turn.safetyDelta >= 3 ? turn.safetyDelta : 0) +
        (turn.respectDelta >= 3 ? turn.respectDelta : 0)
      );
  }
}

function negativeTurnScore(turn: TurnBehaviorSignals, competency: CompetencyKey): number {
  switch (competency) {
    case "emotionalIntelligence":
      return (
        (turn.dismissiveOrAggressive ? 10 : 0) +
        (turn.escalatedUnderPressure ? 8 : 0) +
        (turn.interruptedFlow ? 3 : 0) +
        Math.max(0, turn.ruptureDelta)
      );
    case "relationshipIntelligence":
      return (
        (turn.dismissiveOrAggressive ? 10 : 0) +
        (turn.trustDelta <= -3 ? Math.abs(turn.trustDelta) * 2 : 0) +
        (turn.ruptureDelta >= 5 ? turn.ruptureDelta : 0) +
        (turn.resistanceDelta <= -3 ? Math.abs(turn.resistanceDelta) : 0) +
        (turn.interruptedFlow ? 4 : 0)
      );
    case "criticalThinkingDiscernment":
      return (
        (turn.remainedVagueUnderChallenge ? 8 : 0) +
        (turn.prematureSolutioning ? 5 : 0)
      );
    case "adaptabilityLearningAgility":
      return (
        (turn.facedHighResistance &&
        !turn.reframedAfterPushback &&
        !turn.perspectiveEngagement
          ? 7
          : 0) + (turn.remainedVagueUnderChallenge ? 5 : 0)
      );
    case "humanCenteredDecisionMaking":
      return (
        (turn.dismissiveOrAggressive ? 10 : 0) +
        (turn.safetyDelta <= -3 ? Math.abs(turn.safetyDelta) * 2 : 0) +
        (turn.respectDelta <= -3 ? Math.abs(turn.respectDelta) * 2 : 0)
      );
  }
}

function positiveKeyMomentContext(
  turn: TurnBehaviorSignals,
  competency: CompetencyKey
): string {
  switch (competency) {
    case "emotionalIntelligence":
      if (turn.recoveredAfterChallenge) {
        return "You recovered composure after tension, which kept the conversation recoverable.";
      }
      return "This moment reflects steady emotional regulation when the stakeholder challenged you.";
    case "relationshipIntelligence":
      if (turn.reducedStakeholderDefensiveness) {
        return "This exchange reduced defensiveness and opened space for further dialogue.";
      }
      return "This moment helped build trust and kept the stakeholder willing to engage.";
    case "criticalThinkingDiscernment":
      return "This moment shows thoughtful reasoning when the stakeholder pressed for clarity.";
    case "adaptabilityLearningAgility":
      if (turn.reframedAfterPushback) {
        return "You adapted your framing after pushback rather than repeating the same argument.";
      }
      return "This moment reflects flexibility when resistance appeared.";
    case "humanCenteredDecisionMaking":
      if (turn.stakeholderFirstReasoning) {
        return "You prioritized stakeholder constraints before advancing the proposal.";
      }
      return "This moment balanced people impact with the change you were advocating.";
  }
}

function negativeKeyMomentContext(
  turn: TurnBehaviorSignals,
  competency: CompetencyKey
): string {
  switch (competency) {
    case "emotionalIntelligence":
      if (turn.dismissiveOrAggressive) {
        return "The conversation shifted from discussing concerns to attacking the stakeholder, increasing defensiveness and reducing trust.";
      }
      if (turn.escalatedUnderPressure) {
        return "Escalation here made the stakeholder more guarded and less willing to engage constructively.";
      }
      return "This moment reflects difficulty staying composed when the stakeholder pushed back.";
    case "relationshipIntelligence":
      if (turn.dismissiveOrAggressive) {
        return "This exchange strained the relationship and reduced the stakeholder's willingness to collaborate.";
      }
      return "Trust and openness decreased after this exchange, making alignment harder to reach.";
    case "criticalThinkingDiscernment":
      if (turn.remainedVagueUnderChallenge) {
        return "Staying vague here missed an opportunity to address the stakeholder's request for specifics.";
      }
      return "This moment reflects reasoning that did not meet the stakeholder's need for clarity.";
    case "adaptabilityLearningAgility":
      return "You did not adjust your approach when resistance appeared, limiting progress in the conversation.";
    case "humanCenteredDecisionMaking":
      if (turn.dismissiveOrAggressive) {
        return "This response overlooked stakeholder impact and respect, eroding psychological safety.";
      }
      return "This moment reflects missed opportunities to center people impact in the discussion.";
  }
}

export function selectKeyMoment(
  profile: SessionBehaviorProfile,
  competency: CompetencyKey,
  level: BehavioralLevel
): KeyMoment {
  const polarity = evidencePolarityForLevel(level, profile, competency);
  const scoreTurn =
    polarity === "positive" ? positiveTurnScore : negativeTurnScore;
  const contextFor =
    polarity === "positive" ? positiveKeyMomentContext : negativeKeyMomentContext;

  let best: TurnBehaviorSignals | undefined;
  let bestScore = 0;

  for (const turn of profile.turns) {
    const score = scoreTurn(turn, competency);
    if (score > bestScore) {
      bestScore = score;
      best = turn;
    }
  }

  if (!best || bestScore <= 0) {
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
    quote: firstSentence(best.quote),
    context: contextFor(best, competency),
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
