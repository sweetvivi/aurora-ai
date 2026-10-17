import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProviderConfigDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;

  @IsUrl({ protocols: ['http', 'https'], require_tld: false })
  @MaxLength(500)
  baseUrl!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(128)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  keyRef!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  priority = 100;

  @IsOptional()
  @IsBoolean()
  enabled = true;
}
