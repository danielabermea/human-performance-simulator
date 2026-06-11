import { buildArgumentFatiguePrompt } from "./argumentFatigue";
import { buildBehavioralMemoryPrompt } from "./behavioralMemory";
import { buildStakeholderBehaviorPrompt } from "./stakeholderBehavior";
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
    return "Low goal progress: you see little value in this proposal. Express skepticism and defer or conditionally reject unless they demonstrate understanding of your constraints.";
  }
  if (goalProgress < 70) {
    return "Medium goal progress: you are cautiously interested. Weigh what you've heard and move toward a conditional position — not another round of detail requests.";
  }
  return "High goal progress: you have enough to decide. Offer conditional support or next steps — do not reopen basic evaluation.";
}

export function buildSystemPrompt(
  scenario: Scenario,
  state: ScenarioState,
  stakeholder: StakeholderProfile,
  openingScenario?: OpeningScenario,
  clarificationStreak = 0
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

${buildStakeholderBehaviorPrompt(state, clarificationStreak)}

GOAL PROGRESS GUIDANCE:
${goalProgressGuidance(state.goalProgress, state.argumentFatigue)}

BEHAVIOR ADAPTATION (respect priority hierarchy above):
- High rupture (>70) → disengaging: boundary-setting, no questions
- High argument fatigue (>70) → response collapse; dismiss repetition
- High resistance → concerned: state worries and react, not endless probes
- High trust → collaborative: problem-solve and decide, do not re-interrogate
- Do NOT reveal internal state, relationship state labels, or hidden motivation labels`.trim();
}
