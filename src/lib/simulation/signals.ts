import { addressesHiddenMotivation } from "./motivations";
import {
  HiddenMotivationType,
  MessageAnalysis,
  ToneSignals,
} from "./types";

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function hasPattern(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export function isRelationshipNegative(tone: ToneSignals): boolean {
  return (
    tone.isHostile ||
    tone.isAggressive ||
    tone.isDismissive ||
    tone.isBlameLanguage ||
    tone.isPressureTactic ||
    tone.isPersonalAttack
  );
}

export function isRelationshipNegativeAnalysis(analysis: MessageAnalysis): boolean {
  return isRelationshipNegative(analysis.tone);
}

export function analyzeMessage(
  message: string,
  hiddenMotivation: HiddenMotivationType
): MessageAnalysis {
  const text = message.toLowerCase().trim();

  const hasMetrics = hasPattern(
    text,
    /\b\d+[\d,.]*\s*(hours?|days?|weeks?|months?|people|employees|fte|tickets|incidents|errors|units)\b/
  );

  const hasPercentages = hasPattern(text, /\b\d+(\.\d+)?\s*%/);

  const hasRoiDiscussion = includesAny(text, [
    "roi",
    "return on investment",
    "payback",
    "cost savings",
    "cost-saving",
    "break-even",
    "break even",
    "net present",
  ]);

  const hasTimelines = includesAny(text, [
    "timeline",
    "milestone",
    "phase 1",
    "phase 2",
    "rollout",
    "by q1",
    "by q2",
    "by q3",
    "by q4",
    "within ",
    "weeks",
    "months",
  ]) || hasPattern(text, /\bin \d+ (weeks?|months?|days?)\b/);

  const hasStaffingEstimates = includesAny(text, [
    "headcount",
    "fte",
    "staffing",
    "people needed",
    "hire",
    "redeploy",
    "assign",
    "team of",
  ]);

  const hasResourceEstimates = includesAny(text, [
    "budget",
    "resources",
    "tooling",
    "infrastructure",
    "licensing",
    "investment of",
    "cost of",
  ]);

  const hasRollbackPlan = includesAny(text, [
    "rollback",
    "roll back",
    "revert",
    "contingency",
    "fallback",
    "safeguard",
    "backout",
    "back-out",
  ]);

  const hasSuccessMetrics = includesAny(text, [
    "success metric",
    "success criteria",
    "kpi",
    "measure success",
    "how we'll know",
    "how we will know",
  ]);

  const hasWorkflowDetail = includesAny(text, [
    "workflow",
    "who owns",
    "who runs",
    "what stops",
    "what we pause",
    "pause ",
    "deprioritize",
    "coverage",
    "handoff",
    "runbook",
  ]);

  const hasImplementationPlan = includesAny(text, [
    "implementation",
    "pilot",
    "phased",
    "step-by-step",
    "step by step",
    "roll out",
    "deploy",
    "plan",
    "roadmap",
  ]);

  const answersObjections =
    text.length > 80 &&
    includesAny(text, [
      "to address",
      "your concern",
      "you mentioned",
      "specifically",
      "on the point about",
      "regarding your",
      "because",
    ]);

  const hasVagueClaims = includesAny(text, [
    "we should improve",
    "drive efficiency",
    "improve efficiency",
    "will improve",
    "this will improve",
    "best practice",
    "move the needle",
    "unlock value",
    "transform",
    "game-changer",
    "game changer",
  ]) && !hasMetrics && !hasPercentages && !includesAny(text, [
    "based on",
    "pilot",
    "prior case",
    "assumption",
    "we observed",
    "data from",
    "measured",
  ]);

  const hasBuzzwords = includesAny(text, [
    "synergy",
    "paradigm",
    "holistic",
    "leverage",
    "disruptive",
    "digital transformation",
    "low-hanging fruit",
    "think outside the box",
    "move fast",
  ]);

  const isDismissive = includesAny(text, [
    "just do it",
    "just simple",
    "it's simple",
    "its simple",
    "it's easy",
    "its easy",
    "easy fix",
    "should be straightforward",
    "not a big deal",
    "don't overthink",
    "overcomplicating",
    "over-complicating",
    "making this harder",
    "just get on board",
    "get on board",
    "stop getting in the way",
    "stop blocking",
    "stop pushing back",
    "stop resisting",
    "not my problem",
    "deal with it",
    "move on",
    "get over it",
  ]);

  const hasUnsupportedAssertions = includesAny(text, [
    "guaranteed",
    "will definitely",
    "always works",
    "never fails",
    "no risk",
    "zero risk",
    "can't fail",
    "this will improve efficiency",
    "will improve efficiency",
    "will save time",
    "will reduce workload",
  ]) && !includesAny(text, [
    "based on",
    "pilot",
    "assumption",
    "we observed",
    "data from",
    "measured",
    "prior case",
    "example from",
  ]);

  const isEmpathetic = includesAny(text, [
    "understand",
    "appreciate",
    "hear you",
    "i see your concern",
    "i can see why",
    "valid point",
    "fair concern",
    "that makes sense",
    "makes sense that",
    "i recognize",
    "you're right to",
    "you are right to",
  ]);

  const isAggressive = includesAny(text, [
    "you need to",
    "you have to",
    "you must",
    "you're wrong",
    "you are wrong",
    "you're being difficult",
    "you are being difficult",
    "stop making excuses",
    "stop whining",
    "that's on you",
    "that's your fault",
  ]);

  const isHostile = includesAny(text, [
    "you're dumb",
    "you are dumb",
    "idiot",
    "incompetent",
    "waste of time",
    "shut up",
    "pathetic",
    "ridiculous",
    "absurd",
    "don't be stupid",
    "you're useless",
    "you are useless",
  ]);

  const isBlameLanguage = includesAny(text, [
    "you're the problem",
    "you are the problem",
    "your problem",
    "you caused",
    "you created this",
    "because of you",
    "your fault",
    "blame you",
    "you're why",
    "you are why",
  ]);

  const isPressureTactic = includesAny(text, [
    "non-negotiable",
    "no choice",
    "mandate",
    "figure it out",
    "just trust leadership",
    "leadership decided",
    "already decided",
    "no debate",
    "stop delaying",
    "stop stalling",
  ]);

  const isPersonalAttack = includesAny(text, [
    "you don't care",
    "you dont care",
    "you never listen",
    "you're not listening",
    "you are not listening",
    "you're unreasonable",
    "you are unreasonable",
    "you're obstructing",
    "you are obstructing",
  ]);

  const hasEscalationLanguage = includesAny(text, [
    "you have to",
    "just trust me",
    "i promise",
    "i'm confident",
    "im confident",
  ]);

  const hasConfidenceClaim =
    hasEscalationLanguage ||
    includesAny(text, [
      "trust me",
      "guaranteed",
      "will definitely",
      "i assure you",
    ]);

  const isShort = text.length < 20;

  const hasValidation = includesAny(text, [
    "valid point",
    "that makes sense",
    "fair concern",
    "you're right",
    "you are right",
    "good point",
  ]);

  const questionCount = (message.match(/\?/g) ?? []).length;
  const hasQuestion = questionCount > 0;

  const hasRapportBuilding = includesAny(text, [
    "thanks for your time",
    "appreciate your time",
    "thank you for",
    "respect your experience",
    "value your perspective",
  ]);

  const isInterruptionAttempt =
    (includesAny(text, ["you need to", "you have to"]) && text.length < 60) ||
    includesAny(text, [
      "let me stop you",
      "hold on",
      "that's not the point",
      "actually,",
    ]);

  const showsCriticalThinking = includesAny(text, [
    "assumption",
    "depends on",
    "have we considered",
    "what if",
    "unintended",
    "weighing",
    "based on what we know",
    "evidence suggests",
    "fact vs",
    "on the other hand",
  ]);

  const showsAdaptability = includesAny(text, [
    "fair point",
    "you're right",
    "you are right",
    "let me reconsider",
    "i hadn't considered",
    "good challenge",
    "revised",
    "adjust",
    "open to feedback",
    "what would you suggest",
  ]);

  const showsHumanCenteredThinking = includesAny(text, [
    "your team",
    "people impact",
    "burnout",
    "right thing",
    "long term",
    "long-term",
    "sustainable",
    "shared ownership",
    "together we",
    "inclusion",
    "belonging",
    "accountable",
    "transparent",
  ]);

  const showsSynthesis = includesAny(text, [
    "on one hand",
    "on the other hand",
    "balance",
    "both perspectives",
    "weighing",
    "trade-off",
    "tradeoff",
    "multiple factors",
  ]);

  const specificityScore = [
    hasMetrics,
    hasPercentages,
    hasTimelines,
    hasStaffingEstimates,
    hasResourceEstimates,
    hasImplementationPlan,
    hasWorkflowDetail,
    hasRollbackPlan,
    hasSuccessMetrics,
    answersObjections,
  ].filter(Boolean).length;

  const evidenceScore = [
    hasMetrics,
    hasPercentages,
    hasRoiDiscussion,
    hasResourceEstimates,
  ].filter(Boolean).length;

  const acknowledgesConstraints = includesAny(text, [
    "constraint",
    "limited capacity",
    "already stretched",
    "understaffed",
    "no bandwidth",
    "realistic",
    "trade-off",
    "tradeoff",
    "given your team",
  ]);

  const demonstratesOperationalUnderstanding = includesAny(text, [
    "uptime",
    "on-call",
    "incident",
    "run the business",
    "operational",
    "sla",
    "maintenance",
    "change window",
    "production",
  ]);

  const ownerDefined =
    includesAny(text, [
      "who owns",
      "owner",
      "accountable",
      "point person",
      "will lead",
      "led by",
      "dri ",
      "directly responsible",
    ]) || hasStaffingEstimates;

  const pilotScopeDefined =
    includesAny(text, ["pilot", "proof of concept", "poc", "phased", "phase 1"]) &&
    includesAny(text, [
      "scope",
      "limited rollout",
      "small team",
      "one team",
      "bounded",
      "narrow",
      "subset",
      "single site",
      "one department",
    ]);

  const rollbackExists = hasRollbackPlan;

  const kpiSetDefined =
    hasSuccessMetrics ||
    includesAny(text, [
      "kpi",
      "success metric",
      "success criteria",
      "how we'll measure",
      "how we will measure",
      "how we'll know",
      "track progress",
      "measure success",
      "fewer incidents",
      "reduce tickets",
      "uptime target",
      "high-level metric",
      "directionally",
    ]);

  const timelineDirectionallyDefined =
    hasTimelines ||
    includesAny(text, [
      "within ",
      "over the next",
      "by q1",
      "by q2",
      "by q3",
      "by q4",
      "first ",
      "directionally",
      "rough timeline",
      "high level timeline",
      "in the coming",
    ]) ||
    hasPattern(text, /\bin \d+ (weeks?|months?|quarters?)\b/);

  const addressesConcerns =
    answersObjections || acknowledgesConstraints || isEmpathetic;

  const providesEvidence =
    ownerDefined ||
    pilotScopeDefined ||
    rollbackExists ||
    kpiSetDefined ||
    timelineDirectionallyDefined ||
    hasImplementationPlan ||
    acknowledgesConstraints;

  const discussesRoi = hasRoiDiscussion;

  const answersQuestions =
    text.length > 60 &&
    (answersObjections || hasImplementationPlan || providesEvidence);

  const ignoresObjections = isShort || (isDismissive && !providesEvidence);

  const remainsVague =
    hasVagueClaims || hasBuzzwords || (text.length < 40 && !providesEvidence);

  const repeatsUnsupportedClaims = hasUnsupportedAssertions;

  const isPrematureSolutioning =
    hasImplementationPlan &&
    !acknowledgesConstraints &&
    !isEmpathetic &&
    specificityScore < 4;

  const contentQuality = {
    hasMetrics,
    hasPercentages,
    hasRoiDiscussion,
    hasTimelines,
    hasStaffingEstimates,
    hasResourceEstimates,
    hasImplementationPlan,
    answersObjections,
  };

  const contentNegative = {
    hasVagueClaims,
    hasBuzzwords,
    isDismissive,
    hasUnsupportedAssertions,
  };

  const positiveQualityCount = Object.values(contentQuality).filter(Boolean).length;
  const negativeQualityCount = Object.values(contentNegative).filter(Boolean).length;

  return {
    contentQuality,
    contentNegative,
    tone: {
      isEmpathetic,
      isAggressive,
      isHostile,
      isDismissive,
      isBlameLanguage,
      isPressureTactic,
      isPersonalAttack,
      isShort,
      hasEscalationLanguage,
      hasConfidenceClaim,
    },
    goal: {
      addressesConcerns,
      providesEvidence,
      acknowledgesConstraints,
      discussesRoi,
      answersQuestions,
      demonstratesOperationalUnderstanding,
      ignoresObjections,
      remainsVague: remainsVague || (negativeQualityCount > positiveQualityCount),
      repeatsUnsupportedClaims,
      isPrematureSolutioning,
      ownerDefined,
      pilotScopeDefined,
      rollbackExists,
      kpiSetDefined,
      timelineDirectionallyDefined,
    },
    metrics: {
      hasValidation,
      hasQuestion,
      questionCount,
      hasRapportBuilding,
      isInterruptionAttempt,
      specificityScore,
      evidenceScore,
      showsCriticalThinking,
      showsAdaptability,
      showsHumanCenteredThinking,
      showsSynthesis,
    },
    addressesHiddenMotivation: addressesHiddenMotivation(
      message,
      hiddenMotivation
    ),
  };
}

export function countPositiveQualitySignals(
  signals: MessageAnalysis["contentQuality"]
): number {
  return Object.values(signals).filter(Boolean).length;
}

export function countNegativeQualitySignals(
  signals: MessageAnalysis["contentNegative"]
): number {
  return Object.values(signals).filter(Boolean).length;
}
