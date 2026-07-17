/** The kinds of thing a knowledge artifact can link to. */
export const knowledgeLinkTypes = ['decision', 'code'] as const;

export type KnowledgeLinkType = (typeof knowledgeLinkTypes)[number];

/** A typed link from a knowledge artifact to a decision (ADR) or code target. */
export interface KnowledgeLink {
  readonly type: KnowledgeLinkType;
  readonly target: string;
}

/** Whether a value is a recognized {@link KnowledgeLinkType}. */
export function isKnowledgeLinkType(value: string): value is KnowledgeLinkType {
  return (knowledgeLinkTypes as readonly string[]).includes(value);
}
