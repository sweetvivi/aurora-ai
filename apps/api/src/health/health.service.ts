import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  getHealth() {
    return {
      dependencies: {
        database: this.prismaService.state,
        redis: this.redisService.state,
      },
      service: 'aurora-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
