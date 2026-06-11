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

function describeStakeholderConcern(
  name: string,
  transcript: MessageTurn[]
): string {
  if (stakeholderRaisedCapacityConcerns(transcript)) {
    return `${name} focused on workload, team capacity, and disruption from the initiative.`;
  }

  return `${name}'s primary concern was whether the initiative would strain an already stretched team.`;
}

function describeConversationTrajectory(
  name: string,
  finalState: ScenarioState,
  profile: SessionBehaviorProfile,
  sessionSummary: SessionSummary
): string {
  if (finalState.conversationStatus === "lost") {
    return "The conversation became strained and ended with the stakeholder disengaging.";
  }

  if (profile.trustDelta >= 5 && profile.negativeInteractionCount === 0) {
    return `${name} became more open as the conversation progressed.`;
  }

  if (profile.trustDelta <= -5 || profile.negativeInteractionCount >= 2) {
    return `${name} grew more guarded as the conversation progressed.`;
  }

  if (sessionSummary === "relationshipStrained" || finalState.ruptureLevel >= 55) {
    return "Tension remained high and alignment did not meaningfully improve.";
  }

  if (profile.reframingCount >= 1 && profile.resistanceDelta >= 3) {
    return "Pushback eased after you adjusted your approach mid-conversation.";
  }

  return `${name} stayed cautious throughout, with concerns only partially addressed.`;
}

function describeDecisionDynamics(
  name: string,
  finalState: ScenarioState,
  profile: SessionBehaviorProfile
): string {
  if (finalState.conversationStatus === "concluded") {
    if (finalState.closureReason === "commitment") {
      return "The exchange ended with agreement on next steps.";
    }
    if (finalState.closureReason === "decline") {
      return `${name} declined to move forward without alignment.`;
    }
    return "The conversation closed before a clear decision was reached.";
  }

  if (
    finalState.conversationStatus === "conditionallyAccepted" ||
    finalState.conversationStatus === "conclusion"
  ) {
    return `${name} moved toward conditional support, though some concerns remained open.`;
  }

  if (finalState.conversationStatus === "lost") {
    return "No decision was reached — the relationship broke down first.";
  }

  if (profile.turns.some((t) => t.passiveOrNonDirective)) {
    return "The conversation stalled short of a decision or clear next steps.";
  }

  return "The exchange ended without a clear decision or resolution.";
}

export function buildScenarioInsights(
  stakeholder: StakeholderProfile,
  finalState: ScenarioState,
  profile: SessionBehaviorProfile,
  sessionSummary: SessionSummary,
  transcript: MessageTurn[] = []
): string[] {
  const name = stakeholderFirstName(stakeholder);

  return [
    describeStakeholderConcern(name, transcript),
    describeConversationTrajectory(name, finalState, profile, sessionSummary),
    describeDecisionDynamics(name, finalState, profile),
  ];
}
