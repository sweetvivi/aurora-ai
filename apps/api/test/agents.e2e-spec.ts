import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

interface RegisteredUser {
  accessToken: string;
  id: string;
}

describe('custom agent endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailSuffix = '@agents-test.local';
  const password = 'correct-horse-battery';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: testEmailSuffix,
        },
      },
    });
    await app.close();
  });

  it('requires authentication to access custom agents', async () => {
    await request(app.getHttpServer()).get('/api/v1/agents').expect(401);
  });

  it('creates, lists, updates, publishes, and isolates custom agents by owner', async () => {
    const owner = await registerUser(`owner-${randomUUID()}${testEmailSuffix}`, '智能体所有者');
    const otherUser = await registerUser(`other-${randomUUID()}${testEmailSuffix}`, '其他用户');
    const agentId = `agent-${randomUUID()}`;

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/agents')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({
        capabilities: ['web-search', 'smart-chart'],
        description: '',
        id: agentId,
        instructions: '',
        name: '',
        opening: '',
        starterPrompts: [],
        tags: ['草稿'],
      })
      .expect(201);

    expect(createResponse.body.data).toMatchObject({
      capabilities: ['web-search', 'smart-chart'],
      id: agentId,
      name: '未命名智能体',
      publishedAt: null,
      status: 'DRAFT',
      tags: ['草稿'],
    });
    expect(createResponse.body.data).not.toHaveProperty('userId');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/agents')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0].id).toBe(agentId);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/agents/${agentId}`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({
        description: '整理产品需求并输出验收清单。',
        instructions: '先澄清目标，再生成结构化验收清单。',
        name: '产品验收助手',
        opening: '告诉我产品目标，我会整理验收范围。',
        starterPrompts: ['整理验收清单', '', '补充边界条件'],
      })
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      description: '整理产品需求并输出验收清单。',
      name: '产品验收助手',
      starterPrompts: ['整理验收清单', '补充边界条件'],
      status: 'DRAFT',
    });

    const publishResponse = await request(app.getHttpServer())
      .post(`/api/v1/agents/${agentId}/publish`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(201);

    expect(publishResponse.body.data).toMatchObject({
      id: agentId,
      status: 'PUBLISHED',
    });
    expect(publishResponse.body.data.publishedAt).toEqual(expect.any(String));

    const otherListResponse = await request(app.getHttpServer())
      .get('/api/v1/agents')
      .set('authorization', `Bearer ${otherUser.accessToken}`)
      .expect(200);

    expect(otherListResponse.body.data.items).toEqual([]);

    const otherUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/agents/${agentId}`)
      .set('authorization', `Bearer ${otherUser.accessToken}`)
      .send({
        name: '越权修改',
      })
      .expect(404);

    expect(otherUpdateResponse.body.error.code).toBe('AGENT_NOT_FOUND');

    const otherPublishResponse = await request(app.getHttpServer())
      .post(`/api/v1/agents/${agentId}/publish`)
      .set('authorization', `Bearer ${otherUser.accessToken}`)
      .expect(404);

    expect(otherPublishResponse.body.error.code).toBe('AGENT_NOT_FOUND');
  });

  async function registerUser(email: string, displayName: string): Promise<RegisteredUser> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName,
        email,
        password,
      })
      .expect(201);

    return {
      accessToken: response.body.data.accessToken as string,
      id: response.body.data.user.id as string,
    };
  }
});
