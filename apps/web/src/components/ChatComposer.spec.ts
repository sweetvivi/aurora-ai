import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatComposer from './ChatComposer.vue';

const { uploadImageFileMock } = vi.hoisted(() => ({
  uploadImageFileMock: vi.fn(),
}));

vi.mock('@/app/api', () => ({
  uploadImageFile: uploadImageFileMock,
}));

describe('ChatComposer attachments', () => {
  beforeEach(() => {
    uploadImageFileMock.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:attachment-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('updates the uploaded attachment through reactivity', async () => {
    uploadImageFileMock.mockResolvedValue({
      checksum: 'checksum',
      createdAt: '2026-10-18T00:00:00.000Z',
      id: 'file-uploaded',
      mimeType: 'image/png',
      originalName: 'preview.png',
      size: 67,
    });
    const wrapper = mount(ChatComposer, {
      props: {
        canSend: true,
        modelValue: '',
        streaming: false,
      },
    });
    const file = new File(['image'], 'preview.png', { type: 'image/png' });
    const fileInput = wrapper.get<HTMLInputElement>('input[type="file"]');

    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [file],
    });
    await fileInput.trigger('change');
    await flushPromises();

    expect(uploadImageFileMock).toHaveBeenCalledWith(file);
    expect(wrapper.get('.chat-composer__attachment').text()).toContain('已就绪');
    expect(wrapper.vm.getReadyAttachments()).toEqual([
      expect.objectContaining({
        fileId: 'file-uploaded',
        previewUrl: 'blob:attachment-preview',
      }),
    ]);
  });
});
