import { describe, expect, it } from 'vitest';
import { ToolAuthorizer } from './tool-authorization.js';

describe('ToolAuthorizer', () => {
  it('authorizes a granted tool', () => {
    const authorizer = new ToolAuthorizer(['fs.read', 'fs.write']);
    const result = authorizer.authorize({ tool: 'fs.read', principal: 'agent-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ tool: 'fs.read', principal: 'agent-1' });
    }
  });

  it('denies an ungranted tool (deny-by-default)', () => {
    const authorizer = new ToolAuthorizer(['fs.read']);
    const result = authorizer.authorize({ tool: 'net.fetch', principal: 'agent-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TOOL_UNAUTHORIZED');
    }
  });

  it('exposes the granted tools sorted', () => {
    expect(new ToolAuthorizer(['b', 'a']).grantedTools()).toEqual(['a', 'b']);
  });

  it('reports authorization without side effects', () => {
    const authorizer = new ToolAuthorizer(['fs.read']);
    expect(authorizer.isAuthorized('fs.read')).toBe(true);
    expect(authorizer.isAuthorized('net.fetch')).toBe(false);
  });
});
