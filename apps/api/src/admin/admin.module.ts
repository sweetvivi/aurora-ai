import { Module } from '@nestjs/common';
import { ModelsModule } from '../models/models.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { ProviderProbeService } from './provider-probe.service';

@Module({
  imports: [ModelsModule],
  controllers: [AdminController],
  providers: [AdminGuard, AdminService, ProviderProbeService],
})
export class AdminModule {}
