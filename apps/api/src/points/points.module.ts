import { Module } from '@nestjs/common';
import { PointsService } from './points.service';

@Module({
  exports: [PointsService],
  providers: [PointsService],
})
export class PointsModule {}
