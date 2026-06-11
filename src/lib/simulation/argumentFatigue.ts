import { MessageAnalysis } from "./types";

export type ObjectionExtraction = {
  categories: string[];
  repeatedCategories: string[];
  newCategories: string[];
  isRephraseWithoutEvidence: boolean;
  isVagueReassurance: boolean;
  isInsistingAfterObjection: boolean;
};

type CategoryRule = {
  label: string;
  match: (text: string, analysis: MessageAnalysis) => boolean;
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    label: "efficiency improvement",
    match: (text) =>
      includesAny(text, [
        "efficiency",
        "efficient",
        "improve operations",
        "drive improvement",
        "optimize",
        "streamline",
      ]),
  },
  {
    label: "ROI promise",
    match: (text) =>
      includesAny(text, [
        "roi",
        "return on investment",
        "payback",
        "cost savings",
        "cost-saving",
        "break-even",
        "break even",
      ]),
  },
  {
    label: "low disruption claim",
    match: (text) =>
      includesAny(text, [
        "low disruption",
        "minimal disruption",
        "no downtime",
        "seamless",
        "without disruption",
        "light lift",
        "minimal impact",
      ]),
  },
  {
    label: "just trust me",
    match: (text) =>
      includesAny(text, [
        "just trust me",
        "trust me",
        "i promise",
        "i'm confident",
        "im confident",
        "believe me",
      ]),
  },
  {
    label: "this is simple",
    match: (text) =>
      includesAny(text, [
        "this is simple",
        "it's simple",
        "its simple",
        "easy fix",
        "straightforward",
        "not complicated",
        "should be easy",
      ]),
  },
  {
    label: "bandwidth is fine claim",
    match: (text) =>
      includesAny(text, [
        "won't add workload",
        "wont add workload",
        "no extra work",
        "minimal effort",
        "quick win",
        "low effort",
      ]),
  },
  {
    label: "transformation pitch",
    match: (text) =>
      includesAny(text, [
        "transform",
        "transformation",
        "game-changer",
        "game changer",
        "paradigm",
        "digital transformation",
      ]),
  },
  {
    label: "best practice claim",
    match: (text) =>
      includesAny(text, [
        "best practice",
        "industry standard",
        "proven approach",
        "everyone is doing",
      ]),
  },
];

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function extractPercentageImprovementClaim(text: string): string | null {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*%\s*(improvement|reduction|increase|gain|savings)/);
  if (match) {
    return `${match[1]}% improvement claim`;
  }
  if (/\b\d+(?:\.\d+)?\s*%/.test(text) && includesAny(text, ["improve", "reduce", "save", "gain"])) {
    return "percentage improvement claim";
  }
  return null;
}

export function extractObjectionCategories(
  message: string,
  analysis: MessageAnalysis
): string[] {
  const text = message.toLowerCase().trim();
  const categories: string[] = [];

  for (const rule of CATEGORY_RULES) {
    if (rule.match(text, analysis)) {
      categories.push(rule.label);
    }
  }

  const pctClaim = extractPercentageImprovementClaim(text);
  if (pctClaim) categories.push(pctClaim);

  if (
    analysis.contentQuality.hasImplementationPlan &&
    !categories.includes("implementation plan")
  ) {
    categories.push("implementation plan");
  }

  return categories;
}

export function analyzeObjections(
  message: string,
  analysis: MessageAnalysis,
  objectionMemory: string[]
): ObjectionExtraction {
  const categories = extractObjectionCategories(message, analysis);
  const memorySet = new Set(objectionMemory);

  const repeatedCategories = categories.filter((c) => memorySet.has(c));
  const newCategories = categories.filter((c) => !memorySet.has(c));

  const hasNewEvidence = analysis.goal.providesEvidence;

  const isRephraseWithoutEvidence =
    repeatedCategories.length > 0 && !hasNewEvidence;

  const isVagueReassurance =
    !hasNewEvidence &&
    (analysis.contentNegative.hasUnsupportedAssertions ||
      analysis.goal.remainsVague ||
      (analysis.tone.hasConfidenceClaim && !analysis.contentQuality.hasMetrics));

  const isInsistingAfterObjection =
    repeatedCategories.length > 0 &&
    !hasNewEvidence &&
    (analysis.tone.hasEscalationLanguage ||
      analysis.tone.isAggressive ||
      analysis.contentNegative.isDismissive);

  return {
    categories,
    repeatedCategories,
    newCategories,
    isRephraseWithoutEvidence,
    isVagueReassurance,
    isInsistingAfterObjection,
  };
}

export function calculateFatigueIncrease(
  extraction: ObjectionExtraction
): number {
  let delta = 0;

  if (extraction.repeatedCategories.length > 0) {
    delta += 12 * extraction.repeatedCategories.length;
  }

  if (extraction.isRephraseWithoutEvidence) {
    delta += 14;
  }

  if (extraction.isInsistingAfterObjection) {
    delta += 18;
  }

  if (extraction.isVagueReassurance) {
    delta += 10;
  }

  if (
    extraction.categories.length > 0 &&
    extraction.repeatedCategories.length === extraction.categories.length &&
    extraction.categories.length >= 2
  ) {
    delta += 8;
  }

  return delta;
}

export function mergeObjectionMemory(
  objectionMemory: string[],
  newCategories: string[]
): string[] {
  const merged = [...objectionMemory];
  for (const category of newCategories) {
    if (!merged.includes(category)) {
      merged.push(category);
    }
  }
  return merged;
}

function fatigueTier(fatigue: number): "low" | "medium" | "high" {
  if (fatigue > 70) return "high";
  if (fatigue > 30) return "medium";
  return "low";
}

export function buildArgumentFatiguePrompt(
  objectionMemory: string[],
  argumentFatigue: number
): string {
  const tier = fatigueTier(argumentFatigue);
  const memoryList =
    objectionMemory.length > 0
      ? objectionMemory.map((item) => `  - ${item}`).join("\n")
      : "  (none yet)";

  const lines: string[] = [
    "OBJECTION MEMORY & ARGUMENT FATIGUE (persistent - do NOT reset):",
    "You remember prior arguments. Repetition without new evidence reduces the consultant's credibility.",
    "",
    "Claims already raised in this conversation:",
    memoryList,
    "",
    `argumentFatigue: ${argumentFatigue}/100 (cumulative - never decreases)`,
    "",
    "PRIORITY HIERARCHY (when behaviors conflict):",
    "1. ruptureLevel - emotional safety and defensiveness",
    "2. argumentFatigue - engagement depth and willingness to continue evaluating",
    "3. trust - relationship quality and openness",
    "4. goalProgress - receptiveness to persuasion",
    "",
    "MEMORY RULE: Repetition without new evidence reduces credibility. Novelty and new data are required to shift your opinion.",
  ];

  if (tier === "low") {
    lines.push(
      "",
      "FATIGUE LEVEL - LOW (0–30):",
      "- Normal skeptical engagement",
      "- Evaluate claims individually",
      "- After substantive answers, move toward a position — do not chain clarification questions"
    );
  } else if (tier === "medium") {
    lines.push(
      "",
      "FATIGUE LEVEL - MEDIUM (30–70):",
      "- Become increasingly terse",
      "- Reduce patience for repeated arguments",
      "- Reference prior objections implicitly (e.g. 'we've already discussed this')",
      "- Do not re-litigate settled points unless new evidence appears"
    );
  } else {
    lines.push(
      "",
      "FATIGUE LEVEL - HIGH (70–100) - RESPONSE COLLAPSE RULE:",
      "- Stop engaging deeply with repeated claims",
      "- Compress responses to 1–2 sentences MAX",
      "- Do NOT ask follow-up questions",
      "- Reference prior discussion implicitly - shift from evaluation to dismissal or closure",
      "- Stop evaluating claims individually; respond at summary level",
      "- Prioritize closure over exploration",
      "",
      "Example responses:",
      "- \"This hasn't changed from our earlier concerns.\"",
      "- \"We've already covered this.\"",
      "- \"Nothing here changes my assessment.\"",
      "- \"I'm not seeing new information.\""
    );
  }

  return lines.join("\n");
}

export function fatigueGoalProgressMultiplier(argumentFatigue: number): number {
  if (argumentFatigue > 70) return 0.25;
  if (argumentFatigue > 30) return 0.55;
  return 1;
}

export function fatigueEvidenceMultiplier(argumentFatigue: number): number {
  if (argumentFatigue > 70) return 0.4;
  if (argumentFatigue > 30) return 0.7;
  return 1;
}
