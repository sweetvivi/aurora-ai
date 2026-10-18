import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FileAsset } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { STORAGE_ADAPTER, type StorageAdapter } from '../storage/storage.types';
import {
  normalizeMimeType,
  type UploadedImageFile,
  validateImageUpload,
  validateVideoUpload,
} from './image-file.validator';

export const DEFAULT_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: StorageAdapter,
    private readonly prismaService: PrismaService,
  ) {}

  async upload(userId: string, file: UploadedImageFile | undefined) {
    validateImageUpload(file, {
      maxBytes: this.configService.get<number>('FILE_MAX_SIZE_BYTES', DEFAULT_IMAGE_MAX_SIZE_BYTES),
    });

    return this.persistUpload(userId, file as UploadedImageFile);
  }

  async uploadVideo(userId: string, file: UploadedImageFile | undefined) {
    validateVideoUpload(file, {
      maxBytes: this.configService.get<number>(
        'VIDEO_FILE_MAX_SIZE_BYTES',
        DEFAULT_VIDEO_MAX_SIZE_BYTES,
      ),
    });

    return this.persistUpload(userId, file as UploadedImageFile);
  }

  private async persistUpload(userId: string, uploadedFile: UploadedImageFile) {
    const mimeType = normalizeMimeType(uploadedFile.mimetype);
    const stored = await this.storageAdapter.save({
      buffer: uploadedFile.buffer,
      extension: extensionFromMimeType(mimeType),
      mimeType,
      originalName: sanitizeOriginalName(uploadedFile.originalname),
      userId,
    });

    try {
      const asset = await this.prismaService.fileAsset.create({
        data: {
          checksum: stored.checksum,
          mimeType,
          originalName: sanitizeOriginalName(uploadedFile.originalname),
          size: stored.size,
          storageKey: stored.storageKey,
          userId,
        },
      });

      return this.toFileDto(asset);
    } catch (error) {
      await this.storageAdapter.delete(stored.storageKey);
      throw error;
    }
  }

  async list(userId: string, limit: number) {
    const assets = await this.prismaService.fileAsset.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      where: {
        status: 'READY',
        userId,
      },
    });

    return { items: assets.map((asset) => this.toFileDto(asset)) };
  }

  async getOwnedAsset(userId: string, fileId: string): Promise<FileAsset> {
    const asset = await this.prismaService.fileAsset.findFirst({
      where: {
        id: fileId,
        status: 'READY',
        userId,
      },
    });

    if (!asset) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: '文件不存在或无权访问',
      });
    }

    return asset;
  }

  async getOwnedAssets(userId: string, fileIds: string[]): Promise<FileAsset[]> {
    const uniqueFileIds = [...new Set(fileIds)];

    if (uniqueFileIds.length === 0) {
      return [];
    }

    const assets = await this.prismaService.fileAsset.findMany({
      where: {
        id: { in: uniqueFileIds },
        status: 'READY',
        userId,
      },
    });
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    const orderedAssets = uniqueFileIds.map((fileId) => assetsById.get(fileId));

    if (orderedAssets.some((asset) => !asset)) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: '附件不存在、尚未就绪或无权访问',
      });
    }

    return orderedAssets as FileAsset[];
  }

  async getMetadata(userId: string, fileId: string) {
    return this.toFileDto(await this.getOwnedAsset(userId, fileId));
  }

  async readContent(userId: string, fileId: string) {
    const asset = await this.getOwnedAsset(userId, fileId);

    return {
      asset,
      buffer: await this.storageAdapter.read(asset.storageKey),
    };
  }

  async readAssetContent(asset: FileAsset): Promise<Buffer> {
    return this.storageAdapter.read(asset.storageKey);
  }

  private toFileDto(asset: FileAsset) {
    return {
      checksum: asset.checksum,
      createdAt: asset.createdAt,
      id: asset.id,
      mimeType: asset.mimeType,
      originalName: asset.originalName,
      size: asset.size,
    };
  }
}

function extensionFromMimeType(mimeType: string): string {
  const extensionByMimeType: Record<string, string> = {
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'image/webp': 'webp',
  };

  return extensionByMimeType[mimeType] ?? 'bin';
}

function sanitizeOriginalName(value: string): string {
  const normalized = Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;

      return codePoint >= 32 && codePoint !== 127;
    })
    .join('')
    .trim();

  return normalized.slice(0, 255) || 'image';
}
