import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

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
}
