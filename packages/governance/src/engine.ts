import { type Result, ok } from '@helix/core';
import type { OpenSpecFileStore } from './file-store.js';
import type { ParseError } from './errors.js';
import type { BaselineSpec, ChangeStructure, DeltaSpec } from './model.js';
import { parseChangeManifest } from './parse-manifest.js';
import { parseDelta } from './parse-delta.js';
import { parseSpec } from './parse-spec.js';

const SPEC_FILE = 'spec.md';

/**
 * Reads the OpenSpec workspace and produces structured, validated views:
 * baseline specifications and active changes. All I/O goes through the injected
 * {@link OpenSpecFileStore}; parsing is deterministic and observable.
 */
export class OpenSpecEngine {
  readonly #store: OpenSpecFileStore;

  constructor(store: OpenSpecFileStore) {
    this.#store = store;
  }

  /** Discover and parse every baseline specification under `specs/`. */
  async discoverBaselineSpecs(): Promise<Result<readonly BaselineSpec[], ParseError>> {
    const paths: string[] = [];
    await this.#findSpecMarkdown('specs', paths);

    const specs: BaselineSpec[] = [];
    for (const path of paths.sort()) {
      const capability = path.slice('specs/'.length, -`/${SPEC_FILE}`.length);
      const content = await this.#store.read(path);
      if (!content.some) {
        continue;
      }
      const parsed = parseSpec(capability, content.value);
      if (!parsed.ok) {
        return parsed;
      }
      specs.push(parsed.value);
    }
    return ok(specs);
  }

  /** Discover and parse every change under `changes/`. */
  async discoverActiveChanges(): Promise<Result<readonly ChangeStructure[], ParseError>> {
    const ids = (await this.#store.list('changes')).filter((name) => !name.includes('.'));

    const changes: ChangeStructure[] = [];
    for (const id of [...ids].sort()) {
      const manifestText = await this.#store.read(`changes/${id}/change.yaml`);
      if (!manifestText.some) {
        continue; // not a change directory
      }
      const manifest = parseChangeManifest(manifestText.value);
      if (!manifest.ok) {
        return manifest;
      }

      const deltaPaths: string[] = [];
      await this.#findSpecMarkdown(`changes/${id}/specs`, deltaPaths);
      const deltas: DeltaSpec[] = [];
      const prefix = `changes/${id}/specs/`;
      for (const path of deltaPaths.sort()) {
        const capability = path.slice(prefix.length, -`/${SPEC_FILE}`.length);
        const content = await this.#store.read(path);
        if (!content.some) {
          continue;
        }
        const parsed = parseDelta(capability, content.value);
        if (!parsed.ok) {
          return parsed;
        }
        deltas.push(parsed.value);
      }

      const proposal = await this.#store.read(`changes/${id}/proposal.md`);
      const tasks = await this.#store.read(`changes/${id}/tasks.md`);
      changes.push({
        id,
        manifest: manifest.value,
        hasProposal: proposal.some,
        hasTasks: tasks.some,
        deltas,
      });
    }
    return ok(changes);
  }

  async #findSpecMarkdown(dir: string, accumulator: string[]): Promise<void> {
    for (const entry of await this.#store.list(dir)) {
      const full = `${dir}/${entry}`;
      if (entry === SPEC_FILE) {
        accumulator.push(full);
      } else if (!entry.includes('.')) {
        await this.#findSpecMarkdown(full, accumulator);
      }
    }
  }
}
