/**
 * The canonical prompt sections, in their fixed rendering order. This ordering
 * is part of the deterministic contract: the compiler always emits sections in
 * this sequence regardless of input order.
 */
export const promptSectionKinds = [
  'system',
  'governance',
  'context',
  'task',
  'output_format',
] as const;

export type PromptSectionKind = (typeof promptSectionKinds)[number];

/** A piece of prompt content assigned to a canonical section. */
export interface PromptSection {
  readonly kind: PromptSectionKind;
  readonly content: string;
}

/** Whether a value is a recognized {@link PromptSectionKind}. */
export function isPromptSectionKind(value: string): value is PromptSectionKind {
  return (promptSectionKinds as readonly string[]).includes(value);
}

/** The canonical order index of a section kind. */
export function canonicalOrder(kind: PromptSectionKind): number {
  return promptSectionKinds.indexOf(kind);
}
