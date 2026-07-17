/** The kinds of knowledge artifact the model captures. */
export const knowledgeKinds = ['article', 'pattern', 'anti_pattern'] as const;

export type KnowledgeKind = (typeof knowledgeKinds)[number];

/** Whether a value is a recognized {@link KnowledgeKind}. */
export function isKnowledgeKind(value: string): value is KnowledgeKind {
  return (knowledgeKinds as readonly string[]).includes(value);
}
