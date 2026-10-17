import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveCanvasWorkflowDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'id 只能包含字母、数字、下划线和连字符',
  })
  id?: string;

  @IsObject()
  document!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000)
  version?: number;
}
