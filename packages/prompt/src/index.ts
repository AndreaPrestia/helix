/**
 * `@helix/prompt` — the prompt compiler.
 *
 * Compiles raw sections and selected context into a provider-neutral prompt IR
 * with canonical section ordering, deterministic rendering, a stable content
 * hash, and secret redaction (Constitution Articles 3, 4, 7, 8). Providers
 * translate the IR into vendor-specific formats. Depends on `@helix/core` and
 * `@helix/context`.
 */

export {
  promptSectionKinds,
  isPromptSectionKind,
  canonicalOrder,
  type PromptSectionKind,
  type PromptSection,
} from './section.js';
export { sha256Hex } from './hash.js';
export {
  SecretRedactor,
  defaultRedactionRules,
  type RedactionResult,
  type RedactionRule,
} from './redaction.js';
export { PromptError, InvalidSectionError } from './errors.js';
export {
  PromptCompiler,
  type CompiledPrompt,
  type CompiledSection,
  type PromptInput,
} from './prompt-compiler.js';
