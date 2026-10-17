import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { ModelRegistryService } from './model-registry.service';

describe('model registry', () => {
  it('registers at least four currently available chat models across provider groups', () => {
    const registry = new ModelRegistryService(new ConfigService({}));
    const chatModels = registry.list().filter((model) => model.capabilities.includes('chat'));
    const providerCodes = new Set(chatModels.map((model) => model.providerCode));
    const qwenModels = chatModels.filter((model) => model.providerCode === 'qwen');

    expect(chatModels).toHaveLength(8);
    expect(providerCodes).toEqual(new Set(['deepseek', 'jiguang', 'qwen']));
    expect(qwenModels).toHaveLength(4);
    expect(new Set(chatModels.map((model) => model.alias)).size).toBe(chatModels.length);
  });

  it('keeps model aliases separate from provider model identifiers', () => {
    const registry = new ModelRegistryService(
      new ConfigService({ LLM_DEFAULT_MODEL: 'deepseek-v4-pro-0813' }),
    );

    expect(registry.getDefaultChatModel()).toMatchObject({
      alias: 'deepseek-v4-pro-0813',
      providerCode: 'deepseek',
      providerModel: 'deepseek-v4-pro-0813',
    });
  });
});
