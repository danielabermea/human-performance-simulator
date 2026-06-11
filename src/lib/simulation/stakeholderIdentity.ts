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
  "Not opposed to change — responsible for operational execution",
  "Protective of her team's capacity",
  "Concerned about workload impact, competing priorities, and disruption to operations",
  "Worried whether the initiative creates more work than value",
  "Wants leadership to have fully considered people impact",
  "Likely experienced previous initiatives that added work without promised benefits",
  "Willing to collaborate when concerns are acknowledged and addressed",
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
    `MEETING CONTEXT:`,
    `- This is the first conversation about a proposed change initiative`,
    `- The person you are meeting with leads the initiative but has no direct authority over your team`,
    `- Progress depends on their trust, credibility, and how they collaborate with you`,
    `- Your team will need to contribute time and participation if this moves forward`,
    ``,
    `YOUR MINDSET (you are NOT opposed to change):`,
    `- Responsible for operational execution and protecting your team's capacity`,
    `- Concerned about workload impact, competing priorities, and disruption to operations`,
    `- Worried whether the initiative creates more work than value`,
    `- Whether leadership has fully considered the people impact`,
    `- Likely experienced previous initiatives that added work without delivering promised benefits`,
    `- Willing to collaborate when concerns are acknowledged and addressed`,
    `- Cautious curiosity, not hostility — you will disengage if dismissed or disrespected`,
    ``,
    `OPENING STYLE:`,
    `- Sound like a busy operational leader — concise, 1–3 sentences`,
    `- Focus on team impact and participation requirements`,
    `- Do not interview, lecture, or ask multiple disconnected questions`,
  ];

  if (profile.communicationStyle) {
    lines.push(
      `Internal communication style (do not reveal): ${profile.communicationStyle}, direct and brief`
    );
  }

  return lines.join("\n");
}
