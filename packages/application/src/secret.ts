/**
 * A secret value that never exposes its contents through logging, string
 * coercion, or JSON serialization. The raw value is available only via an
 * explicit {@link Secret.reveal} call, making disclosure intentional and
 * auditable (Constitution Article 8).
 */
export class Secret {
  readonly name: string;
  readonly #value: string;

  constructor(name: string, value: string) {
    this.name = name;
    this.#value = value;
  }

  /** Explicitly read the raw secret value. */
  reveal(): string {
    return this.#value;
  }

  /** Whether this secret currently holds a non-empty value. */
  get isPresent(): boolean {
    return this.#value.length > 0;
  }

  /** Redacted representation for logs and string interpolation. */
  toString(): string {
    return `[redacted:${this.name}]`;
  }

  /** Redacted representation for `JSON.stringify`. */
  toJSON(): string {
    return `[redacted:${this.name}]`;
  }
}

/** The token substituted for secret material during redaction. */
export const REDACTION_PLACEHOLDER = '[redacted]';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scrub the raw values of the given secrets from a string, replacing each with
 * the redaction placeholder. Empty secrets are ignored so nothing is
 * over-redacted. Used before emitting any text that may embed secrets.
 */
export function redactSecrets(text: string, secrets: readonly Secret[]): string {
  let result = text;
  for (const secret of secrets) {
    if (!secret.isPresent) {
      continue;
    }
    result = result.replace(new RegExp(escapeRegExp(secret.reveal()), 'g'), REDACTION_PLACEHOLDER);
  }
  return result;
}
