import { Module } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { ModuleDisplayConfigController } from './module-display-config.controller';
import { ModuleDisplayConfigService } from './module-display-config.service';
import { ModelsController } from './models.controller';

@Module({
  controllers: [ModelsController, ModuleDisplayConfigController],
  providers: [ModelRegistryService, ModuleDisplayConfigService],
  exports: [ModelRegistryService, ModuleDisplayConfigService],
})
export class ModelsModule {}
