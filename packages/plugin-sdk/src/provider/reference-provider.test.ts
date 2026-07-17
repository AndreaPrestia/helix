import { isErr, isOk } from '@helix/core';
import { describe, expect, it } from 'vitest';
import type { CompletionRequest, StreamChunk } from './provider.js';
import { ReferenceProvider } from './reference-provider.js';

const provider = new ReferenceProvider();

function request(overrides: Partial<CompletionRequest> = {}): CompletionRequest {
  return {
    model: 'reference-echo',
    messages: [
      { role: 'system', content: 'be helpful' },
      { role: 'user', content: 'hello world' },
    ],
    ...overrides,
  };
}

describe('ReferenceProvider model discovery', () => {
  it('lists the reference model', async () => {
    const result = await provider.listModels();
    if (isOk(result)) {
      expect(result.value.map((m) => m.id)).toEqual(['reference-echo']);
    }
  });
});

describe('ReferenceProvider completion and tool calls', () => {
  it('echoes the last user message and accounts usage', async () => {
    const result = await provider.complete(request());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.content).toBe('ECHO: hello world');
      expect(result.value.finishReason).toBe('stop');
      expect(result.value.usage.promptTokens).toBe(4); // "be helpful" (2) + "hello world" (2)
      expect(result.value.usage.completionTokens).toBe(3); // "ECHO: hello world"
      expect(result.value.usage.totalTokens).toBe(
        result.value.usage.promptTokens + result.value.usage.completionTokens,
      );
    }
  });

  it('emits a tool call when tools are provided', async () => {
    const result = await provider.complete(
      request({ tools: [{ name: 'search', description: 'search the web' }] }),
    );
    if (isOk(result)) {
      expect(result.value.finishReason).toBe('tool_calls');
      expect(result.value.toolCalls).toEqual([{ id: 'call_1', name: 'search', arguments: '{}' }]);
    }
  });

  it('is deterministic', async () => {
    const a = await provider.complete(request());
    const b = await provider.complete(request());
    expect(a).toEqual(b);
  });
});

describe('ReferenceProvider structured errors', () => {
  it('rejects an unknown model', async () => {
    const result = await provider.complete(request({ model: 'gpt-nope' }));
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PROVIDER_MODEL_NOT_FOUND');
    }
  });

  it('rejects a request with no user message', async () => {
    const result = await provider.complete(
      request({ messages: [{ role: 'system', content: 'only system' }] }),
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PROVIDER_INVALID_REQUEST');
    }
  });
});

describe('ReferenceProvider streaming', () => {
  it('streams the content and ends with usage', async () => {
    const stream = await provider.stream(request());
    expect(isOk(stream)).toBe(true);
    if (isOk(stream)) {
      const chunks: StreamChunk[] = [];
      for await (const chunk of stream.value) {
        chunks.push(chunk);
      }
      const assembled = chunks.map((c) => c.delta).join('');
      expect(assembled).toBe('ECHO: hello world');
      const last = chunks[chunks.length - 1];
      expect(last?.done).toBe(true);
      expect(last?.usage).toBeDefined();
    }
  });

  it('surfaces validation errors before streaming', async () => {
    const stream = await provider.stream(request({ model: 'bad' }));
    expect(isErr(stream)).toBe(true);
  });
});
