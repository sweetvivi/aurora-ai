import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CanvasWorkflow, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { SaveCanvasWorkflowDto } from './dto/save-canvas-workflow.dto';

const MAX_DOCUMENT_BYTES = 2_000_000;

export interface CanvasWorkflowView {
  createdAt: Date;
  document: Prisma.JsonValue;
  id: string;
  title: string;
  updatedAt: Date;
  version: number;
}

@Injectable()
export class CanvasWorkflowsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(userId: string): Promise<CanvasWorkflowView[]> {
    const workflows = await this.prismaService.canvasWorkflow.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      where: { userId },
    });

    return workflows.map((workflow) => this.toView(workflow));
  }

  async save(userId: string, input: SaveCanvasWorkflowDto): Promise<CanvasWorkflowView> {
    const workflowId = input.id?.trim();
    const document = this.normalizeDocument(input.document);
    const data = {
      document,
      title: input.title?.trim().slice(0, 80) || this.documentTitle(input.document),
      userId,
      version: input.version ?? this.documentVersion(input.document),
    };

    if (workflowId) {
      const existing = await this.prismaService.canvasWorkflow.findUnique({
        select: { id: true, userId: true },
        where: { id: workflowId },
      });

      if (existing && existing.userId !== userId) {
        throw new NotFoundException({
          code: 'CANVAS_WORKFLOW_NOT_FOUND',
          message: '画布不存在或无权访问',
        });
      }

      const workflow = existing
        ? await this.prismaService.canvasWorkflow.update({
            data,
            where: { id: workflowId },
          })
        : await this.prismaService.canvasWorkflow.create({
            data: {
              ...data,
              id: workflowId,
            },
          });

      return this.toView(workflow);
    }

    const workflow = await this.prismaService.canvasWorkflow.create({
      data: {
        ...data,
        id: `canvas-${randomUUID()}`,
      },
    });

    return this.toView(workflow);
  }

  async remove(userId: string, workflowId: string): Promise<{ id: string }> {
    const normalizedId = workflowId.trim();
    const result = normalizedId
      ? await this.prismaService.canvasWorkflow.deleteMany({
          where: {
            id: normalizedId,
            userId,
          },
        })
      : { count: 0 };

    if (result.count === 0) {
      throw new NotFoundException({
        code: 'CANVAS_WORKFLOW_NOT_FOUND',
        message: '画布不存在或无权访问',
      });
    }

    return { id: normalizedId };
  }

  private normalizeDocument(input: Record<string, unknown>): Prisma.InputJsonObject {
    if (
      Array.isArray(input) ||
      typeof input !== 'object' ||
      !Array.isArray(input.nodes) ||
      !Array.isArray(input.edges)
    ) {
      throw new BadRequestException({
        code: 'INVALID_CANVAS_DOCUMENT',
        message: '画布数据必须包含 nodes 和 edges 数组',
      });
    }

    const serialized = JSON.stringify(input);

    if (Buffer.byteLength(serialized, 'utf8') > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException({
        code: 'CANVAS_DOCUMENT_TOO_LARGE',
        message: '画布数据超过 2 MB 限制',
      });
    }

    return JSON.parse(serialized) as Prisma.InputJsonObject;
  }

  private documentTitle(document: Record<string, unknown>): string {
    if (typeof document === 'object' && document !== null && typeof document.title === 'string') {
      return document.title.trim().slice(0, 80) || '新建画布';
    }

    return '新建画布';
  }

  private documentVersion(document: Record<string, unknown>): number {
    if (
      typeof document === 'object' &&
      document !== null &&
      typeof document.version === 'number' &&
      Number.isInteger(document.version)
    ) {
      return Math.min(1_000, Math.max(1, document.version));
    }

    return 1;
  }

  private toView(workflow: CanvasWorkflow): CanvasWorkflowView {
    return {
      createdAt: workflow.createdAt,
      document: workflow.document,
      id: workflow.id,
      title: workflow.title,
      updatedAt: workflow.updatedAt,
      version: workflow.version,
    };
  }
}
