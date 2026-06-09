import { MessageTurn } from "@/lib/feedback/coachingFeedback";
import { createInitialScores, ExecutiveScores } from "@/lib/feedback/executiveScoring";
import { createInitialConversationMetrics, ConversationMetrics } from "@/lib/feedback/conversationMetrics";
import { ops_resistant_leader } from "@/lib/scenarios";
import {
  generateOpeningScenario,
  OpeningScenario,
} from "@/lib/simulation/openingScenarioGenerator";
import {
  pickStakeholderForSession,
  StakeholderProfile,
  toStakeholderDisplay,
  StakeholderDisplay,
} from "@/lib/simulation/stakeholderIdentity";
import { ScenarioState } from "@/lib/simulation/types";

export type SimulationSession = {
  state: ScenarioState;
  initialState: ScenarioState;
  metrics: ConversationMetrics;
  executiveScores: ExecutiveScores;
  transcript: MessageTurn[];
  stakeholder: StakeholderProfile;
  openingScenario: OpeningScenario;
};

function createFreshState(): ScenarioState {
  return structuredClone(ops_resistant_leader.initialState);
}

export function createSimulationSession(sessionId: string): SimulationSession {
  const state = createFreshState();
  const stakeholder = pickStakeholderForSession(ops_resistant_leader.id, sessionId);
  return {
    state,
    initialState: structuredClone(state),
    metrics: createInitialConversationMetrics(),
    executiveScores: createInitialScores(),
    transcript: [],
    stakeholder,
    openingScenario: generateOpeningScenario(sessionId, stakeholder),
  };
}

export function getSessionStakeholderDisplay(
  session: SimulationSession
): StakeholderDisplay {
  return toStakeholderDisplay(session.stakeholder);
}

const sessions = new Map<string, SimulationSession>();

export function getSimulationSession(sessionId: string): SimulationSession {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  let session = sessions.get(sessionId);
  if (!session) {
    session = createSimulationSession(sessionId);
    sessions.set(sessionId, session);
  }

  return session;
}

export function registerSimulationSession(
  sessionId: string,
  session: SimulationSession
): void {
  sessions.set(sessionId, session);
}

export function resetSimulationSession(sessionId: string): SimulationSession {
  const session = createSimulationSession(sessionId);
  sessions.set(sessionId, session);
  return session;
}

export function pruneSessions(activeSessionId: string): void {
  if (sessions.size <= 50) return;

  for (const id of sessions.keys()) {
    if (id !== activeSessionId) {
      sessions.delete(id);
    }
    if (sessions.size <= 50) break;
  }
}
