import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get('display/:moduleKey/cover')
  @Public()
  async getCover(@Param('moduleKey') moduleKey: string, @Res() response: Response): Promise<void> {
    const { buffer, mimeType } = await this.moduleDisplayConfigService.readPublicCover(moduleKey);

    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Length', buffer.length);
    response.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    response.send(buffer);
  }
}
