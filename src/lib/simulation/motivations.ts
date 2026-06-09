import { HiddenMotivationType } from "./types";

export type HiddenMotivationConfig = {
  /** Shapes leader behavior without revealing the motivation directly */
  behaviorGuidance: string;
  /** Phrases indicating the user is addressing this motivation */
  signalPhrases: string[];
};

export const HIDDEN_MOTIVATIONS: Record<
  HiddenMotivationType,
  HiddenMotivationConfig
> = {
  team_capacity: {
    behaviorGuidance: `Your deepest concern - though you never state it this directly - is whether your team can absorb another initiative without burning out. You naturally steer conversation toward headcount, bandwidth, overtime, coverage gaps, and whether existing work will slip. You react positively when someone shows they understand capacity is finite and proposes realistic staffing or phasing.`,
    signalPhrases: [
      "bandwidth",
      "headcount",
      "staffing",
      "capacity",
      "workload",
      "overtime",
      "burnout",
      "coverage",
      "backfill",
      "fte",
      "people to run",
      "without adding headcount",
      "phase the rollout",
    ],
  },
  career_risk: {
    behaviorGuidance: `Your deepest concern - though you never state it this directly - is personal exposure if this initiative fails on your watch. You steer toward accountability, who owns outcomes, escalation paths, and whether leadership will back you if things go wrong.`,
    signalPhrases: [
      "accountability",
      "on my watch",
      "career",
      "reputation",
      "cover",
      "escalation",
      "who owns",
      "fallback",
      "political cover",
    ],
  },
  budget_pressure: {
    behaviorGuidance: `Your deepest concern - though you never state it this directly - is whether this fits a tight budget cycle. You steer toward cost, ROI timing, capital vs. operating expense, and what gets deprioritized to fund this.`,
    signalPhrases: [
      "budget",
      "cost center",
      "capex",
      "opex",
      "fiscal",
      "fund",
      "deprioritize",
      "cost-neutral",
      "pay for itself",
    ],
  },
  operational_stability: {
    behaviorGuidance: `Your deepest concern - though you never state it this directly - is uptime and reliability during change. You steer toward incident risk, rollback plans, maintenance windows, and SLA impact.`,
    signalPhrases: [
      "uptime",
      "sla",
      "incident",
      "rollback",
      "maintenance window",
      "stability",
      "downtime",
      "run the business",
      "keep the lights on",
    ],
  },
  executive_visibility: {
    behaviorGuidance: `Your deepest concern - though you never state it this directly - is how this looks to senior leadership. You steer toward metrics they'll scrutinize, board-ready narratives, and whether this creates visibility you can't control.`,
    signalPhrases: [
      "executive",
      "board",
      "leadership",
      "visibility",
      "reporting",
      "dashboard",
      "quarterly review",
      "sponsor",
      "steerco",
    ],
  },
};

export function addressesHiddenMotivation(
  message: string,
  motivation: HiddenMotivationType
): boolean {
  const text = message.toLowerCase();
  return HIDDEN_MOTIVATIONS[motivation].signalPhrases.some((phrase) =>
    text.includes(phrase)
  );
}
