import { StakeholderProfile, StakeholderRoleCategory, ALICIA_MINDSET } from "./stakeholderIdentity";
import { ContextType, MotivationLens } from "./scenarioTypes";

export type SituationType =
  | "new_initiative"
  | "process_change"
  | "cross_team_alignment";

export type CoreTension =
  | "resistance_to_change"
  | "capacity_constraints"
  | "risk_concerns"
  | "change_fatigue";

export type ScenarioDefinition = {
  stakeholderRole: StakeholderRoleCategory;
  stakeholderName: string;
  stakeholderRoleTitle: string;
  situationType: SituationType;
  coreTension: CoreTension;
  stakeholderRoleLabel: string;
  situationLabel: string;
  tensionLabel: string;
  userRoleIntro: string;
  stakeholderIntro: string;
  stakeholderMindset: string[];
  communicationObjective: string;
  /** Standard sharp-format scenario prompt for AI and feedback */
  scenarioPrompt: string;
  /** Brief line for instruction panel (no "You are a" prefix) */
  userRoleLine: string;
  /** One-line scenario context for the brief */
  scenarioContextLine: string;
};

export const USER_ROLE_LINE = "Consultant leading a workplace initiative";

export const SCENARIO_CONTEXT_LINE =
  "Meeting with a stakeholder whose team will be affected by the initiative.";

const USER_ROLE_INTRO = `You are a consultant leading a significant workplace initiative.

You are meeting with a stakeholder whose team will be affected by the change.

The stakeholder is concerned about workload, competing priorities, and whether the initiative will create more work than value.`;

const STAKEHOLDER_ROLE_LABELS: Record<StakeholderRoleCategory, string> = {
  project_manager: "Project Manager",
  operations_manager: "Operations Manager",
  functional_director: "Functional Director",
  cross_functional_lead: "Cross-functional Lead",
};

const SITUATION_LABELS: Record<SituationType, string> = {
  new_initiative: "Introducing a new initiative",
  process_change: "Process change or operational improvement",
  cross_team_alignment: "Cross-team alignment effort",
};

const TENSION_LABELS: Record<CoreTension, string> = {
  resistance_to_change: "Competing priorities",
  capacity_constraints: "Capacity constraints",
  risk_concerns: "Day-to-day impact uncertainty",
  change_fatigue: "Prior initiative fatigue",
};

const STAKEHOLDER_MINDSET: string[] = [...ALICIA_MINDSET];

const COMMUNICATION_OBJECTIVE = `Success looks like:
- The stakeholder feels heard
- Key concerns are surfaced and clarified
- The stakeholder is willing to continue the conversation
- Clear next steps emerge`;

export const SUCCESS_LOOKS_LIKE = [
  "The stakeholder feels heard",
  "Key concerns are surfaced and clarified",
  "The stakeholder is willing to continue the conversation",
  "Clear next steps emerge",
] as const;

export function contextTypeToSituation(contextType: ContextType): SituationType {
  if (contextType === "cross_functional_alignment") {
    return "cross_team_alignment";
  }
  if (
    contextType === "process_change_proposal" ||
    contextType === "operational_improvement"
  ) {
    return "process_change";
  }
  return "new_initiative";
}

export function motivationLensToTension(motivationLens: MotivationLens): CoreTension {
  switch (motivationLens) {
    case "operational_risk":
      return "risk_concerns";
    case "burnout_capacity":
      return "capacity_constraints";
    case "prior_negative_experience":
      return "change_fatigue";
    case "political_pressure":
    case "efficiency_concerns":
      return "resistance_to_change";
  }
}

function formatScenarioPrompt(
  userRoleIntro: string,
  stakeholderIntro: string,
  stakeholderMindset: string[],
  communicationObjective: string
): string {
  const mindset = stakeholderMindset.map((item) => `- ${item}`).join("\n");
  return `${userRoleIntro}\n\n${stakeholderIntro}\n${mindset}\n\n${communicationObjective}`;
}

export function buildScenarioDefinition(
  _sessionId: string,
  stakeholder: StakeholderProfile,
  motivationLens: MotivationLens,
  contextType: ContextType
): ScenarioDefinition {
  const situationType = contextTypeToSituation(contextType);
  const coreTension = motivationLensToTension(motivationLens);

  const stakeholderRole = stakeholder.scenarioRole;
  const stakeholderRoleLabel = STAKEHOLDER_ROLE_LABELS[stakeholderRole];
  const situationLabel = SITUATION_LABELS[situationType];
  const tensionLabel = TENSION_LABELS[coreTension];

  const stakeholderMindset = STAKEHOLDER_MINDSET;
  const stakeholderIntro = `Stakeholder: ${stakeholder.fullName}, ${stakeholder.roleTitle}\nStakeholder mindset:`;

  const scenarioPrompt = formatScenarioPrompt(
    USER_ROLE_INTRO,
    stakeholderIntro,
    stakeholderMindset,
    COMMUNICATION_OBJECTIVE
  );

  return {
    stakeholderRole,
    stakeholderName: stakeholder.fullName,
    stakeholderRoleTitle: stakeholder.roleTitle,
    situationType,
    coreTension,
    stakeholderRoleLabel,
    situationLabel,
    tensionLabel,
    userRoleIntro: USER_ROLE_INTRO,
    stakeholderIntro,
    stakeholderMindset,
    communicationObjective: COMMUNICATION_OBJECTIVE,
    scenarioPrompt,
    userRoleLine: USER_ROLE_LINE,
    scenarioContextLine: SCENARIO_CONTEXT_LINE,
  };
}

export function buildScenarioDefinitionPrompt(definition: ScenarioDefinition): string {
  return `SCENARIO DEFINITION (background context for the user — never read aloud or expose as meta-commentary):
${definition.scenarioPrompt}

You are ${definition.stakeholderName}, ${definition.stakeholderRoleTitle}. Stay in character. The user is a consultant leading a significant workplace initiative.`;
}
