export type ExecutiveScores = {
  emotionalIntelligence: number;
  stakeholderManagement: number;
  executiveCommunication: number;
  adaptiveCommunication: number;
  influenceAndPersuasion: number;
};

export type ScoreLevel =
  | "Expert"
  | "Strong"
  | "Developing"
  | "Needs Improvement";

export type ExecutiveScoreState = {
  trust: number;
  resistance: number;
  ruptureLevel: number;
};

export function createInitialScores(): ExecutiveScores {
  return {
    emotionalIntelligence: 50,
    stakeholderManagement: 50,
    executiveCommunication: 50,
    adaptiveCommunication: 50,
    influenceAndPersuasion: 50,
  };
}

export function updateExecutiveScores(
  scores: ExecutiveScores,
  message: string,
  state: ExecutiveScoreState
): ExecutiveScores {
  const text = message.toLowerCase();
  const next = { ...scores };

  const isDismissive =
    text.includes("just do it") ||
    text.includes("you're dumb") ||
    text.includes("get on board") ||
    text.includes("you're blocking");

  const isEmpathetic =
    text.includes("i understand") ||
    text.includes("i see your concern") ||
    text.includes("that makes sense");

  const isSpecific =
    text.includes("pilot") ||
    text.includes("timeline") ||
    text.includes("fte") ||
    text.includes("rollout") ||
    text.includes("resource");

  const isVague =
    text.includes("we should improve") ||
    text.includes("efficiency") ||
    text.includes("optimize");

  const highRupture = state.ruptureLevel > 60;

  if (isEmpathetic) next.emotionalIntelligence += 3;
  if (isDismissive) next.emotionalIntelligence -= 6;
  if (highRupture && !isEmpathetic) next.emotionalIntelligence -= 2;

  if (isEmpathetic) next.stakeholderManagement += 4;
  if (isDismissive) next.stakeholderManagement -= 7;

  if (state.trust < 40) {
    next.stakeholderManagement -= 2;
  }

  if (isSpecific) next.executiveCommunication += 4;
  if (isVague) next.executiveCommunication -= 4;
  if (isDismissive) next.executiveCommunication -= 3;

  if (state.resistance > 60 && isSpecific) {
    next.adaptiveCommunication += 5;
  }

  if (state.resistance > 60 && isVague) {
    next.adaptiveCommunication -= 5;
  }

  if (isEmpathetic && state.ruptureLevel > 40) {
    next.adaptiveCommunication += 4;
  }

  if (isSpecific && !isVague) next.influenceAndPersuasion += 3;

  if (state.trust > 60 && isSpecific) {
    next.influenceAndPersuasion += 4;
  }

  if (isDismissive) next.influenceAndPersuasion -= 6;

  for (const key of Object.keys(next) as (keyof ExecutiveScores)[]) {
    next[key] = Math.max(0, Math.min(100, next[key]));
  }

  return next;
}

export function interpretExecutiveScore(score: number): ScoreLevel {
  if (score >= 80) return "Expert";
  if (score >= 65) return "Strong";
  if (score >= 45) return "Developing";
  return "Needs Improvement";
}

export function calculateOverallScore(scores: ExecutiveScores): number {
  return Math.round(
    (scores.emotionalIntelligence +
      scores.stakeholderManagement +
      scores.executiveCommunication +
      scores.adaptiveCommunication +
      scores.influenceAndPersuasion) /
      5
  );
}
