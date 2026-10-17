import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { FileAsset } from '@prisma/client';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import type {
  ChatContentPart,
  ChatMessage,
  LlmProvider,
  StreamChatEvent,
} from '../providers/llm-provider';
import { LLM_PROVIDER } from '../providers/llm-provider';
import { ConversationsService } from '../conversations/conversations.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../models/model-registry.service';
import { PointsService } from '../points/points.service';

const MAX_HISTORY_MESSAGES = 40;
const MAX_HISTORY_IMAGE_ATTACHMENTS = 6;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MAX_MESSAGE_ATTACHMENTS = 3;
const STREAM_HEARTBEAT_MS = 15_000;

interface StreamChatInput {
  content: string;
  conversationId?: string;
  fileIds?: string[];
  idempotencyKey: string;
  modelAlias?: string;
  systemPrompt?: string;
  temperature?: number;
  userId: string;
}

interface PreparedChat {
  assistantMessageId: string;
  balanceAfter: number;
  chatRequestId: string;
  conversationId: string;
  messages: ChatMessage[];
  modelAlias: string;
  pointsCost: number;
  providerBaseUrl?: string;
  providerCode: string;
  providerKeyRef?: string;
  providerModel: string;
  reservationId: string;
  temperature?: number;
  userId: string;
}

interface ClassifiedError {
  code: string;
  message: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    private readonly configService: ConfigService,
    private readonly conversationsService: ConversationsService,
    private readonly filesService: FilesService,
    private readonly modelRegistryService: ModelRegistryService,
    private readonly pointsService: PointsService,
    private readonly prismaService: PrismaService,
  ) {}

  async stream(input: StreamChatInput, response: Response): Promise<void> {
    const idempotencyKey = this.normalizeIdempotencyKey(input.userId, input.idempotencyKey);
    const existingRequest = await this.prismaService.chatRequest.findUnique({
      where: { idempotencyKey },
    });

    if (existingRequest) {
      throw new ConflictException({
        code: 'CHAT_REQUEST_ALREADY_EXISTS',
        message: '该对话请求已提交，请刷新会话历史查看状态',
      });
    }

    const prepared = await this.prepare(input, idempotencyKey);

    this.initializeStream(response);
    this.writeEvent(response, 'meta', {
      assistantMessageId: prepared.assistantMessageId,
      balance: prepared.balanceAfter,
      conversationId: prepared.conversationId,
      modelAlias: prepared.modelAlias,
      pointsCost: prepared.pointsCost,
      requestId: prepared.chatRequestId,
    });

    const abortController = new AbortController();
    const heartbeat = setInterval(() => {
      if (!response.writableEnded) {
        response.write(': keep-alive\n\n');
      }
    }, STREAM_HEARTBEAT_MS);
    heartbeat.unref();

    const handleClose = (): void => {
      if (!response.writableEnded) {
        abortController.abort();
      }
    };
    response.on('close', handleClose);

    try {
      await this.generate(prepared, abortController.signal, response);
    } finally {
      clearInterval(heartbeat);
      response.off('close', handleClose);

      if (!response.writableEnded) {
        response.end();
      }
    }
  }

  async getRequest(userId: string, chatRequestId: string) {
    const request = await this.prismaService.chatRequest.findFirst({
      where: {
        id: chatRequestId,
        userId,
      },
    });

    if (!request) {
      throw new NotFoundException({
        code: 'CHAT_REQUEST_NOT_FOUND',
        message: '对话请求不存在或无权访问',
      });
    }

    return request;
  }

  private async prepare(input: StreamChatInput, idempotencyKey: string): Promise<PreparedChat> {
    const fileIds = [...new Set((input.fileIds ?? []).map((fileId) => fileId.trim()))].filter(
      Boolean,
    );

    if (fileIds.length > MAX_MESSAGE_ATTACHMENTS) {
      throw new ConflictException({
        code: 'ATTACHMENT_LIMIT_EXCEEDED',
        message: `每条消息最多上传 ${MAX_MESSAGE_ATTACHMENTS} 张图片`,
      });
    }

    const existingConversation = input.conversationId
      ? await this.conversationsService.getOwnedConversation(input.userId, input.conversationId)
      : undefined;
    const requestedModelAlias =
      input.modelAlias ??
      existingConversation?.modelAlias ??
      this.modelRegistryService.getDefaultChatModel().alias;
    const model = this.modelRegistryService.getByAlias(requestedModelAlias);

    if (!model.capabilities.includes('chat')) {
      throw new ConflictException({
        code: 'CHAT_MODEL_NOT_FOUND',
        message: '所选模型不支持对话',
      });
    }

    const attachmentAssets = await this.filesService.getOwnedAssets(input.userId, fileIds);

    if (attachmentAssets.some((asset) => !asset.mimeType.startsWith('image/'))) {
      throw new ConflictException({
        code: 'CHAT_ATTACHMENT_UNSUPPORTED',
        message: '当前仅支持在对话中发送图片附件',
      });
    }

    if (attachmentAssets.length > 0 && !model.capabilities.includes('vision')) {
      throw new ConflictException({
        code: 'CHAT_MODEL_VISION_UNSUPPORTED',
        message: '当前模型不支持图片，请切换到具有视觉能力的模型',
      });
    }

    const attachmentParts: ChatContentPart[] = [];

    for (const asset of attachmentAssets) {
      const buffer = await this.filesService.readAssetContent(asset);

      attachmentParts.push({
        image_url: {
          url: `data:${asset.mimeType};base64,${buffer.toString('base64')}`,
        },
        type: 'image_url',
      });
    }

    const conversation =
      existingConversation ?? (await this.conversationsService.create(input.userId, {}));
    const history = (
      await this.prismaService.message.findMany({
        include: {
          attachments: {
            include: {
              file: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_HISTORY_MESSAGES,
        where: {
          conversationId: conversation.id,
          status: 'COMPLETED',
          userId: input.userId,
        },
      })
    ).reverse();
    const chatRequestId = randomUUID();
    const userMessageId = randomUUID();
    const assistantMessageId = randomUUID();
    const pointsCost = this.configService.get<number>('CHAT_POINTS_COST', 1);
    const occurredAt = new Date();
    const content = input.content.trim();
    const systemPrompt = input.systemPrompt?.trim();
    const recentHistoryAttachmentIds = collectRecentHistoryAttachmentIds(history);
    const historyMessages: ChatMessage[] = [];

    for (const message of history) {
      const role = message.role.toLowerCase() as ChatMessage['role'];

      if (role === 'user' && message.attachments.length > 0) {
        const parts: ChatContentPart[] = [
          {
            text: message.content,
            type: 'text',
          },
        ];

        for (const attachment of message.attachments) {
          if (recentHistoryAttachmentIds.has(attachment.id)) {
            parts.push(await this.toImagePart(attachment.file));
          }
        }

        historyMessages.push({
          content: parts,
          role,
        });
      } else {
        historyMessages.push({
          content: message.content,
          role,
        });
      }
    }

    if (!content) {
      throw new ConflictException({
        code: 'CHAT_CONTENT_REQUIRED',
        message: '消息内容不能为空',
      });
    }

    try {
      await this.prismaService.$transaction(async (transaction) => {
        await transaction.chatRequest.create({
          data: {
            assistantMessageId,
            conversationId: conversation.id,
            id: chatRequestId,
            idempotencyKey,
            modelAlias: model.alias,
            pointsCost,
            userMessageId,
            userId: input.userId,
          },
        });
        await transaction.message.create({
          data: {
            content,
            conversationId: conversation.id,
            id: userMessageId,
            requestId: chatRequestId,
            role: 'USER',
            status: 'COMPLETED',
            userId: input.userId,
          },
        });
        if (fileIds.length > 0) {
          await transaction.messageAttachment.createMany({
            data: fileIds.map((fileId, sortOrder) => ({
              fileId,
              messageId: userMessageId,
              sortOrder,
            })),
          });
        }
        await transaction.message.create({
          data: {
            content: '',
            conversationId: conversation.id,
            id: assistantMessageId,
            requestId: chatRequestId,
            role: 'ASSISTANT',
            status: 'PENDING',
            userId: input.userId,
          },
        });
        await this.conversationsService.appendMessage(
          transaction,
          input.userId,
          conversation.id,
          conversation.title === '新对话'
            ? this.deriveConversationTitle(content)
            : conversation.title,
          model.alias,
          occurredAt,
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'CHAT_REQUEST_ALREADY_EXISTS',
          message: '该对话请求已提交，请刷新会话历史查看状态',
        });
      }

      throw error;
    }

    let reservation;

    try {
      reservation = await this.pointsService.reserve({
        amount: pointsCost,
        idempotencyKey: `chat-hold:${idempotencyKey}`,
        referenceId: chatRequestId,
        referenceType: 'chat_request',
        userId: input.userId,
      });
    } catch (error) {
      const classified = this.classifyError(error);

      await this.markFailed(chatRequestId, input.userId, assistantMessageId, classified, false);
      throw error;
    }

    return {
      assistantMessageId,
      balanceAfter: reservation.balanceAfter,
      chatRequestId,
      conversationId: conversation.id,
      messages: [
        ...(systemPrompt
          ? [
              {
                content: systemPrompt,
                role: 'system' as const,
              },
            ]
          : []),
        ...historyMessages,
        {
          content:
            attachmentParts.length > 0
              ? [{ text: content, type: 'text' as const }, ...attachmentParts]
              : content,
          role: 'user',
        },
      ],
      modelAlias: model.alias,
      pointsCost,
      providerBaseUrl: model.baseUrl,
      providerCode: model.providerCode,
      providerKeyRef: model.keyRef,
      providerModel: model.providerModel,
      reservationId: reservation.id,
      temperature: input.temperature,
      userId: input.userId,
    };
  }

  private async generate(
    prepared: PreparedChat,
    signal: AbortSignal,
    response: Response,
  ): Promise<void> {
    let content = '';
    let providerCompleted = false;

    try {
      await this.prismaService.chatRequest.update({
        data: {
          startedAt: new Date(),
          status: 'STREAMING',
        },
        where: { id: prepared.chatRequestId },
      });

      for await (const event of this.llmProvider.streamChat({
        messages: prepared.messages,
        model: prepared.providerModel,
        providerBaseUrl: prepared.providerBaseUrl,
        providerCode: prepared.providerCode,
        providerKeyRef: prepared.providerKeyRef,
        signal,
        temperature: prepared.temperature,
      })) {
        this.consumeProviderEvent(event, response, (chunk) => {
          content += chunk;
        });
        providerCompleted ||= event.type === 'done';
      }

      if (!providerCompleted) {
        throw new Error('LLM stream ended without a done event');
      }

      if (!content.trim()) {
        const error = new Error('LLM returned an empty response');
        Object.assign(error, { code: 'LLM_EMPTY_RESPONSE' });
        throw error;
      }

      await this.prismaService.$transaction(async (transaction) => {
        await transaction.message.update({
          data: {
            content,
            status: 'COMPLETED',
          },
          where: { id: prepared.assistantMessageId },
        });
        await transaction.chatRequest.update({
          data: {
            completedAt: new Date(),
            status: 'COMPLETED',
          },
          where: { id: prepared.chatRequestId },
        });
      });
      await this.pointsService.settle(prepared.reservationId);
      const balance = await this.pointsService.getBalance(prepared.userId);

      this.writeEvent(response, 'done', {
        assistantMessageId: prepared.assistantMessageId,
        balance,
        requestId: prepared.chatRequestId,
        status: 'COMPLETED',
      });
    } catch (error) {
      const classified = this.classifyError(error, signal.aborted);
      this.logger.warn(`Chat request ${prepared.chatRequestId} failed: ${classified.code}`);

      await this.markFailed(
        prepared.chatRequestId,
        prepared.userId,
        prepared.assistantMessageId,
        classified,
        true,
      );
      const balance = await this.pointsService.getBalance(prepared.userId);

      if (!response.writableEnded) {
        this.writeEvent(response, 'error', {
          balance,
          code: classified.code,
          message: classified.message,
          refunded: true,
          requestId: prepared.chatRequestId,
        });
      }
    }
  }

  private consumeProviderEvent(
    event: StreamChatEvent,
    response: Response,
    appendContent: (content: string) => void,
  ): void {
    if (event.type === 'delta') {
      appendContent(event.content);
      this.writeEvent(response, 'delta', { content: event.content });
    }
  }

  private async markFailed(
    chatRequestId: string,
    userId: string,
    assistantMessageId: string,
    error: ClassifiedError,
    refundReservation: boolean,
  ): Promise<void> {
    if (refundReservation) {
      const reservation = await this.prismaService.pointsReservation.findFirst({
        where: {
          referenceId: chatRequestId,
          referenceType: 'chat_request',
          userId,
        },
      });

      if (reservation) {
        await this.pointsService.refund(reservation.id);
      }
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.message.updateMany({
        data: {
          status: 'FAILED',
        },
        where: {
          id: assistantMessageId,
          userId,
        },
      });
      await transaction.chatRequest.updateMany({
        data: {
          completedAt: new Date(),
          errorCode: error.code,
          errorMessage: error.message,
          status: refundReservation ? 'REFUNDED' : 'FAILED',
        },
        where: {
          id: chatRequestId,
          userId,
        },
      });
    });
  }

  private initializeStream(response: Response): void {
    response.status(200);
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
  }

  private writeEvent(response: Response, event: string, data: unknown): void {
    if (response.writableEnded || response.destroyed) {
      return;
    }

    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private normalizeIdempotencyKey(userId: string, value: string): string {
    const key = value.trim();

    if (!key || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new ConflictException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: '幂等键不能为空且不能超过 128 个字符',
      });
    }

    return `chat:${userId}:${key}`;
  }

  private deriveConversationTitle(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim();

    return normalized.length > 36 ? `${normalized.slice(0, 36)}...` : normalized;
  }

  private async toImagePart(asset: FileAsset): Promise<ChatContentPart> {
    const buffer = await this.filesService.readAssetContent(asset);

    return {
      image_url: {
        url: `data:${asset.mimeType};base64,${buffer.toString('base64')}`,
      },
      type: 'image_url',
    };
  }

  private classifyError(error: unknown, aborted = false): ClassifiedError {
    if (aborted) {
      return {
        code: 'CLIENT_ABORTED',
        message: '生成已中断，本次积分已退回',
      };
    }

    const response =
      typeof error === 'object' && error !== null && 'getResponse' in error
        ? (error as { getResponse: () => unknown }).getResponse()
        : undefined;
    const payload =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>)
        : undefined;
    const code = typeof payload?.code === 'string' ? payload.code : 'CHAT_GENERATION_FAILED';

    return {
      code,
      message: this.userFacingErrorMessage(code),
    };
  }

  private userFacingErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      CLIENT_ABORTED: '生成已中断，本次积分已退回',
      LLM_AUTH_ERROR: '模型服务鉴权失败，请联系管理员',
      LLM_EMPTY_RESPONSE: '模型没有返回有效内容，请重试',
      LLM_INVALID_STREAM: '模型返回数据异常，请重试',
      LLM_NOT_CONFIGURED: '模型服务尚未配置，请联系管理员',
      LLM_RATE_LIMITED: '模型服务繁忙，请稍后重试',
      LLM_REQUEST_ERROR: '模型请求失败，请调整输入后重试',
      LLM_TIMEOUT: '模型响应超时，本次积分已退回',
      LLM_UNAVAILABLE: '模型服务暂时不可用，本次积分已退回',
    };

    return messages[code] ?? '对话生成失败，本次积分已退回';
  }
}

function collectRecentHistoryAttachmentIds(
  history: Array<{
    attachments: Array<{
      id: string;
    }>;
  }>,
): Set<string> {
  const attachmentIds = new Set<string>();

  for (const message of [...history].reverse()) {
    for (const attachment of message.attachments) {
      attachmentIds.add(attachment.id);

      if (attachmentIds.size >= MAX_HISTORY_IMAGE_ATTACHMENTS) {
        return attachmentIds;
      }
    }
  }

  return attachmentIds;
}
