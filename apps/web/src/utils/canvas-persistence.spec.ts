import { describe, expect, it } from 'vitest';
import { parseLocalCanvasWorkflow, serializeLocalCanvasWorkflow } from './canvas-persistence';

interface TestCanvasDocument {
  edges: unknown[];
  nodes: unknown[];
  title: string;
  version: 1;
}

describe('canvas persistence helpers', () => {
  it('reads the legacy flat local canvas format', () => {
    const legacy = JSON.stringify({
      edges: [],
      nodes: [{ id: 'node-a' }],
      title: '旧画布',
      version: 1,
    });

    expect(parseLocalCanvasWorkflow<TestCanvasDocument>(legacy)).toEqual({
      document: {
        edges: [],
        nodes: [{ id: 'node-a' }],
        title: '旧画布',
        version: 1,
      },
      id: '',
      savedAt: 0,
    });
  });

  it('round-trips the versioned local canvas envelope', () => {
    const workflow = {
      document: {
        edges: [],
        nodes: [{ id: 'node-a' }],
        title: '本地画布',
        version: 1 as const,
      },
      id: 'canvas-test',
      savedAt: 1_764_000_000_000,
    };

    expect(
      parseLocalCanvasWorkflow<TestCanvasDocument>(serializeLocalCanvasWorkflow(workflow)),
    ).toEqual(workflow);
  });

  it('rejects malformed or unrelated local values', () => {
    expect(parseLocalCanvasWorkflow<TestCanvasDocument>('not-json')).toBeNull();
    expect(parseLocalCanvasWorkflow<TestCanvasDocument>('{"title":"缺少节点"}')).toBeNull();
  });
});
