import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { FilesService } from './files.service';
import type { UploadedImageFile } from './image-file.validator';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@CurrentUser('id') userId: string, @UploadedFile() file: UploadedImageFile | undefined) {
    return this.filesService.upload(userId, file);
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  uploadVideo(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: UploadedImageFile | undefined,
  ) {
    return this.filesService.uploadVideo(userId, file);
  }

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: ListFilesQueryDto) {
    return this.filesService.list(userId, query.limit);
  }

  @Get(':fileId')
  getMetadata(@CurrentUser('id') userId: string, @Param('fileId') fileId: string) {
    return this.filesService.getMetadata(userId, fileId);
  }

  @Get(':fileId/content')
  async getContent(
    @CurrentUser('id') userId: string,
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { asset, buffer } = await this.filesService.readContent(userId, fileId);
    const encodedName = encodeURIComponent(asset.originalName);

    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', buffer.length);
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedName}`);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.send(buffer);
  }
}
