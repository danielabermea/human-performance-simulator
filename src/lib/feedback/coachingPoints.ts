import { SessionBehaviorProfile, TurnBehaviorSignals } from "./behaviorSignals";
import { ScenarioState } from "../simulation/types";

export type CoachingSuggestion = {
  observed: string;
  suggestedAlternative: string;
  explanation: string;
};

type StrengthRule = {
  coachingLine: string;
  detect: (turn: TurnBehaviorSignals) => boolean;
};

type SessionCoachingRule = {
  detect: (profile: SessionBehaviorProfile, finalState: ScenarioState) => boolean;
  build: (
    profile: SessionBehaviorProfile,
    finalState: ScenarioState,
    stakeholderFirstName: string
  ) => CoachingSuggestion | null;
};

type TurnIssue =
  | "hostile"
  | "dismissive"
  | "escalated"
  | "trust_loss"
  | "vague"
  | "premature_solution"
  | "repeated"
  | "passive";

const MAX_WHAT_WORKED = 3;
const MIN_STRENGTHEN = 2;
const MAX_STRENGTHEN = 3;
const STRONG_MAX_STRENGTHEN = 2;
const SEVERE_ISSUES: TurnIssue[] = [
  "hostile",
  "dismissive",
  "escalated",
  "trust_loss",
];

const STRENGTH_RULES: StrengthRule[] = [
  {
    coachingLine: "Acknowledged workload concerns before discussing the initiative.",
    detect: (t) => t.acknowledgedStakeholderConcerns || t.stakeholderFirstReasoning,
  },
  {
    coachingLine: "Engaged the stakeholder's perspective before advancing your position.",
    detect: (t) => t.perspectiveEngagement,
  },
  {
    coachingLine: "Provided specific information rather than vague reassurance.",
    detect: (t) => t.substantiveEngagement && !t.remainedVagueUnderChallenge,
  },
  {
    coachingLine: "Adjusted approach after pushback instead of repeating the same case.",
    detect: (t) => t.reframedAfterPushback,
  },
  {
    coachingLine: "Stayed composed when the conversation became challenging.",
    detect: (t) =>
      t.maintainedComposureUnderPressure &&
      !t.escalatedUnderPressure &&
      !t.dismissiveOrAggressive,
  },
  {
    coachingLine: "Recovered constructively after a tense exchange.",
    detect: (t) => t.recoveredAfterChallenge,
  },
  {
    coachingLine: "Asked an open-ended question when resistance was elevated.",
    detect: (t) => t.invitedDialogue && t.facedHighResistance,
  },
  {
    coachingLine: "Reasoned through trade-offs while uncertainty and pushback were present.",
    detect: (t) => t.reasonedUnderUncertainty,
  },
];

function quoteExcerpt(quote: string, max = 58): string {
  const trimmed = quote.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function mentionsCapacity(quote: string): boolean {
  return /\b(capacity|workload|bandwidth|stretched|underwater|hours|calendar|peak week)\b/i.test(
    quote
  );
}

function quoteShowsAcknowledgment(quote: string): boolean {
  return (
    /\b(doing your normal|take on additional|already stretched|capacity is tight|bandwidth|workload impact|competing priorit|your team is already)\b/i.test(
      quote
    ) ||
    (mentionsCapacity(quote) &&
      /\b(acknowledge|i hear|i understand|that's fair|makes sense|before (i|we) go)\b/i.test(
        quote
      ))
  );
}

function hasAcknowledgedConcerns(profile: SessionBehaviorProfile): boolean {
  return profile.acknowledgedConcernsCount >= 1 || profile.stakeholderFirstCount >= 1;
}

export function isSuccessfulConversation(finalState: ScenarioState): boolean {
  return (
    finalState.conversationStatus === "concluded" ||
    finalState.conversationStatus === "conclusion" ||
    finalState.conversationStatus === "conditionallyAccepted" ||
    finalState.conversationStatus === "conditionallyAcceptedWin" ||
    finalState.closureReason === "commitment" ||
    (finalState.readinessScore >= 60 &&
      finalState.trust >= 55 &&
      finalState.resistance <= 55)
  );
}

function isStrongConversation(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState
): boolean {
  if (!isSuccessfulConversation(finalState)) return false;

  const severeIssueCount = profile.turns.filter((turn) => {
    const issue = detectTurnIssue(turn);
    return issue !== null && SEVERE_ISSUES.includes(issue);
  }).length;

  return (
    severeIssueCount === 0 &&
    finalState.readinessScore >= 55 &&
    profile.negativeInteractionCount <= 1
  );
}

function isSevereIssue(issue: TurnIssue): boolean {
  return SEVERE_ISSUES.includes(issue);
}

function mentionsTimelineOrPlan(quote: string): boolean {
  return /\b(weeks?|timeline|rollout|phase|schedule|pilot|deploy|milestone)\b/i.test(quote);
}

function mentionsPressureLanguage(quote: string): boolean {
  return /\b(straightforward|simple|easy|get on board|stop pushing|deal with it|move forward|overcomplicat)\b/i.test(
    quote
  );
}

function pickUnused(
  options: string[],
  used: Set<string>
): string | undefined {
  return options.find((option) => !used.has(option));
}

function quoteImpliesHostile(quote: string): boolean {
  return /\b(stop pushing back|not my problem|deal with it|we'll escalate|your problem|without you)\b/i.test(
    quote
  );
}

function quoteImpliesRepetition(quote: string): boolean {
  return /\b(scope again|that's the scope again|as i said|already explained|same approach|repeating)\b/i.test(
    quote
  );
}

function detectTurnIssue(turn: TurnBehaviorSignals): TurnIssue | null {
  if (turn.hostileOrPersonalAttack || quoteImpliesHostile(turn.quote)) return "hostile";
  if (turn.dismissiveOrAggressive) return "dismissive";
  if (turn.escalatedUnderPressure) return "escalated";
  if (turn.trustDelta <= -4) return "trust_loss";
  if (turn.remainedVagueUnderChallenge) return "vague";
  if (turn.prematureSolutioning) return "premature_solution";
  if (
    turn.repeatedWithoutAdaptation ||
    (turn.facedHighResistance &&
      !turn.reframedAfterPushback &&
      !turn.perspectiveEngagement &&
      !turn.stakeholderFirstReasoning &&
      !turn.acknowledgedStakeholderConcerns)
  ) {
    return "repeated";
  }
  if (turn.passiveOrNonDirective) return "passive";

  // Quote-based fallback when behavioral flags miss phrasing in the transcript
  if (mentionsPressureLanguage(turn.quote) || /\bneed to move forward\b/i.test(turn.quote)) {
    if (
      turn.perspectiveEngagement ||
      turn.stakeholderFirstReasoning ||
      turn.acknowledgedStakeholderConcerns ||
      (turn.invitedDialogue && turn.substantiveEngagement)
    ) {
      return null;
    }
    return "dismissive";
  }
  if (quoteImpliesRepetition(turn.quote)) return "repeated";

  return null;
}

function buildTurnCoaching(
  turn: TurnBehaviorSignals,
  stakeholderFirstName: string,
  issueCounts: Record<TurnIssue, number>,
  usedAlternatives: Set<string>,
  profile?: SessionBehaviorProfile
): CoachingSuggestion | null {
  const issue = detectTurnIssue(turn);
  if (!issue) return null;

  const excerpt = quoteExcerpt(turn.quote);
  const variant = issueCounts[issue];
  issueCounts[issue] += 1;

  let suggestion: CoachingSuggestion | null = null;

  switch (issue) {
    case "hostile": {
      const alternatives = [
        "I want to reset — that came out wrong. Your team's constraints are real, and I need to address them respectfully.",
        "That wasn't fair to say. Can we step back — what's the main risk you see for your team if we proceed?",
        "I hear that I sounded hostile just now. Help me understand what would make this conversation workable again.",
      ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      const explanations = [
        "Repairing tone restores willingness to continue the conversation.",
        "Naming the rupture directly gives you a chance to reset before continuing.",
        "A direct repair attempt signals respect when trust has dropped sharply.",
      ];
      suggestion = {
        observed: `You used hostile or personal language that shifted focus away from the initiative: "${excerpt}"`,
        suggestedAlternative,
        explanation: explanations[variant % explanations.length],
      };
      break;
    }
    case "dismissive": {
      const alternatives = mentionsCapacity(turn.quote)
        ? [
            "You're right that capacity is tight — before I explain the plan, what weeks or handoffs are most at risk?",
            "I may have minimized the workload hit. What would need to pause for this to feel manageable?",
          ]
        : mentionsPressureLanguage(turn.quote)
          ? [
              "I can see why that sounded minimizing — what's the part of this that feels most unrealistic from your side?",
              "Let me back up. I don't want to rush you — what's still unresolved for your team?",
              "Fair pushback. What would you need to see before this feels worth discussing further?",
            ]
          : mentionsTimelineOrPlan(turn.quote)
            ? [
                "Before I walk through the timeline again — what part of the plan still doesn't fit your team's reality?",
                "I may have pushed the schedule too hard. What would a workable first step look like from your side?",
              ]
            : [
                "I can see why that landed badly — what's the hardest part of this for your team right now?",
                "Let me slow down. What concern still isn't addressed for you?",
                `Help me understand what ${stakeholderFirstName} needs to hear before this can move forward.`,
              ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      const explanations = [
        "Acknowledging how your words landed keeps the stakeholder engaged instead of defensive.",
        "Slowing down after a minimizing phrase shows you take the stakeholder's reality seriously.",
        "Inviting their view after a misstep rebuilds collaboration better than pressing the plan.",
      ];
      suggestion = {
        observed: `When you said "${excerpt}", it sounded dismissive or pressuring.`,
        suggestedAlternative,
        explanation: explanations[variant % explanations.length],
      };
      break;
    }
    case "escalated": {
      const alternatives = [
        "I can see this is frustrating — let me slow down and address your concern directly.",
        "I'm hearing tension in how I said that. What part of this still feels unresolved?",
        "Let me reset my tone — what's the one thing you most need clarity on right now?",
      ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      suggestion = {
        observed: `Your tone escalated when the stakeholder pushed back: "${excerpt}"`,
        suggestedAlternative,
        explanation:
          "De-escalating keeps the conversation productive under pressure.",
      };
      break;
    }
    case "trust_loss": {
      const alternatives = [
        "I don't think that landed well — what's still unanswered for you?",
        "That may have missed the mark. What would help you trust we're taking this seriously?",
        "I want to check how that came across — what would repair this part of the conversation?",
      ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      suggestion = {
        observed: `This response reduced trust in the conversation: "${excerpt}"`,
        suggestedAlternative,
        explanation:
          "Acknowledging impact on trust invites repair before pushing the proposal again.",
      };
      break;
    }
    case "vague": {
      const alternatives = mentionsTimelineOrPlan(turn.quote)
        ? [
            "Concretely: one team, a six-week pilot, one paused report, and a stop point if workload spikes — does that level of detail help?",
            "Here's what I can commit to today on scope and timing, and here's what I'm still confirming.",
          ]
        : [
            "Here's what I can commit to today, and here's what I'm still working to confirm.",
            "Let me be specific: one pilot team, defined success criteria at week six, and a rollback trigger if load increases.",
            "Instead of the broad case — the first step would be a six-week pilot with your ops lead as co-owner.",
          ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      suggestion = {
        observed: `When the stakeholder pressed for detail, you stayed general: "${excerpt}"`,
        suggestedAlternative,
        explanation:
          "This gives the stakeholder something concrete to evaluate without overpromising.",
      };
      break;
    }
    case "premature_solution": {
      const acknowledged =
        turn.acknowledgedStakeholderConcerns ||
        quoteShowsAcknowledgment(turn.quote) ||
        (profile !== undefined && hasAcknowledgedConcerns(profile));
      const alternatives = acknowledged
        ? mentionsTimelineOrPlan(turn.quote)
          ? [
              "You acknowledged the workload concern — how do peak workload periods affect your team when something new is added?",
              "Before I walk through the timeline again — what part of peak-week capacity is most at risk?",
            ]
          : [
              "You acknowledged workload concerns effectively — what would help you explore how peak periods affect the team?",
              "I hear the capacity concern — what operational detail would help you evaluate whether a pilot is workable?",
            ]
        : mentionsTimelineOrPlan(turn.quote)
          ? [
              "Before I walk through implementation — how would this land on your team's calendar during peak weeks?",
              "I jumped to the plan too fast. What operational concern should I understand first?",
            ]
          : [
              "Before we talk implementation, I want to understand how this affects your team's day-to-day work.",
              "I may have moved to solutions too soon — what's the main constraint I haven't addressed yet?",
            ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      suggestion = {
        observed: acknowledged
          ? `You acknowledged workload concerns, then moved quickly into solutions — exploring impact more deeply could strengthen trust: "${excerpt}"`
          : `You moved to solutions before the stakeholder's concerns were understood: "${excerpt}"`,
        suggestedAlternative,
        explanation: acknowledged
          ? "Deepening exploration after acknowledgment shows curiosity without undoing what you already validated."
          : "Centering their concerns first builds trust before proposing a path forward.",
      };
      break;
    }
    case "repeated": {
      const alternatives = [
        "Given your pushback, let me adjust — here's a lighter first step we could try.",
        "I'm not going to repeat the same pitch — what's the one constraint we should design around first?",
        "Let me change approach. What would a low-risk pilot look like from your perspective?",
      ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      suggestion = {
        observed: `You repeated a similar approach without addressing the stakeholder's concerns: "${excerpt}"`,
        suggestedAlternative,
        explanation:
          "Adapting your framing shows you are responding to the stakeholder, not just repeating your case.",
      };
      break;
    }
    case "passive": {
      const alternatives = [
        "I hear you — here's one concrete next step we could explore together.",
        "Agreed, and to make that real: what would a manageable first step look like on your side?",
        "Thanks for sharing that. Can we define one small experiment we'd both be willing to try?",
      ];
      const suggestedAlternative = pickUnused(alternatives, usedAlternatives);
      if (!suggestedAlternative) return null;
      suggestion = {
        observed: `You agreed without engaging concerns or proposing a next step: "${excerpt}"`,
        suggestedAlternative,
        explanation:
          "Pairing agreement with a concrete next step shows real collaboration.",
      };
      break;
    }
  }

  if (!suggestion || usedAlternatives.has(suggestion.suggestedAlternative)) {
    return null;
  }

  usedAlternatives.add(suggestion.suggestedAlternative);
  return suggestion;
}

function buildSessionCoachingRules(coachedTurnIndices: Set<number>): SessionCoachingRule[] {
  return [
    {
      detect: (profile, _finalState) =>
        hasAcknowledgedConcerns(profile) &&
        profile.perspectiveEngagementCount === 0 &&
        profile.userMessageCount >= 2,
      build: (profile, _finalState, stakeholderFirstName) => {
        const ackTurn = profile.turns.find(
          (t) => t.acknowledgedStakeholderConcerns || t.stakeholderFirstReasoning
        );
        const followTurn = profile.turns.find(
          (t) =>
            t.turnIndex > (ackTurn?.turnIndex ?? -1) &&
            t.substantiveEngagement &&
            !t.perspectiveEngagement
        );
        if (ackTurn && coachedTurnIndices.has(ackTurn.turnIndex)) {
          return null;
        }
        const followExcerpt = followTurn
          ? quoteExcerpt(followTurn.quote, 45)
          : "the plan";

        return {
          observed: `You acknowledged ${stakeholderFirstName}'s workload concerns effectively — you could deepen the discussion by exploring how peak workload periods affect the team before moving into "${followExcerpt}".`,
          suggestedAlternative:
            "I hear the capacity concern. Before I walk through the schedule, what weeks or priorities are most sensitive for your team right now?",
          explanation: `This keeps the acknowledgment but gives ${stakeholderFirstName} a chance to define the risk before you explain the plan.`,
        };
      },
    },
    {
      detect: (profile) =>
        profile.substantiveEngagementCount >= 2 &&
        profile.alignmentShiftCount === 0 &&
        profile.userMessageCount >= 3,
      build: (_profile, _finalState, stakeholderFirstName) => ({
        observed: `You kept adding operational detail for ${stakeholderFirstName} without checking whether she had enough to evaluate the proposal.`,
        suggestedAlternative:
          "Based on what we've discussed so far, do you feel like you have enough information to evaluate whether this makes sense for your team?",
        explanation:
          "This shifts the conversation from information gathering toward decision-making.",
      }),
    },
    {
      detect: (profile, finalState) =>
        !hasAcknowledgedConcerns(profile) &&
        profile.perspectiveEngagementCount === 0 &&
        profile.userMessageCount >= 2 &&
        !coachedTurnIndices.has(0) &&
        !isSuccessfulConversation(finalState),
      build: (profile, _finalState, stakeholderFirstName) => {
        const firstUser = profile.turns[0];
        const excerpt = firstUser ? quoteExcerpt(firstUser.quote, 50) : "the initiative";
        return {
          observed: `Your opening moved straight into "${excerpt}" without acknowledging ${stakeholderFirstName}'s workload or capacity concerns.`,
          suggestedAlternative:
            "Before we go further, I want to acknowledge your team is already stretched — that's exactly why I wanted to talk with you first.",
          explanation:
            "Leading with acknowledgment shows you understand what is at stake for their team.",
        };
      },
    },
    {
      detect: (profile) => {
        const vagueTurns = profile.turns.filter(
          (t) =>
            t.remainedVagueUnderChallenge &&
            !quoteImpliesHostile(t.quote) &&
            !mentionsPressureLanguage(t.quote)
        );
        return (
          vagueTurns.length >= 2 &&
          profile.substantiveEngagementCount < profile.vagueUnderChallengeCount
        );
      },
      build: (profile) => {
        const vagueTurns = profile.turns.filter(
          (t) =>
            t.remainedVagueUnderChallenge &&
            !quoteImpliesHostile(t.quote) &&
            !mentionsPressureLanguage(t.quote)
        );
        const last = vagueTurns.at(-1);
        if (!last) return null;
        return {
          observed: `You gave another vague response when pressed for detail: "${quoteExcerpt(last.quote)}"`,
          suggestedAlternative:
            "Here's what I can commit to today, and here's what I'm still working to confirm.",
          explanation:
            "Separating known facts from open questions builds credibility under scrutiny.",
        };
      },
    },
    {
      detect: (profile, finalState) =>
        !isSuccessfulConversation(finalState) &&
        profile.dialogueInvitationCount === 0 &&
        profile.turns.filter((t) => t.facedHighResistance).length >= 2 &&
        profile.reframingCount === 0,
      build: (_profile, _finalState, stakeholderFirstName) => ({
        observed: `Resistance stayed elevated across several exchanges, but you didn't invite ${stakeholderFirstName}'s input on what would make this workable.`,
        suggestedAlternative:
          "What would need to be true for this to feel manageable from your team's perspective?",
        explanation:
          "Inviting their criteria turns pushback into shared problem-solving.",
      }),
    },
    {
      detect: (profile, finalState) =>
        !isSuccessfulConversation(finalState) &&
        finalState.trust < 55 &&
        profile.trustDelta <= 0 &&
        profile.userMessageCount >= 3 &&
        !hasAcknowledgedConcerns(profile),
      build: (_profile, _finalState, stakeholderFirstName) => ({
        observed: `Trust did not improve as your conversation with ${stakeholderFirstName} progressed, and concerns may not have been fully addressed.`,
        suggestedAlternative:
          "It sounds like I haven't fully addressed your concerns yet — what's the biggest thing still giving you pause?",
        explanation:
          "Naming the gap directly can reopen productive dialogue before you ask for support.",
      }),
    },
    {
      detect: (profile, finalState) =>
        !isSuccessfulConversation(finalState) &&
        (finalState.conversationStatus === "userEnded" ||
          (finalState.readinessScore < 50 && finalState.conversationStatus === "active")),
      build: (_profile, _finalState, stakeholderFirstName) => ({
        observed: `Your conversation with ${stakeholderFirstName} ended without a clear next step or decision.`,
        suggestedAlternative:
          "Before we wrap up, I'd like to agree on one concrete next step — even if that's you taking time to evaluate internally.",
        explanation:
          "Closing with a specific next step prevents the conversation from fading without resolution.",
      }),
    },
  ];
}

function buildSessionCoaching(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  stakeholderFirstName: string,
  coachedTurnIndices: Set<number>,
  usedAlternatives: Set<string>,
  usedObserved: Set<string>
): CoachingSuggestion[] {
  const items: CoachingSuggestion[] = [];

  for (const rule of buildSessionCoachingRules(coachedTurnIndices)) {
    if (!rule.detect(profile, finalState)) continue;
    const suggestion = rule.build(profile, finalState, stakeholderFirstName);
    if (!suggestion) continue;
    if (
      usedAlternatives.has(suggestion.suggestedAlternative) ||
      usedObserved.has(suggestion.observed)
    ) {
      continue;
    }
    usedAlternatives.add(suggestion.suggestedAlternative);
    usedObserved.add(suggestion.observed);
    items.push(suggestion);
  }

  return items;
}

function buildLevelUpCoaching(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  stakeholderFirstName: string,
  usedAlternatives: Set<string>,
  usedObserved: Set<string>
): CoachingSuggestion[] {
  const items: CoachingSuggestion[] = [];

  const push = (suggestion: CoachingSuggestion) => {
    if (
      usedAlternatives.has(suggestion.suggestedAlternative) ||
      usedObserved.has(suggestion.observed)
    ) {
      return;
    }
    usedAlternatives.add(suggestion.suggestedAlternative);
    usedObserved.add(suggestion.observed);
    items.push(suggestion);
  };

  if (
    profile.perspectiveEngagementCount >= 1 &&
    profile.userMessageCount >= 3 &&
    finalState.readinessScore >= 55
  ) {
    push({
      observed: `You invited ${stakeholderFirstName}'s perspective — before closing, you could reflect her main concern back in your own words.`,
      suggestedAlternative: `So if I'm hearing you correctly, the biggest risk is capacity during peak weeks — did I get that right?`,
      explanation:
        "Summarizing confirms you understood before asking for a decision or next step.",
    });
  }

  if (profile.reframingCount >= 1 && finalState.readinessScore >= 60) {
    push({
      observed:
        "You adapted after pushback — you could make the tradeoff explicit so the stakeholder sees what you adjusted for.",
      suggestedAlternative:
        "Given your capacity concern, I'm proposing we start with one team and pause a low-value report to protect bandwidth — does that tradeoff feel fair?",
      explanation:
        "Naming the tradeoff shows you are designing around their constraint, not just softening your pitch.",
    });
  }

  if (
    profile.substantiveEngagementCount >= 2 &&
    profile.stakeholderFirstCount >= 1 &&
    profile.dialogueInvitationCount <= 1
  ) {
    push({
      observed: `You provided useful detail after acknowledging ${stakeholderFirstName}'s concern — pausing to check readiness could strengthen the close.`,
      suggestedAlternative:
        "Based on what we've covered, do you feel like you have enough to decide whether a small pilot is worth exploring?",
      explanation:
        "Decision framing prevents the conversation from staying in information mode too long.",
    });
  }

  if (
    profile.stakeholderFirstCount >= 1 &&
    profile.substantiveEngagementCount >= 1 &&
    profile.reasonedJudgmentCount === 0
  ) {
    push({
      observed:
        "You validated concerns and shared information — naming the operational tradeoff would make the proposal easier to evaluate.",
      suggestedAlternative:
        "The tradeoff I'm asking for is roughly six weeks of focused effort in exchange for reducing manual handoffs — I want to be upfront about that cost.",
      explanation:
        "Stakeholders weigh change more fairly when the cost is named clearly, not implied.",
    });
  }

  return items;
}

function buildFallbackCoaching(
  profile: SessionBehaviorProfile,
  stakeholderFirstName: string,
  usedAlternatives: Set<string>,
  usedObserved: Set<string>
): CoachingSuggestion[] {
  const fallbacks: CoachingSuggestion[] = [
    {
      observed: `Your conversation with ${stakeholderFirstName} was brief — there is room to explore her concerns more fully before presenting the plan.`,
      suggestedAlternative:
        "Before I go further, what's the biggest concern on your team's plate right now?",
      explanation:
        "An early open-ended question surfaces the real constraint before you present the plan.",
    },
    {
      observed: `You may not have checked whether ${stakeholderFirstName} felt heard before moving toward next steps.`,
      suggestedAlternative:
        "I want to make sure I've understood your concern — what would need to be true for this to feel manageable?",
      explanation:
        "Checking understanding keeps the conversation collaborative rather than one-directional.",
    },
    {
      observed: `There may be an opportunity to name one concrete next step ${stakeholderFirstName} could agree to, even conditionally.`,
      suggestedAlternative:
        "Would it help if we defined a small pilot with a clear stop point — and you decide after week six whether to continue?",
      explanation:
        "A bounded next step lowers the risk of committing before trust is established.",
    },
  ];

  if (profile.turns.length > 0) {
    const lastQuote = quoteExcerpt(profile.turns.at(-1)!.quote, 45);
    fallbacks.unshift({
      observed: `Your last message ("${lastQuote}") could have ended with a question that invited ${stakeholderFirstName}'s criteria for moving forward.`,
      suggestedAlternative:
        "What would you need to see in the first two weeks to know whether this pilot is workable?",
      explanation:
        "Ending with their criteria keeps the conversation co-owned rather than one-directional.",
    });
  }

  return fallbacks.filter((suggestion) => {
    if (
      usedAlternatives.has(suggestion.suggestedAlternative) ||
      usedObserved.has(suggestion.observed)
    ) {
      return false;
    }
    usedAlternatives.add(suggestion.suggestedAlternative);
    usedObserved.add(suggestion.observed);
    return true;
  });
}

export function buildWhatWorked(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState
): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  const breakdown =
    finalState.conversationStatus === "lost" ||
    (finalState.trust < 45 && finalState.ruptureLevel >= 55);

  for (const turn of profile.turns) {
    for (const rule of STRENGTH_RULES) {
      if (!rule.detect(turn) || seen.has(rule.coachingLine)) continue;
      if (breakdown) {
        if (
          rule.coachingLine.includes("Acknowledged") &&
          profile.acknowledgedConcernsCount + profile.stakeholderFirstCount < 1
        ) {
          continue;
        }
        if (
          rule.coachingLine.includes("Stayed composed") &&
          profile.escalationUnderPressureCount >= 1
        ) {
          continue;
        }
        if (
          rule.coachingLine.includes("Recovered") &&
          profile.recoveryCount === 0
        ) {
          continue;
        }
      }
      seen.add(rule.coachingLine);
      items.push(rule.coachingLine);
      if (items.length >= MAX_WHAT_WORKED) return items;
    }
  }

  return items;
}

export function buildStrengthenConversation(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  stakeholderFirstName = "the stakeholder"
): CoachingSuggestion[] {
  const successful = isSuccessfulConversation(finalState);
  const strong = isStrongConversation(profile, finalState);
  const minStrengthen = strong || successful ? 0 : MIN_STRENGTHEN;
  const maxStrengthen = strong ? STRONG_MAX_STRENGTHEN : successful ? 2 : MAX_STRENGTHEN;

  const usedAlternatives = new Set<string>();
  const usedObserved = new Set<string>();
  const items: CoachingSuggestion[] = [];
  const coachedTurnIndices = new Set<number>();
  const issueCounts: Record<TurnIssue, number> = {
    hostile: 0,
    dismissive: 0,
    escalated: 0,
    trust_loss: 0,
    vague: 0,
    premature_solution: 0,
    repeated: 0,
    passive: 0,
  };

  for (const turn of profile.turns) {
    const issue = detectTurnIssue(turn);
    if (successful && issue !== null && !isSevereIssue(issue)) continue;

    const suggestion = buildTurnCoaching(
      turn,
      stakeholderFirstName,
      issueCounts,
      usedAlternatives,
      profile
    );
    if (!suggestion || usedObserved.has(suggestion.observed)) continue;
    usedObserved.add(suggestion.observed);
    coachedTurnIndices.add(turn.turnIndex);
    items.push(suggestion);
    if (items.length >= maxStrengthen) return items;
  }

  for (const suggestion of buildSessionCoaching(
    profile,
    finalState,
    stakeholderFirstName,
    coachedTurnIndices,
    usedAlternatives,
    usedObserved
  )) {
    items.push(suggestion);
    if (items.length >= maxStrengthen) return items.slice(0, maxStrengthen);
  }

  if (successful || items.length < minStrengthen) {
    for (const suggestion of buildLevelUpCoaching(
      profile,
      finalState,
      stakeholderFirstName,
      usedAlternatives,
      usedObserved
    )) {
      items.push(suggestion);
      if (items.length >= maxStrengthen) break;
    }
  }

  if (!successful && items.length < minStrengthen) {
    for (const suggestion of buildFallbackCoaching(
      profile,
      stakeholderFirstName,
      usedAlternatives,
      usedObserved
    )) {
      items.push(suggestion);
      if (items.length >= minStrengthen) break;
    }
  }

  return items.slice(0, maxStrengthen);
}

const GROWTH_SKILL_NAMES: Record<TurnIssue, string> = {
  hostile: "Validation",
  dismissive: "Validation",
  escalated: "Validation",
  trust_loss: "Validation",
  vague: "Specific Communication",
  premature_solution: "Perspective-Taking",
  repeated: "Collaborative Problem Solving",
  passive: "Alignment Checking",
};

const ISSUE_SEVERITY: TurnIssue[] = [
  "hostile",
  "dismissive",
  "escalated",
  "trust_loss",
  "vague",
  "premature_solution",
  "repeated",
  "passive",
];

export type GrowthOpportunity = {
  skillName: string;
  observed: string;
  tryInstead: string;
  whyItMatters: string;
};

function findTurnsBySeverity(
  profile: SessionBehaviorProfile
): { turn: TurnBehaviorSignals; issue: TurnIssue }[] {
  const matches: { turn: TurnBehaviorSignals; issue: TurnIssue; severity: number }[] = [];

  for (const turn of profile.turns) {
    const issue = detectTurnIssue(turn);
    if (!issue) continue;
    const severity = ISSUE_SEVERITY.indexOf(issue);
    if (severity < 0) continue;
    matches.push({ turn, issue, severity });
  }

  return matches
    .sort((a, b) => a.severity - b.severity)
    .map(({ turn, issue }) => ({ turn, issue }));
}

export function buildGrowthOpportunity(
  profile: SessionBehaviorProfile,
  finalState: ScenarioState,
  stakeholderFirstName: string,
  excludeTryInstead: string[] = []
): GrowthOpportunity | null {
  const successful = isSuccessfulConversation(finalState);
  const strong = isStrongConversation(profile, finalState);
  const usedAlternatives = new Set(excludeTryInstead);
  const issueCounts: Record<TurnIssue, number> = {
    hostile: 0,
    dismissive: 0,
    escalated: 0,
    trust_loss: 0,
    vague: 0,
    premature_solution: 0,
    repeated: 0,
    passive: 0,
  };

  const whyBySkill: Record<string, string> = {
    Validation:
      "Validation helps people feel heard before they are asked to consider change.",
    "Specific Communication":
      "Specific detail under scrutiny builds credibility when stakeholders ask hard operational questions.",
    "Perspective-Taking":
      "Perspective-taking surfaces the real concern behind resistance instead of debating the proposal.",
    "Collaborative Problem Solving":
      "Collaborative problem-solving turns pushback into shared criteria instead of a standoff.",
    "Alignment Checking":
      "Alignment checking confirms whether the stakeholder has enough to evaluate before you ask for support.",
  };

  const toGrowthOpportunity = (
    coaching: CoachingSuggestion,
    issue?: TurnIssue
  ): GrowthOpportunity => {
    const skillName = issue
      ? GROWTH_SKILL_NAMES[issue]
      : coaching.observed.toLowerCase().includes("summar") ||
          coaching.observed.toLowerCase().includes("reflect")
        ? "Validation"
        : coaching.observed.toLowerCase().includes("tradeoff")
          ? "Specific Communication"
          : "Alignment Checking";

    return {
      skillName,
      observed: coaching.observed,
      tryInstead: coaching.suggestedAlternative,
      whyItMatters: whyBySkill[skillName] ?? coaching.explanation,
    };
  };

  if (!strong) {
    for (const { turn, issue } of findTurnsBySeverity(profile)) {
      if (successful && !isSevereIssue(issue)) continue;

      const coaching = buildTurnCoaching(
        turn,
        stakeholderFirstName,
        issueCounts,
        usedAlternatives,
        profile
      );
      if (!coaching || excludeTryInstead.includes(coaching.suggestedAlternative)) {
        continue;
      }

      return toGrowthOpportunity(coaching, issue);
    }
  }

  const usedObserved = new Set<string>();
  for (const suggestion of buildLevelUpCoaching(
    profile,
    finalState,
    stakeholderFirstName,
    usedAlternatives,
    usedObserved
  )) {
    if (excludeTryInstead.includes(suggestion.suggestedAlternative)) continue;
    return toGrowthOpportunity(suggestion);
  }

  if (!successful) {
    const positiveFallbacks: GrowthOpportunity[] = [
      {
        skillName: "Alignment Checking",
        observed: `You built momentum with ${stakeholderFirstName} — the close could include an explicit check on whether she is ready for a next step.`,
        tryInstead:
          "Based on what we covered, would a small pilot with a week-six checkpoint be worth defining together — or would you prefer time to evaluate internally?",
        whyItMatters:
          "Alignment checking turns a productive conversation into a clear shared next step.",
      },
      {
        skillName: "Validation",
        observed: `There may be room to reflect ${stakeholderFirstName}'s main concern in your own words before asking for a decision.`,
        tryInstead: `So if I'm hearing you correctly, the biggest risk is peak-week capacity — did I get that right?`,
        whyItMatters:
          "Summarizing concerns confirms you understood what matters before asking for support.",
      },
    ];

    for (const fallback of positiveFallbacks) {
      if (!excludeTryInstead.includes(fallback.tryInstead)) {
        return fallback;
      }
    }
  }

  return null;
}
