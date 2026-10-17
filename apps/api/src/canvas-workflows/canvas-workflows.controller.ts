import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CanvasWorkflowsService } from './canvas-workflows.service';
import { SaveCanvasWorkflowDto } from './dto/save-canvas-workflow.dto';

@Controller('canvas-workflows')
export class CanvasWorkflowsController {
  constructor(private readonly canvasWorkflowsService: CanvasWorkflowsService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return {
      items: await this.canvasWorkflowsService.list(userId),
    };
  }

  @Post()
  save(@CurrentUser('id') userId: string, @Body() input: SaveCanvasWorkflowDto) {
    return this.canvasWorkflowsService.save(userId, input);
  }
}
