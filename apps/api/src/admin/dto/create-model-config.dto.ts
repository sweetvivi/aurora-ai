import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const capabilities = ['chat', 'image', 'video', 'embedding'] as const;

export class CreateModelConfigDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9][a-z0-9._-]*$/)
  alias!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/)
  providerCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  providerModel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(capabilities, { each: true })
  capabilities!: Array<(typeof capabilities)[number]>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  contextWindow?: number;

  @IsOptional()
  @IsBoolean()
  enabled = true;
}
