import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ModuleDisplayConfigService } from './module-display-config.service';

@Controller('modules')
export class ModuleDisplayConfigController {
  constructor(private readonly moduleDisplayConfigService: ModuleDisplayConfigService) {}

  @Get('display')
  @Public()
  list() {
    return this.moduleDisplayConfigService.listPublic();
  }
}
