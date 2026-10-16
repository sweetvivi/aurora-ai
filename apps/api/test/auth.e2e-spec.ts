import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('authentication endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailSuffix = '@auth-test.local';
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

  it('registers an email user with the initial points ledger entry', async () => {
    const email = `register-${randomUUID()}${testEmailSuffix}`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '测试用户',
        email,
        password,
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      expiresIn: 900,
      user: {
        displayName: '测试用户',
        email,
        pointsBalance: 100,
      },
    });
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const ledger = await prisma.pointsLedgerEntry.findMany({
      where: { userId: user.id },
    });

    expect(user.pointsBalance).toBe(100);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      balanceAfter: 100,
      delta: 100,
      idempotencyKey: `signup:${user.id}`,
      type: 'GRANT',
    });
  });

  it('rejects duplicate registrations and wrong passwords', async () => {
    const email = `duplicate-${randomUUID()}${testEmailSuffix}`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '重复用户',
        email,
        password,
      })
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '重复用户',
        email,
        password,
      })
      .expect(409);

    expect(duplicateResponse.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/email/login')
      .send({
        email,
        password: 'definitely-wrong-password',
      })
      .expect(401);

    expect(loginResponse.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('protects user routes and returns the current user', async () => {
    const email = `me-${randomUUID()}${testEmailSuffix}`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '当前用户',
        email,
        password,
      })
      .expect(201);

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${registerResponse.body.data.accessToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      displayName: '当前用户',
      email,
      pointsBalance: 100,
    });
  });

  it('rotates refresh tokens and rejects the previous token', async () => {
    const email = `refresh-${randomUUID()}${testEmailSuffix}`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/email/register')
      .send({
        displayName: '刷新用户',
        email,
        password,
      })
      .expect(201);
    const refreshToken = registerResponse.body.data.refreshToken as string;

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshResponse.body.data.refreshToken).not.toBe(refreshToken);

    const reusedResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(reusedResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('creates a development user with a unique email', async () => {
    const email = `dev-${randomUUID()}${testEmailSuffix}`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({
        displayName: '开发用户',
        email,
      })
      .expect(200);

    expect(response.body.data.user).toMatchObject({
      displayName: '开发用户',
      email,
      pointsBalance: 100,
    });
  });
});
