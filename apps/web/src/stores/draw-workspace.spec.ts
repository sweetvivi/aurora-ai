import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  createImageTask: vi.fn(),
  devLogin: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchFileBlob: vi.fn(),
  getImageTask: vi.fn(),
  hasStoredTokens: vi.fn(),
  listImageTasks: vi.fn(),
  uploadImageFile: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import type { ImageTask } from '@/app/api';
import { IMAGE_MODEL_ALIAS, useDrawWorkspaceStore } from './draw-workspace';
import { useSessionStore } from './session';

const authenticatedUser = {
  displayName: '绘图测试用户',
  email: 'draw@example.com',
  id: 'user-draw',
  pointsBalance: 100,
  role: 'USER' as const,
  status: 'ACTIVE' as const,
};

const resultFile = {
  checksum: 'checksum-result',
  createdAt: '2026-10-17T02:00:02.000Z',
  id: 'file-result',
  mimeType: 'image/png',
  originalName: 'result.png',
  size: 128,
};

describe('draw workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.clearAllMocks();

    apiMocks.hasStoredTokens.mockReturnValue(true);
    apiMocks.fetchCurrentUser.mockResolvedValue(authenticatedUser);
    apiMocks.listImageTasks.mockResolvedValue([]);
    apiMocks.fetchFileBlob.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    apiMocks.uploadImageFile.mockResolvedValue({
      ...resultFile,
      checksum: 'checksum-source',
      id: 'file-source',
      originalName: 'source.png',
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:draw-result'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps QUEUED, RUNNING and FAILED tasks into display states', () => {
    const store = useDrawWorkspaceStore();

    store.mergeTasks([
      makeTask({ id: 'task-queued', status: 'QUEUED' }),
      makeTask({ id: 'task-running', status: 'RUNNING' }),
      makeTask({
        errorCode: 'IMAGE_PROVIDER_UNAVAILABLE',
        errorMessage: '图片生成失败，本次积分已退回',
        id: 'task-failed',
        status: 'FAILED',
      }),
    ]);

    expect(store.works.map((work) => work.status)).toEqual(['failed', 'generating', 'queued']);
    expect(store.works.find((work) => work.id === 'task-failed')).toMatchObject({
      errorMessage: '图片生成失败，本次积分已退回',
      status: 'failed',
    });
  });

  it('creates one idempotent backend task per requested image', async () => {
    vi.useFakeTimers();

    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    apiMocks.fetchCurrentUser.mockResolvedValue({
      ...authenticatedUser,
      pointsBalance: 90,
    });
    apiMocks.createImageTask
      .mockResolvedValueOnce(
        makeTask({
          id: 'task-1',
          sourceFile: {
            ...resultFile,
            id: 'file-source',
            originalName: 'source.png',
          },
        }),
      )
      .mockResolvedValueOnce(
        makeTask({
          id: 'task-2',
          sourceFile: {
            ...resultFile,
            id: 'file-source',
            originalName: 'source.png',
          },
        }),
      );
    const store = useDrawWorkspaceStore();

    const works = await store.createGenerationWorks({
      amount: 2,
      model: 'light-2',
      modelLabel: '极光光影 2.1',
      prompt: '  湖畔玻璃茶室  ',
      ratio: '16:9',
      referenceFileIds: ['file-reference'],
      size: '2K',
      sourceFileId: 'file-source',
    });

    expect(works).toHaveLength(2);
    expect(apiMocks.createImageTask).toHaveBeenCalledTimes(2);

    const firstCall = apiMocks.createImageTask.mock.calls[0] as unknown as [
      Record<string, unknown>,
      string,
    ];
    const secondCall = apiMocks.createImageTask.mock.calls[1] as unknown as [
      Record<string, unknown>,
      string,
    ];

    expect(firstCall[0]).toMatchObject({
      modelAlias: IMAGE_MODEL_ALIAS,
      parameters: {
        ratio: '16:9',
        size: '2K',
        tool: 'draw',
        uiModel: 'light-2',
        uiModelLabel: '极光光影 2.1',
      },
      prompt: '湖畔玻璃茶室',
      referenceFileIds: ['file-reference'],
      sourceFileId: 'file-source',
    });
    expect(firstCall[1]).toMatch(/^generation-.+:1$/);
    expect(secondCall[1]).toMatch(/^generation-.+:2$/);
    expect(firstCall[1].replace(/:1$/, '')).toBe(secondCall[1].replace(/:2$/, ''));
    expect(sessionStore.points).toBe(90);

    vi.clearAllTimers();
  });

  it('keeps tool-specific parameters separate for retouch and image generation tasks', () => {
    const store = useDrawWorkspaceStore();

    store.mergeTasks([
      makeTask({
        id: 'task-retouch',
        parameters: {
          mode: 'image-to-image',
          operation: 'cutout',
          ratio: '保持原图',
          size: '2K',
          strength: 65,
          tool: 'smart-retouch',
          uiModel: 'smart-retouch',
          uiModelLabel: '一键抠图',
        },
      }),
      makeTask({
        id: 'task-generation',
        parameters: {
          mode: 'text-to-image',
          ratio: '16:9',
          size: '2K',
          tool: 'image-generation',
          uiModel: 'generation-light-2',
          uiModelLabel: '极光光影 2.1',
        },
      }),
    ]);

    expect(store.works.filter((work) => work.tool === 'smart-retouch')).toHaveLength(1);
    expect(store.works.filter((work) => work.tool === 'image-generation')).toHaveLength(1);
    expect(store.works.find((work) => work.id === 'task-retouch')).toMatchObject({
      parameters: {
        mode: 'image-to-image',
        operation: 'cutout',
        strength: 65,
      },
      tool: 'smart-retouch',
    });
    expect(store.works.find((work) => work.id === 'task-generation')).toMatchObject({
      parameters: {
        mode: 'text-to-image',
      },
      tool: 'image-generation',
    });
  });

  it('loads a successful result and refreshes the settled balance', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    apiMocks.fetchCurrentUser.mockResolvedValue({
      ...authenticatedUser,
      pointsBalance: 95,
    });
    apiMocks.createImageTask.mockResolvedValue(
      makeTask({
        id: 'task-success',
        resultFile,
        status: 'SUCCEEDED',
      }),
    );
    const store = useDrawWorkspaceStore();

    await store.createGenerationWorks({
      amount: 1,
      model: 'canvas-3',
      modelLabel: '香蕉绘影 3.1',
      prompt: '春日湖畔',
      ratio: '1:1',
      size: '1K',
    });

    await vi.waitFor(() => {
      expect(store.works[0]?.artworkUrl).toBe('blob:draw-result');
    });

    expect(store.works[0]).toMatchObject({
      resultFileId: 'file-result',
      status: 'done',
    });
    expect(apiMocks.fetchFileBlob).toHaveBeenCalledWith('file-result');
    expect(sessionStore.points).toBe(95);
  });

  it('keeps a failed task visible and syncs the refunded balance', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    apiMocks.fetchCurrentUser.mockResolvedValue({
      ...authenticatedUser,
      pointsBalance: 100,
    });
    apiMocks.createImageTask.mockResolvedValue(
      makeTask({
        errorCode: 'IMAGE_PROVIDER_UNAVAILABLE',
        errorMessage: '图片生成失败，本次积分已退回',
        id: 'task-failed',
        status: 'FAILED',
      }),
    );
    const store = useDrawWorkspaceStore();

    await store.createGenerationWorks({
      amount: 1,
      model: 'canvas-3',
      modelLabel: '香蕉绘影 3.1',
      prompt: '失败任务',
      ratio: '1:1',
      size: '1K',
    });

    expect(store.works[0]).toMatchObject({
      errorMessage: '图片生成失败，本次积分已退回',
      status: 'failed',
    });
    expect(sessionStore.points).toBe(100);
  });

  it('polls an active task to SUCCEEDED and refreshes the balance', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: {
        ...authenticatedUser,
        pointsBalance: 95,
      },
    });
    apiMocks.getImageTask.mockResolvedValue(
      makeTask({
        id: 'task-polled',
        resultFile,
        status: 'SUCCEEDED',
      }),
    );
    const store = useDrawWorkspaceStore();

    store.mergeTask(makeTask({ id: 'task-polled', status: 'RUNNING' }));
    await store.pollActiveTasks();
    await vi.waitFor(() => {
      expect(store.works[0]?.artworkUrl).toBe('blob:draw-result');
    });

    expect(store.works[0]?.status).toBe('done');
    expect(sessionStore.points).toBe(100);
  });

  it('does not upload a reference file when authentication fails', async () => {
    apiMocks.hasStoredTokens.mockReturnValue(false);
    apiMocks.devLogin.mockRejectedValue(new Error('offline'));
    const store = useDrawWorkspaceStore();
    const file = new File(['source'], 'source.png', { type: 'image/png' });

    await expect(store.uploadReference(file)).rejects.toThrow();

    expect(apiMocks.uploadImageFile).not.toHaveBeenCalled();
    expect(store.error).toMatchObject({
      code: 'AUTH_REQUIRED',
      recoverable: true,
    });
  });
});

function makeTask(overrides: Partial<ImageTask> = {}): ImageTask {
  return {
    completedAt: null,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    errorCode: null,
    errorMessage: null,
    id: 'task-default',
    modelAlias: IMAGE_MODEL_ALIAS,
    parameters: {
      ratio: '1:1',
      size: '1K',
      uiModel: 'canvas-3',
      uiModelLabel: '香蕉绘影 3.1',
    },
    prompt: '测试图片',
    resultFile: null,
    sourceFile: null,
    startedAt: null,
    status: 'QUEUED',
    ...overrides,
  };
}
