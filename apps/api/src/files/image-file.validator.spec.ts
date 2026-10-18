import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { validateVideoUpload, type UploadedImageFile } from './image-file.validator';

const MP4_BUFFER = Buffer.from('0000ftypisom');
const WEBM_BUFFER = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBM')]);

describe('video upload validation', () => {
  it('accepts MP4, MOV, and WebM signatures', () => {
    expect(() =>
      validateVideoUpload(createFile(MP4_BUFFER, 'video/mp4', 'clip.mp4')),
    ).not.toThrow();
    expect(() =>
      validateVideoUpload(createFile(MP4_BUFFER, 'video/quicktime', 'clip.mov')),
    ).not.toThrow();
    expect(() =>
      validateVideoUpload(createFile(WEBM_BUFFER, 'video/webm', 'clip.webm')),
    ).not.toThrow();
  });

  it('rejects missing, empty, oversized, and unsupported files', () => {
    expectValidationError(() => validateVideoUpload(undefined), 'FILE_REQUIRED');
    expectValidationError(
      () => validateVideoUpload(createFile(Buffer.alloc(0), 'video/mp4', 'empty.mp4')),
      'FILE_REQUIRED',
    );
    expectValidationError(
      () =>
        validateVideoUpload(createFile(MP4_BUFFER, 'video/mp4', 'large.mp4'), {
          maxBytes: MP4_BUFFER.length - 1,
        }),
      'FILE_TOO_LARGE',
    );
    expectValidationError(
      () => validateVideoUpload(createFile(MP4_BUFFER, 'application/octet-stream', 'clip.bin')),
      'FILE_TYPE_NOT_ALLOWED',
    );
  });

  it('rejects a spoofed MIME type when the signature does not match', () => {
    expectValidationError(
      () => validateVideoUpload(createFile(MP4_BUFFER, 'video/webm', 'spoofed.webm')),
      'FILE_CONTENT_MISMATCH',
    );
    expectValidationError(
      () => validateVideoUpload(createFile(WEBM_BUFFER, 'video/mp4', 'spoofed.mp4')),
      'FILE_CONTENT_MISMATCH',
    );
  });
});

function createFile(buffer: Buffer, mimetype: string, originalname: string): UploadedImageFile {
  return {
    buffer,
    mimetype,
    originalname,
    size: buffer.length,
  };
}

function expectValidationError(run: () => void, code: string): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected validation error ${code}`);
}
