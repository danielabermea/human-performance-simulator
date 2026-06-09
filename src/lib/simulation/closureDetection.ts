import { ScenarioState } from "./types";

export type ClosureType = "commitment" | "decline" | "wrapUp";

export type ClosureDetection = {
  detected: boolean;
  type: ClosureType | null;
};

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

/** Commitment with explicit next-step or decision language */
const STRONG_COMMITMENT_PHRASES = [
  "we'll proceed",
  "we will proceed",
  "let's proceed",
  "lets proceed",
  "let us proceed",
  "let's move forward",
  "lets move forward",
  "we'll move forward",
  "we will move forward",
  "i'm comfortable with this",
  "i am comfortable with this",
  "comfortable with this",
  "we'll do this",
  "we will do this",
  "let's do this",
  "lets do this",
  "let's schedule next steps",
  "lets schedule next steps",
  "schedule next steps",
  "let's figure out next steps",
  "lets figure out next steps",
  "we can proceed",
  "i'll take this forward",
  "i will take this forward",
];

/** Weak support alone is NOT closure - requires next-step language */
const WEAK_SUPPORT_PHRASES = [
  "i support this",
  "i'm supportive",
  "i am supportive",
  "i'm on board",
  "i am on board",
  "i can get behind",
  "sounds reasonable",
  "makes sense to me",
];

const NEXT_STEP_PHRASES = [
  "let's move forward",
  "lets move forward",
  "we'll proceed",
  "we will proceed",
  "let's proceed",
  "lets proceed",
  "schedule next steps",
  "next steps",
  "move forward",
  "take this forward",
  "we'll do this",
  "we will do this",
  "let's do this",
  "figure out next steps",
];

const DECLINE_PHRASES = [
  "we're not moving forward",
  "we are not moving forward",
  "not moving forward",
  "i can't support this",
  "i cannot support this",
  "can't support this",
  "cannot support this",
  "we can't support",
  "we cannot support",
  "i'm not moving forward",
  "i am not moving forward",
  "won't be moving forward",
  "not going to happen",
  "not proceeding",
  "not feasible",
  "isn't feasible",
  "have to pass on this",
];

const EXPLICIT_CLOSURE_PHRASES = [
  "thank you",
  "thanks",
  "talk soon",
  "goodbye",
  "good bye",
  "that works",
  "sounds good",
  "take care",
  "have a good one",
  "have a good day",
  "appreciate your time",
];

/** Stakeholder explicitly ends or disengages from the conversation */
const STAKEHOLDER_DISENGAGEMENT_PHRASES = [
  "i'm ending this discussion",
  "i am ending this discussion",
  "ending this discussion for now",
  "i'm stepping away",
  "i am stepping away",
  "stepping away from this",
  "this conversation is no longer productive",
  "conversation is no longer productive",
  "no longer productive",
  "i'm done here",
  "i am done here",
  "let's revisit this another time",
  "lets revisit this another time",
  "revisit this another time",
  "pick this up another time",
  "we can pick this up another time",
  "i'm not willing to keep going",
  "i am not willing to keep going",
  "not willing to keep going like this",
  "i don't think we're having a productive conversation",
  "i do not think we're having a productive conversation",
  "not having a productive conversation",
  "we're not having a productive conversation",
  "we are not having a productive conversation",
  "this isn't productive",
  "this is not productive",
  "i need to end this conversation",
  "end this conversation",
  "i'm going to stop here",
  "i am going to stop here",
];

function detectDecline(text: string): boolean {
  return includesAny(text, DECLINE_PHRASES);
}

function detectCommitment(text: string): boolean {
  if (includesAny(text, STRONG_COMMITMENT_PHRASES)) {
    return true;
  }

  const hasWeakSupport = includesAny(text, WEAK_SUPPORT_PHRASES);
  const hasNextStep = includesAny(text, NEXT_STEP_PHRASES);

  if (hasWeakSupport && hasNextStep) {
    return true;
  }

  // Anti-bug: "I support this" alone is NOT closure
  return false;
}

function detectExplicitClosure(text: string): boolean {
  return includesAny(text, EXPLICIT_CLOSURE_PHRASES);
}

/** Detects stakeholder language that explicitly ends or disengages from the conversation. */
export function detectStakeholderDisengagement(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  if (!normalized) {
    return false;
  }

  if (includesAny(normalized, STAKEHOLDER_DISENGAGEMENT_PHRASES)) {
    return true;
  }

  if (/\b(i'm|i am) done\b/.test(normalized) && normalized.length <= 120) {
    return true;
  }

  return false;
}

/**
 * Wrap-up closure requires explicit closure language AND
 * no unresolved active negotiation (not high-conflict active debate).
 */
function detectWrapUpClosure(
  text: string,
  state: ScenarioState,
  otherPartyText?: string
): boolean {
  if (!detectExplicitClosure(text)) {
    return false;
  }

  const strongClosure = includesAny(text, [
    "goodbye",
    "good bye",
    "talk soon",
    "take care",
  ]);

  if (strongClosure) {
    return hasNoActiveNegotiation(state);
  }

  if (otherPartyText && detectExplicitClosure(otherPartyText)) {
    return hasNoActiveNegotiation(state);
  }

  if (text.length < 100) {
    return hasNoActiveNegotiation(state);
  }

  return false;
}

function hasNoActiveNegotiation(state: ScenarioState): boolean {
  if (state.conversationStatus !== "active") {
    return true;
  }

  return (
    state.ruptureLevel < 50 &&
    state.resistance < 65 &&
    state.trust >= 50
  );
}

function detectInMessage(
  message: string,
  state: ScenarioState,
  otherPartyText?: string
): ClosureDetection {
  const text = message.toLowerCase().trim();

  if (!text) {
    return { detected: false, type: null };
  }

  if (detectDecline(text)) {
    return { detected: true, type: "decline" };
  }

  if (detectCommitment(text)) {
    return { detected: true, type: "commitment" };
  }

  if (detectWrapUpClosure(text, state, otherPartyText)) {
    return { detected: true, type: "wrapUp" };
  }

  return { detected: false, type: null };
}

/**
 * TERMINATION GATE - runs before state updates, scoring, or AI generation.
 * Checks user message and optional last stakeholder message for closure.
 */
export function detectPreMessageClosure(
  userMessage: string,
  state: ScenarioState,
  lastAssistantMessage?: string
): ClosureDetection {
  const user = userMessage.toLowerCase().trim();
  const assistant = lastAssistantMessage?.toLowerCase().trim();

  if (!user && !assistant) {
    return { detected: false, type: null };
  }

  if (user) {
    const userClosure = detectInMessage(user, state, assistant);
    if (userClosure.detected) {
      return userClosure;
    }
  }

  if (assistant) {
    const assistantClosure = detectInMessage(assistant, state, user);
    if (assistantClosure.detected) {
      return assistantClosure;
    }
  }

  return { detected: false, type: null };
}

/** Post-AI check - stakeholder response closure (same rules). */
export function detectPostAssistantClosure(
  assistantMessage: string,
  userMessage: string,
  state: ScenarioState
): ClosureDetection {
  return detectInMessage(
    assistantMessage.toLowerCase().trim(),
    state,
    userMessage.toLowerCase().trim()
  );
}

/** @deprecated Use detectPreMessageClosure / detectPostAssistantClosure */
export function detectConversationClosure(
  assistantMessage: string,
  lastUserMessage?: string
): ClosureDetection {
  return detectInMessage(
    assistantMessage.toLowerCase().trim(),
    { conversationStatus: "active", ruptureLevel: 0, resistance: 50, trust: 50 } as ScenarioState,
    lastUserMessage?.toLowerCase().trim()
  );
}
