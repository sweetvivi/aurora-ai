import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export type ModelCapability = 'chat' | 'embedding' | 'image' | 'video' | 'vision';

export interface ImageCapabilityProfile {
  maxReferenceImages: number;
  sizePresets: string[];
  supportsLayerDecomposition?: boolean;
  supportsSequentialGeneration?: boolean;
}

export interface VideoCapabilityProfile {
  maxDuration: number;
  resolutions: string[];
  supportsAudio?: boolean;
  supportsLastFrame?: boolean;
  supportsVideoInput?: boolean;
}

export interface ModelCapabilityProfile {
  image?: ImageCapabilityProfile;
  video?: VideoCapabilityProfile;
}

export interface RegisteredModel {
  alias: string;
  capabilities: ModelCapability[];
  displayName: string;
  baseUrl?: string;
  keyRef?: string;
  profile?: ModelCapabilityProfile;
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
    profile: {
      image: {
        maxReferenceImages: 10,
        sizePresets: ['1K', '2K', '4K'],
      },
    },
    providerCode: 'jiguang',
    providerModel: 'gpt-image-2.5',
  },
  {
    alias: 'doubao-seedream-4-0',
    capabilities: ['image'],
    displayName: 'Seedream 4.0',
    profile: {
      image: {
        maxReferenceImages: 14,
        sizePresets: ['1K', '2K', '4K'],
        supportsSequentialGeneration: true,
      },
    },
    providerCode: 'volcengine',
    providerModel: 'doubao-seedream-4-0-250828',
  },
  {
    alias: 'xai-grok-imagine-video',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video',
    profile: {
      video: {
        maxDuration: 15,
        resolutions: ['720P', '1080P'],
        supportsAudio: false,
        supportsLastFrame: false,
        supportsVideoInput: false,
      },
    },
    providerCode: 'xai',
    providerModel: 'grok-imagine-video',
  },
  {
    alias: 'xai-grok-imagine-video-1.5',
    capabilities: ['video'],
    displayName: 'Grok Imagine Video 1.5',
    profile: {
      video: {
        maxDuration: 15,
        resolutions: ['720P', '1080P'],
        supportsAudio: false,
        supportsLastFrame: false,
        supportsVideoInput: false,
      },
    },
    providerCode: 'xai',
    providerModel: 'grok-imagine-video-1.5',
  },
  {
    alias: 'doubao-seedance-1-0-pro',
    capabilities: ['video'],
    displayName: 'Seedance 1.0 Pro',
    profile: {
      video: {
        maxDuration: 12,
        resolutions: ['480P', '720P', '1080P'],
        supportsAudio: false,
        supportsLastFrame: true,
        supportsVideoInput: false,
      },
    },
    providerCode: 'volcengine',
    providerModel: 'doubao-seedance-1-0-pro-250528',
  },
];

export function resolveModelCapabilityProfile(input: {
  alias: string;
  capabilities: ModelCapability[];
  providerCode: string;
  providerModel: string;
}): ModelCapabilityProfile | undefined {
  const identity = `${input.alias} ${input.providerModel}`.toLowerCase();
  const profile: ModelCapabilityProfile = {};

  if (input.capabilities.includes('image')) {
    const imageProfile = resolveImageCapabilityProfile(identity);

    if (imageProfile) {
      profile.image = imageProfile;
    }
  }

  if (input.capabilities.includes('video')) {
    const videoProfile = resolveVideoCapabilityProfile(identity);

    if (videoProfile) {
      profile.video = videoProfile;
    }
  }

  return profile.image || profile.video ? profile : undefined;
}

function resolveImageCapabilityProfile(identity: string): ImageCapabilityProfile | undefined {
  if (identity.includes('gpt-image')) {
    return {
      maxReferenceImages: 10,
      sizePresets: ['1K', '2K', '4K'],
    };
  }

  if (!identity.includes('seedream')) {
    return undefined;
  }

  if (/seedream[-_\s]?5(?:[-_\s]?0)?[-_\s]?(pro|flash)/.test(identity)) {
    return {
      maxReferenceImages: 10,
      sizePresets: ['1K', '1.5K', '2K'],
      supportsLayerDecomposition: true,
    };
  }

  if (/seedream[-_\s]?5(?:[-_\s]?0)?[-_\s]?(lite|260128)/.test(identity)) {
    return {
      maxReferenceImages: 14,
      sizePresets: ['2K', '3K', '4K'],
      supportsSequentialGeneration: true,
    };
  }

  if (identity.includes('seedream-4-5') || identity.includes('seedream-4.5')) {
    return {
      maxReferenceImages: 14,
      sizePresets: ['2K', '4K'],
      supportsSequentialGeneration: true,
    };
  }

  if (identity.includes('seedream-4-0') || identity.includes('seedream-4.0')) {
    return {
      maxReferenceImages: 14,
      sizePresets: ['1K', '2K', '4K'],
      supportsSequentialGeneration: true,
    };
  }

  return {
    maxReferenceImages: 14,
    sizePresets: ['1K', '1.5K', '2K', '3K', '4K'],
    supportsSequentialGeneration: true,
  };
}

function resolveVideoCapabilityProfile(identity: string): VideoCapabilityProfile | undefined {
  if (identity.includes('grok')) {
    return {
      maxDuration: 15,
      resolutions: ['720P', '1080P'],
      supportsAudio: false,
      supportsLastFrame: false,
      supportsVideoInput: false,
    };
  }

  if (!identity.includes('seedance')) {
    return undefined;
  }

  if (identity.includes('seedance-2-5') || identity.includes('seedance-2.5')) {
    return {
      maxDuration: 30,
      resolutions: ['480P', '720P', '1080P'],
      supportsAudio: false,
      supportsLastFrame: true,
      supportsVideoInput: true,
    };
  }

  if (/seedance[-_\s]?2(?:[-_\s]?0)?[-_\s]?(fast|mini)/.test(identity)) {
    return {
      maxDuration: 15,
      resolutions: ['480P', '720P'],
      supportsAudio: false,
      supportsLastFrame: true,
      supportsVideoInput: true,
    };
  }

  if (identity.includes('seedance-2-0') || identity.includes('seedance-2.0')) {
    return {
      maxDuration: 15,
      resolutions: ['480P', '720P', '1080P', '4K'],
      supportsAudio: false,
      supportsLastFrame: true,
      supportsVideoInput: true,
    };
  }

  if (identity.includes('seedance-1-5') || identity.includes('seedance-1.5')) {
    return {
      maxDuration: 12,
      resolutions: ['480P', '720P', '1080P'],
      supportsAudio: true,
      supportsLastFrame: true,
      supportsVideoInput: false,
    };
  }

  if (identity.includes('seedance-1-0') || identity.includes('seedance-1.0')) {
    return {
      maxDuration: 12,
      resolutions: ['480P', '720P', '1080P'],
      supportsAudio: false,
      supportsLastFrame: true,
      supportsVideoInput: false,
    };
  }

  return {
    maxDuration: 30,
    resolutions: ['480P', '720P', '1080P', '4K'],
    supportsAudio: false,
    supportsLastFrame: true,
    supportsVideoInput: true,
  };
}

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

      this.models = records.map((record) => {
        const capabilities = record.capabilities.map(
          (capability) => capability.toLowerCase() as ModelCapability,
        );
        const profile = resolveModelCapabilityProfile({
          alias: record.alias,
          capabilities,
          providerCode: record.provider.code,
          providerModel: record.providerModel,
        });

        return {
          alias: record.alias,
          baseUrl: record.provider.baseUrl,
          capabilities,
          displayName: record.displayName,
          keyRef: record.provider.keyRef,
          ...(profile ? { profile } : {}),
          providerCode: record.provider.code,
          providerModel: record.providerModel,
        };
      });
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
