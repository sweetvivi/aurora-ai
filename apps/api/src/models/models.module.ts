import { Module } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { ModelsController } from './models.controller';

@Module({
  controllers: [ModelsController],
  providers: [ModelRegistryService],
  exports: [ModelRegistryService],
})
export class ModelsModule {}
