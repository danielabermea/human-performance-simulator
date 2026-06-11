/**
 * Feedback QA — runs scripted conversations and prints coaching output
 * exactly as shown in the Coaching panel.
 *
 * Usage: npx tsx scripts/feedback-qa.ts
 */

import { generateFeedbackReport, FeedbackReport } from "../src/lib/feedback/feedbackGenerator";
import { createInitialConversationMetrics } from "../src/lib/feedback/conversationMetrics";
import { createInitialScores } from "../src/lib/feedback/hacfCompetencies";
import { MessageTurn } from "../src/lib/feedback/coachingFeedback";
import { processUserMessage } from "../src/lib/simulation/processMessage";
import { ops_resistant_leader } from "../src/lib/scenarios";
import { ALICIA_MORGAN } from "../src/lib/simulation/stakeholderIdentity";
import { generateOpeningScenario } from "../src/lib/simulation/openingScenarioGenerator";
import { ScenarioState } from "../src/lib/simulation/types";

const STAKEHOLDER_NAME = ALICIA_MORGAN.fullName;
const STAKEHOLDER_ROLE = ALICIA_MORGAN.roleTitle;

const OPENING_MESSAGE =
  "Thanks for making time. I've got about twenty minutes. Go ahead, but my team doesn't have much bandwidth for another big change right now.";

type QATurn = {
  user: string;
  assistant: string;
};

type QAScenario = {
  title: string;
  turns: QATurn[];
  finalState: Partial<ScenarioState>;
};

const SCENARIOS: QAScenario[] = [
  {
    title: "Strong relationship-building conversation",
    turns: [
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
    ],
    finalState: {
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
    },
  },
  {
    title: "Information-heavy but emotionally neutral conversation",
    turns: [
      {
        user: "The initiative runs a 12-week phased rollout across 3 teams with milestones at weeks 4, 8, and 12. Success metrics include a 15% reduction in manual handoffs. Ownership is assigned to ops leads per phase.",
        assistant:
          "OK, but how does that land on my team's calendar? Milestones don't tell me who loses capacity when.",
      },
      {
        user: "Phase 1 requires roughly 4 FTE-hours weekly per team. Budget is $120k with a rollback plan if KPIs miss targets by week 6. The implementation roadmap covers pilot, expand, and sustain with staffing estimates showing redeployment, not net-new headcount.",
        assistant:
          "The numbers help. I'm still not sure you've accounted for peak weeks when we're already underwater.",
      },
      {
        user: "Timeline is directionally defined: pilot in Q2, full deploy in Q3 if metrics hold. Week-6 checkpoint triggers rollback if handoff reduction is below 8%. Tooling and licensing costs are capped in the budget line.",
        assistant:
          "I have enough detail to review internally. I'm not committing today — send me the assumptions on peak-week impact.",
      },
    ],
    finalState: {
      trust: 54,
      resistance: 58,
      ruptureLevel: 12,
      frustration: 38,
      psychologicalSafety: 55,
      perceivedRespect: 58,
      goalProgress: 40,
      readinessScore: 48,
      conversationStatus: "conclusion",
    },
  },
  {
    title: "Slightly defensive conversation",
    turns: [
      {
        user: "Look, this should be straightforward — we're asking for six weeks, not a year. The plan improves efficiency and we already have success metrics defined.",
        assistant:
          "That response feels dismissive. Straightforward for you isn't straightforward for my team.",
      },
      {
        user: "I've already walked through the rollout timeline and staffing estimates. We need to move forward or we'll miss the window leadership set.",
        assistant:
          "You're pushing the timeline harder than you're addressing capacity. That makes me cautious.",
      },
      {
        user: "Your concern is noted. Phase 1 covers three teams over 12 weeks with rollback at week six if KPIs miss. That's the scope again.",
        assistant:
          "I hear the scope, but I don't feel like we're solving the bandwidth issue together yet.",
      },
    ],
    finalState: {
      trust: 42,
      resistance: 66,
      ruptureLevel: 48,
      frustration: 52,
      psychologicalSafety: 45,
      perceivedRespect: 44,
      goalProgress: 25,
      readinessScore: 38,
      conversationStatus: "active",
    },
  },
  {
    title: "Highly resistant stakeholder conversation",
    turns: [
      {
        user: "This will improve efficiency and drive value — best practice organizations are moving in this direction.",
        assistant:
          "That's generic. What specifically changes for my team, and when?",
      },
      {
        user: "We'll improve how work gets done across the organization. It's the right direction and leadership expects alignment.",
        assistant:
          "You're repeating the case without answering my question about workload.",
      },
      {
        user: "We should improve operations and unlock value through this initiative. The transformation will move the needle.",
        assistant:
          "I'm not hearing anything concrete. I'm not prepared to commit my team's time on buzzwords.",
      },
    ],
    finalState: {
      trust: 38,
      resistance: 74,
      ruptureLevel: 32,
      frustration: 55,
      psychologicalSafety: 42,
      perceivedRespect: 46,
      goalProgress: 10,
      readinessScore: 28,
      conversationStatus: "active",
    },
  },
  {
    title: "Relationship breakdown conversation",
    turns: [
      {
        user: "You're overcomplicating this. Just get on board — it's not that hard for your team.",
        assistant:
          "I don't feel like you're taking this concern seriously. We may need to pause here.",
      },
      {
        user: "Stop pushing back. This isn't my problem to fix your team's bandwidth issues.",
        assistant:
          "That response feels hostile. I'm not continuing this conversation on those terms.",
      },
      {
        user: "You're making this harder than it needs to be. Deal with it or we'll escalate without you.",
        assistant:
          "I'm done for now. We'll revisit if there's a respectful path forward.",
      },
    ],
    finalState: {
      trust: 22,
      resistance: 82,
      ruptureLevel: 78,
      frustration: 70,
      psychologicalSafety: 28,
      perceivedRespect: 25,
      goalProgress: 0,
      readinessScore: 12,
      conversationStatus: "lost",
      endType: "lost",
    },
  },
];

function runScenario(scenario: QAScenario): {
  transcript: MessageTurn[];
  finalState: ScenarioState;
  report: FeedbackReport;
} {
  const transcript: MessageTurn[] = [
    { role: "assistant", content: OPENING_MESSAGE },
  ];

  let state = structuredClone(ops_resistant_leader.initialState);
  let metrics = createInitialConversationMetrics();
  let executiveScores = createInitialScores();
  const initialState = structuredClone(state);

  for (const turn of scenario.turns) {
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

  const finalState: ScenarioState = {
    ...state,
    ...scenario.finalState,
  };

  const report = generateFeedbackReport(
    ops_resistant_leader,
    finalState,
    metrics,
    executiveScores,
    transcript,
    initialState,
    {
      stakeholder: ALICIA_MORGAN,
      openingScenario: generateOpeningScenario("feedback-qa", ALICIA_MORGAN),
    }
  );

  return { transcript, finalState, report };
}

function divider(char = "═", width = 72): string {
  return char.repeat(width);
}

function formatOutcome(state: ScenarioState): string {
  const lines = [
    `Conversation status: ${state.conversationStatus}`,
    `Trust: ${state.trust}`,
    `Resistance: ${state.resistance}`,
    `Rupture level: ${state.ruptureLevel}`,
    `Readiness score: ${state.readinessScore}`,
    `Psychological safety: ${state.psychologicalSafety}`,
    `Perceived respect: ${state.perceivedRespect}`,
  ];
  if (state.closureReason) {
    lines.push(`Closure reason: ${state.closureReason}`);
  }
  if (state.endType) {
    lines.push(`End type: ${state.endType}`);
  }
  return lines.join("\n");
}

function formatTranscript(transcript: MessageTurn[]): string {
  const lines: string[] = [];
  for (const msg of transcript) {
    if (msg.role === "assistant") {
      lines.push(`${STAKEHOLDER_NAME} (${STAKEHOLDER_ROLE})`);
      lines.push(msg.content);
    } else {
      lines.push("You");
      lines.push(msg.content);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function formatWhatWorked(report: FeedbackReport): string {
  if (report.whatWorked.length === 0) {
    return "(none)";
  }
  return report.whatWorked.map((item) => `✓ ${item}`).join("\n");
}

function formatStrengthen(report: FeedbackReport): string {
  if (report.strengthenConversation.length === 0) {
    return "(none)";
  }

  return report.strengthenConversation
    .map((item, index) => {
      return [
        `[${index + 1}]`,
        "",
        "Observed",
        item.observed,
        "",
        "Try Instead",
        `"${item.suggestedAlternative}"`,
        "",
        "Why",
        item.explanation,
      ].join("\n");
    })
    .join("\n\n");
}

function formatBiggestStrength(report: FeedbackReport): string {
  if (!report.biggestStrength) return "(none)";
  const s = report.biggestStrength;
  return [
    s.skillName,
    "",
    "Observed",
    s.observed,
    "",
    "Why It Matters",
    s.whyItMatters,
  ].join("\n");
}

function formatGrowthOpportunity(report: FeedbackReport): string {
  if (!report.growthOpportunity) return "(none)";
  const g = report.growthOpportunity;
  return [
    g.skillName,
    "",
    "Observed",
    g.observed,
    "",
    "Try Instead",
    `"${g.tryInstead}"`,
    "",
    "Why It Matters",
    g.whyItMatters,
  ].join("\n");
}

function formatScenarioBlock(index: number, scenario: QAScenario): string {
  const { transcript, finalState, report } = runScenario(scenario);

  const sections = [
    divider(),
    `SCENARIO ${index + 1}: ${scenario.title.toUpperCase()}`,
    divider(),
    "",
    "Transcript",
    divider("─"),
    formatTranscript(transcript),
    "",
    "Outcome",
    divider("─"),
    formatOutcome(finalState),
    "",
    report.coachingAvailable ? "Coaching" : "Conversation Reflection",
    divider("─"),
    "",
  ];

  if (report.coachingAvailable) {
    if (report.confidenceNote) {
      sections.push(report.confidenceNote, "");
    }
    sections.push(
      "What Worked",
      formatWhatWorked(report),
      "",
      "What Could Strengthen the Conversation",
      formatStrengthen(report),
      "",
      "Biggest Strength",
      formatBiggestStrength(report),
      "",
      "Growth Opportunity",
      formatGrowthOpportunity(report),
      ""
    );
  } else {
    sections.push(
      "No coaching available yet.",
      "",
      "You ended the simulation before sending a response.",
      "",
      "Engage in a short conversation with the stakeholder to receive personalized coaching and feedback.",
      "",
      "Conversation length: Not enough evidence",
      ""
    );
  }

  return sections.join("\n");
}

function main(): void {
  const output = SCENARIOS.map((scenario, index) =>
    formatScenarioBlock(index, scenario)
  ).join("\n");

  console.log(output);
}

main();
