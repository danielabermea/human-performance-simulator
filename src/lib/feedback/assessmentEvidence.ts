import { MessageTurn } from "./coachingFeedback";

export type AssessmentConfidence = "none" | "low" | "standard";

export type FeedbackEvidence = {
  confidence: AssessmentConfidence;
  userMessageCount: number;
  substantiveMessageCount: number;
};

const SUBSTANTIVE_MIN_WORDS = 5;
const SUBSTANTIVE_MIN_CHARS = 25;

export function isSubstantiveUserMessage(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return trimmed.length >= SUBSTANTIVE_MIN_CHARS || words.length >= SUBSTANTIVE_MIN_WORDS;
}

export function assessFeedbackEvidence(transcript: MessageTurn[]): FeedbackEvidence {
  const userMessages = transcript.filter((turn) => turn.role === "user");
  const userMessageCount = userMessages.length;
  const substantiveMessageCount = userMessages.filter((turn) =>
    isSubstantiveUserMessage(turn.content)
  ).length;

  if (userMessageCount === 0) {
    return { confidence: "none", userMessageCount, substantiveMessageCount };
  }

  if (substantiveMessageCount >= 2) {
    return { confidence: "standard", userMessageCount, substantiveMessageCount };
  }

  return { confidence: "low", userMessageCount, substantiveMessageCount };
}

export const INSUFFICIENT_EVIDENCE_ASSESSMENT = `Insufficient evidence to assess communication behaviors.

No user responses were recorded during this simulation.

To receive meaningful coaching feedback, engage in a short conversation with the stakeholder before ending the simulation.`;

export function buildLowConfidenceNote(evidence: FeedbackEvidence): string {
  if (evidence.userMessageCount === 1 && evidence.substantiveMessageCount === 0) {
    return "Assessment Confidence: Low — only one brief response was recorded, so competency ratings reflect limited observed behavior.";
  }

  if (evidence.userMessageCount === 1) {
    return "Assessment Confidence: Low — only one user response was recorded; more conversation would improve accuracy.";
  }

  return "Assessment Confidence: Low — limited conversation was recorded, so this feedback is based on partial observed behavior.";
}
