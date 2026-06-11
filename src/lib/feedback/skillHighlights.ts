import { SessionBehaviorProfile, TurnBehaviorSignals } from "./behaviorSignals";
import { ScenarioState } from "../simulation/types";

export type SkillHighlight = {
  skillName: string;
  observed: string;
  whyItMatters: string;
};

function quoteExcerpt(quote: string, max = 58): string {
  const trimmed = quote.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function isRelationshipBreakdown(
  finalState: ScenarioState,
  profile: SessionBehaviorProfile
): boolean {
  return (
    finalState.conversationStatus === "lost" ||
    (finalState.trust < 45 && finalState.ruptureLevel >= 55) ||
    (finalState.readinessScore < 40 && profile.trustDelta <= -8)
  );
}

function conversationWentWell(finalState: ScenarioState): boolean {
  return (
    finalState.conversationStatus === "concluded" ||
    finalState.conversationStatus === "conclusion" ||
    finalState.conversationStatus === "conditionallyAccepted" ||
    finalState.conversationStatus === "conditionallyAcceptedWin"
  );
}

type StrengthCandidate = {
  skillName: string;
  score: number;
  observed: string;
  whyItMatters: string;
};

function candidateFromTurn(
  turn: TurnBehaviorSignals,
  skillName: string,
  score: number,
  observedIntro: string,
  whyItMatters: string
): StrengthCandidate {
  return {
    skillName,
    score,
    observed: `${observedIntro}: "${quoteExcerpt(turn.quote)}"`,
    whyItMatters,
  };
}

export function buildBiggestStrength(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  stakeholderFirstName: string
): SkillHighlight | null {
  if (isRelationshipBreakdown(finalState, profile)) {
    const hostileTurns = profile.turns.filter(
      (t) => t.hostileOrPersonalAttack || t.dismissiveOrAggressive
    ).length;
    if (hostileTurns >= 2) return null;
  }

  const candidates: StrengthCandidate[] = [];

  const perspectiveTurn = profile.turns.find((t) => t.perspectiveEngagement);
  if (perspectiveTurn) {
    candidates.push(
      candidateFromTurn(
        perspectiveTurn,
        "Perspective-Taking",
        40 + profile.perspectiveEngagementCount * 8,
        `You invited ${stakeholderFirstName}'s perspective before advancing your position`,
        "Perspective-taking surfaces the real concern behind resistance and keeps the conversation collaborative."
      )
    );
  }

  const validationTurn = profile.turns.find(
    (t) =>
      (t.acknowledgedStakeholderConcerns || t.stakeholderFirstReasoning) &&
      !t.dismissiveOrAggressive
  );
  if (validationTurn) {
    candidates.push(
      candidateFromTurn(
        validationTurn,
        "Validation",
        35 + profile.stakeholderFirstCount * 8,
        `You acknowledged ${stakeholderFirstName}'s constraints before discussing the initiative`,
        "Validation helps people feel heard before they are asked to consider change."
      )
    );
  }

  const dialogueTurn = profile.turns.find(
    (t) => t.invitedDialogue && t.facedHighResistance
  );
  if (dialogueTurn) {
    candidates.push(
      candidateFromTurn(
        dialogueTurn,
        "Open-ended Questions",
        30 + profile.dialogueInvitationCount * 6,
        "You asked an open-ended question when resistance was elevated",
        "Open-ended questions invite the stakeholder to define the problem in their own words."
      )
    );
  }

  const specificTurn = profile.turns.find(
    (t) => t.substantiveEngagement && !t.remainedVagueUnderChallenge
  );
  if (specificTurn && profile.vagueUnderChallengeCount === 0) {
    candidates.push(
      candidateFromTurn(
        specificTurn,
        "Specific Communication",
        28 + profile.substantiveEngagementCount * 5,
        "You responded with specific detail instead of vague reassurance",
        "Specific communication builds credibility when stakeholders press for operational clarity."
      )
    );
  }

  const reframeTurn = profile.turns.find((t) => t.reframedAfterPushback);
  if (reframeTurn) {
    candidates.push(
      candidateFromTurn(
        reframeTurn,
        "Collaborative Problem Solving",
        32 + profile.reframingCount * 7,
        "You adjusted your approach after pushback instead of repeating the same case",
        "Collaborative problem-solving shows you are designing with the stakeholder, not talking past them."
      )
    );
  }

  if (
    conversationWentWell(finalState) &&
    profile.dialogueInvitationCount >= 2 &&
    finalState.readinessScore >= 55
  ) {
    const alignmentTurn = profile.turns.find(
      (t) => t.invitedDialogue && /\?/.test(t.quote)
    );
    if (alignmentTurn) {
      candidates.push(
        candidateFromTurn(
          alignmentTurn,
          "Alignment Checking",
          25 + finalState.readinessScore / 5,
          "You checked whether the stakeholder had enough to evaluate the proposal",
          "Alignment checking moves the conversation from information-sharing toward a shared decision."
        )
      );
    }
  }

  if (candidates.length === 0) return null;

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return {
    skillName: best.skillName,
    observed: best.observed,
    whyItMatters: best.whyItMatters,
  };
}
