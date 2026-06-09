import {
  detectPostAssistantClosure,
  detectPreMessageClosure,
  detectStakeholderDisengagement,
  ClosureType,
} from "./closureDetection";
import {
  CLOSURE_ENDED_MESSAGE,
  ENDED_CONVERSATION_MESSAGE,
  isLossState,
  isSimulationTerminated,
  markConcluded,
  markLost,
  markUserEnded,
  USER_ENDED_MESSAGE,
} from "./conversationOutcome";
import { ClosureReason, EndType, ScenarioState } from "./types";

export type { EndType };

export type TerminationState = {
  conversationEnded: boolean;
  endType: EndType | null;
  closureDetected: boolean;
  closureReason?: ClosureReason;
};

export type TerminationGateInput = {
  state: ScenarioState;
  userMessage: string;
  lastAssistantMessage?: string;
  manualEnd?: boolean;
};

export type TerminationGateResult = TerminationState & {
  shouldTerminate: boolean;
  endMessage: string;
  state: ScenarioState;
};

function closureTypeToReason(type: ClosureType): ClosureReason {
  return type;
}

function buildTerminationState(
  shouldTerminate: boolean,
  endType: EndType | null,
  closureDetected: boolean,
  closureReason?: ClosureReason
): TerminationState {
  return {
    conversationEnded: shouldTerminate,
    endType,
    closureDetected,
    closureReason,
  };
}

function endMessageFor(endType: EndType, status: ScenarioState["conversationStatus"]): string {
  switch (endType) {
    case "manual":
      return USER_ENDED_MESSAGE;
    case "concluded":
      return CLOSURE_ENDED_MESSAGE;
    case "lost":
      return ENDED_CONVERSATION_MESSAGE;
    default:
      if (status === "userEnded") return USER_ENDED_MESSAGE;
      if (status === "concluded") return CLOSURE_ENDED_MESSAGE;
      return ENDED_CONVERSATION_MESSAGE;
  }
}

function applyEndType(state: ScenarioState, endType: EndType): ScenarioState {
  return { ...state, endType };
}

/**
 * HARD GATE - Step 0/1: Manual end and already-terminated sessions.
 * No state updates, scoring, or AI generation.
 */
export function evaluateManualOrStickyTermination(
  state: ScenarioState,
  manualEnd: boolean
): TerminationGateResult | null {
  if (manualEnd) {
    const next = applyEndType(markUserEnded(state), "manual");
    return {
      shouldTerminate: true,
      ...buildTerminationState(true, "manual", false),
      endMessage: USER_ENDED_MESSAGE,
      state: next,
    };
  }

  if (isSimulationTerminated(state)) {
    const endType: EndType =
      state.conversationStatus === "userEnded"
        ? "manual"
        : state.conversationStatus === "concluded"
          ? "concluded"
          : "lost";

    return {
      shouldTerminate: true,
      ...buildTerminationState(true, endType, state.conversationStatus === "concluded"),
      closureReason: state.closureReason,
      endMessage: endMessageFor(endType, state.conversationStatus),
      state,
    };
  }

  return null;
}

/**
 * HARD GATE - Step 1b: Stakeholder already disengaged; user message must not reopen the conversation.
 * No state updates, scoring, or AI generation.
 */
export function evaluatePreMessageDisengagementGate(
  state: ScenarioState,
  lastAssistantMessage?: string
): TerminationGateResult | null {
  if (!lastAssistantMessage || !detectStakeholderDisengagement(lastAssistantMessage)) {
    return null;
  }

  const next = applyEndType(markLost(state), "lost");

  return {
    shouldTerminate: true,
    ...buildTerminationState(true, "lost", false),
    endMessage: "",
    state: next,
  };
}

/**
 * HARD GATE - Step 1: Closure detection BEFORE any state updates or scoring.
 * Evaluates user message and last stakeholder message.
 */
export function evaluatePreMessageTerminationGate(
  input: TerminationGateInput
): TerminationGateResult | null {
  const { state, userMessage, lastAssistantMessage } = input;

  const closure = detectPreMessageClosure(
    userMessage,
    state,
    lastAssistantMessage
  );

  if (!closure.detected || !closure.type) {
    return null;
  }

  const next = applyEndType(
    markConcluded(state, closureTypeToReason(closure.type)),
    "concluded"
  );

  return {
    shouldTerminate: true,
    ...buildTerminationState(true, "concluded", true, closureTypeToReason(closure.type)),
    endMessage: CLOSURE_ENDED_MESSAGE,
    state: next,
  };
}

/**
 * HARD GATE - Step 2: Loss on current state BEFORE processing new message.
 */
export function evaluatePreMessageLossGate(
  state: ScenarioState
): TerminationGateResult | null {
  if (state.conversationStatus === "lost" || isLossState(state)) {
    const next = applyEndType(
      state.conversationStatus === "lost"
        ? state
        : { ...state, conversationStatus: "lost" },
      "lost"
    );

    return {
      shouldTerminate: true,
      ...buildTerminationState(true, "lost", false),
      endMessage: ENDED_CONVERSATION_MESSAGE,
      state: next,
    };
  }

  return null;
}

/**
 * HARD GATE - Step 3: Loss AFTER state update from user message.
 * Terminates without AI generation.
 */
export function evaluatePostMessageLossGate(
  state: ScenarioState
): TerminationGateResult | null {
  if (state.conversationStatus !== "lost" && !isLossState(state)) {
    return null;
  }

  const next = applyEndType(
    state.conversationStatus === "lost"
      ? state
      : { ...state, conversationStatus: "lost" },
    "lost"
  );

  return {
    shouldTerminate: true,
    ...buildTerminationState(true, "lost", false),
    endMessage: ENDED_CONVERSATION_MESSAGE,
    state: next,
  };
}

/**
 * HARD GATE - Step 4: Stakeholder closure after AI response.
 * Ends session; no further turns allowed.
 */
export function evaluatePostAssistantTerminationGate(
  state: ScenarioState,
  assistantMessage: string,
  userMessage: string
): TerminationGateResult | null {
  if (detectStakeholderDisengagement(assistantMessage)) {
    const next = applyEndType(markLost(state), "lost");

    return {
      shouldTerminate: true,
      ...buildTerminationState(true, "lost", false),
      endMessage: assistantMessage,
      state: next,
    };
  }

  const closure = detectPostAssistantClosure(
    assistantMessage,
    userMessage,
    state
  );

  if (!closure.detected || !closure.type) {
    return null;
  }

  const next = applyEndType(
    markConcluded(state, closureTypeToReason(closure.type)),
    "concluded"
  );

  return {
    shouldTerminate: true,
    ...buildTerminationState(true, "concluded", true, closureTypeToReason(closure.type)),
    endMessage: assistantMessage,
    state: next,
  };
}
