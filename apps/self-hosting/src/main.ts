import { join } from 'node:path';
import { fromNullable, isErr, type Option } from '@helix/core';
import { FileSystemFileStore, OpenSpecEngine } from '@helix/governance';
import { BoundedPlanner } from './bounded-planner.js';
import type { ChangeExecutor, ChangeSummary, ExecutionRecord, SpecReader } from './model.js';
import { ReviewLog } from './review-log.js';
import { SelfHostingWorkflow } from './workflow.js';

const APPROVED_STATUSES = new Set(['accepted', 'completed']);

/** A {@link SpecReader} over an already-loaded set of change summaries. */
function staticSpecReader(changes: readonly ChangeSummary[]): SpecReader {
  const byId = new Map(changes.map((change) => [change.id, change]));
  return {
    changes: () => changes,
    change: (id): Option<ChangeSummary> => fromNullable(byId.get(id)),
  };
}

/**
 * Runtime executor. Actual code execution is delegated to the external agent
 * runtime (Claude), so this executor records each step as delegated rather than
 * fabricating a result — the report honestly reflects that execution happens
 * outside this process.
 */
const delegatingExecutor: ChangeExecutor = {
  execute: (_changeId, step): ExecutionRecord => ({
    index: step.index,
    description: step.description,
    status: 'skipped',
    detail: 'delegated to the agent runtime',
  }),
};

function parseSteps(tasksMarkdown: string): readonly string[] {
  return tasksMarkdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ['))
    .map((line) => line.replace(/^- \[[ xX]\]\s*/, ''));
}

/**
 * The `helix-self-hosting` binary entry point. It reads Helix's own OpenSpec
 * changes, builds a bounded plan for the requested change, and prints a
 * self-hosting report. Execution is delegated to the agent runtime; a manual
 * override (`--override`) authorizes an unapproved change explicitly.
 */
async function main(): Promise<void> {
  const changeId = process.argv[2];
  if (changeId === undefined) {
    process.stderr.write('usage: helix-self-hosting <change-id> [--override]\n');
    process.exitCode = 2;
    return;
  }
  const manualOverride = process.argv.includes('--override');

  const root = join(process.cwd(), 'openspec');
  const store = new FileSystemFileStore(root);
  const engine = new OpenSpecEngine(store);
  const discovered = await engine.discoverActiveChanges();
  if (isErr(discovered)) {
    process.stderr.write(`error: ${discovered.error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const summaries: ChangeSummary[] = [];
  for (const change of discovered.value) {
    const tasks = await store.read(`changes/${change.id}/tasks.md`);
    summaries.push({
      id: change.id,
      status: change.manifest.status,
      approved: APPROVED_STATUSES.has(change.manifest.status),
      steps: tasks.some ? parseSteps(tasks.value) : [],
    });
  }

  const workflow = new SelfHostingWorkflow({
    specs: staticSpecReader(summaries),
    planner: new BoundedPlanner(),
    executor: delegatingExecutor,
    reviewLog: new ReviewLog(),
  });

  const result = workflow.run(changeId, { manualOverride });
  if (isErr(result)) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, code: result.error.code, message: result.error.message })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${JSON.stringify({ ok: true, report: result.value }, null, 2)}\n`);
}

void main();
