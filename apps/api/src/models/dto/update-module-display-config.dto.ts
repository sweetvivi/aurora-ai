import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const MODULE_DISPLAY_GROUPS = ['primary', 'creation-office'] as const;

export type ModuleDisplayGroup = (typeof MODULE_DISPLAY_GROUPS)[number];

export class UpdateModuleDisplayConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cover?: string | null;

  @IsOptional()
  @IsIn(MODULE_DISPLAY_GROUPS)
  group?: ModuleDisplayGroup;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  badge?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  route?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
