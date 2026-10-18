import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { ModelRegistryService } from '../src/models/model-registry.service';
import { STORAGE_ADAPTER, type StorageAdapter } from '../src/storage/storage.types';

interface RegisteredUser {
  accessToken: string;
  id: string;
}

describe('admin endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailSuffix = '@admin-test.local';
  const testProviderPrefix = 'admin-e2e-';
  const testModelPrefix = 'admin-e2e-';
  const password = 'correct-horse-battery';
  let admin: RegisteredUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);

    const email = `admin-${randomUUID()}${testEmailSuffix}`;
    const registration = await registerUser(email, '接口管理员');

    await prisma.user.update({
      data: { role: 'ADMIN' },
      where: { id: registration.id },
    });

    admin = registration;
  });

  afterAll(async () => {
    await prisma.modelConfig.deleteMany({
      where: {
        alias: {
          startsWith: testModelPrefix,
        },
      },
    });
    await prisma.providerConfig.deleteMany({
      where: {
        code: {
          startsWith: testProviderPrefix,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: testEmailSuffix,
        },
      },
    });
    await app.close();
    vi.unstubAllGlobals();
  });

  it('requires an authenticated administrator', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/overview').expect(401);

    const user = await registerUser(`restricted-${randomUUID()}${testEmailSuffix}`, '普通用户');

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('authorization', `Bearer ${user.accessToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('returns an overview without exposing credentials', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      models: {
        enabled: expect.any(Number),
        total: expect.any(Number),
      },
      orders: {
        enabled: false,
        status: 'not_enabled',
      },
      users: {
        admins: expect.any(Number),
        total: expect.any(Number),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('apiKey');
    expect(JSON.stringify(response.body)).not.toContain('sk-');
  });

  it('lists, updates, and suspends users while recording point adjustments', async () => {
    const user = await registerUser(`managed-${randomUUID()}${testEmailSuffix}`, '待管理用户');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .query({
        limit: 100,
        search: user.id,
      })
      .set('authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0]).toMatchObject({
      displayName: '待管理用户',
      id: user.id,
      role: 'USER',
      status: 'ACTIVE',
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${user.id}`)
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        displayName: '已更新用户',
        status: 'SUSPENDED',
      })
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      displayName: '已更新用户',
      status: 'SUSPENDED',
    });
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${user.accessToken}`)
      .expect(403);

    const adjustmentResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${user.id}/points-adjustments`)
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        delta: 25,
        idempotencyKey: `admin-adjust-${randomUUID()}`,
        reason: '端到端测试调整',
      })
      .expect(201);

    expect(adjustmentResponse.body.data).toMatchObject({
      ledgerEntryId: expect.any(String),
      user: {
        id: user.id,
        pointsBalance: 125,
      },
    });

    const ledger = await prisma.pointsLedgerEntry.findUniqueOrThrow({
      where: {
        id: adjustmentResponse.body.data.ledgerEntryId,
      },
    });

    expect(ledger).toMatchObject({
      balanceAfter: 125,
      delta: 25,
      referenceId: user.id,
      referenceType: 'admin_user',
      type: 'ADJUSTMENT',
      userId: user.id,
    });
    expect(ledger.metadata).toMatchObject({
      actorId: admin.id,
      reason: '端到端测试调整',
    });
  });

  it('prevents an administrator from demoting or suspending their own account', async () => {
    const demoteResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${admin.id}`)
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'USER' })
      .expect(400);

    expect(demoteResponse.body.error.code).toBe('CANNOT_DEMOTE_SELF');

    const suspendResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${admin.id}`)
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(400);

    expect(suspendResponse.body.error.code).toBe('CANNOT_SUSPEND_SELF');
  });

  it('creates and updates provider and model configuration metadata', async () => {
    const providerCode = `${testProviderPrefix}${randomUUID().slice(0, 8)}`;
    const modelAlias = `${testModelPrefix}${randomUUID().slice(0, 8)}`;
    const providerResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/providers')
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        baseUrl: 'http://127.0.0.1:9999/v1/',
        code: providerCode,
        displayName: '测试厂商',
        enabled: true,
        keyRef: 'ADMIN_E2E_TEST_KEY',
        priority: 10,
      })
      .expect(201);

    expect(providerResponse.body.data).toMatchObject({
      baseUrl: 'http://127.0.0.1:9999/v1',
      code: providerCode,
      displayName: '测试厂商',
      keyRef: 'ADMIN_E2E_TEST_KEY',
      priority: 10,
    });
    expect(JSON.stringify(providerResponse.body)).not.toContain('apiKey');
    expect(JSON.stringify(providerResponse.body)).not.toContain('sk-');

    const modelResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/models')
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        alias: modelAlias,
        capabilities: ['chat'],
        contextWindow: 128000,
        displayName: '测试模型',
        enabled: false,
        providerCode,
        providerModel: 'test-model-v1',
      })
      .expect(201);

    expect(modelResponse.body.data).toMatchObject({
      alias: modelAlias,
      capabilities: ['CHAT'],
      contextWindow: 128000,
      displayName: '测试模型',
      enabled: false,
      provider: {
        code: providerCode,
      },
      providerModel: 'test-model-v1',
    });

    const disabledResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/models')
      .query({
        enabled: 'false',
        providerCode,
      })
      .set('authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(disabledResponse.body.data.items).toHaveLength(1);
    expect(disabledResponse.body.data.items[0].enabled).toBe(false);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/admin/models/${modelResponse.body.data.id}`)
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        capabilities: ['chat', 'image'],
        enabled: true,
      })
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      alias: modelAlias,
      capabilities: ['CHAT', 'IMAGE'],
      enabled: true,
    });

    const publicModelsResponse = await request(app.getHttpServer())
      .get('/api/v1/models')
      .query({ capability: 'image' })
      .set('authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(publicModelsResponse.body.data.items).toContainEqual({
      alias: modelAlias,
      capabilities: ['chat', 'image'],
      displayName: '测试模型',
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/providers/${providerResponse.body.data.id}`)
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        baseUrl: 'http://127.0.0.1:9998/v2/',
      })
      .expect(200);

    const registry = app.get(ModelRegistryService);

    expect(registry.getByAlias(modelAlias)).toMatchObject({
      baseUrl: 'http://127.0.0.1:9998/v2',
      keyRef: 'ADMIN_E2E_TEST_KEY',
      providerCode,
      providerModel: 'test-model-v1',
    });
  });

  it('rejects attempts to submit a real key through provider configuration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/providers')
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        apiKey: 'sk-should-never-be-accepted',
        baseUrl: 'http://127.0.0.1:9999/v1',
        code: `${testProviderPrefix}${randomUUID().slice(0, 8)}`,
        displayName: '危险请求',
        keyRef: 'ADMIN_E2E_TEST_KEY',
      })
      .expect(400);

    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(JSON.stringify(response.body)).not.toContain('sk-should-never-be-accepted');
  });

  it('uploads, serves, replaces, and clears local module covers', async () => {
    const moduleKey = `admin-e2e-cover-${randomUUID().slice(0, 8)}`;
    const storage = app.get<StorageAdapter>(STORAGE_ADAPTER);
    const firstCover = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const secondCover = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZfC8AAAAASUVORK5CYII=',
      'base64',
    );

    await prisma.moduleDisplayConfig.create({
      data: {
        group: 'primary',
        icon: 'test-cover',
        key: moduleKey,
        name: '封面测试模块',
        route: '/cover-test',
        sortOrder: 999,
      },
    });

    let currentStorageKey: string | null = null;

    try {
      const regularUser = await registerUser(
        `cover-uploader-${randomUUID()}${testEmailSuffix}`,
        '普通上传用户',
      );

      await request(app.getHttpServer())
        .post(`/api/v1/admin/modules/${moduleKey}/cover`)
        .set('authorization', `Bearer ${regularUser.accessToken}`)
        .attach('file', firstCover, {
          contentType: 'image/png',
          filename: 'cover.png',
        })
        .expect(403);

      const untouchedRecord = await prisma.moduleDisplayConfig.findUniqueOrThrow({
        where: { key: moduleKey },
      });

      expect(untouchedRecord.coverStorageKey).toBeNull();

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/v1/admin/modules/${moduleKey}/cover`)
        .set('authorization', `Bearer ${admin.accessToken}`)
        .attach('file', firstCover, {
          contentType: 'image/png',
          filename: 'cover.png',
        })
        .expect(201);

      expect(uploadResponse.body.data).toMatchObject({
        cover: expect.stringMatching(
          new RegExp(`^/api/v1/modules/display/${moduleKey}/cover\\?v=\\d+$`),
        ),
        coverSource: 'local',
        customized: true,
        key: moduleKey,
      });
      expect(JSON.stringify(uploadResponse.body)).not.toContain('coverStorageKey');
      expect(JSON.stringify(uploadResponse.body)).not.toContain('storageKey');

      const firstStoredRecord = await prisma.moduleDisplayConfig.findUniqueOrThrow({
        where: { key: moduleKey },
      });

      expect(firstStoredRecord.cover).toBeNull();
      expect(firstStoredRecord.coverStorageKey).toBeTruthy();
      currentStorageKey = firstStoredRecord.coverStorageKey;

      const coverResponse = await request(app.getHttpServer())
        .get(`/api/v1/modules/display/${moduleKey}/cover`)
        .expect('Content-Type', /image\/png/)
        .expect(200);

      expect(Buffer.compare(coverResponse.body as Buffer, firstCover)).toBe(0);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/modules/${moduleKey}/cover`)
        .set('authorization', `Bearer ${admin.accessToken}`)
        .attach('file', secondCover, {
          contentType: 'image/png',
          filename: 'cover-replacement.png',
        })
        .expect(201);

      const replacementRecord = await prisma.moduleDisplayConfig.findUniqueOrThrow({
        where: { key: moduleKey },
      });
      const replacedStorageKey = replacementRecord.coverStorageKey;

      expect(replacedStorageKey).toBeTruthy();
      expect(replacedStorageKey).not.toBe(currentStorageKey);
      await expect(storage.read(currentStorageKey as string)).rejects.toThrow();
      currentStorageKey = replacedStorageKey;

      const externalResponse = await request(app.getHttpServer())
        .patch(`/api/v1/admin/modules/${moduleKey}`)
        .set('authorization', `Bearer ${admin.accessToken}`)
        .send({
          cover: 'https://cdn.example/module-cover.webp',
        })
        .expect(200);

      expect(externalResponse.body.data).toMatchObject({
        cover: 'https://cdn.example/module-cover.webp',
        coverSource: 'url',
      });
      await expect(storage.read(currentStorageKey as string)).rejects.toThrow();

      const externalRecord = await prisma.moduleDisplayConfig.findUniqueOrThrow({
        where: { key: moduleKey },
      });

      expect(externalRecord.cover).toBe('https://cdn.example/module-cover.webp');
      expect(externalRecord.coverStorageKey).toBeNull();
      currentStorageKey = null;

      const clearResponse = await request(app.getHttpServer())
        .patch(`/api/v1/admin/modules/${moduleKey}`)
        .set('authorization', `Bearer ${admin.accessToken}`)
        .send({
          cover: null,
        })
        .expect(200);

      expect(clearResponse.body.data).toMatchObject({
        cover: null,
        coverSource: null,
      });

      await request(app.getHttpServer())
        .get(`/api/v1/modules/display/${moduleKey}/cover`)
        .expect(404);
    } finally {
      if (currentStorageKey) {
        await storage.delete(currentStorageKey);
      }

      await prisma.moduleDisplayConfig.deleteMany({
        where: { key: moduleKey },
      });
    }
  });

  it('probes a provider with a transient key and imports selected models', async () => {
    const providerCode = `${testProviderPrefix}${randomUUID().slice(0, 8)}`;
    const providerResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/providers')
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        baseUrl: 'https://discovery.example/v1',
        code: providerCode,
        displayName: '模型发现测试厂',
        enabled: true,
        keyRef: 'ADMIN_E2E_DISCOVERY_KEY',
        priority: 20,
      })
      .expect(201);
    const transientKey = 'sk-discovery-secret';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: 'discovered-chat' }, { id: 'discovered-image' }, { id: 'discovered-video' }],
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const probeResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/providers/${providerResponse.body.data.id}/probe`)
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        apiKey: transientKey,
        baseUrl: 'https://discovery.example/v1',
      })
      .expect(201);

    expect(probeResponse.body.data).toMatchObject({
      modelCount: 3,
      protocol: 'openai-compatible',
      truncated: false,
    });
    expect(probeResponse.body.data.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capabilities: ['chat'],
          providerModel: 'discovered-chat',
        }),
        expect.objectContaining({
          capabilities: ['image'],
          providerModel: 'discovered-image',
        }),
        expect.objectContaining({
          capabilities: ['video'],
          providerModel: 'discovered-video',
        }),
      ]),
    );
    expect(JSON.stringify(probeResponse.body)).not.toContain(transientKey);

    const selectedModels = probeResponse.body.data.models.map(
      (model: { capabilities: string[]; displayName: string; providerModel: string }) => ({
        capabilities: model.capabilities,
        displayName: model.displayName,
        enabled: true,
        providerModel: model.providerModel,
      }),
    );
    const importResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/models/import-discovered')
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        models: selectedModels,
        providerCode,
      })
      .expect(201);

    expect(importResponse.body.data.imported).toHaveLength(3);
    expect(importResponse.body.data.skipped).toHaveLength(0);

    const secondImportResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/models/import-discovered')
      .set('authorization', `Bearer ${admin.accessToken}`)
      .send({
        models: selectedModels,
        providerCode,
      })
      .expect(201);

    expect(secondImportResponse.body.data.imported).toHaveLength(0);
    expect(secondImportResponse.body.data.skipped).toHaveLength(3);

    const registry = app.get(ModelRegistryService);

    expect(registry.getByAlias(`${providerCode}-discovered-chat`)).toMatchObject({
      capabilities: ['chat'],
      providerCode,
      providerModel: 'discovered-chat',
    });
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
