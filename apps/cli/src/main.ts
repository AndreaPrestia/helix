import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isErr, none, some, type Option } from '@helix/core';
import { FileSystemFileStore, OpenSpecEngine, QualityGate } from '@helix/governance';
import { Cli } from './cli.js';
import type { CliConfig, CliIo } from './command.js';
import { ExitCode } from './command.js';
import { discoverConfig, fileSystemConfigReader } from './config.js';
import { createInitCommand, type FileSink, type Template } from './commands/init.js';
import {
  architectureRulesCheck,
  createValidateCommand,
  openSpecValidationCheck,
  qualityGateCheck,
  type ArchitectureViolation,
  type ValidationCheck,
} from './commands/validate.js';
import {
  configurationProbe,
  createDoctorCommand,
  environmentProbe,
  pluginCompatibilityProbe,
  toolchainProbe,
} from './commands/doctor.js';

const nodeFileSink: FileSink = {
  exists: (path) => existsSync(path),
  write: (path, content) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  },
};

const minimalTemplate: Template = {
  name: 'minimal',
  files: [
    { path: 'README.md', content: '# Helix project\n\nBootstrapped by `helix init`.\n' },
    { path: '.gitignore', content: 'node_modules/\ndist/\n' },
  ],
};

const builtInTemplates = new Map<string, Template>([[minimalTemplate.name, minimalTemplate]]);

/** Verify the architecture dependency ruleset is present and well-formed at runtime. */
function readArchitectureViolations(cwd: string): readonly ArchitectureViolation[] {
  const rulesPath = join(cwd, 'reference', 'architecture', 'package-dependency-rules.json');
  let raw: string;
  try {
    raw = readFileSync(rulesPath, 'utf8');
  } catch {
    return [{ rule: 'ruleset-present', package: '(workspace)', detail: `missing ${rulesPath}` }];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [
      { rule: 'ruleset-valid', package: '(workspace)', detail: `invalid JSON in ${rulesPath}` },
    ];
  }
  if (typeof parsed !== 'object' || parsed === null || !('packages' in parsed)) {
    return [
      {
        rule: 'ruleset-valid',
        package: '(workspace)',
        detail: 'ruleset is missing a "packages" map',
      },
    ];
  }
  return [];
}

/**
 * The `helix` binary entry point. This is the only module that touches process
 * globals and the real filesystem; every command's behaviour lives in
 * unit-tested, injectable modules.
 */
async function main(): Promise<void> {
  const io: CliIo = {
    writeOut: (text) => process.stdout.write(`${text}\n`),
    writeErr: (text) => process.stderr.write(`${text}\n`),
  };

  const cwd = process.cwd();

  let config: Option<CliConfig> = none();
  const discovered = discoverConfig(fileSystemConfigReader, cwd);
  if (isErr(discovered)) {
    io.writeErr(`error: ${discovered.error.message}`);
    process.exitCode = ExitCode.error;
    return;
  }
  if (discovered.value.some) {
    config = some(discovered.value.value.config);
  }

  const engine = new OpenSpecEngine(new FileSystemFileStore(join(cwd, 'openspec')));
  const changesResult = await engine.discoverActiveChanges();
  const openspecCheck: ValidationCheck = changesResult.ok
    ? openSpecValidationCheck(changesResult.value)
    : {
        name: 'openspec',
        run: () => [{ severity: 'error', message: changesResult.error.message }],
      };

  const cli = new Cli('helix')
    .register(createInitCommand({ fs: nodeFileSink, templates: builtInTemplates, cwd }))
    .register(
      createValidateCommand([
        openspecCheck,
        architectureRulesCheck(() => readArchitectureViolations(cwd)),
        qualityGateCheck(new QualityGate('cli-validate', []), {}),
      ]),
    )
    .register(
      createDoctorCommand([
        environmentProbe('node-binary', some(process.execPath)),
        toolchainProbe('node', process.versions.node, '22.0.0'),
        configurationProbe(config),
        pluginCompatibilityProbe([]),
      ]),
    );

  const result = await cli.run(process.argv.slice(2), io, { config });
  process.exitCode = result.exitCode;
}

void main();
