import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { InfrastructureState } from '../prisma/prisma.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly connectOnBoot: boolean;
  private readonly redisUrl: string;
  private client: Redis | null = null;

  state: InfrastructureState = 'not_connected';

  constructor(configService: ConfigService) {
    this.connectOnBoot = configService.get<boolean>('REDIS_CONNECT_ON_BOOT', true);
    this.redisUrl = configService.getOrThrow<string>('REDIS_URL');
  }

  async onModuleInit(): Promise<void> {
    if (!this.connectOnBoot) {
      return;
    }

    this.client = new Redis(this.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    try {
      await this.client.connect();
      this.state = 'up';
    } catch (error) {
      this.state = 'down';
      this.logger.warn(
        `Redis connection is not available during startup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  getClient(): Redis {
    if (!this.client || this.state !== 'up') {
      throw new ServiceUnavailableException('Redis is not available');
    }

    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    if (this.client.status === 'ready') {
      await this.client.quit();
    } else {
      this.client.disconnect();
    }
  }
}
