import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

const DEFAULT_RESERVATION_TTL_MS = 30 * 60 * 1000;

export interface ReservePointsInput {
  amount: number;
  expiresAt?: Date;
  idempotencyKey: string;
  referenceId: string;
  referenceType: string;
  userId: string;
}

export interface PointsReservationResult {
  amount: number;
  balanceAfter: number;
  expiresAt: Date;
  id: string;
  status: 'RESERVED' | 'SETTLED' | 'REFUNDED';
}

@Injectable()
export class PointsService {
  constructor(private readonly prismaService: PrismaService) {}

  async reserve(input: ReservePointsInput): Promise<PointsReservationResult> {
    this.validateAmount(input.amount);

    const existing = await this.prismaService.pointsReservation.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existing) {
      this.assertMatchingReservation(existing, input);

      return this.toReservationResult(existing, await this.getBalance(input.userId));
    }

    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: input.userId },
        });

        if (!user) {
          throw new NotFoundException({
            code: 'USER_NOT_FOUND',
            message: '用户不存在',
          });
        }

        if (user.status !== 'ACTIVE') {
          throw new ConflictException({
            code: 'USER_SUSPENDED',
            message: '当前账号已停用',
          });
        }

        const updated = await transaction.user.updateMany({
          data: {
            pointsBalance: {
              decrement: input.amount,
            },
          },
          where: {
            id: input.userId,
            pointsBalance: {
              gte: input.amount,
            },
          },
        });

        if (updated.count !== 1) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_POINTS',
            message: '积分不足，请先充值或减少任务消耗',
          });
        }

        const updatedUser = await transaction.user.findUniqueOrThrow({
          select: { pointsBalance: true },
          where: { id: input.userId },
        });
        const balanceAfter = updatedUser.pointsBalance;
        const reservation = await transaction.pointsReservation.create({
          data: {
            amount: input.amount,
            expiresAt: input.expiresAt ?? new Date(Date.now() + DEFAULT_RESERVATION_TTL_MS),
            idempotencyKey: input.idempotencyKey,
            referenceId: input.referenceId,
            referenceType: input.referenceType,
            userId: input.userId,
          },
        });

        await transaction.pointsLedgerEntry.create({
          data: {
            balanceAfter,
            delta: -input.amount,
            idempotencyKey: `hold:${input.idempotencyKey}`,
            referenceId: reservation.id,
            referenceType: 'points_reservation',
            type: 'HOLD',
            userId: input.userId,
          },
        });

        return this.toReservationResult(reservation, balanceAfter);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const reservation = await this.prismaService.pointsReservation.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });

        if (reservation) {
          this.assertMatchingReservation(reservation, input);

          return this.toReservationResult(reservation, await this.getBalance(input.userId));
        }
      }

      throw error;
    }
  }

  async settle(reservationId: string): Promise<PointsReservationResult> {
    return this.finalizeReservation(reservationId, 'SETTLED');
  }

  async refund(reservationId: string): Promise<PointsReservationResult> {
    return this.finalizeReservation(reservationId, 'REFUNDED');
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.prismaService.user.findUnique({
      select: { pointsBalance: true },
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    return user.pointsBalance;
  }

  private async finalizeReservation(
    reservationId: string,
    targetStatus: 'SETTLED' | 'REFUNDED',
  ): Promise<PointsReservationResult> {
    return this.prismaService.$transaction(async (transaction) => {
      const reservation = await transaction.pointsReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException({
          code: 'POINTS_RESERVATION_NOT_FOUND',
          message: '积分冻结记录不存在',
        });
      }

      if (reservation.status === targetStatus) {
        const user = await transaction.user.findUniqueOrThrow({
          select: { pointsBalance: true },
          where: { id: reservation.userId },
        });

        return this.toReservationResult(reservation, user.pointsBalance);
      }

      if (reservation.status !== 'RESERVED') {
        throw new ConflictException({
          code: 'POINTS_RESERVATION_ALREADY_FINALIZED',
          message:
            targetStatus === 'SETTLED'
              ? '该积分冻结记录已退回，不能重复结算'
              : '该积分冻结记录已结算，不能重复退回',
        });
      }

      const completedAt = new Date();
      const updated = await transaction.pointsReservation.updateMany({
        data:
          targetStatus === 'SETTLED'
            ? {
                settledAt: completedAt,
                status: 'SETTLED',
              }
            : {
                refundedAt: completedAt,
                status: 'REFUNDED',
              },
        where: {
          id: reservationId,
          status: 'RESERVED',
        },
      });

      if (updated.count !== 1) {
        const current = await transaction.pointsReservation.findUniqueOrThrow({
          where: { id: reservationId },
        });

        if (current.status === targetStatus) {
          const user = await transaction.user.findUniqueOrThrow({
            select: { pointsBalance: true },
            where: { id: current.userId },
          });

          return this.toReservationResult(current, user.pointsBalance);
        }

        throw new ConflictException({
          code: 'POINTS_RESERVATION_CONFLICT',
          message: '积分冻结记录状态已发生变化，请刷新后重试',
        });
      }

      const balanceAfter =
        targetStatus === 'SETTLED'
          ? (
              await transaction.user.findUniqueOrThrow({
                select: { pointsBalance: true },
                where: { id: reservation.userId },
              })
            ).pointsBalance
          : await this.incrementBalance(transaction, reservation.userId, reservation.amount);

      await transaction.pointsLedgerEntry.create({
        data: {
          balanceAfter,
          delta: targetStatus === 'SETTLED' ? 0 : reservation.amount,
          idempotencyKey:
            targetStatus === 'SETTLED' ? `settle:${reservation.id}` : `refund:${reservation.id}`,
          referenceId: reservation.id,
          referenceType: 'points_reservation',
          type: targetStatus === 'SETTLED' ? 'SETTLE' : 'REFUND',
          userId: reservation.userId,
        },
      });

      const finalized = await transaction.pointsReservation.findUniqueOrThrow({
        where: { id: reservationId },
      });

      return this.toReservationResult(finalized, balanceAfter);
    });
  }

  private async incrementBalance(
    transaction: Prisma.TransactionClient,
    userId: string,
    amount: number,
  ): Promise<number> {
    const user = await transaction.user.update({
      data: {
        pointsBalance: {
          increment: amount,
        },
      },
      select: { pointsBalance: true },
      where: { id: userId },
    });

    return user.pointsBalance;
  }

  private validateAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new BadRequestException({
        code: 'INVALID_POINTS_AMOUNT',
        message: '积分数量必须是大于或等于 0 的整数',
      });
    }
  }

  private assertMatchingReservation(
    reservation: {
      amount: number;
      referenceId: string;
      referenceType: string;
      userId: string;
    },
    input: ReservePointsInput,
  ): void {
    if (
      reservation.userId !== input.userId ||
      reservation.amount !== input.amount ||
      reservation.referenceId !== input.referenceId ||
      reservation.referenceType !== input.referenceType
    ) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        message: '幂等键已被其他积分操作使用',
      });
    }
  }

  private toReservationResult(
    reservation: {
      amount: number;
      expiresAt: Date;
      id: string;
      status: 'RESERVED' | 'SETTLED' | 'REFUNDED';
    },
    balanceAfter: number,
  ): PointsReservationResult {
    return {
      amount: reservation.amount,
      balanceAfter,
      expiresAt: reservation.expiresAt,
      id: reservation.id,
      status: reservation.status,
    };
  }
}
