import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { createSseParser } from './sse';

const ACCESS_TOKEN_KEY = 'aurora.auth.accessToken';
const REFRESH_TOKEN_KEY = 'aurora.auth.refreshToken';

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface HealthSnapshot {
  dependencies: {
    database: 'down' | 'not_connected' | 'up';
    redis: 'down' | 'not_connected' | 'up';
  };
  service: string;
  status: 'ok';
  timestamp: string;
}

export interface AdminOverview {
  models: {
    enabled: number;
    total: number;
  };
  orders: {
    enabled: false;
    status: 'not_enabled';
  };
  points: {
    balanceTotal: number;
  };
  providers: {
    enabled: number;
    total: number;
  };
  tasks: {
    chatRequests: number;
    imageTasks: number;
    videoTasks: number;
  };
  users: {
    active: number;
    admins: number;
    total: number;
  };
}

export interface AdminUser {
  createdAt: string;
  displayName: string;
  email: string | null;
  id: string;
  pointsBalance: number;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED';
  updatedAt: string;
}

export interface AdminUserList {
  items: AdminUser[];
  limit: number;
  offset: number;
  total: number;
}

export interface AdminProvider {
  _count: {
    models: number;
  };
  baseUrl: string;
  code: string;
  createdAt: string;
  displayName: string;
  enabled: boolean;
  id: string;
  keyRef: string;
  kind: 'OPENAI_COMPATIBLE';
  priority: number;
  updatedAt: string;
}

export interface AdminModel {
  alias: string;
  capabilities: Array<'CHAT' | 'EMBEDDING' | 'IMAGE' | 'VIDEO'>;
  contextWindow: number | null;
  createdAt: string;
  displayName: string;
  enabled: boolean;
  id: string;
  provider: {
    code: string;
    displayName: string;
    enabled: boolean;
    id: string;
  };
  providerModel: string;
  updatedAt: string;
}

export type ModuleDisplayGroup = 'creation-office' | 'primary';

export interface ModuleDisplayConfig {
  badge: string | null;
  cover: string | null;
  customized: boolean;
  group: ModuleDisplayGroup;
  icon: string;
  key: string;
  name: string;
  route: string;
  sortOrder: number;
  visible: boolean;
}

export interface AdminProviderProbeModel {
  capabilities: Array<'chat' | 'embedding' | 'image' | 'video'>;
  displayName: string;
  providerModel: string;
  suggestedAlias: string;
}

export interface AdminProviderProbeResult {
  checkedAt: string;
  latencyMs: number;
  modelCount: number;
  models: AdminProviderProbeModel[];
  protocol: 'doubao' | 'openai-compatible' | 'xai';
  truncated: boolean;
}

export interface AuthenticatedUser {
  displayName: string;
  email: string | null;
  id: string;
  pointsBalance: number;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: AuthenticatedUser;
}

export interface ChatModel {
  alias: string;
  capabilities: Array<'chat' | 'embedding' | 'image' | 'video'>;
  displayName: string;
}

export interface FileAsset {
  checksum: string;
  createdAt: string;
  id: string;
  mimeType: string;
  originalName: string;
  size: number;
}

export type ImageTaskStatus = 'CANCELLED' | 'FAILED' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED';

export interface ImageTask {
  completedAt: string | null;
  createdAt: string;
  errorCode: string | null;
  errorMessage: string | null;
  id: string;
  modelAlias: string;
  parameters: Record<string, unknown> | null;
  prompt: string;
  resultFile: FileAsset | null;
  sourceFile: FileAsset | null;
  startedAt: string | null;
  status: ImageTaskStatus;
}

export type VideoTaskStatus = 'CANCELLED' | 'FAILED' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED';

export interface VideoTask {
  completedAt: string | null;
  createdAt: string;
  errorCode: string | null;
  errorMessage: string | null;
  id: string;
  lastFrameFile: FileAsset | null;
  modelAlias: string;
  parameters: Record<string, unknown> | null;
  progress: number;
  prompt: string;
  resultFile: FileAsset | null;
  sourceFile: FileAsset | null;
  startedAt: string | null;
  status: VideoTaskStatus;
}

export interface ConversationSummary {
  createdAt: string;
  id: string;
  lastMessageAt: string | null;
  modelAlias: string;
  title: string;
  updatedAt: string;
}

export interface ConversationMessage {
  content: string;
  createdAt: string;
  id: string;
  role: 'ASSISTANT' | 'USER';
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
  userId: string;
}

export interface ChatStreamMeta {
  assistantMessageId: string;
  balance: number;
  conversationId: string;
  modelAlias: string;
  pointsCost: number;
  requestId: string;
}

export interface ChatStreamDelta {
  content: string;
}

export interface ChatStreamDone {
  assistantMessageId: string;
  balance: number;
  requestId: string;
  status: 'COMPLETED';
}

export interface ChatStreamError {
  balance: number;
  code: string;
  message: string;
  refunded: boolean;
  requestId: string;
}

export interface StreamChatHandlers {
  onDelta: (event: ChatStreamDelta) => void;
  onDone: (event: ChatStreamDone) => void;
  onError: (event: ChatStreamError) => void;
  onMeta: (event: ChatStreamMeta) => void;
}

interface ApiErrorOptions {
  code?: string;
  details?: unknown;
  requestId?: string;
  status?: number;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly status?: number;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code ?? 'API_REQUEST_FAILED';
    this.details = options.details;
    this.requestId = options.requestId;
    this.status = options.status;
  }

  get recoverable(): boolean {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.code.startsWith('LLM_') ||
      this.status === 429 ||
      (this.status ?? 0) >= 500
    );
  }
}

const rawHttp = axios.create({
  baseURL: '/',
  timeout: 8_000,
});

export const apiClient = axios.create({
  baseURL: '/',
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken && config.headers) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status === 401 && config && !config._retry && getRefreshToken()) {
      config._retry = true;

      try {
        const auth = await refreshAuthSession();

        config.headers.set('Authorization', `Bearer ${auth.accessToken}`);
        return apiClient.request(config);
      } catch {
        // The original request receives a normalized authentication error below.
      }
    }

    throw toApiError(error);
  },
);

let refreshPromise: Promise<AuthResult> | null = null;

export function getAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH_TOKEN_KEY);
}

export function hasStoredTokens(): boolean {
  return Boolean(getAccessToken() || getRefreshToken());
}

export function setAuthSession(result: Pick<AuthResult, 'accessToken' | 'refreshToken'>): void {
  writeStorage(ACCESS_TOKEN_KEY, result.accessToken);
  writeStorage(REFRESH_TOKEN_KEY, result.refreshToken);
}

export function clearAuthSession(): void {
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
}

export async function refreshAuthSession(): Promise<AuthResult> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new ApiError('登录状态已失效，请重新登录', {
      code: 'INVALID_REFRESH_TOKEN',
      status: 401,
    });
  }

  if (!refreshPromise) {
    refreshPromise = rawHttp
      .post<ApiEnvelope<AuthResult>>('/api/v1/auth/refresh', { refreshToken })
      .then((response) => {
        setAuthSession(response.data.data);
        return response.data.data;
      })
      .catch((error: unknown) => {
        clearAuthSession();
        window.dispatchEvent(new CustomEvent('aurora:auth-expired'));
        throw toApiError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function fetchHealth(): Promise<HealthSnapshot> {
  const response = await apiClient.get<ApiEnvelope<HealthSnapshot>>('/api/v1/health');

  return response.data.data;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const response = await apiClient.get<ApiEnvelope<AdminOverview>>('/api/v1/admin/overview');

  return response.data.data;
}

export async function fetchAdminUsers(params: {
  limit?: number;
  offset?: number;
  role?: 'ADMIN' | 'USER';
  search?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}): Promise<AdminUserList> {
  const response = await apiClient.get<ApiEnvelope<AdminUserList>>('/api/v1/admin/users', {
    params,
  });

  return response.data.data;
}

export async function updateAdminUser(
  userId: string,
  input: {
    displayName?: string;
    role?: 'ADMIN' | 'USER';
    status?: 'ACTIVE' | 'SUSPENDED';
  },
): Promise<AdminUser> {
  const response = await apiClient.patch<ApiEnvelope<AdminUser>>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}`,
    input,
  );

  return response.data.data;
}

export async function adjustAdminUserPoints(
  userId: string,
  input: {
    delta: number;
    idempotencyKey: string;
    reason: string;
  },
): Promise<{ ledgerEntryId: string; user: AdminUser }> {
  const response = await apiClient.post<
    ApiEnvelope<{
      ledgerEntryId: string;
      user: AdminUser;
    }>
  >(`/api/v1/admin/users/${encodeURIComponent(userId)}/points-adjustments`, input);

  return response.data.data;
}

export async function fetchAdminProviders(): Promise<{ items: AdminProvider[] }> {
  const response =
    await apiClient.get<ApiEnvelope<{ items: AdminProvider[] }>>('/api/v1/admin/providers');

  return response.data.data;
}

export async function createAdminProvider(input: {
  baseUrl: string;
  code: string;
  displayName: string;
  enabled: boolean;
  keyRef: string;
  priority: number;
}): Promise<AdminProvider> {
  const response = await apiClient.post<ApiEnvelope<AdminProvider>>(
    '/api/v1/admin/providers',
    input,
  );

  return response.data.data;
}

export async function updateAdminProvider(
  providerId: string,
  input: {
    baseUrl?: string;
    displayName?: string;
    enabled?: boolean;
    keyRef?: string;
    priority?: number;
  },
): Promise<AdminProvider> {
  const response = await apiClient.patch<ApiEnvelope<AdminProvider>>(
    `/api/v1/admin/providers/${encodeURIComponent(providerId)}`,
    input,
  );

  return response.data.data;
}

export async function probeAdminProvider(
  providerId: string,
  input: {
    apiKey?: string;
    baseUrl: string;
    protocol?: 'doubao' | 'openai-compatible' | 'xai';
    timeoutMs?: number;
  },
): Promise<AdminProviderProbeResult> {
  const response = await apiClient.post<ApiEnvelope<AdminProviderProbeResult>>(
    `/api/v1/admin/providers/${encodeURIComponent(providerId)}/probe`,
    input,
  );

  return response.data.data;
}

export async function fetchAdminModels(params: {
  capability?: 'chat' | 'embedding' | 'image' | 'video';
  enabled?: boolean;
  providerCode?: string;
  search?: string;
}): Promise<{ items: AdminModel[] }> {
  const response = await apiClient.get<ApiEnvelope<{ items: AdminModel[] }>>(
    '/api/v1/admin/models',
    { params },
  );

  return response.data.data;
}

export async function createAdminModel(input: {
  alias: string;
  capabilities: Array<'chat' | 'embedding' | 'image' | 'video'>;
  contextWindow?: number;
  displayName: string;
  enabled: boolean;
  providerCode: string;
  providerModel: string;
}): Promise<AdminModel> {
  const response = await apiClient.post<ApiEnvelope<AdminModel>>('/api/v1/admin/models', input);

  return response.data.data;
}

export async function importAdminDiscoveredModels(input: {
  models: Array<{
    capabilities: Array<'chat' | 'embedding' | 'image' | 'video'>;
    displayName: string;
    enabled?: boolean;
    providerModel: string;
  }>;
  providerCode: string;
}): Promise<{
  imported: AdminModel[];
  skipped: Array<{
    alias: string;
    providerModel: string;
    reason: 'already_exists';
  }>;
}> {
  const response = await apiClient.post<
    ApiEnvelope<{
      imported: AdminModel[];
      skipped: Array<{
        alias: string;
        providerModel: string;
        reason: 'already_exists';
      }>;
    }>
  >('/api/v1/admin/models/import-discovered', input);

  return response.data.data;
}

export async function updateAdminModel(
  modelId: string,
  input: {
    capabilities?: Array<'chat' | 'embedding' | 'image' | 'video'>;
    contextWindow?: number;
    displayName?: string;
    enabled?: boolean;
    providerCode?: string;
    providerModel?: string;
  },
): Promise<AdminModel> {
  const response = await apiClient.patch<ApiEnvelope<AdminModel>>(
    `/api/v1/admin/models/${encodeURIComponent(modelId)}`,
    input,
  );

  return response.data.data;
}

export async function devLogin(
  input: {
    displayName?: string;
    email?: string;
  } = {},
): Promise<AuthResult> {
  const response = await rawHttp.post<ApiEnvelope<AuthResult>>('/api/v1/auth/dev-login', input);

  return response.data.data;
}

export async function emailLogin(input: { email: string; password: string }): Promise<AuthResult> {
  const response = await rawHttp.post<ApiEnvelope<AuthResult>>('/api/v1/auth/email/login', input);

  return response.data.data;
}

export async function emailRegister(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const response = await rawHttp.post<ApiEnvelope<AuthResult>>(
    '/api/v1/auth/email/register',
    input,
  );

  return response.data.data;
}

export async function fetchCurrentUser(): Promise<AuthenticatedUser> {
  const response = await apiClient.get<ApiEnvelope<AuthenticatedUser>>('/api/v1/auth/me');

  return response.data.data;
}

export async function logout(refreshToken: string | null): Promise<void> {
  await apiClient.post('/api/v1/auth/logout', {
    refreshToken: refreshToken ?? undefined,
  });
}

export async function fetchModels(capability?: ChatModel['capabilities'][number]) {
  const response = await apiClient.get<ApiEnvelope<{ items: ChatModel[] }>>('/api/v1/models', {
    params: capability ? { capability } : undefined,
  });

  return response.data.data.items;
}

export async function fetchModuleDisplayConfigs(): Promise<{
  items: ModuleDisplayConfig[];
  source: 'database' | 'defaults';
}> {
  const response = await apiClient.get<
    ApiEnvelope<{
      items: ModuleDisplayConfig[];
      source: 'database' | 'defaults';
    }>
  >('/api/v1/modules/display');

  return response.data.data;
}

export async function fetchAdminModuleDisplayConfigs(): Promise<{
  items: ModuleDisplayConfig[];
  source: 'database' | 'defaults';
}> {
  const response = await apiClient.get<
    ApiEnvelope<{
      items: ModuleDisplayConfig[];
      source: 'database' | 'defaults';
    }>
  >('/api/v1/admin/modules');

  return response.data.data;
}

export async function updateAdminModuleDisplayConfig(
  moduleKey: string,
  input: {
    badge?: string | null;
    cover?: string | null;
    group?: ModuleDisplayGroup;
    icon?: string;
    name?: string;
    route?: string;
    sortOrder?: number;
    visible?: boolean;
  },
): Promise<ModuleDisplayConfig> {
  const response = await apiClient.patch<ApiEnvelope<ModuleDisplayConfig>>(
    `/api/v1/admin/modules/${encodeURIComponent(moduleKey)}`,
    input,
  );

  return response.data.data;
}

export async function uploadImageFile(file: File): Promise<FileAsset> {
  const formData = new FormData();

  formData.append('file', file);

  const response = await apiClient.post<ApiEnvelope<FileAsset>>('/api/v1/files', formData, {
    timeout: 30_000,
  });

  return response.data.data;
}

export async function fetchFileBlob(fileId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `/api/v1/files/${encodeURIComponent(fileId)}/content`,
    {
      responseType: 'blob',
      timeout: 30_000,
    },
  );

  return response.data;
}

export async function createImageTask(
  input: {
    modelAlias?: string;
    parameters?: Record<string, unknown>;
    prompt: string;
    referenceFileIds?: string[];
    sourceFileId?: string;
  },
  idempotencyKey: string,
): Promise<ImageTask> {
  const response = await apiClient.post<ApiEnvelope<ImageTask>>('/api/v1/image-tasks', input, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    timeout: 30_000,
  });

  return response.data.data;
}

export async function listImageTasks(limit = 30): Promise<ImageTask[]> {
  const response = await apiClient.get<ApiEnvelope<{ items: ImageTask[] }>>('/api/v1/image-tasks', {
    params: { limit },
  });

  return response.data.data.items;
}

export async function getImageTask(taskId: string): Promise<ImageTask> {
  const response = await apiClient.get<ApiEnvelope<ImageTask>>(
    `/api/v1/image-tasks/${encodeURIComponent(taskId)}`,
  );

  return response.data.data;
}

export async function createVideoTask(
  input: {
    lastFrameFileId?: string;
    modelAlias?: string;
    parameters?: Record<string, unknown>;
    prompt: string;
    sourceFileId?: string;
  },
  idempotencyKey: string,
): Promise<VideoTask> {
  const response = await apiClient.post<ApiEnvelope<VideoTask>>('/api/v1/video-tasks', input, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    timeout: 30_000,
  });

  return response.data.data;
}

export async function listVideoTasks(limit = 30): Promise<VideoTask[]> {
  const response = await apiClient.get<ApiEnvelope<{ items: VideoTask[] }>>('/api/v1/video-tasks', {
    params: { limit },
  });

  return response.data.data.items;
}

export async function getVideoTask(taskId: string): Promise<VideoTask> {
  const response = await apiClient.get<ApiEnvelope<VideoTask>>(
    `/api/v1/video-tasks/${encodeURIComponent(taskId)}`,
  );

  return response.data.data;
}

export async function cancelVideoTask(taskId: string): Promise<VideoTask> {
  const response = await apiClient.post<ApiEnvelope<VideoTask>>(
    `/api/v1/video-tasks/${encodeURIComponent(taskId)}/cancel`,
  );

  return response.data.data;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const response =
    await apiClient.get<ApiEnvelope<{ items: ConversationSummary[] }>>('/api/v1/conversations');

  return response.data.data.items;
}

export async function createConversation(
  input: {
    modelAlias?: string;
    title?: string;
  } = {},
): Promise<ConversationSummary> {
  const response = await apiClient.post<ApiEnvelope<ConversationSummary>>(
    '/api/v1/conversations',
    input,
  );

  return response.data.data;
}

export async function fetchConversation(conversationId: string): Promise<ConversationDetail> {
  const response = await apiClient.get<ApiEnvelope<ConversationDetail>>(
    `/api/v1/conversations/${conversationId}`,
  );

  return response.data.data;
}

export async function streamChat(
  input: {
    content: string;
    conversationId?: string;
    modelAlias?: string;
    systemPrompt?: string;
    temperature?: number;
  },
  handlers: StreamChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? createFallbackId();
  const request = async (): Promise<Response> =>
    fetch('/api/v1/chat/stream', {
      body: JSON.stringify(input),
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        'Idempotency-Key': idempotencyKey,
      },
      method: 'POST',
      signal,
    });

  let response = await request();

  if (response.status === 401 && getRefreshToken()) {
    await refreshAuthSession();
    response = await request();
  }

  if (!response.ok) {
    throw await responseToApiError(response);
  }

  if (!response.body) {
    throw new ApiError('服务器没有返回可读取的流式响应', {
      code: 'CHAT_STREAM_UNAVAILABLE',
      status: 502,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  let finished = false;

  try {
    while (!finished) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      const events = parser.feed(decoder.decode(result.value, { stream: true }));

      for (const event of events) {
        finished ||= dispatchStreamEvent(event.event, event.data, handlers);
      }
    }

    if (!finished) {
      for (const event of parser.flush()) {
        finished ||= dispatchStreamEvent(event.event, event.data, handlers);
      }
    }
  } finally {
    if (!finished) {
      await reader.cancel().catch(() => undefined);
    }
  }
}

function dispatchStreamEvent(
  eventName: string,
  rawData: string,
  handlers: StreamChatHandlers,
): boolean {
  let payload: unknown;

  try {
    payload = JSON.parse(rawData);
  } catch {
    throw new ApiError('流式响应包含无法解析的数据', {
      code: 'CHAT_STREAM_INVALID',
      details: rawData,
    });
  }

  if (eventName === 'meta') {
    handlers.onMeta(payload as ChatStreamMeta);
    return false;
  }

  if (eventName === 'delta') {
    handlers.onDelta(payload as ChatStreamDelta);
    return false;
  }

  if (eventName === 'done') {
    handlers.onDone(payload as ChatStreamDone);
    return true;
  }

  if (eventName === 'error') {
    handlers.onError(payload as ChatStreamError);
    return true;
  }

  return false;
}

async function responseToApiError(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => undefined);
  const envelope =
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const errorPayload =
    typeof envelope.error === 'object' && envelope.error !== null
      ? (envelope.error as Record<string, unknown>)
      : {};

  return new ApiError(
    typeof errorPayload.message === 'string'
      ? errorPayload.message
      : `请求失败 (${response.status})`,
    {
      code: typeof errorPayload.code === 'string' ? errorPayload.code : 'API_REQUEST_FAILED',
      details: errorPayload.details,
      requestId: typeof envelope.requestId === 'string' ? envelope.requestId : undefined,
      status: response.status,
    },
  );
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const payload =
      typeof error.response?.data === 'object' && error.response.data !== null
        ? (error.response.data as Record<string, unknown>)
        : {};
    const errorPayload =
      typeof payload.error === 'object' && payload.error !== null
        ? (payload.error as Record<string, unknown>)
        : {};

    return new ApiError(
      typeof errorPayload.message === 'string'
        ? errorPayload.message
        : error.response
          ? `请求失败 (${error.response.status})`
          : '无法连接服务，请检查本地 API 是否运行',
      {
        code:
          typeof errorPayload.code === 'string'
            ? errorPayload.code
            : error.response
              ? 'API_REQUEST_FAILED'
              : 'NETWORK_ERROR',
        details: errorPayload.details,
        requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined,
        status: error.response?.status,
      },
    );
  }

  return new ApiError(error instanceof Error ? error.message : '请求失败，请稍后重试');
}

function createFallbackId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or browser policy may disable persistent storage.
  }
}

function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage policy failures.
  }
}
