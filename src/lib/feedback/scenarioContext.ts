import { OpeningScenario } from "../simulation/openingScenarioGenerator";
import { StakeholderProfile } from "../simulation/stakeholderIdentity";
import { SessionSummary } from "./coachingFeedback";
import { SessionBehaviorProfile } from "./behaviorSignals";
import { ScenarioState } from "../simulation/types";

function stakeholderFirstName(stakeholder: StakeholderProfile): string {
  return stakeholder.fullName.split(/\s+/)[0] ?? stakeholder.fullName;
}

function describePrimaryConcern(stakeholder: StakeholderProfile): string {
  const name = stakeholderFirstName(stakeholder);
  return `${name}'s main concern was whether the initiative would create more work for an already stretched team.`;
}

function describeTrustShift(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  sessionSummary: SessionSummary
): string {
  if (
    profile.perspectiveEngagementCount >= 1 ||
    profile.trustDelta >= 3 ||
    profile.defensivenessReductionCount >= 1
  ) {
    return "Trust increased when you acknowledged capacity concerns directly.";
  }

  if (sessionSummary === "strongAlignment" || sessionSummary === "buildingTrust") {
    return "Trust improved as you addressed operational impact and made the ask more concrete.";
  }

  if (finalState.trust < 45 || sessionSummary === "relationshipStrained") {
    return "Trust stayed limited because workload and disruption concerns were not fully acknowledged.";
  }

  return "Progress depended on how directly you addressed capacity, competing priorities, and team impact.";
}

function describeConversationDynamic(
  profile: SessionBehaviorProfile,
  sessionSummary: SessionSummary
): string {
  if (profile.reframingCount >= 1) {
    return "The conversation improved when you shifted from convincing to collaborating.";
  }

  if (profile.perspectiveEngagementCount >= 2) {
    return "The dialogue became more productive when you explored the stakeholder's perspective before advancing your case.";
  }

  if (profile.escalationUnderPressureCount > 0) {
    return "The conversation closed down when responses became more defensive or directive under pushback.";
  }

  if (sessionSummary === "strongAlignment") {
    return "Alignment strengthened when you moved from abstract benefits to concrete safeguards and next steps.";
  }

  return "The conversation stayed most productive when you balanced clarity about the initiative with explicit acknowledgment of team impact.";
}

export function buildScenarioInsights(
  stakeholder: StakeholderProfile,
  _opening: OpeningScenario,
  finalState: ScenarioState,
  profile: SessionBehaviorProfile,
  sessionSummary: SessionSummary
): string[] {
  return [
    describePrimaryConcern(stakeholder),
    describeTrustShift(profile, finalState, sessionSummary),
    describeConversationDynamic(profile, sessionSummary),
  ];
}
