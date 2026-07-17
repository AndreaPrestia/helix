import { type Result, err, ok } from '@helix/core';
import type { ContextSelection } from '@helix/context';
import { InvalidSectionError, type PromptError } from './errors.js';
import { sha256Hex } from './hash.js';
import { SecretRedactor } from './redaction.js';
import {
  type PromptSection,
  type PromptSectionKind,
  isPromptSectionKind,
  promptSectionKinds,
} from './section.js';

/** A compiled, redacted section in the provider-neutral IR. */
export interface CompiledSection {
  readonly kind: PromptSectionKind;
  readonly content: string;
}

/** The provider-neutral compiled prompt. */
export interface CompiledPrompt {
  /** Canonical, ordered sections — the provider-neutral IR a provider renders. */
  readonly sections: readonly CompiledSection[];
  /** The deterministic rendered text. */
  readonly text: string;
  /** A stable content hash of {@link CompiledPrompt.text}. */
  readonly hash: string;
  /** Total number of secret redactions applied. */
  readonly redactions: number;
}

/** Input to the compiler: raw sections, optional selected context, optional redactor. */
export interface PromptInput {
  readonly sections: readonly PromptSection[];
  readonly context?: ContextSelection;
  readonly redactor?: SecretRedactor;
}

function renderContextSection(selection: ContextSelection): string {
  return selection.selected.map((item) => `- ${item.id} (${item.source})`).join('\n');
}

/**
 * Compiles raw sections and selected context into a provider-neutral prompt IR.
 * Sections are emitted in canonical order regardless of input order, secrets are
 * redacted, and the rendered text is hashed so identical inputs always produce
 * an identical, verifiable output (Constitution Articles 3, 7, 8).
 */
export class PromptCompiler {
  compile(input: PromptInput): Result<CompiledPrompt, PromptError> {
    const grouped = new Map<PromptSectionKind, string[]>();

    for (const section of input.sections) {
      if (!isPromptSectionKind(section.kind)) {
        return err(new InvalidSectionError(`unknown prompt section kind: ${String(section.kind)}`));
      }
      if (section.content.trim() === '') {
        return err(new InvalidSectionError(`section "${section.kind}" must not be empty`));
      }
      const bucket = grouped.get(section.kind) ?? [];
      bucket.push(section.content);
      grouped.set(section.kind, bucket);
    }

    if (input.context !== undefined && input.context.selected.length > 0) {
      const bucket = grouped.get('context') ?? [];
      bucket.push(renderContextSection(input.context));
      grouped.set('context', bucket);
    }

    const redactor = input.redactor ?? new SecretRedactor();
    const sections: CompiledSection[] = [];
    let redactions = 0;

    for (const kind of promptSectionKinds) {
      const bucket = grouped.get(kind);
      if (bucket === undefined || bucket.length === 0) {
        continue;
      }
      const merged = bucket.join('\n\n');
      const redacted = redactor.redact(merged);
      redactions += redacted.redactions;
      sections.push({ kind, content: redacted.text });
    }

    const text = sections.map((section) => `## ${section.kind}\n${section.content}`).join('\n\n');
    return ok({ sections, text, hash: sha256Hex(text), redactions });
  }
}
