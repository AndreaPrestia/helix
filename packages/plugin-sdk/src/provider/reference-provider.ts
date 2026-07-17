import { type Result, err, ok } from '@helix/core';
import {
  type AiProvider,
  type CompletionRequest,
  type CompletionResult,
  type ModelInfo,
  type StreamChunk,
  type ToolCall,
  type Usage,
} from './provider.js';
import { InvalidRequestError, ModelNotFoundError, type ProviderError } from './provider-errors.js';

const MODELS: readonly ModelInfo[] = [
  { id: 'reference-echo', name: 'Reference Echo', contextWindow: 8192 },
];

function countTokens(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/**
 * A deterministic, vendor-neutral reference {@link AiProvider}. It echoes the
 * last user message, accounts token usage by word count, and streams the result
 * in fixed order. It exists to exercise the contract and verify provider
 * conformance without coupling to any vendor (ADR-0002).
 */
export class ReferenceProvider implements AiProvider {
  readonly id = 'reference';

  async listModels(): Promise<Result<readonly ModelInfo[], ProviderError>> {
    return ok(MODELS);
  }

  async complete(request: CompletionRequest): Promise<Result<CompletionResult, ProviderError>> {
    const validation = this.#validate(request);
    if (!validation.ok) {
      return validation;
    }
    const content = this.#echo(request);
    const toolCalls = this.#toolCalls(request);
    const usage = this.#usage(request, content);
    return ok({
      content,
      toolCalls,
      usage,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
    });
  }

  async stream(
    request: CompletionRequest,
  ): Promise<Result<AsyncIterable<StreamChunk>, ProviderError>> {
    const validation = this.#validate(request);
    if (!validation.ok) {
      return validation;
    }
    const content = this.#echo(request);
    const usage = this.#usage(request, content);
    return ok(this.#chunks(content, usage));
  }

  #validate(request: CompletionRequest): Result<void, ProviderError> {
    if (!MODELS.some((model) => model.id === request.model)) {
      return err(new ModelNotFoundError(request.model));
    }
    if (request.messages.length === 0) {
      return err(new InvalidRequestError('messages must not be empty'));
    }
    if (!request.messages.some((message) => message.role === 'user')) {
      return err(new InvalidRequestError('a user message is required'));
    }
    return ok(undefined);
  }

  #echo(request: CompletionRequest): string {
    const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
    return `ECHO: ${lastUser?.content ?? ''}`;
  }

  #toolCalls(request: CompletionRequest): readonly ToolCall[] {
    const first = request.tools?.[0];
    if (first === undefined) {
      return [];
    }
    return [{ id: 'call_1', name: first.name, arguments: '{}' }];
  }

  #usage(request: CompletionRequest, content: string): Usage {
    const promptTokens = request.messages.reduce(
      (total, message) => total + countTokens(message.content),
      0,
    );
    const completionTokens = countTokens(content);
    return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
  }

  async *#chunks(content: string, usage: Usage): AsyncGenerator<StreamChunk> {
    const words = content.split(' ');
    for (let index = 0; index < words.length; index += 1) {
      const isLast = index === words.length - 1;
      yield { delta: isLast ? (words[index] ?? '') : `${words[index] ?? ''} `, done: false };
    }
    yield { delta: '', done: true, usage };
  }
}
