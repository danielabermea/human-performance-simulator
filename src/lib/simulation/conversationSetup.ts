import { ScenarioDefinition } from "./scenarioDefinition";
import { StakeholderProfile } from "./stakeholderIdentity";

export const CONVERSATION_SETUP_LINE =
  "First conversation about a proposed workplace initiative that may affect Alicia's team.";

export function buildConversationSetup(
  _sessionId: string,
  _stakeholder: StakeholderProfile,
  _definition: ScenarioDefinition
): string {
  return CONVERSATION_SETUP_LINE;
}
