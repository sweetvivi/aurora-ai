import { Body, Controller, Get, Headers, HttpCode, Param, Post, Res } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { StreamChatDto } from './dto/stream-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  @HttpCode(200)
  async stream(
    @CurrentUser('id') userId: string,
    @Body() input: StreamChatDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    await this.chatService.stream(
      {
        ...input,
        idempotencyKey: idempotencyKey || randomUUID(),
        userId,
      },
      response,
    );
  }

  @Get('requests/:chatRequestId')
  getRequest(@CurrentUser('id') userId: string, @Param('chatRequestId') chatRequestId: string) {
    return this.chatService.getRequest(userId, chatRequestId);
  }
}
