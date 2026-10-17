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
    alias: 'jiguang-gpt-image-2.5',
    capabilities: ['image'],
    displayName: 'GPT Image 2.5',
    providerCode: 'jiguang',
    providerModel: 'gpt-image-2.5',
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
}
