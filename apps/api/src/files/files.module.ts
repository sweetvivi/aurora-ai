import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import {
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  DEFAULT_VIDEO_MAX_SIZE_BYTES,
  FilesService,
} from './files.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        limits: {
          fileSize: Math.max(
            configService.get<number>('FILE_MAX_SIZE_BYTES', DEFAULT_IMAGE_MAX_SIZE_BYTES),
            configService.get<number>('VIDEO_FILE_MAX_SIZE_BYTES', DEFAULT_VIDEO_MAX_SIZE_BYTES),
          ),
          files: 1,
        },
      }),
    }),
  ],
  controllers: [FilesController],
  exports: [FilesService],
  providers: [FilesService],
})
export class FilesModule {}
