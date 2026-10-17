import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { CanvasWorkflowsModule } from './canvas-workflows/canvas-workflows.module';
import { ChatModule } from './chat/chat.module';
import { ConversationsModule } from './conversations/conversations.module';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { validateEnvironment } from './config/env';
import { HealthModule } from './health/health.module';
import { FilesModule } from './files/files.module';
import { ImageTasksModule } from './image-tasks/image-tasks.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { ModelsModule } from './models/models.module';
import { PointsModule } from './points/points.module';
import { ProvidersModule } from './providers/providers.module';
import { StorageModule } from './storage/storage.module';
import { VideoTasksModule } from './video-tasks/video-tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '../../.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    ModelsModule,
    PointsModule,
    ConversationsModule,
    ChatModule,
    FilesModule,
    ImageTasksModule,
    VideoTasksModule,
    ProvidersModule,
    AgentsModule,
    CanvasWorkflowsModule,
    AdminModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
