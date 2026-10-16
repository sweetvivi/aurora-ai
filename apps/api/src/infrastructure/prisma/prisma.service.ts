import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export type InfrastructureState = 'up' | 'down' | 'not_connected';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly connectOnBoot: boolean;

  state: InfrastructureState = 'not_connected';

  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });

    super({ adapter });
    this.connectOnBoot = configService.get<boolean>('DATABASE_CONNECT_ON_BOOT', true);
  }

  async onModuleInit(): Promise<void> {
    if (!this.connectOnBoot) {
      return;
    }

    try {
      await this.$connect();
      this.state = 'up';
    } catch (error) {
      this.state = 'down';
      this.logger.warn(
        `Database connection is not available during startup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.state !== 'up') {
      return;
    }

    await this.$disconnect();
  }
}
