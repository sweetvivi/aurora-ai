import { IsIn, IsOptional } from 'class-validator';
import type { ModelCapability } from '../model-registry.service';

const modelCapabilities: ModelCapability[] = ['chat', 'image', 'video', 'embedding'];

export class ListModelsQueryDto {
  @IsOptional()
  @IsIn(modelCapabilities)
  capability?: ModelCapability;
}
