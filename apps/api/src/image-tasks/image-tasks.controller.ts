import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateImageTaskDto } from './dto/create-image-task.dto';
import { ListImageTasksQueryDto } from './dto/list-image-tasks-query.dto';
import { ImageTasksService } from './image-tasks.service';

@Controller('image-tasks')
export class ImageTasksController {
  constructor(private readonly imageTasksService: ImageTasksService) {}

  @Post()
  @HttpCode(202)
  create(
    @CurrentUser('id') userId: string,
    @Body() input: CreateImageTaskDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.imageTasksService.create(userId, input, idempotencyKey);
  }

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: ListImageTasksQueryDto) {
    return this.imageTasksService.list(userId, query.limit);
  }

  @Get(':taskId')
  getTask(@CurrentUser('id') userId: string, @Param('taskId') taskId: string) {
    return this.imageTasksService.getTask(userId, taskId);
  }
}
