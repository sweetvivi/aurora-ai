import { Injectable, NotFoundException } from '@nestjs/common';
import type { Conversation, Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../models/model-registry.service';
import type { CreateConversationDto } from './dto/create-conversation.dto';
import type { UpdateConversationDto } from './dto/update-conversation.dto';

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
          include: {
            attachments: {
              include: {
                file: {
                  select: {
                    checksum: true,
                    createdAt: true,
                    id: true,
                    mimeType: true,
                    originalName: true,
                    size: true,
                  },
                },
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
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

    return {
      ...conversation,
      messages: conversation.messages.map((message) => ({
        ...message,
        attachments: message.attachments.map((attachment) => ({
          file: attachment.file,
          fileId: attachment.fileId,
          id: attachment.id,
          sortOrder: attachment.sortOrder,
        })),
      })),
    };
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

  async rename(
    userId: string,
    conversationId: string,
    input: UpdateConversationDto,
  ): Promise<Conversation> {
    const conversation = await this.getOwnedConversation(userId, conversationId);

    return this.prismaService.conversation.update({
      data: {
        title: input.title.trim(),
      },
      where: {
        id: conversation.id,
      },
    });
  }

  async remove(userId: string, conversationId: string): Promise<{ id: string }> {
    const conversation = await this.getOwnedConversation(userId, conversationId);

    await this.prismaService.conversation.delete({
      where: {
        id: conversation.id,
      },
    });

    return {
      id: conversation.id,
    };
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
