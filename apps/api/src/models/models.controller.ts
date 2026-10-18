import { Controller, Get, Query } from '@nestjs/common';
import { ListModelsQueryDto } from './dto/list-models-query.dto';
import { ModelRegistryService } from './model-registry.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelRegistryService: ModelRegistryService) {}

  @Get()
  list(@Query() query: ListModelsQueryDto) {
    const items = this.modelRegistryService
      .list()
      .filter((model) => !query.capability || model.capabilities.includes(query.capability))
      .map((model) => ({
        alias: model.alias,
        capabilities: model.capabilities,
        displayName: model.displayName,
        ...(model.profile ? { profile: model.profile } : {}),
      }));

    return { items };
  }
}
