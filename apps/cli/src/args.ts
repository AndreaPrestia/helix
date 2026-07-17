/** Positional args and flags parsed from a command's argument tokens. */
export interface ParsedArgs {
  readonly args: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

/**
 * Parse argument tokens deterministically. Recognizes `--flag` (boolean true)
 * and `--key=value` (string); everything else is a positional argument.
 */
export function parseArgs(tokens: readonly string[]): ParsedArgs {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const token of tokens) {
    if (token.startsWith('--')) {
      const body = token.slice(2);
      const equals = body.indexOf('=');
      if (equals >= 0) {
        flags[body.slice(0, equals)] = body.slice(equals + 1);
      } else if (body !== '') {
        flags[body] = true;
      }
    } else {
      args.push(token);
    }
  }

  return { args, flags };
}
