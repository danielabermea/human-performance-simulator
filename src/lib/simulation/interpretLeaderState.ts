import {
  interpretRelationshipInsight,
  RelationshipInsight,
  RelationshipInsightInput,
} from "./relationshipInsight";

export type LeaderStateInput = RelationshipInsightInput;
export type LeaderPerception = RelationshipInsight;

export function interpretLeaderState(state: LeaderStateInput): LeaderPerception {
  return interpretRelationshipInsight(state);
}

export type { RelationshipInsight, RelationshipInsightInput };
