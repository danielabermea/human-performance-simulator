export type ConversationMetrics = {
  empathyCount: number;
  validationCount: number;
  hostileCount: number;
  dismissiveCount: number;
  questionCount: number;
  objectionHandlingCount: number;
  evidenceCount: number;
  specificityCount: number;
  rapportBuildingCount: number;
  interruptionAttempts: number;
  repairAttempts: number;
  successfulRepairs: number;
  hiddenMotivationAddressedCount: number;
  vagueMessageCount: number;
  aggressiveCount: number;
  addressesConcernCount: number;
  userMessageCount: number;
  postPushbackAdaptationCount: number;
};

export function createInitialConversationMetrics(): ConversationMetrics {
  return {
    empathyCount: 0,
    validationCount: 0,
    hostileCount: 0,
    dismissiveCount: 0,
    questionCount: 0,
    objectionHandlingCount: 0,
    evidenceCount: 0,
    specificityCount: 0,
    rapportBuildingCount: 0,
    interruptionAttempts: 0,
    repairAttempts: 0,
    successfulRepairs: 0,
    hiddenMotivationAddressedCount: 0,
    vagueMessageCount: 0,
    aggressiveCount: 0,
    addressesConcernCount: 0,
    userMessageCount: 0,
    postPushbackAdaptationCount: 0,
  };
}
