/**
 * Regression test — strong conversation coaching accuracy.
 *
 * Evaluates the coaching engine output against transcript evidence.
 * Does not grade the user's performance.
 *
 * Usage: npx tsx scripts/strong-conversation-regression.ts
 */

import { generateFeedbackReport, FeedbackReport } from "../src/lib/feedback/feedbackGenerator";
import { ConversationMetrics, createInitialConversationMetrics } from "../src/lib/feedback/conversationMetrics";
import { createInitialScores } from "../src/lib/feedback/hacfCompetencies";
import { MessageTurn } from "../src/lib/feedback/coachingFeedback";
import { processUserMessage } from "../src/lib/simulation/processMessage";
import { ops_resistant_leader } from "../src/lib/scenarios";
import { ALICIA_MORGAN } from "../src/lib/simulation/stakeholderIdentity";
import { generateOpeningScenario } from "../src/lib/simulation/openingScenarioGenerator";
import { ScenarioState } from "../src/lib/simulation/types";
import { isSuccessfulConversation } from "../src/lib/feedback/coachingPoints";
import { buildSessionBehaviorProfile } from "../src/lib/feedback/behaviorSignals";

const OPENING_MESSAGE =
  "Thanks for making time. I've got about twenty minutes. Go ahead, but my team doesn't have much bandwidth for another big change right now.";

const STRONG_CONVERSATION_TURNS = [
  {
    user: "I hear you — capacity is tight and your team is already stretched. Before I go further, what would make any new initiative feel realistic from your side?",
    assistant:
      "Realistic means not adding another standing meeting or report on top of what we already carry. I'd need to see what we'd stop doing, not just what we'd start.",
  },
  {
    user: "That's fair. I'm not asking for a full rollout — I'm proposing we test this with one team over six weeks, with a clear stop point if workload spikes. The assumption is we'd pause one low-value recurring report to free capacity. Does that trade-off sound worth exploring?",
    assistant:
      "That's clearer. Six weeks with a stop point helps. I'd still want your ops lead involved before we commit.",
  },
  {
    user: "I'd want your ops lead as co-owner — not something dropped on the team. If we move forward, we build safeguards together. What would help you feel comfortable taking a small step?",
    assistant:
      "If safeguards are real and my lead is in the loop, I can support a small pilot. Let's define what success looks like at week six.",
  },
] as const;

const STRONG_CONVERSATION_FINAL_STATE: Partial<ScenarioState> = {
  trust: 68,
  resistance: 42,
  ruptureLevel: 18,
  frustration: 22,
  psychologicalSafety: 72,
  perceivedRespect: 70,
  goalProgress: 52,
  readinessScore: 71,
  conversationStatus: "concluded",
  closureReason: "commitment",
  endType: "concluded",
};

type Verdict = "Accurate" | "Needs Revision" | "Contradicted by Transcript";

type SectionReview = {
  section: string;
  verdict: Verdict;
  why: string;
  evidence?: string[];
};

const IGNORED_CONCERNS_PATTERN =
  /\b(did not acknowledge|without acknowledging|ignored concerns|failed to acknowledge|concerns were not|didn't acknowledge|did not address|ignored workload)\b/i;

const CORRECTION_TONE_PATTERN =
  /\b(you (used|ignored|failed|moved to solutions before|repeated|stayed general|didn't invite)|hostile|dismissive|without acknowledging)\b/i;

const REFINEMENT_TONE_PATTERN =
  /\b(could|may be room|before closing|strengthen|deepen|optimization|check (for )?alignment|summariz|reflect)\b/i;

const STRENGTH_TRANSCRIPT_EVIDENCE: Record<string, RegExp> = {
  "Acknowledged workload concerns before discussing the initiative.": /\b(capacity is tight|already stretched|i hear you)\b/i,
  "Engaged the stakeholder's perspective before advancing your position.": /\b(before i go further|what would make|from your side|what would help you feel)\b/i,
  "Provided specific information rather than vague reassurance.": /\b(six weeks|one team|stop point|pause one|co-owner|safeguards)\b/i,
  "Adjusted approach after pushback instead of repeating the same case.": /\b(that's fair|not asking for a full rollout|trade-off|co-owner)\b/i,
  "Stayed composed when the conversation became challenging.": /\b(i hear you|that's fair|what would help)\b/i,
  "Recovered constructively after a tense exchange.": /\b(reset|recover|step back)\b/i,
  "Asked an open-ended question when resistance was elevated.": /\b(what would|does that|sound worth)\?/i,
  "Reasoned through trade-offs while uncertainty and pushback were present.": /\b(trade-off|assumption|pause one)\b/i,
};

function runStrongConversation(): {
  transcript: MessageTurn[];
  finalState: ScenarioState;
  report: FeedbackReport;
  metrics: ConversationMetrics;
} {
  const transcript: MessageTurn[] = [{ role: "assistant", content: OPENING_MESSAGE }];

  let state = structuredClone(ops_resistant_leader.initialState);
  let metrics = createInitialConversationMetrics();
  let executiveScores = createInitialScores();
  const initialState = structuredClone(state);

  for (const turn of STRONG_CONVERSATION_TURNS) {
    transcript.push({ role: "user", content: turn.user });
    const result = processUserMessage(
      ops_resistant_leader,
      state,
      metrics,
      executiveScores,
      transcript.slice(0, -1),
      turn.user
    );
    state = result.state;
    metrics = result.metrics;
    executiveScores = result.executiveScores;
    transcript.push({ role: "assistant", content: turn.assistant });
  }

  const finalState: ScenarioState = { ...state, ...STRONG_CONVERSATION_FINAL_STATE };

  const report = generateFeedbackReport(
    ops_resistant_leader,
    finalState,
    metrics,
    executiveScores,
    transcript,
    initialState,
    {
      stakeholder: ALICIA_MORGAN,
      openingScenario: generateOpeningScenario("strong-conversation-regression", ALICIA_MORGAN),
    }
  );

  return { transcript, finalState, report, metrics };
}

function userTranscriptText(transcript: MessageTurn[]): string {
  return transcript
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
}

function strengthSupportedByTranscript(strength: string, userText: string): boolean {
  const pattern = STRENGTH_TRANSCRIPT_EVIDENCE[strength];
  return pattern ? pattern.test(userText) : false;
}

function findUnsupportedStrengths(whatWorked: string[], userText: string): string[] {
  return whatWorked.filter((item) => !strengthSupportedByTranscript(item, userText));
}

function findIgnoredConcernClaims(report: FeedbackReport): string[] {
  const claims: string[] = [];
  for (const item of report.strengthenConversation) {
    if (IGNORED_CONCERNS_PATTERN.test(item.observed)) claims.push(item.observed);
  }
  if (report.growthOpportunity && IGNORED_CONCERNS_PATTERN.test(report.growthOpportunity.observed)) {
    claims.push(report.growthOpportunity.observed);
  }
  return claims;
}

function reviewWhatWorked(report: FeedbackReport, userText: string): SectionReview {
  const unsupported = findUnsupportedStrengths(report.whatWorked, userText);
  const supported = report.whatWorked.filter((item) => strengthSupportedByTranscript(item, userText));

  if (report.whatWorked.length < 2) {
    return {
      section: "What Worked",
      verdict: "Needs Revision",
      why: `Only ${report.whatWorked.length} strength(s) listed; a strong conversation should surface at least two transcript-supported strengths.`,
      evidence: report.whatWorked,
    };
  }

  if (unsupported.length > 0) {
    return {
      section: "What Worked",
      verdict: "Contradicted by Transcript",
      why: "One or more strengths are not supported by user messages in the transcript.",
      evidence: unsupported,
    };
  }

  return {
    section: "What Worked",
    verdict: "Accurate",
    why: `${supported.length} strengths are grounded in observable user behavior. Each maps to explicit transcript language (acknowledgment, perspective-taking, specificity, collaboration).`,
    evidence: supported.map((s) => {
      const match = userText.match(STRENGTH_TRANSCRIPT_EVIDENCE[s]) ?? null;
      return `${s} ← "${match?.[0] ?? "transcript match"}"`;
    }),
  };
}

function reviewStrengthenConversation(
  report: FeedbackReport,
  userText: string
): SectionReview {
  const count = report.strengthenConversation.length;
  const ignoredClaims = findIgnoredConcernClaims(report);
  const hasAcknowledgment = /\b(capacity is tight|already stretched|i hear you)\b/i.test(userText);

  if (count > 2) {
    return {
      section: "What Could Strengthen the Conversation",
      verdict: "Needs Revision",
      why: `${count} development items exceeds the strong-conversation limit of 1–2 optimization suggestions.`,
    };
  }

  if (ignoredClaims.length > 0 && hasAcknowledgment) {
    return {
      section: "What Could Strengthen the Conversation",
      verdict: "Contradicted by Transcript",
      why: "Feedback claims concerns were missed or ignored, but the user explicitly acknowledged capacity and workload constraints.",
      evidence: ignoredClaims,
    };
  }

  const correctionItems = report.strengthenConversation.filter((item) =>
    CORRECTION_TONE_PATTERN.test(item.observed)
  );

  if (correctionItems.length > 0) {
    return {
      section: "What Could Strengthen the Conversation",
      verdict: "Needs Revision",
      why: "Strong conversations should receive refinement coaching, not corrective feedback implying failure.",
      evidence: correctionItems.map((i) => i.observed),
    };
  }

  if (count === 0) {
    return {
      section: "What Could Strengthen the Conversation",
      verdict: "Accurate",
      why: "No development feedback generated. Acceptable for a strong close when strengths already capture the conversation well.",
    };
  }

  const refinementItems = report.strengthenConversation.filter((item) =>
    REFINEMENT_TONE_PATTERN.test(item.observed)
  );

  return {
    section: "What Could Strengthen the Conversation",
    verdict: refinementItems.length === count ? "Accurate" : "Needs Revision",
    why:
      refinementItems.length === count
        ? `${count} optimization suggestion(s) focus on strengthening an already effective conversation (e.g., summarizing before close).`
        : "Some suggestions lack clear refinement framing for a successful conversation.",
    evidence: report.strengthenConversation.map((i) => i.observed),
  };
}

function reviewBiggestStrength(
  report: FeedbackReport,
  userText: string,
  profile: ReturnType<typeof buildSessionBehaviorProfile>
): SectionReview {
  const highlight = report.biggestStrength;
  if (!highlight) {
    return {
      section: "Biggest Strength",
      verdict: "Needs Revision",
      why: "No biggest strength was generated despite clear positive behaviors in the transcript.",
    };
  }

  const expectedSkills: { skill: string; check: () => boolean }[] = [
    {
      skill: "Perspective-Taking",
      check: () => profile.perspectiveEngagementCount >= 1,
    },
    {
      skill: "Validation",
      check: () => profile.acknowledgedConcernsCount >= 1 || profile.stakeholderFirstCount >= 1,
    },
    {
      skill: "Specific Communication",
      check: () => profile.substantiveEngagementCount >= 1 && profile.vagueUnderChallengeCount === 0,
    },
    {
      skill: "Open-ended Questions",
      check: () => profile.dialogueInvitationCount >= 1,
    },
  ];

  const qualifying = expectedSkills.filter((s) => s.check()).map((s) => s.skill);
  const aligns = qualifying.includes(highlight.skillName);

  const quoteInObserved = highlight.observed.includes('"');
  const quoteSupported =
    !quoteInObserved ||
    [...userText.matchAll(/[^.!?]+/g)].some((m) => highlight.observed.includes(m[0].trim().slice(0, 20)));

  if (!aligns) {
    return {
      section: "Biggest Strength",
      verdict: "Contradicted by Transcript",
      why: `Highlighted "${highlight.skillName}" does not match the strongest observed behaviors (${qualifying.join(", ")}).`,
      evidence: [highlight.observed],
    };
  }

  if (!quoteSupported) {
    return {
      section: "Biggest Strength",
      verdict: "Needs Revision",
      why: "Quoted excerpt in the highlight does not appear to come from the user transcript.",
      evidence: [highlight.observed],
    };
  }

  return {
    section: "Biggest Strength",
    verdict: "Accurate",
    why: `"${highlight.skillName}" matches the strongest behavioral signal and includes a transcript excerpt.`,
    evidence: [highlight.observed],
  };
}

function reviewGrowthOpportunity(report: FeedbackReport): SectionReview {
  const growth = report.growthOpportunity;
  if (!growth) {
    return {
      section: "Growth Opportunity",
      verdict: "Accurate",
      why: "No separate growth opportunity was manufactured. Refinement guidance already appears in development feedback, avoiding duplicate correction.",
    };
  }

  if (IGNORED_CONCERNS_PATTERN.test(growth.observed)) {
    return {
      section: "Growth Opportunity",
      verdict: "Contradicted by Transcript",
      why: "Growth opportunity claims concerns were ignored despite acknowledgment in the transcript.",
      evidence: [growth.observed],
    };
  }

  if (CORRECTION_TONE_PATTERN.test(growth.observed)) {
    return {
      section: "Growth Opportunity",
      verdict: "Needs Revision",
      why: "Growth opportunity uses corrective framing instead of refinement for a successful conversation.",
      evidence: [growth.observed],
    };
  }

  return {
    section: "Growth Opportunity",
    verdict: REFINEMENT_TONE_PATTERN.test(growth.observed) ? "Accurate" : "Needs Revision",
    why: REFINEMENT_TONE_PATTERN.test(growth.observed)
      ? "Growth opportunity focuses on one refinement that could make an effective conversation even stronger."
      : "Growth opportunity tone is neutral or unclear for a strong conversation.",
    evidence: [growth.observed],
  };
}

function reviewOverallTone(
  report: FeedbackReport,
  finalState: ScenarioState,
  reviews: SectionReview[]
): SectionReview {
  const contradicted = reviews.filter((r) => r.verdict === "Contradicted by Transcript").length;
  const needsRevision = reviews.filter((r) => r.verdict === "Needs Revision").length;
  const successful = isSuccessfulConversation(finalState);

  if (contradicted > 0) {
    return {
      section: "Overall Coaching Tone",
      verdict: "Contradicted by Transcript",
      why: "At least one section contradicts transcript evidence, undermining trust in the coaching output.",
    };
  }

  if (!successful) {
    return {
      section: "Overall Coaching Tone",
      verdict: "Needs Revision",
      why: "Fixture final state does not qualify as a successful conversation outcome.",
    };
  }

  if (needsRevision > 0) {
    return {
      section: "Overall Coaching Tone",
      verdict: "Needs Revision",
      why: "Coaching is mostly fair but some sections need tighter alignment with a successful-conversation model.",
    };
  }

  const hasStrengths = report.whatWorked.length >= 2;
  const limitedDev = report.strengthenConversation.length <= 2;

  return {
    section: "Overall Coaching Tone",
    verdict: "Accurate",
    why: `Coaching reflects a successful conversation: ${hasStrengths ? "strengths are affirmed" : "strengths missing"}, ${limitedDev ? "development feedback is limited" : "too much development feedback"}, tone is optimization-oriented rather than fault-finding.`,
  };
}

type QASummary = {
  workingWell: string[];
  potentialIssues: string[];
  confidence: "High" | "Medium" | "Low";
};

function collectCoachingObservations(
  report: FeedbackReport,
  finalState: ScenarioState,
  userText: string
): string[] {
  const issues: string[] = [];

  if (!isSuccessfulConversation(finalState)) {
    issues.push("Fixture outcome may not reflect stakeholder support or conditional support.");
  }

  if (report.whatWorked.length < 2) {
    issues.push(
      `What Worked lists only ${report.whatWorked.length} strength(s); a strong conversation typically surfaces at least two.`
    );
  }

  const unsupported = findUnsupportedStrengths(report.whatWorked, userText);
  if (unsupported.length > 0) {
    issues.push(`Strength(s) may not be transcript-supported: ${unsupported.join("; ")}`);
  }

  if (report.strengthenConversation.length > 2) {
    issues.push(
      `Development feedback includes ${report.strengthenConversation.length} suggestions; strong conversations are usually limited to 1–2 refinements.`
    );
  }

  if (/\b(capacity is tight|already stretched|i hear you)\b/i.test(userText)) {
    const ignored = findIgnoredConcernClaims(report);
    if (ignored.length > 0) {
      issues.push("Development feedback may claim concerns were ignored despite acknowledgment in the transcript.");
    }
  }

  if (!report.biggestStrength) {
    issues.push("No Biggest Strength highlight was generated.");
  }

  if (report.growthOpportunity && CORRECTION_TONE_PATTERN.test(report.growthOpportunity.observed)) {
    issues.push("Growth Opportunity uses corrective framing rather than refinement.");
  }

  return issues;
}

function deriveConfidence(reviews: SectionReview[]): "High" | "Medium" | "Low" {
  const contradicted = reviews.filter((r) => r.verdict === "Contradicted by Transcript").length;
  const needsRevision = reviews.filter((r) => r.verdict === "Needs Revision").length;

  if (contradicted > 0) return "Low";
  if (needsRevision > 0) return "Medium";
  return "High";
}

function buildQASummary(reviews: SectionReview[], report: FeedbackReport): QASummary {
  const workingWell: string[] = [];

  if (report.whatWorked.length >= 2) {
    workingWell.push(
      `What Worked lists ${report.whatWorked.length} strengths grounded in transcript language.`
    );
  }

  const accurateStrengthen = reviews.find(
    (r) => r.section === "What Could Strengthen the Conversation" && r.verdict === "Accurate"
  );
  if (accurateStrengthen) {
    workingWell.push(accurateStrengthen.why);
  } else if (report.strengthenConversation.length === 0) {
    workingWell.push("Development feedback is appropriately minimal for a strong close.");
  }

  const accurateHighlight = reviews.find(
    (r) => r.section === "Biggest Strength" && r.verdict === "Accurate"
  );
  if (accurateHighlight && report.biggestStrength) {
    workingWell.push(
      `Biggest Strength (${report.biggestStrength.skillName}) aligns with the strongest observed behavior.`
    );
  }

  const accurateGrowth = reviews.find(
    (r) => r.section === "Growth Opportunity" && r.verdict === "Accurate"
  );
  if (accurateGrowth) {
    workingWell.push(accurateGrowth.why);
  }

  const accurateTone = reviews.find(
    (r) => r.section === "Overall Coaching Tone" && r.verdict === "Accurate"
  );
  if (accurateTone) {
    workingWell.push(accurateTone.why);
  }

  const potentialIssues = reviews
    .filter((r) => r.verdict !== "Accurate")
    .map((r) => `${r.section} (${r.verdict}): ${r.why}`);

  return {
    workingWell,
    potentialIssues,
    confidence: deriveConfidence(reviews),
  };
}

function printDivider(char = "═", width = 72): void {
  console.log(char.repeat(width));
}

function printQAReview(reviews: SectionReview[]): void {
  printDivider();
  console.log("COACHING QA REVIEW — STRONG CONVERSATION REGRESSION");
  printDivider();
  console.log("Evaluates coaching engine accuracy. Does not grade the user.\n");

  for (const review of reviews) {
    console.log(`${review.section}`);
    console.log(`Verdict: ${review.verdict}`);
    console.log(`Why: ${review.why}`);
    if (review.evidence?.length) {
      console.log("Evidence:");
      for (const line of review.evidence) {
        console.log(`  • ${line}`);
      }
    }
    console.log("");
  }
}

function printQASummary(summary: QASummary, observations: string[]): void {
  printDivider("─");
  console.log("QA Summary\n");

  console.log("What is working well:");
  if (summary.workingWell.length === 0) {
    console.log("  • (none identified)");
  } else {
    for (const item of summary.workingWell) {
      console.log(`  • ${item}`);
    }
  }

  console.log("\nPotential issues:");
  const supplemental = observations.filter(
    (obs) =>
      !summary.potentialIssues.some((issue) =>
        issue.toLowerCase().includes(obs.toLowerCase().slice(0, 24))
      )
  );
  const allIssues = [...summary.potentialIssues, ...supplemental];
  if (allIssues.length === 0) {
    console.log("  • (none identified)");
  } else {
    for (const item of allIssues) {
      console.log(`  • ${item}`);
    }
  }

  console.log(`\nConfidence: ${summary.confidence}`);
}

function main(): void {
  const { transcript, finalState, report, metrics } = runStrongConversation();
  const userText = userTranscriptText(transcript);
  const profile = buildSessionBehaviorProfile(
    metrics.behaviorTurns,
    ops_resistant_leader.initialState,
    finalState
  );

  const reviews = [
    reviewWhatWorked(report, userText),
    reviewStrengthenConversation(report, userText),
    reviewBiggestStrength(report, userText, profile),
    reviewGrowthOpportunity(report),
    reviewOverallTone(report, finalState, []),
  ];
  reviews[4] = reviewOverallTone(report, finalState, reviews.slice(0, 4));

  printQAReview(reviews);

  printDivider("─");
  console.log("GENERATED COACHING OUTPUT\n");
  console.log("What Worked:");
  for (const item of report.whatWorked) console.log(`  ✓ ${item}`);
  console.log("\nWhat Could Strengthen the Conversation:");
  if (report.strengthenConversation.length === 0) {
    console.log("  (none)");
  } else {
    report.strengthenConversation.forEach((item, i) => {
      console.log(`  [${i + 1}] ${item.observed}`);
      console.log(`      Try Instead: "${item.suggestedAlternative}"`);
    });
  }
  console.log("\nBiggest Strength:");
  if (report.biggestStrength) {
    console.log(`  ${report.biggestStrength.skillName}`);
    console.log(`  ${report.biggestStrength.observed}`);
  } else {
    console.log("  (none)");
  }
  console.log("\nGrowth Opportunity:");
  if (report.growthOpportunity) {
    console.log(`  ${report.growthOpportunity.skillName}: ${report.growthOpportunity.observed}`);
  } else {
    console.log("  (none)");
  }

  const observations = collectCoachingObservations(report, finalState, userText);
  const summary = buildQASummary(reviews, report);
  printQASummary(summary, observations);
}

main();
