import { describe, expect, it } from 'vitest';
import { agentCapabilityOptions, agentCatalog } from './agents';

const curatedAgents = agentCatalog.filter((agent) => !agent.id.startsWith('official-'));
const capabilityIds = new Set(agentCapabilityOptions.map((option) => option.id));
const inputModes = new Set(['chat', 'form', 'wizard']);

describe('curated agent catalog', () => {
  it('keeps the curated layer above the agreed quality floor', () => {
    expect(curatedAgents.length).toBeGreaterThanOrEqual(60);
  });

  it('covers every category with at least three curated agents', () => {
    const counts = new Map<string, number>();

    for (const agent of curatedAgents) {
      counts.set(agent.category, (counts.get(agent.category) ?? 0) + 1);
    }

    for (const [category, count] of counts) {
      expect(count, `类目 ${category} 的精选数量`).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives every curated agent real instructions', () => {
    const missing = curatedAgents.filter(
      (agent) => !agent.instructions || agent.instructions.trim().length < 20,
    );

    expect(missing.map((agent) => agent.id)).toEqual([]);
  });

  it('carries valid preset params on every curated agent', () => {
    const missingPreset = curatedAgents.filter(
      (agent) => !agent.modelAlias || !/^[a-z0-9][a-z0-9._-]*$/.test(agent.modelAlias),
    );

    expect(missingPreset.map((agent) => agent.id)).toEqual([]);

    const outOfRange = curatedAgents.filter(
      (agent) =>
        (agent.temperature !== undefined && (agent.temperature < 0 || agent.temperature > 2)) ||
        (agent.maxTokens !== undefined && (agent.maxTokens < 256 || agent.maxTokens > 32_768)),
    );

    expect(outOfRange.map((agent) => agent.id)).toEqual([]);
  });

  it('uses a declared input mode on every curated agent', () => {
    const invalid = curatedAgents.filter(
      (agent) => agent.inputMode === undefined || !inputModes.has(agent.inputMode),
    );

    expect(invalid.map((agent) => agent.id)).toEqual([]);
  });

  it('declares at least one capability on every curated agent', () => {
    const missing = curatedAgents.filter((agent) => (agent.capabilities ?? []).length === 0);

    expect(missing.map((agent) => agent.id)).toEqual([]);
  });

  it('uses only declared capability ids', () => {
    const unknown = curatedAgents.flatMap((agent) =>
      (agent.capabilities ?? []).filter((capability) => !capabilityIds.has(capability)).map((capability) => `${agent.id}:${capability}`),
    );

    expect(unknown).toEqual([]);
  });

  it('has no duplicate ids or names across the full catalog', () => {
    expect(new Set(agentCatalog.map((agent) => agent.id)).size).toBe(agentCatalog.length);
    expect(new Set(agentCatalog.map((agent) => agent.name)).size).toBe(agentCatalog.length);
  });

  it('keeps the full catalog at the reference scale', () => {
    expect(agentCatalog).toHaveLength(6358);
  });
});
