import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ModelsModule } from '../models/models.module';
import { PointsModule } from '../points/points.module';
import { ProvidersModule } from '../providers/providers.module';
import { ImageTasksController } from './image-tasks.controller';
import { ImageTasksService } from './image-tasks.service';

@Module({
  imports: [FilesModule, ModelsModule, PointsModule, ProvidersModule],
  controllers: [ImageTasksController],
  providers: [ImageTasksService],
})
export class ImageTasksModule {}
