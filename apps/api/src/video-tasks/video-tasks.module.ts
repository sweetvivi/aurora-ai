import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ModelsModule } from '../models/models.module';
import { PointsModule } from '../points/points.module';
import { ProvidersModule } from '../providers/providers.module';
import { VideoTasksController } from './video-tasks.controller';
import { VideoTasksService } from './video-tasks.service';

@Module({
  imports: [FilesModule, ModelsModule, PointsModule, ProvidersModule],
  controllers: [VideoTasksController],
  providers: [VideoTasksService],
})
export class VideoTasksModule {}
