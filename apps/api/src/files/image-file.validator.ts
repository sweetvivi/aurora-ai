import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp']);

export function validateImageUpload(
  file: UploadedImageFile | undefined,
  options: { maxBytes?: number } = {},
): void {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new BadRequestException({
      code: 'FILE_REQUIRED',
      message: '请选择要上传的图片文件',
    });
  }

  if (options.maxBytes && file.buffer.length > options.maxBytes) {
    throw new BadRequestException({
      code: 'FILE_TOO_LARGE',
      message: '文件超过允许的大小限制',
    });
  }

  const mimeType = normalizeMimeType(file.mimetype);

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException({
      code: 'FILE_TYPE_NOT_ALLOWED',
      message: '仅支持 JPEG、PNG、WebP 和 GIF 图片',
    });
  }

  if (detectImageMimeType(file.buffer) !== mimeType) {
    throw new BadRequestException({
      code: 'FILE_CONTENT_MISMATCH',
      message: '文件内容与声明的图片格式不一致',
    });
  }
}

export function normalizeMimeType(mimeType: string): string {
  return mimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimeType.toLowerCase();
}

export function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function detectImageMimeType(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  const gifHeader = buffer.subarray(0, 6).toString('ascii');

  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return 'image/gif';
  }

  return null;
}
