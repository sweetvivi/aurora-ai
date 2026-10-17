import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListModelConfigsQueryDto {
  @IsOptional()
  @IsIn(['chat', 'image', 'video', 'embedding'])
  capability?: 'chat' | 'embedding' | 'image' | 'video';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') {
      return true;
    }

    if (value === false || value === 'false' || value === '0') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  enabled?: boolean;
}
