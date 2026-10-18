import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() input: CreateConversationDto) {
    return this.conversationsService.create(userId, input);
  }

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return {
      items: await this.conversationsService.list(userId),
    };
  }

  @Get(':conversationId')
  getDetail(@CurrentUser('id') userId: string, @Param('conversationId') conversationId: string) {
    return this.conversationsService.getDetail(userId, conversationId);
  }

  @Patch(':conversationId')
  rename(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() input: UpdateConversationDto,
  ) {
    return this.conversationsService.rename(userId, conversationId, input);
  }

  @Delete(':conversationId')
  remove(@CurrentUser('id') userId: string, @Param('conversationId') conversationId: string) {
    return this.conversationsService.remove(userId, conversationId);
  }
}
