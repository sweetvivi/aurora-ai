import { BadRequestException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { PointsService } from '../src/points/points.service';

describe('points service', () => {
  const testEmailSuffix = '@points-test.local';
  let app: INestApplication;
  let prisma: PrismaService;
  let pointsService: PointsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    pointsService = app.get(PointsService);
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

  it('reserves points once for a repeated idempotency key', async () => {
    const user = await createUser(10);
    const input = {
      amount: 3,
      idempotencyKey: `chat:${randomUUID()}`,
      referenceId: randomUUID(),
      referenceType: 'chat',
      userId: user.id,
    };

    const first = await pointsService.reserve(input);
    const second = await pointsService.reserve(input);

    expect(first).toMatchObject({
      amount: 3,
      balanceAfter: 7,
      status: 'RESERVED',
    });
    expect(second.id).toBe(first.id);
    expect(await pointsService.getBalance(user.id)).toBe(7);

    const reservations = await prisma.pointsReservation.findMany({
      where: { userId: user.id },
    });
    const ledger = await prisma.pointsLedgerEntry.findMany({
      orderBy: { createdAt: 'asc' },
      where: { userId: user.id },
    });

    expect(reservations).toHaveLength(1);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      balanceAfter: 7,
      delta: -3,
      type: 'HOLD',
    });
  });

  it('rejects a reservation when the balance is insufficient', async () => {
    const user = await createUser(2);

    await expect(
      pointsService.reserve({
        amount: 3,
        idempotencyKey: `chat:${randomUUID()}`,
        referenceId: randomUUID(),
        referenceType: 'chat',
        userId: user.id,
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'INSUFFICIENT_POINTS',
      },
    });

    expect(await pointsService.getBalance(user.id)).toBe(2);
    expect(await prisma.pointsReservation.count({ where: { userId: user.id } })).toBe(0);
  });

  it('settles a reservation once without changing the available balance', async () => {
    const user = await createUser(10);
    const reservation = await pointsService.reserve({
      amount: 4,
      idempotencyKey: `chat:${randomUUID()}`,
      referenceId: randomUUID(),
      referenceType: 'chat',
      userId: user.id,
    });

    const settled = await pointsService.settle(reservation.id);
    const repeated = await pointsService.settle(reservation.id);

    expect(settled).toMatchObject({
      balanceAfter: 6,
      status: 'SETTLED',
    });
    expect(repeated.id).toBe(reservation.id);
    expect(await pointsService.getBalance(user.id)).toBe(6);

    const ledger = await prisma.pointsLedgerEntry.findMany({
      orderBy: { createdAt: 'asc' },
      where: { userId: user.id },
    });

    expect(ledger).toHaveLength(2);
    expect(ledger[1]).toMatchObject({
      balanceAfter: 6,
      delta: 0,
      type: 'SETTLE',
    });
  });

  it('refunds a failed reservation once and restores the balance', async () => {
    const user = await createUser(10);
    const reservation = await pointsService.reserve({
      amount: 4,
      idempotencyKey: `image:${randomUUID()}`,
      referenceId: randomUUID(),
      referenceType: 'image',
      userId: user.id,
    });

    const refunded = await pointsService.refund(reservation.id);
    const repeated = await pointsService.refund(reservation.id);

    expect(refunded).toMatchObject({
      balanceAfter: 10,
      status: 'REFUNDED',
    });
    expect(repeated.id).toBe(reservation.id);
    expect(await pointsService.getBalance(user.id)).toBe(10);

    const ledger = await prisma.pointsLedgerEntry.findMany({
      orderBy: { createdAt: 'asc' },
      where: { userId: user.id },
    });

    expect(ledger).toHaveLength(2);
    expect(ledger[1]).toMatchObject({
      balanceAfter: 10,
      delta: 4,
      type: 'REFUND',
    });
  });

  it('does not refund a settled reservation or settle a refunded one', async () => {
    const user = await createUser(10);
    const settledReservation = await pointsService.reserve({
      amount: 2,
      idempotencyKey: `chat:${randomUUID()}`,
      referenceId: randomUUID(),
      referenceType: 'chat',
      userId: user.id,
    });
    await pointsService.settle(settledReservation.id);

    await expect(pointsService.refund(settledReservation.id)).rejects.toMatchObject({
      response: {
        code: 'POINTS_RESERVATION_ALREADY_FINALIZED',
      },
    });

    const refundedReservation = await pointsService.reserve({
      amount: 2,
      idempotencyKey: `image:${randomUUID()}`,
      referenceId: randomUUID(),
      referenceType: 'image',
      userId: user.id,
    });
    await pointsService.refund(refundedReservation.id);

    await expect(pointsService.settle(refundedReservation.id)).rejects.toMatchObject({
      response: {
        code: 'POINTS_RESERVATION_ALREADY_FINALIZED',
      },
    });
  });

  it('handles concurrent reservations with the same idempotency key', async () => {
    const user = await createUser(10);
    const input = {
      amount: 3,
      idempotencyKey: `chat:${randomUUID()}`,
      referenceId: randomUUID(),
      referenceType: 'chat',
      userId: user.id,
    };

    const [first, second] = await Promise.all([
      pointsService.reserve(input),
      pointsService.reserve(input),
    ]);

    expect(first.id).toBe(second.id);
    expect(await pointsService.getBalance(user.id)).toBe(7);
    expect(await prisma.pointsReservation.count({ where: { userId: user.id } })).toBe(1);
  });

  it('keeps ledger balances correct for concurrent distinct reservations', async () => {
    const user = await createUser(10);

    const reservations = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        pointsService.reserve({
          amount: 2,
          idempotencyKey: `chat:${index}:${randomUUID()}`,
          referenceId: randomUUID(),
          referenceType: 'chat',
          userId: user.id,
        }),
      ),
    );

    expect(new Set(reservations.map((reservation) => reservation.id)).size).toBe(3);
    expect(await pointsService.getBalance(user.id)).toBe(4);

    const ledger = await prisma.pointsLedgerEntry.findMany({
      orderBy: { balanceAfter: 'asc' },
      where: {
        referenceId: { in: reservations.map((reservation) => reservation.id) },
      },
    });

    expect(ledger.map((entry) => entry.balanceAfter)).toEqual([4, 6, 8]);
  });

  it('rejects invalid point amounts', async () => {
    const user = await createUser(10);

    await expect(
      pointsService.reserve({
        amount: 1.5,
        idempotencyKey: `chat:${randomUUID()}`,
        referenceId: randomUUID(),
        referenceType: 'chat',
        userId: user.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  async function createUser(pointsBalance: number) {
    return prisma.user.create({
      data: {
        displayName: '积分测试用户',
        email: `points-${randomUUID()}${testEmailSuffix}`,
        pointsBalance,
      },
    });
  }
});
