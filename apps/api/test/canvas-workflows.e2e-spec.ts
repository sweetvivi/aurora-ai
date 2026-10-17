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
}

describe('canvas workflow endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailSuffix = '@canvas-test.local';
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

  it('requires authentication to access canvas workflows', async () => {
    await request(app.getHttpServer()).get('/api/v1/canvas-workflows').expect(401);
  });

  it('creates, updates, lists, and isolates canvas workflows by owner', async () => {
    const owner = await registerUser(`owner-${randomUUID()}${testEmailSuffix}`, '画布所有者');
    const otherUser = await registerUser(`other-${randomUUID()}${testEmailSuffix}`, '其他用户');
    const workflowId = `canvas-${randomUUID()}`;
    const document = {
      edges: [{ from: 'node-a', id: 'edge-a', to: 'node-b' }],
      groups: [],
      nodes: [
        {
          height: 218,
          id: 'node-a',
          kind: 'image',
          prompt: '产品主图',
          title: '主图',
          width: 330,
          x: 120,
          y: 80,
        },
        {
          height: 225,
          id: 'node-b',
          kind: 'output',
          prompt: '产品主图',
          title: '输出',
          width: 330,
          x: 520,
          y: 80,
        },
      ],
      title: '商品视觉流程',
      version: 1,
    };

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/canvas-workflows')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({
        document,
        id: workflowId,
        title: '商品视觉流程',
        version: 1,
      })
      .expect(201);

    expect(createResponse.body.data).toMatchObject({
      id: workflowId,
      title: '商品视觉流程',
      version: 1,
    });
    expect(createResponse.body.data.document).toMatchObject(document);
    expect(createResponse.body.data).not.toHaveProperty('userId');

    const updateResponse = await request(app.getHttpServer())
      .post('/api/v1/canvas-workflows')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({
        document: {
          ...document,
          title: '更新后的画布',
        },
        id: workflowId,
        title: '更新后的画布',
        version: 1,
      })
      .expect(201);

    expect(updateResponse.body.data).toMatchObject({
      id: workflowId,
      title: '更新后的画布',
      version: 1,
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/canvas-workflows')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0]).toMatchObject({
      id: workflowId,
      title: '更新后的画布',
    });

    const otherListResponse = await request(app.getHttpServer())
      .get('/api/v1/canvas-workflows')
      .set('authorization', `Bearer ${otherUser.accessToken}`)
      .expect(200);

    expect(otherListResponse.body.data.items).toEqual([]);

    const otherSaveResponse = await request(app.getHttpServer())
      .post('/api/v1/canvas-workflows')
      .set('authorization', `Bearer ${otherUser.accessToken}`)
      .send({
        document,
        id: workflowId,
        title: '越权覆盖',
        version: 1,
      })
      .expect(404);

    expect(otherSaveResponse.body.error.code).toBe('CANVAS_WORKFLOW_NOT_FOUND');
  });

  it('rejects malformed canvas documents', async () => {
    const user = await registerUser(`invalid-${randomUUID()}${testEmailSuffix}`, '校验用户');

    const response = await request(app.getHttpServer())
      .post('/api/v1/canvas-workflows')
      .set('authorization', `Bearer ${user.accessToken}`)
      .send({
        document: { title: '缺少节点' },
        title: '无效画布',
      })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_CANVAS_DOCUMENT');
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
    };
  }
});
