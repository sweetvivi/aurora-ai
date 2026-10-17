import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ModelCapability = 'chat' | 'image' | 'video' | 'embedding';

export interface RegisteredModel {
  alias: string;
  capabilities: ModelCapability[];
  displayName: string;
  providerCode: string;
  providerModel: string;
}

const DEFAULT_MODELS: RegisteredModel[] = [
  {
    alias: 'openai-gpt-6-astra',
    capabilities: ['chat'],
    displayName: 'GPT-6 Astra',
    providerCode: 'jiguang',
    providerModel: 'gpt-6-astra',
  },
  {
    alias: 'openai-gpt-6-sol',
    capabilities: ['chat'],
    displayName: 'GPT-6 Sol',
    providerCode: 'jiguang',
    providerModel: 'gpt-6-sol',
  },
  {
    alias: 'deepseek-v4-pro-0813',
    capabilities: ['chat'],
    displayName: 'DeepSeek V4 Pro',
    providerCode: 'deepseek',
    providerModel: 'deepseek-v4-pro-0813',
  },
  {
    alias: 'deepseek-v4-1-flash-0910',
    capabilities: ['chat'],
    displayName: 'DeepSeek V4.1 Flash',
    providerCode: 'deepseek',
    providerModel: 'deepseek-v4.1-flash-0910',
  },
  {
    alias: 'qwen-3-8-max',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 Max',
    providerCode: 'qwen',
    providerModel: 'qwen3.8-max',
  },
  {
    alias: 'qwen-3-8-flash',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 Flash',
    providerCode: 'qwen',
    providerModel: 'qwen3.8-flash',
  },
  {
    alias: 'qwen-3-8-27b',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 27B',
    providerCode: 'qwen',
    providerModel: 'qwen3.8-27b',
  },
  {
    alias: 'qwen-3-8-max-0902',
    capabilities: ['chat'],
    displayName: 'Qwen 3.8 Max 0902',
    providerCode: 'qwen',
    providerModel: 'qwen3.8-max-0902',
  },
  {
    alias: 'jiguang-gpt-image-2.5',
    capabilities: ['image'],
    displayName: 'GPT Image 2.5',
    providerCode: 'jiguang',
    providerModel: 'gpt-image-2.5',
  },
  {
    alias: 'xai-grok-imagine-video',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video',
    providerCode: 'xai',
    providerModel: 'grok-imagine-video',
  },
  {
    alias: 'xai-grok-imagine-video-1.5',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video 1.5',
    providerCode: 'xai',
    providerModel: 'grok-imagine-video-1.5',
  },
];

@Injectable()
export class ModelRegistryService {
  constructor(private readonly configService: ConfigService) {}

  list(): RegisteredModel[] {
    return DEFAULT_MODELS;
  }

  getByAlias(alias: string): RegisteredModel {
    const model = DEFAULT_MODELS.find((candidate) => candidate.alias === alias);

    if (!model) {
      throw new NotFoundException({
        code: 'MODEL_NOT_FOUND',
        message: `Model "${alias}" is not registered`,
      });
    }

    return model;
  }

  getDefaultChatModel(): RegisteredModel {
    return this.getByAlias(
      this.configService.get<string>('LLM_DEFAULT_MODEL', 'openai-gpt-6-astra'),
    );
  }

  getDefaultImageModel(): RegisteredModel {
    return this.getByAlias(
      this.configService.get<string>('IMAGE_DEFAULT_MODEL_ALIAS', 'jiguang-gpt-image-2.5'),
    );
  }

  getDefaultVideoModel(): RegisteredModel {
    return this.getByAlias(
      this.configService.get<string>('VIDEO_DEFAULT_MODEL_ALIAS', 'xai-grok-imagine-video'),
    );
  }
}
