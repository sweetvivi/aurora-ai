import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdjustAdminUserPointsDto {
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  delta!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(240)
  reason!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey?: string;
}
