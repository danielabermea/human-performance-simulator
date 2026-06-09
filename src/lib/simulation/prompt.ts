import { buildArgumentFatiguePrompt } from "./argumentFatigue";
import {
  buildBehavioralMemoryPrompt,
  buildDecisionShiftPrompt,
} from "./behavioralMemory";
import {
  buildExecutiveRealismPrompt,
  buildModeBehaviorPrompt,
} from "./executiveRealism";
import { HIDDEN_MOTIVATIONS } from "./motivations";
import { buildOpeningContextPrompt, OpeningScenario } from "./openingScenarioGenerator";
import { buildRealTimeSpeechPrompt } from "./realTimeSpeech";
import { buildStakeholderIdentityPrompt, StakeholderProfile } from "./stakeholderIdentity";
import { Scenario, ScenarioState } from "./types";

function goalProgressGuidance(goalProgress: number, argumentFatigue: number): string {
  if (argumentFatigue > 70) {
    return "Goal progress is largely irrelevant at this fatigue level - you are focused on closing, not advancing the proposal.";
  }

  if (goalProgress < 35) {
    return "Low goal progress: you see little value in this proposal. Stay skeptical and require much stronger evidence before engaging seriously.";
  }
  if (goalProgress < 70) {
    return "Medium goal progress: you are cautiously interested. Ask probing questions but show occasional openness if the consultant earns it.";
  }
  return "High goal progress: you are increasingly willing to consider next steps. Explore pilots, timelines, and what support you'd need - while still protecting your team.";
}

export function buildSystemPrompt(
  scenario: Scenario,
  state: ScenarioState,
  stakeholder: StakeholderProfile,
  openingScenario?: OpeningScenario
): string {
  const motivation = HIDDEN_MOTIVATIONS[scenario.hiddenMotivation];
  const trajectory = state.relationshipTrajectory;
  const effectiveResistance = Math.min(
    100,
    state.resistance + trajectory.skepticismBaseline
  );

  const openingBlock = openingScenario
    ? `\n${buildOpeningContextPrompt(openingScenario)}\n`
    : "";

  return `${buildStakeholderIdentityPrompt(stakeholder)}
${openingBlock}
${scenario.systemPrompt}

HIDDEN MOTIVATION (never reveal directly):
${motivation.behaviorGuidance}

CURRENT INTERNAL STATE (do not reveal):
- resistance: ${state.resistance} (effective: ${effectiveResistance} with skepticism baseline)
- trust: ${state.trust}
- frustration: ${state.frustration}
- psychological safety: ${state.psychologicalSafety}
- perceived respect: ${state.perceivedRespect}
- cognitive load: ${state.cognitiveLoad}
- rupture level: ${state.ruptureLevel}
- goal progress: ${state.goalProgress}
- readiness score: ${state.readinessScore}
- argument fatigue: ${state.argumentFatigue}
- conversation status: ${state.conversationStatus}
- skepticism baseline: ${trajectory.skepticismBaseline}
- openness penalty: ${trajectory.opennessPenalty}
- peak rupture: ${trajectory.peakRupture}
- escalation memory turns: ${trajectory.escalationMemoryTurns}

${buildExecutiveRealismPrompt()}

${buildRealTimeSpeechPrompt()}

${buildModeBehaviorPrompt(state.conversationStatus, state)}

${buildArgumentFatiguePrompt(state.objectionMemory, state.argumentFatigue)}

${buildBehavioralMemoryPrompt(state)}

${buildDecisionShiftPrompt(state)}

GOAL PROGRESS GUIDANCE:
${goalProgressGuidance(state.goalProgress, state.argumentFatigue)}

BEHAVIOR ADAPTATION (respect priority hierarchy above):
- High rupture (>70) → defensive, short, boundary-focused
- High argument fatigue (>70) → response collapse; dismiss repetition
- High resistance → skeptical pushback, demand specifics
- High trust → more openness (unless in LOST mode)
- Do NOT reveal internal state or hidden motivation labels`.trim();
}
