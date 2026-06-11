import { ops_resistant_leader } from "@/lib/scenarios";
import { ScenarioDefinition } from "./scenarioDefinition";
import {
  createSessionIdAvoidingStakeholder,
  StakeholderProfile,
  toStakeholderDisplay,
} from "./stakeholderIdentity";
import {
  createSimulationSession,
  registerSimulationSession,
  SimulationSession,
} from "./sessionStore";

export type ClientScenarioContext = {
  scenarioNarrative: readonly string[];
  stakeholderName: string;
  stakeholderRole: string;
  stakeholderCaresAbout: readonly string[];
};

export type ClientSimulationSession = {
  sessionId: string;
  stakeholder: {
    id: string;
    name: string;
    role: string;
    displayLabel: string;
    personality?: string;
  };
  scenario: string;
  initialPrompt: string;
  scenarioContext: ClientScenarioContext;
};

function stakeholderPersonality(profile: StakeholderProfile): string | undefined {
  if (!profile.communicationStyle) return undefined;
  return profile.communicationStyle;
}

function toClientScenarioContext(
  definition: ScenarioDefinition,
  stakeholder: StakeholderProfile
): ClientScenarioContext {
  return {
    scenarioNarrative: definition.scenarioNarrative,
    stakeholderName: stakeholder.fullName,
    stakeholderRole: stakeholder.roleTitle,
    stakeholderCaresAbout: definition.stakeholderCaresAbout,
  };
}

export function toClientSimulationSession(
  sessionId: string,
  session: SimulationSession
): ClientSimulationSession {
  const display = toStakeholderDisplay(session.stakeholder);
  return {
    sessionId,
    stakeholder: {
      id: session.stakeholder.id,
      name: display.fullName,
      role: display.roleTitle,
      displayLabel: display.displayLabel,
      personality: stakeholderPersonality(session.stakeholder),
    },
    scenario: ops_resistant_leader.id,
    initialPrompt: session.openingScenario.content,
    scenarioContext: toClientScenarioContext(
      session.openingScenario.definition,
      session.stakeholder
    ),
  };
}

/** Create and persist a simulation session on the server — single source of truth. */
export function initializeSimulationSession(): ClientSimulationSession {
  const sessionId = createSessionIdAvoidingStakeholder(ops_resistant_leader.id);
  const session = createSimulationSession(sessionId);
  registerSimulationSession(sessionId, session);
  return toClientSimulationSession(sessionId, session);
}
