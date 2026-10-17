export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');

export interface SaveFileInput {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  originalName: string;
  userId: string;
}

export interface StoredFile {
  checksum: string;
  size: number;
  storageKey: string;
}

export interface StorageAdapter {
  delete(storageKey: string): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
  save(input: SaveFileInput): Promise<StoredFile>;
}
