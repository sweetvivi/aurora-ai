import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export type ModelCapability = 'chat' | 'embedding' | 'image' | 'video' | 'vision';

export interface RegisteredModel {
  alias: string;
  capabilities: ModelCapability[];
  displayName: string;
  baseUrl?: string;
  keyRef?: string;
  providerCode: string;
  providerModel: string;
}

export const DEFAULT_MODELS: RegisteredModel[] = [
  {
    alias: 'openai-gpt-6-astra',
    capabilities: ['chat', 'vision'],
    displayName: 'GPT-6 Astra',
    providerCode: 'jiguang',
    providerModel: 'gpt-6-astra',
  },
  {
    alias: 'openai-gpt-6-sol',
    capabilities: ['chat', 'vision'],
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
    alias: 'doubao-seedream-4-0',
    capabilities: ['image'],
    displayName: 'Seedream 4.0',
    providerCode: 'volcengine',
    providerModel: 'doubao-seedream-4-0-250828',
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
  {
    alias: 'doubao-seedance-1-0-pro',
    capabilities: ['video'],
    displayName: 'Seedance 1.0 Pro',
    providerCode: 'volcengine',
    providerModel: 'doubao-seedance-1-0-pro-250528',
  },
];

@Injectable()
export class ModelRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModelRegistryService.name);
  private models: RegisteredModel[] = DEFAULT_MODELS;
  private loadedFromDatabase = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<{ count: number; source: 'cache' | 'database' | 'defaults' }> {
    try {
      const records = await this.prismaService.modelConfig.findMany({
        orderBy: [{ provider: { priority: 'asc' } }, { displayName: 'asc' }, { alias: 'asc' }],
        select: {
          alias: true,
          capabilities: true,
          displayName: true,
          provider: {
            select: {
              baseUrl: true,
              code: true,
              keyRef: true,
            },
          },
          providerModel: true,
        },
        where: {
          enabled: true,
          provider: {
            enabled: true,
          },
        },
      });

      if (records.length === 0) {
        this.models = DEFAULT_MODELS;
        this.loadedFromDatabase = false;

        return {
          count: this.models.length,
          source: 'defaults',
        };
      }

      this.models = records.map((record) => ({
        alias: record.alias,
        baseUrl: record.provider.baseUrl,
        capabilities: record.capabilities.map(
          (capability) => capability.toLowerCase() as ModelCapability,
        ),
        displayName: record.displayName,
        keyRef: record.provider.keyRef,
        providerCode: record.provider.code,
        providerModel: record.providerModel,
      }));
      this.loadedFromDatabase = true;

      return {
        count: this.models.length,
        source: 'database',
      };
    } catch (error) {
      const source = this.loadedFromDatabase ? 'cache' : 'defaults';

      if (!this.loadedFromDatabase) {
        this.models = DEFAULT_MODELS;
      }

      this.logger.warn(
        `Model registry reload failed; using ${source}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return {
        count: this.models.length,
        source,
      };
    }
  }

  list(): RegisteredModel[] {
    return this.models;
  }

  getByAlias(alias: string): RegisteredModel {
    const model = this.models.find((candidate) => candidate.alias === alias);

    if (!model) {
      throw new NotFoundException({
        code: 'MODEL_NOT_FOUND',
        message: `Model "${alias}" is not registered`,
      });
    }

    return model;
  }

  getDefaultChatModel(): RegisteredModel {
    return this.getDefaultModel(
      this.configService.get<string>('LLM_DEFAULT_MODEL', 'openai-gpt-6-astra'),
      'chat',
    );
  }

  getDefaultImageModel(): RegisteredModel {
    return this.getDefaultModel(
      this.configService.get<string>('IMAGE_DEFAULT_MODEL_ALIAS', 'jiguang-gpt-image-2.5'),
      'image',
    );
  }

  getDefaultVideoModel(): RegisteredModel {
    return this.getDefaultModel(
      this.configService.get<string>('VIDEO_DEFAULT_MODEL_ALIAS', 'xai-grok-imagine-video'),
      'video',
    );
  }

  private getDefaultModel(alias: string, capability: ModelCapability): RegisteredModel {
    const configured = this.models.find((model) => model.alias === alias);

    if (configured?.capabilities.includes(capability)) {
      return configured;
    }

    const fallback = this.models.find((model) => model.capabilities.includes(capability));

    if (fallback) {
      return fallback;
    }

    return this.getByAlias(alias);
  }
}
