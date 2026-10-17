import {
  IsIn,
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

const providerProtocols = ['openai-compatible', 'doubao', 'xai'] as const;

export class ProbeProviderDto {
  @IsUrl({ protocols: ['http', 'https'], require_tld: false })
  @MaxLength(500)
  baseUrl!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  keyRef?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  apiKey?: string;

  @IsOptional()
  @IsIn(providerProtocols)
  protocol: (typeof providerProtocols)[number] = 'openai-compatible';

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  providerCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1_000)
  @Max(30_000)
  timeoutMs?: number;
}
