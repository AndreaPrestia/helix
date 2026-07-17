export {
  ExitCode,
  type Command,
  type CommandContext,
  type CommandResult,
  type CliIo,
  type CliConfig,
  type Diagnostic,
  type DiagnosticSeverity,
} from './command.js';
export { Cli, type RunResult, type RunOptions } from './cli.js';
export { parseArgs, type ParsedArgs } from './args.js';
export { formatOutput, type OutputFormat } from './output.js';
export {
  ConfigError,
  DEFAULT_CONFIG_FILENAME,
  discoverConfig,
  fileSystemConfigReader,
  type ConfigReader,
  type DiscoveredConfig,
} from './config.js';

export {
  createInitCommand,
  validateManifest,
  type FileSink,
  type Template,
  type TemplateFile,
  type InitDeps,
  type GeneratedManifest,
} from './commands/init.js';
export {
  createValidateCommand,
  runChecks,
  openSpecValidationCheck,
  architectureRulesCheck,
  qualityGateCheck,
  type ValidationCheck,
  type ValidationFinding,
  type ValidationSeverity,
  type ValidationReport,
  type ArchitectureViolation,
} from './commands/validate.js';
export {
  createDoctorCommand,
  runProbes,
  environmentProbe,
  toolchainProbe,
  configurationProbe,
  pluginCompatibilityProbe,
  type DoctorCheck,
  type DoctorProbe,
  type DoctorReport,
  type DoctorStatus,
  type PluginApi,
} from './commands/doctor.js';
export {
  createQueryCommand,
  parseLimit,
  parseProjection,
  projectNode,
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_LIMIT,
  PROJECTION_FIELDS,
  type GraphSource,
  type QueryKind,
  type ProjectionField,
} from './commands/query.js';
