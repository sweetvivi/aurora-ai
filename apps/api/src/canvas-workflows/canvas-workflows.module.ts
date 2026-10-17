import { Module } from '@nestjs/common';
import { CanvasWorkflowsController } from './canvas-workflows.controller';
import { CanvasWorkflowsService } from './canvas-workflows.service';

@Module({
  controllers: [CanvasWorkflowsController],
  providers: [CanvasWorkflowsService],
})
export class CanvasWorkflowsModule {}
