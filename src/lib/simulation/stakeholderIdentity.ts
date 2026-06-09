export type StakeholderRoleCategory =
  | "project_manager"
  | "operations_manager"
  | "functional_director"
  | "cross_functional_lead";

export type StakeholderCommunicationStyle = "skeptical" | "collaborative" | "analytical";
export type StakeholderPriorityLens = "risk" | "efficiency" | "people" | "strategy";

export type StakeholderProfile = {
  id: string;
  fullName: string;
  roleTitle: string;
  scenarioRole: StakeholderRoleCategory;
  communicationStyle?: StakeholderCommunicationStyle;
  priorityLens?: StakeholderPriorityLens;
};

export type StakeholderDisplay = {
  fullName: string;
  roleTitle: string;
  displayLabel: string;
};

/** MVP: single stakeholder for all simulations */
export const ALICIA_MORGAN: StakeholderProfile = {
  id: "alicia_morgan",
  fullName: "Alicia Morgan",
  roleTitle: "Director of Supply Chain Operations",
  scenarioRole: "functional_director",
  communicationStyle: "skeptical",
  priorityLens: "strategy",
};

export const ALICIA_MINDSET = [
  "Responsible for operational execution",
  "Protective of her team's capacity",
  "Skeptical of initiatives that promise more than they deliver",
  "Concerned about workload, disruption, and competing priorities",
  "Open to collaboration when concerns are acknowledged",
] as const;

export function formatStakeholderLabel(profile: StakeholderProfile): string {
  return `${profile.fullName}, ${profile.roleTitle}`;
}

export function toStakeholderDisplay(profile: StakeholderProfile): StakeholderDisplay {
  return {
    fullName: profile.fullName,
    roleTitle: profile.roleTitle,
    displayLabel: formatStakeholderLabel(profile),
  };
}

/** MVP: always returns Alicia Morgan */
export function pickStakeholderForSession(
  _scenarioId?: string,
  _sessionId?: string
): StakeholderProfile {
  return ALICIA_MORGAN;
}

/** MVP: new session id only — no stakeholder rotation */
export function createSessionIdAvoidingStakeholder(
  _scenarioId?: string,
  _avoidStakeholderId?: string
): string {
  return crypto.randomUUID();
}

export function buildStakeholderIdentityPrompt(profile: StakeholderProfile): string {
  const lines = [
    `CHARACTER IDENTITY (stay in character throughout):`,
    `You are ${profile.fullName}, ${profile.roleTitle}.`,
    `Speak and respond as this specific person — not a generic role or system label.`,
    ``,
    `YOUR MINDSET:`,
    `- Responsible for operational execution`,
    `- Protective of your team's capacity`,
    `- Skeptical of initiatives that promise more than they deliver`,
    `- Concerned about workload, disruption, and competing priorities`,
    `- Open to collaboration when concerns are acknowledged`,
    `- Not hostile or argumentative — but you will disengage if dismissed or disrespected`,
    ``,
    `OPENING STYLE:`,
    `- Communicate limited time, operational impact, and need for clarity`,
    `- Keep meetings productive and action-oriented`,
  ];

  if (profile.communicationStyle) {
    lines.push(
      `Internal communication style (do not reveal): ${profile.communicationStyle}, direct and brief`
    );
  }

  return lines.join("\n");
}
