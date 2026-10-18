import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  cancelVideoTask: vi.fn(),
  createVideoTask: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchFileBlob: vi.fn(),
  getVideoTask: vi.fn(),
  hasStoredTokens: vi.fn(),
  listVideoTasks: vi.fn(),
  uploadImageFile: vi.fn(),
  uploadVideoFile: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

import type { VideoTask } from '@/app/api';
import { useSessionStore } from './session';
import { VIDEO_MODEL_ALIAS, useVideoWorkspaceStore } from './video-workspace';

const authenticatedUser = {
  displayName: '视频测试用户',
  email: 'video@example.com',
  id: 'user-video',
  pointsBalance: 90,
  role: 'USER' as const,
  status: 'ACTIVE' as const,
};

describe('video workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.clearAllMocks();

    apiMocks.hasStoredTokens.mockReturnValue(true);
    apiMocks.fetchCurrentUser.mockResolvedValue(authenticatedUser);
    apiMocks.listVideoTasks.mockResolvedValue([]);
    apiMocks.fetchFileBlob.mockResolvedValue(new Blob(['video'], { type: 'video/mp4' }));
  });

  it('sends generate_audio only when audio generation is enabled', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    apiMocks.createVideoTask.mockResolvedValue(
      makeTask({
        id: 'task-audio',
        status: 'SUCCEEDED',
      }),
    );
    const store = useVideoWorkspaceStore();

    await store.createGeneration({
      duration: 8,
      generateAudio: true,
      mode: 'text-to-video',
      model: 'doubao-seedance-1-0-pro',
      modelAlias: 'doubao-seedance-1-0-pro',
      modelLabel: 'Seedance 1.0 Pro',
      prompt: '清晨海面上升起薄雾',
      ratio: '16:9',
      resolution: '1080P',
    });

    expect(apiMocks.createVideoTask).toHaveBeenCalledWith(
      {
        lastFrameFileId: undefined,
        modelAlias: 'doubao-seedance-1-0-pro',
        parameters: {
          duration: 8,
          generate_audio: true,
          mode: 'text-to-video',
          ratio: '16:9',
          resolution: '1080P',
          uiModel: 'doubao-seedance-1-0-pro',
          uiModelLabel: 'Seedance 1.0 Pro',
        },
        prompt: '清晨海面上升起薄雾',
        sourceFileId: undefined,
      },
      expect.stringMatching(/^video-generation-/),
    );
    expect(store.works[0]?.generateAudio).toBe(true);
  });

  it('omits generate_audio when audio generation is disabled', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    apiMocks.createVideoTask.mockResolvedValue(
      makeTask({
        id: 'task-silent',
        status: 'SUCCEEDED',
      }),
    );
    const store = useVideoWorkspaceStore();

    await store.createGeneration({
      duration: 5,
      generateAudio: false,
      mode: 'text-to-video',
      model: 'xai-grok-imagine-video',
      modelAlias: VIDEO_MODEL_ALIAS,
      modelLabel: 'Grok Imagine Video',
      prompt: '雨夜霓虹街区',
      ratio: '16:9',
      resolution: '720P',
    });

    const request = apiMocks.createVideoTask.mock.calls[0]?.[0] as {
      parameters: Record<string, unknown>;
    };

    expect(request.parameters).not.toHaveProperty('generate_audio');
    expect(store.works[0]?.generateAudio).toBe(false);
  });

  it('restores audio settings from task parameters and preserves them on retry', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    apiMocks.createVideoTask.mockResolvedValue(
      makeTask({
        id: 'task-retried',
        status: 'SUCCEEDED',
      }),
    );
    const store = useVideoWorkspaceStore();

    store.mergeTask(
      makeTask({
        id: 'task-failed',
        modelAlias: 'doubao-seedance-1-0-pro',
        parameters: {
          duration: 12,
          generate_audio: true,
          mode: 'first-last-frame',
          ratio: '9:16',
          resolution: '1080P',
          uiModel: 'doubao-seedance-1-0-pro',
          uiModelLabel: 'Seedance 1.0 Pro',
        },
        status: 'FAILED',
      }),
    );

    expect(store.works[0]?.generateAudio).toBe(true);

    await store.retryWork('task-failed');

    expect(apiMocks.createVideoTask).toHaveBeenCalledWith(
      expect.objectContaining({
        modelAlias: 'doubao-seedance-1-0-pro',
        parameters: expect.objectContaining({
          generate_audio: true,
          mode: 'first-last-frame',
        }),
      }),
      expect.stringMatching(/^video-generation-/),
    );
    expect(store.works.map((work) => work.id)).toContain('task-retried');
  });

  it('keeps an enabled audio setting when a later task payload omits the flag', () => {
    const store = useVideoWorkspaceStore();

    store.mergeTask(
      makeTask({
        id: 'task-audio-existing',
        parameters: {
          duration: 8,
          generate_audio: true,
          mode: 'text-to-video',
          ratio: '16:9',
          resolution: '1080P',
        },
        status: 'RUNNING',
      }),
    );
    store.mergeTask(
      makeTask({
        id: 'task-audio-existing',
        parameters: {
          duration: 8,
          mode: 'text-to-video',
          ratio: '16:9',
          resolution: '1080P',
        },
        status: 'SUCCEEDED',
      }),
    );

    expect(store.works[0]?.generateAudio).toBe(true);
    expect(store.works[0]?.status).toBe('done');
  });

  it('uploads a reference video and submits it without image frame fields', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    const referenceFile = {
      checksum: 'video-checksum',
      createdAt: new Date().toISOString(),
      id: 'file-reference-video',
      mimeType: 'video/mp4',
      originalName: 'reference.mp4',
      size: 4_096,
    };
    apiMocks.uploadVideoFile.mockResolvedValue(referenceFile);
    apiMocks.createVideoTask.mockResolvedValue(
      makeTask({
        id: 'task-reference-video',
        modelAlias: 'doubao-seedance-2-0',
        parameters: {
          duration: 5,
          mode: 'reference-video',
          ratio: '16:9',
          resolution: '720P',
          uiModel: 'doubao-seedance-2-0',
          uiModelLabel: 'Seedance 2.0',
        },
        referenceVideoFile: referenceFile,
        status: 'SUCCEEDED',
      }),
    );
    const store = useVideoWorkspaceStore();
    const file = new File(['test-video'], 'reference.mp4', { type: 'video/mp4' });

    await expect(store.uploadReferenceVideo(file)).resolves.toEqual(referenceFile);
    await store.createGeneration({
      duration: 5,
      generateAudio: false,
      mode: 'reference-video',
      model: 'doubao-seedance-2-0',
      modelAlias: 'doubao-seedance-2-0',
      modelLabel: 'Seedance 2.0',
      prompt: '保持参考视频的动作',
      ratio: '16:9',
      referenceVideoFileId: referenceFile.id,
      resolution: '720P',
    });

    expect(apiMocks.uploadVideoFile).toHaveBeenCalledWith(file);
    expect(apiMocks.createVideoTask).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFrameFileId: undefined,
        referenceVideoFileId: 'file-reference-video',
        sourceFileId: undefined,
      }),
      expect.stringMatching(/^video-generation-/),
    );
    expect(store.works[0]?.referenceVideoFileId).toBe('file-reference-video');
  });

  it('preserves reference video fields when retrying a failed task', async () => {
    const sessionStore = useSessionStore();
    sessionStore.$patch({
      status: 'authenticated',
      user: authenticatedUser,
    });
    apiMocks.createVideoTask.mockResolvedValue(
      makeTask({
        id: 'task-reference-retried',
        referenceVideoFile: {
          checksum: 'retry-checksum',
          createdAt: new Date().toISOString(),
          id: 'file-reference-retry',
          mimeType: 'video/mp4',
          originalName: 'retry.mp4',
          size: 2_048,
        },
        status: 'SUCCEEDED',
      }),
    );
    const store = useVideoWorkspaceStore();

    store.mergeTask(
      makeTask({
        id: 'task-reference-failed',
        modelAlias: 'doubao-seedance-2-0',
        parameters: {
          duration: 5,
          mode: 'reference-video',
          ratio: '16:9',
          resolution: '720P',
          uiModel: 'doubao-seedance-2-0',
          uiModelLabel: 'Seedance 2.0',
        },
        referenceVideoFile: {
          checksum: 'retry-checksum',
          createdAt: new Date().toISOString(),
          id: 'file-reference-retry',
          mimeType: 'video/mp4',
          originalName: 'retry.mp4',
          size: 2_048,
        },
        status: 'FAILED',
      }),
    );

    await store.retryWork('task-reference-failed');

    expect(apiMocks.createVideoTask).toHaveBeenCalledWith(
      expect.objectContaining({
        modelAlias: 'doubao-seedance-2-0',
        referenceVideoFileId: 'file-reference-retry',
        sourceFileId: undefined,
      }),
      expect.stringMatching(/^video-generation-/),
    );
  });
});

function makeTask(overrides: Partial<VideoTask> = {}): VideoTask {
  return {
    completedAt: null,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    errorCode: null,
    errorMessage: null,
    id: 'task-default',
    lastFrameFile: null,
    modelAlias: VIDEO_MODEL_ALIAS,
    parameters: {
      duration: 5,
      mode: 'text-to-video',
      ratio: '16:9',
      resolution: '720P',
      uiModel: 'xai-grok-imagine-video',
      uiModelLabel: 'Grok Imagine Video',
    },
    progress: 0,
    prompt: '测试视频',
    referenceVideoFile: null,
    resultFile: null,
    sourceFile: null,
    startedAt: null,
    status: 'QUEUED',
    ...overrides,
  };
}
