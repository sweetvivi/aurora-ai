import { IsIn, IsOptional } from 'class-validator';
import type { ModelCapability } from '../model-registry.service';

const modelCapabilities: ModelCapability[] = ['chat', 'embedding', 'image', 'video', 'vision'];

export class ListModelsQueryDto {
  @IsOptional()
  @IsIn(modelCapabilities)
  capability?: ModelCapability;
}
