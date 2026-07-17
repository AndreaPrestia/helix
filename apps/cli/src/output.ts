/** The output rendering format. */
export type OutputFormat = 'text' | 'json';

/**
 * Render command output deterministically. `json` always yields canonical JSON;
 * `text` prints strings verbatim and pretty-prints structured values.
 */
export function formatOutput(output: unknown, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(output ?? null);
  }
  if (output === undefined) {
    return '';
  }
  if (typeof output === 'string') {
    return output;
  }
  return JSON.stringify(output, null, 2);
}
