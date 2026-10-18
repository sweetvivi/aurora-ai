import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import type { SaveFileInput, StorageAdapter, StoredFile } from './storage.types';

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

@Injectable()
export class LocalStorageAdapter implements StorageAdapter, OnModuleInit {
  private readonly root: string;

  constructor(configService: ConfigService) {
    this.root = resolve(process.cwd(), configService.get<string>('STORAGE_ROOT', '../../storage'));
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.root, { recursive: true });
  }

  async save(input: SaveFileInput): Promise<StoredFile> {
    const extension = this.normalizeExtension(input);
    const storageKey = [
      'users',
      this.safePathSegment(input.userId),
      String(new Date().getUTCFullYear()),
      String(new Date().getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}.${extension}`,
    ].join('/');
    const targetPath = this.resolveStoragePath(storageKey);
    const temporaryPath = `${targetPath}.tmp`;

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(temporaryPath, input.buffer, { flag: 'wx' });
    await rename(temporaryPath, targetPath);

    return {
      checksum: createHash('sha256').update(input.buffer).digest('hex'),
      size: input.buffer.length,
      storageKey,
    };
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveStoragePath(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveStoragePath(storageKey));
    } catch (error) {
      if (!this.isMissingFileError(error)) {
        throw error;
      }
    }
  }

  private normalizeExtension(input: SaveFileInput): string {
    const mimeExtension = EXTENSION_BY_MIME_TYPE[input.mimeType];

    if (mimeExtension) {
      return mimeExtension;
    }

    const extension = input.extension.trim().toLowerCase().replace(/^\./, '');

    if (!/^[a-z0-9]{1,10}$/.test(extension)) {
      return 'bin';
    }

    return extension;
  }

  private safePathSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private resolveStoragePath(storageKey: string): string {
    const normalizedKey = normalize(storageKey).replaceAll('\\', '/');

    if (
      isAbsolute(storageKey) ||
      normalizedKey.startsWith('../') ||
      normalizedKey === '..' ||
      normalizedKey.includes('/../')
    ) {
      throw new Error('Invalid storage key');
    }

    const targetPath = resolve(this.root, ...normalizedKey.split('/'));

    if (targetPath !== this.root && !targetPath.startsWith(`${this.root}${sep}`)) {
      throw new Error('Invalid storage key');
    }

    return join(targetPath);
  }

  private isMissingFileError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT'
    );
  }
}
