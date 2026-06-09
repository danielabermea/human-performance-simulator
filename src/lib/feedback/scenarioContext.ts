import { MessageTurn, SessionSummary } from "./coachingFeedback";
import { StakeholderProfile } from "../simulation/stakeholderIdentity";
import { SessionBehaviorProfile } from "./behaviorSignals";
import { ScenarioState } from "../simulation/types";

const CAPACITY_KEYWORDS = [
  "capacity",
  "workload",
  "bandwidth",
  "stretched",
  "competing priorities",
  "disruption",
  "another initiative",
  "more work",
];

function stakeholderFirstName(stakeholder: StakeholderProfile): string {
  return stakeholder.fullName.split(/\s+/)[0] ?? stakeholder.fullName;
}

function stakeholderRaisedCapacityConcerns(transcript: MessageTurn[]): boolean {
  const assistantText = transcript
    .filter((turn) => turn.role === "assistant")
    .map((turn) => turn.content.toLowerCase())
    .join("\n");

  if (!assistantText.trim()) return false;

  return CAPACITY_KEYWORDS.some((keyword) => assistantText.includes(keyword));
}

function userAcknowledgedCapacityConcerns(profile: SessionBehaviorProfile): boolean {
  return profile.turns.some(
    (turn) =>
      turn.perspectiveEngagement ||
      turn.stakeholderFirstReasoning ||
      turn.reducedStakeholderDefensiveness ||
      (turn.invitedDialogue && turn.facedHighResistance)
  );
}

function isRelationshipBreakdown(
  finalState: ScenarioState,
  sessionSummary: SessionSummary,
  profile: SessionBehaviorProfile
): boolean {
  return (
    finalState.conversationStatus === "lost" ||
    sessionSummary === "relationshipStrained" ||
    profile.negativeInteractionCount >= 2 ||
    finalState.ruptureLevel >= 60 ||
    (finalState.trust < 40 && profile.trustDelta < -5)
  );
}

function describeStakeholderConcern(
  name: string,
  transcript: MessageTurn[]
): string {
  if (stakeholderRaisedCapacityConcerns(transcript)) {
    return `${name} repeatedly raised concerns about workload, team capacity, and the disruption this initiative could create.`;
  }

  return `${name}'s main concern was whether the initiative would add workload and strain an already stretched team.`;
}

function describeWhatHelped(
  name: string,
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  sessionSummary: SessionSummary
): string | null {
  if (isRelationshipBreakdown(finalState, sessionSummary, profile)) {
    return null;
  }

  if (profile.negativeInteractionCount >= 1) {
    return null;
  }

  const hasHostileLanguage = profile.turns.some((turn) => turn.hostileOrPersonalAttack);
  if (hasHostileLanguage) {
    return null;
  }

  if (profile.trustDelta < 3) {
    return null;
  }

  if (profile.perspectiveEngagementCount >= 1 && userAcknowledgedCapacityConcerns(profile)) {
    return `Engaging ${name}'s perspective and acknowledging constraints before advancing your proposal helped keep the dialogue constructive.`;
  }

  if (profile.defensivenessReductionCount >= 1 && profile.resistanceDelta >= 3) {
    return `Acknowledging capacity and disruption concerns directly helped reduce defensiveness.`;
  }

  if (
    profile.reframingCount >= 1 &&
    profile.resistanceDelta >= 3 &&
    profile.negativeInteractionCount === 0
  ) {
    return `Adjusting your framing after pushback helped move the discussion toward collaboration.`;
  }

  if (profile.trustBuildingCount >= 1 && profile.trustDelta >= 5) {
    return `Grounded, specific responses helped build enough trust for ${name} to stay engaged.`;
  }

  return null;
}

function describeWhatHurt(
  name: string,
  profile: SessionBehaviorProfile,
  transcript: MessageTurn[]
): string[] {
  const bullets: string[] = [];
  const raisedCapacity = stakeholderRaisedCapacityConcerns(transcript);
  const acknowledged = userAcknowledgedCapacityConcerns(profile);

  if (raisedCapacity && !acknowledged) {
    bullets.push(
      "Those concerns were not explored or acknowledged before the conversation moved on."
    );
  }

  if (profile.turns.some((turn) => turn.hostileOrPersonalAttack)) {
    bullets.push(
      "Hostile or personal language shifted the conversation away from the initiative and toward the interaction itself."
    );
  } else if (
    profile.turns.some(
      (turn) => turn.dismissiveOrAggressive && !turn.hostileOrPersonalAttack
    )
  ) {
    bullets.push(
      "Dismissive or pressuring language made it harder for the stakeholder to stay engaged on the substance."
    );
  } else if (profile.turns.some((turn) => turn.passiveOrNonDirective)) {
    bullets.push(
      "Short agreement without next steps kept the conversation from moving toward a decision or resolution."
    );
  } else if (profile.escalationUnderPressureCount >= 1) {
    bullets.push(
      "Tone escalated under pushback, which increased defensiveness and reduced openness."
    );
  }

  if (
    profile.vagueUnderChallengeCount >= 2 &&
    bullets.length < 2 &&
    profile.negativeInteractionCount === 0
  ) {
    bullets.push(
      `Vague responses when ${name} asked for specifics weakened trust in the proposal.`
    );
  }

  if (
    profile.trustDelta < -5 &&
    profile.negativeInteractionCount === 0 &&
    bullets.length < 2
  ) {
    bullets.push(
      `${name} became more guarded as the conversation progressed, and trust did not recover.`
    );
  }

  return bullets.slice(0, 2);
}

function describeWhyConversationEnded(
  name: string,
  finalState: ScenarioState,
  sessionSummary: SessionSummary,
  profile: SessionBehaviorProfile
): string {
  if (finalState.conversationStatus === "lost") {
    return `${name} ultimately chose to disengage after the relationship became too strained to continue productively.`;
  }

  if (finalState.conversationStatus === "concluded") {
    if (finalState.closureReason === "commitment") {
      return "The conversation ended with agreement to move forward on defined next steps.";
    }
    if (finalState.closureReason === "decline") {
      return `${name} declined to move forward, ending the conversation without alignment.`;
    }
    return "The conversation reached a natural close after the main concerns were addressed.";
  }

  if (finalState.conversationStatus === "userEnded") {
    return "You ended the simulation before a clear resolution was reached.";
  }

  if (
    sessionSummary === "strongAlignment" ||
    finalState.conversationStatus === "conditionallyAccepted" ||
    finalState.conversationStatus === "conclusion"
  ) {
    if (profile.trustDelta >= 5 && profile.negativeInteractionCount === 0) {
      return `${name} remained willing to continue the conversation and consider next steps on the initiative.`;
    }
    return `The conversation ended with partial alignment, though ${name} still had open concerns.`;
  }

  if (sessionSummary === "relationshipStrained" || finalState.ruptureLevel >= 55) {
    return `${name} remained guarded, and the conversation ended without meaningful alignment.`;
  }

  return `${name} stayed cautious, and the conversation ended with important concerns still unresolved.`;
}

export function buildScenarioInsights(
  stakeholder: StakeholderProfile,
  finalState: ScenarioState,
  profile: SessionBehaviorProfile,
  sessionSummary: SessionSummary,
  transcript: MessageTurn[] = []
): string[] {
  const name = stakeholderFirstName(stakeholder);
  const insights: string[] = [describeStakeholderConcern(name, transcript)];

  const helped = describeWhatHelped(name, profile, finalState, sessionSummary);
  if (helped) {
    insights.push(helped);
  }

  for (const hurt of describeWhatHurt(name, profile, transcript)) {
    if (insights.length >= 3) break;
    insights.push(hurt);
  }

  insights.push(describeWhyConversationEnded(name, finalState, sessionSummary, profile));

  return insights.slice(0, 4);
}
