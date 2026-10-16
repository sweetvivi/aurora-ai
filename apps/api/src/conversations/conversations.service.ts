import { Injectable, NotFoundException } from '@nestjs/common';
import type { Conversation, Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../models/model-registry.service';
import type { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly modelRegistryService: ModelRegistryService,
    private readonly prismaService: PrismaService,
  ) {}

  async create(userId: string, input: CreateConversationDto): Promise<Conversation> {
    const model = input.modelAlias
      ? this.modelRegistryService.getByAlias(input.modelAlias)
      : this.modelRegistryService.getDefaultChatModel();

    if (!model.capabilities.includes('chat')) {
      throw new NotFoundException({
        code: 'CHAT_MODEL_NOT_FOUND',
        message: '所选模型不支持对话',
      });
    }

    return this.prismaService.conversation.create({
      data: {
        modelAlias: model.alias,
        title: input.title?.trim() || '新对话',
        userId,
      },
    });
  }

  async list(userId: string): Promise<Conversation[]> {
    return this.prismaService.conversation.findMany({
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      where: { userId },
    });
  }

  async getDetail(userId: string, conversationId: string) {
    const conversation = await this.prismaService.conversation.findFirst({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw this.notFound();
    }

    return conversation;
  }

  async getOwnedConversation(userId: string, conversationId: string): Promise<Conversation> {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw this.notFound();
    }

    return conversation;
  }

  async appendMessage(
    transaction: Prisma.TransactionClient,
    userId: string,
    conversationId: string,
    title: string,
    modelAlias: string,
    occurredAt: Date,
  ): Promise<void> {
    await transaction.conversation.update({
      data: {
        lastMessageAt: occurredAt,
        modelAlias,
        title,
      },
      where: {
        id: conversationId,
        userId,
      },
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'CONVERSATION_NOT_FOUND',
      message: '会话不存在或无权访问',
    });
  }
}
