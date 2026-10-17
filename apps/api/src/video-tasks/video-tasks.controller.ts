import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateVideoTaskDto } from './dto/create-video-task.dto';
import { ListVideoTasksQueryDto } from './dto/list-video-tasks-query.dto';
import { VideoTasksService } from './video-tasks.service';

@Controller('video-tasks')
export class VideoTasksController {
  constructor(private readonly videoTasksService: VideoTasksService) {}

  @Post()
  @HttpCode(202)
  create(
    @CurrentUser('id') userId: string,
    @Body() input: CreateVideoTaskDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.videoTasksService.create(userId, input, idempotencyKey);
  }

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: ListVideoTasksQueryDto) {
    return this.videoTasksService.list(userId, query.limit);
  }

  @Get(':taskId')
  getTask(@CurrentUser('id') userId: string, @Param('taskId') taskId: string) {
    return this.videoTasksService.getTask(userId, taskId);
  }

  @Post(':taskId/cancel')
  @HttpCode(200)
  cancel(@CurrentUser('id') userId: string, @Param('taskId') taskId: string) {
    return this.videoTasksService.cancel(userId, taskId);
  }
}
