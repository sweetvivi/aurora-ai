import { Injectable, NotFoundException } from '@nestjs/common';
import type { CustomAgent, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { CreateAgentDto } from './dto/create-agent.dto';
import type { UpdateAgentDto } from './dto/update-agent.dto';

export interface CustomAgentView {
  capabilities: string[];
  category: string;
  color: string;
  createdAt: Date;
  description: string;
  glyph: string;
  id: string;
  instructions: string;
  name: string;
  opening: string;
  publishedAt: Date | null;
  rating: number;
  starterPrompts: string[];
  status: 'DRAFT' | 'PUBLISHED';
  tags: string[];
  updatedAt: Date;
  usage: number;
}

@Injectable()
export class AgentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(userId: string): Promise<CustomAgentView[]> {
    const agents = await this.prismaService.customAgent.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      where: { userId },
    });

    return agents.map((agent) => this.toView(agent));
  }

  async save(userId: string, input: CreateAgentDto): Promise<CustomAgentView> {
    const agentId = input.id?.trim();

    if (agentId) {
      const existing = await this.prismaService.customAgent.findUnique({
        where: { id: agentId },
      });

      if (existing && existing.userId !== userId) {
        throw new NotFoundException({
          code: 'AGENT_NOT_FOUND',
          message: '智能体不存在或无权访问',
        });
      }

      const data = this.toCreateData(userId, input);
      const agent = existing
        ? await this.prismaService.customAgent.update({
            data: this.toUpdateData(input),
            where: { id: agentId },
          })
        : await this.prismaService.customAgent.create({
            data: {
              ...data,
              id: agentId,
            },
          });

      return this.toView(agent);
    }

    const agent = await this.prismaService.customAgent.create({
      data: {
        ...this.toCreateData(userId, input),
        id: `agent-${randomUUID()}`,
      },
    });

    return this.toView(agent);
  }

  async update(userId: string, agentId: string, input: UpdateAgentDto): Promise<CustomAgentView> {
    await this.assertOwned(userId, agentId);

    const agent = await this.prismaService.customAgent.update({
      data: this.toUpdateData(input),
      where: { id: agentId },
    });

    return this.toView(agent);
  }

  async publish(userId: string, agentId: string): Promise<CustomAgentView> {
    await this.assertOwned(userId, agentId);

    const agent = await this.prismaService.customAgent.update({
      data: {
        publishedAt: new Date(),
        status: 'PUBLISHED',
      },
      where: { id: agentId },
    });

    return this.toView(agent);
  }

  private async assertOwned(userId: string, agentId: string): Promise<void> {
    const agent = await this.prismaService.customAgent.findFirst({
      select: { id: true },
      where: {
        id: agentId,
        userId,
      },
    });

    if (!agent) {
      throw new NotFoundException({
        code: 'AGENT_NOT_FOUND',
        message: '智能体不存在或无权访问',
      });
    }
  }

  private toCreateData(
    userId: string,
    input: CreateAgentDto,
  ): Omit<Prisma.CustomAgentCreateInput, 'id'> {
    const name = input.name?.trim() || '未命名智能体';

    return {
      capabilities: this.cleanList(input.capabilities),
      category: '我的智能体',
      color: input.color?.trim() || '#3979ed',
      description: input.description?.trim() || '',
      glyph: input.glyph?.trim().slice(0, 1) || name.slice(0, 1) || '智',
      instructions: input.instructions?.trim() || '',
      name,
      opening: input.opening?.trim() || '',
      starterPrompts: this.cleanList(input.starterPrompts),
      tags: this.cleanList(input.tags),
      user: {
        connect: { id: userId },
      },
    };
  }

  private toUpdateData(input: UpdateAgentDto): Prisma.CustomAgentUpdateInput {
    const data: Prisma.CustomAgentUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name.trim() || '未命名智能体';
    }

    if (input.description !== undefined) {
      data.description = input.description.trim();
    }

    if (input.instructions !== undefined) {
      data.instructions = input.instructions.trim();
    }

    if (input.opening !== undefined) {
      data.opening = input.opening.trim();
    }

    if (input.capabilities !== undefined) {
      data.capabilities = this.cleanList(input.capabilities);
    }

    if (input.tags !== undefined) {
      data.tags = this.cleanList(input.tags);
    }

    if (input.starterPrompts !== undefined) {
      data.starterPrompts = this.cleanList(input.starterPrompts);
    }

    if (input.color !== undefined) {
      data.color = input.color.trim() || '#3979ed';
    }

    if (input.glyph !== undefined) {
      data.glyph = input.glyph.trim().slice(0, 1) || '智';
    }

    return data;
  }

  private cleanList(items: string[] | undefined): string[] {
    return (items ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private toView(agent: CustomAgent): CustomAgentView {
    return {
      capabilities: agent.capabilities,
      category: agent.category,
      color: agent.color,
      createdAt: agent.createdAt,
      description: agent.description,
      glyph: agent.glyph,
      id: agent.id,
      instructions: agent.instructions,
      name: agent.name,
      opening: agent.opening,
      publishedAt: agent.publishedAt,
      rating: agent.rating,
      starterPrompts: agent.starterPrompts,
      status: agent.status,
      tags: agent.tags,
      updatedAt: agent.updatedAt,
      usage: agent.usage,
    };
  }
}
