import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import type { GeneratedImage, GenerateImageInput, ImageProvider } from '../image-provider';

@Injectable()
export class MockImageProvider implements ImageProvider {
  private readonly delayMs: number;
  private readonly imageSize: number;

  constructor(configService: ConfigService) {
    this.delayMs = configService.get<number>('IMAGE_MOCK_DELAY_MS', 0);
    this.imageSize = configService.get<number>('IMAGE_MOCK_IMAGE_SIZE', 512);
  }

  async generateImage(input: GenerateImageInput): Promise<GeneratedImage> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    return {
      buffer: createMockPng(input.prompt, this.imageSize),
      extension: 'png',
      mimeType: 'image/png',
    };
  }
}

function createMockPng(prompt: string, size: number): Buffer {
  const normalizedSize = Math.max(64, Math.min(1_024, Math.floor(size)));
  const seed = createHash('sha256').update(prompt).digest();
  const baseRed = seed[0] ?? 52;
  const baseGreen = seed[1] ?? 96;
  const baseBlue = seed[2] ?? 148;
  const accentRed = seed[3] ?? 214;
  const accentGreen = seed[4] ?? 118;
  const accentBlue = seed[5] ?? 70;
  const rowLength = normalizedSize * 3 + 1;
  const pixels = Buffer.alloc(rowLength * normalizedSize);

  for (let y = 0; y < normalizedSize; y += 1) {
    const rowOffset = y * rowLength;
    pixels[rowOffset] = 0;

    for (let x = 0; x < normalizedSize; x += 1) {
      const offset = rowOffset + 1 + x * 3;
      const horizontalBand = Math.floor((x + (seed[6] ?? 0)) / 48) % 2;
      const verticalBand = Math.floor((y + (seed[7] ?? 0)) / 48) % 2;
      const useAccent = horizontalBand === verticalBand;

      pixels[offset] = useAccent ? accentRed : baseRed;
      pixels[offset + 1] = useAccent ? accentGreen : baseGreen;
      pixels[offset + 2] = useAccent ? accentBlue : baseBlue;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(normalizedSize, 0);
  header.writeUInt32BE(normalizedSize, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    createPngChunk('IHDR', header),
    createPngChunk('IDAT', deflateSync(pixels)),
    createPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(calculateCrc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function calculateCrc32(buffer: Buffer): number {
  let checksum = 0xffffffff;

  for (const byte of buffer) {
    checksum = (crc32Table[(checksum ^ byte) & 0xff] ?? 0) ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
