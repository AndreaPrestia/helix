/** The result of redacting secrets from text. */
export interface RedactionResult {
  readonly text: string;
  readonly redactions: number;
}

/** A redaction rule: a global regex and its replacement (may use `$1`). */
export interface RedactionRule {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/** Default redaction rules covering common secret shapes. */
export const defaultRedactionRules: readonly RedactionRule[] = [
  {
    pattern: /((?:api[-_]?key|secret|token|password|passwd)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi,
    replacement: '$1[REDACTED]',
  },
  { pattern: /(Bearer\s+)[A-Za-z0-9._-]+/gi, replacement: '$1[REDACTED]' },
  { pattern: /\bghp_[A-Za-z0-9]{16,}\b/g, replacement: '[REDACTED]' },
];

/**
 * Redacts secrets from prompt content before it leaves the platform. Rules are
 * applied deterministically in order; the count of redactions is reported so a
 * secret leak is never hidden behind a successful compile (Constitution
 * Articles 7 and 8).
 */
export class SecretRedactor {
  readonly #rules: readonly RedactionRule[];

  constructor(rules: readonly RedactionRule[] = defaultRedactionRules) {
    this.#rules = rules;
  }

  redact(text: string): RedactionResult {
    let output = text;
    let redactions = 0;
    for (const rule of this.#rules) {
      const counter = new RegExp(rule.pattern.source, rule.pattern.flags);
      const matches = output.match(counter);
      if (matches !== null) {
        redactions += matches.length;
      }
      const replacer = new RegExp(rule.pattern.source, rule.pattern.flags);
      output = output.replace(replacer, rule.replacement);
    }
    return { text: output, redactions };
  }
}
