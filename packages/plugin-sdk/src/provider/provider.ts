import type { Result } from '@helix/core';
import type { ProviderError } from './provider-errors.js';

/** A model offered by a provider. */
export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly contextWindow: number;
}

/** The role of a message in a completion request. */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** A single conversation message. */
export interface Message {
  readonly role: MessageRole;
  readonly content: string;
}

/** A tool the provider may call. */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
}

/** A tool invocation requested by the model. */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  /** JSON-encoded arguments. */
  readonly arguments: string;
}

/** Token usage accounting for a completion. */
export interface Usage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/** Why a completion finished. */
export type FinishReason = 'stop' | 'length' | 'tool_calls';

/** A provider-neutral completion request. */
export interface CompletionRequest {
  readonly model: string;
  readonly messages: readonly Message[];
  readonly tools?: readonly ToolDefinition[];
  readonly maxTokens?: number;
}

/** A provider-neutral completion result. */
export interface CompletionResult {
  readonly content: string;
  readonly toolCalls: readonly ToolCall[];
  readonly usage: Usage;
  readonly finishReason: FinishReason;
}

/** A streamed completion chunk; the final chunk sets `done` and carries usage. */
export interface StreamChunk {
  readonly delta: string;
  readonly done: boolean;
  readonly usage?: Usage;
}

/**
 * The provider-agnostic AI provider capability contract (ADR-0002, ADR-0009).
 * Vendor providers are plugins implementing this interface; the core platform
 * never depends on a specific vendor. All operations return structured
 * `Result`s so failures are explicit (Constitution Article 7).
 */
export interface AiProvider {
  readonly id: string;
  listModels(): Promise<Result<readonly ModelInfo[], ProviderError>>;
  complete(request: CompletionRequest): Promise<Result<CompletionResult, ProviderError>>;
  stream(request: CompletionRequest): Promise<Result<AsyncIterable<StreamChunk>, ProviderError>>;
}
