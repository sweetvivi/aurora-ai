<script setup lang="ts">
import {
  CloudServerOutlined,
  DatabaseOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import {
  ApiError,
  adjustAdminUserPoints,
  createAdminModel,
  createAdminProvider,
  fetchAdminModels,
  fetchAdminOverview,
  fetchAdminProviders,
  fetchAdminUsers,
  importAdminDiscoveredModels,
  probeAdminProvider,
  updateAdminModel,
  updateAdminProvider,
  updateAdminUser,
  type AdminModel,
  type AdminOverview,
  type AdminProvider,
  type AdminProviderProbeResult,
  type AdminUser,
} from '@/app/api';

type AdminTab = 'models' | 'overview' | 'providers' | 'users';
type ModelCapability = 'chat' | 'embedding' | 'image' | 'video';

const activeTab = ref<AdminTab>('overview');
const loading = ref(false);
const saving = ref(false);
const overview = ref<AdminOverview | null>(null);
const users = ref<AdminUser[]>([]);
const providers = ref<AdminProvider[]>([]);
const models = ref<AdminModel[]>([]);
const userSearch = ref('');
const userRole = ref<'ADMIN' | 'USER' | undefined>();
const userStatus = ref<'ACTIVE' | 'SUSPENDED' | undefined>();
const modelSearch = ref('');
const modelProvider = ref<string | undefined>();
const modelCapability = ref<ModelCapability | undefined>();

const userModalOpen = ref(false);
const editingUser = ref<AdminUser | null>(null);
const userForm = reactive({
  displayName: '',
  role: 'USER' as 'ADMIN' | 'USER',
  status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
});

const pointsModalOpen = ref(false);
const pointsUser = ref<AdminUser | null>(null);
const pointsForm = reactive({
  delta: 10,
  reason: '',
});

const providerModalOpen = ref(false);
const editingProvider = ref<AdminProvider | null>(null);
const providerForm = reactive({
  baseUrl: '',
  code: '',
  displayName: '',
  enabled: true,
  keyRef: '',
  priority: 100,
});
const discoveryModalOpen = ref(false);
const discoveryProvider = ref<AdminProvider | null>(null);
const discoveryKey = ref('');
const discoveryLoading = ref(false);
const importingDiscoveredModels = ref(false);
const discoveryResult = ref<AdminProviderProbeResult | null>(null);
const selectedDiscoveredModels = ref<string[]>([]);

const modelModalOpen = ref(false);
const editingModel = ref<AdminModel | null>(null);
const modelForm = reactive({
  alias: '',
  capabilities: ['chat'] as ModelCapability[],
  contextWindow: 128000,
  displayName: '',
  enabled: true,
  providerCode: '',
  providerModel: '',
});

const userColumns = [
  { dataIndex: 'displayName', key: 'displayName', title: '用户' },
  { dataIndex: 'role', key: 'role', title: '角色', width: 92 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 96 },
  { dataIndex: 'pointsBalance', key: 'pointsBalance', title: '积分', width: 92 },
  { dataIndex: 'createdAt', key: 'createdAt', title: '创建时间', width: 142 },
  { key: 'actions', title: '操作', width: 176 },
];

const providerColumns = [
  { dataIndex: 'displayName', key: 'displayName', title: '厂商' },
  { dataIndex: 'baseUrl', key: 'baseUrl', title: 'Base URL' },
  { dataIndex: 'keyRef', key: 'keyRef', title: '密钥引用', width: 160 },
  { dataIndex: 'priority', key: 'priority', title: '优先级', width: 84 },
  { dataIndex: '_count', key: 'modelCount', title: '模型数', width: 84 },
  { dataIndex: 'enabled', key: 'enabled', title: '状态', width: 86 },
  { key: 'actions', title: '操作', width: 154 },
];

const modelColumns = [
  { dataIndex: 'displayName', key: 'displayName', title: '模型' },
  { dataIndex: 'provider', key: 'provider', title: '厂商', width: 150 },
  { dataIndex: 'providerModel', key: 'providerModel', title: '上游模型' },
  { dataIndex: 'capabilities', key: 'capabilities', title: '能力', width: 190 },
  { dataIndex: 'contextWindow', key: 'contextWindow', title: '上下文', width: 104 },
  { dataIndex: 'enabled', key: 'enabled', title: '状态', width: 86 },
  { key: 'actions', title: '操作', width: 92 },
];

const providerOptions = computed(() =>
  providers.value.map((provider) => ({
    label: `${provider.displayName} (${provider.code})`,
    value: provider.code,
  })),
);

const capabilityOptions: Array<{ label: string; value: ModelCapability }> = [
  { label: '对话', value: 'chat' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '向量', value: 'embedding' },
];

const completionRate = computed(() => {
  if (!overview.value?.models.total) {
    return 0;
  }

  return Math.round((overview.value.models.enabled / overview.value.models.total) * 100);
});

const selectedDiscoveredModelItems = computed(() => {
  const selected = new Set(selectedDiscoveredModels.value);

  return discoveryResult.value?.models.filter((model) => selected.has(model.providerModel)) ?? [];
});

async function loadAll(): Promise<void> {
  loading.value = true;

  try {
    const [overviewResult, userResult, providerResult, modelResult] = await Promise.all([
      fetchAdminOverview(),
      fetchAdminUsers({
        limit: 100,
        role: userRole.value,
        search: userSearch.value.trim() || undefined,
        status: userStatus.value,
      }),
      fetchAdminProviders(),
      fetchAdminModels({
        capability: modelCapability.value,
        providerCode: modelProvider.value,
        search: modelSearch.value.trim() || undefined,
      }),
    ]);

    overview.value = overviewResult;
    users.value = userResult.items;
    providers.value = providerResult.items;
    models.value = modelResult.items;
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function loadUsers(): Promise<void> {
  try {
    const result = await fetchAdminUsers({
      limit: 100,
      role: userRole.value,
      search: userSearch.value.trim() || undefined,
      status: userStatus.value,
    });

    users.value = result.items;
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function loadModels(): Promise<void> {
  try {
    const result = await fetchAdminModels({
      capability: modelCapability.value,
      providerCode: modelProvider.value,
      search: modelSearch.value.trim() || undefined,
    });

    models.value = result.items;
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

function openUserModal(user: AdminUser): void {
  editingUser.value = user;
  userForm.displayName = user.displayName;
  userForm.role = user.role;
  userForm.status = user.status;
  userModalOpen.value = true;
}

async function saveUser(): Promise<void> {
  if (!editingUser.value || !userForm.displayName.trim()) {
    message.warning('请输入显示名称');
    return;
  }

  saving.value = true;

  try {
    const updated = await updateAdminUser(editingUser.value.id, {
      displayName: userForm.displayName.trim(),
      role: userForm.role,
      status: userForm.status,
    });

    users.value = users.value.map((user) => (user.id === updated.id ? updated : user));
    userModalOpen.value = false;
    message.success('用户信息已更新');
    await refreshOverview();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

function openPointsModal(user: AdminUser): void {
  pointsUser.value = user;
  pointsForm.delta = 10;
  pointsForm.reason = '';
  pointsModalOpen.value = true;
}

async function savePointsAdjustment(): Promise<void> {
  if (!pointsUser.value || pointsForm.delta === 0 || !pointsForm.reason.trim()) {
    message.warning('请填写非零积分调整值和调整原因');
    return;
  }

  saving.value = true;

  try {
    const result = await adjustAdminUserPoints(pointsUser.value.id, {
      delta: pointsForm.delta,
      idempotencyKey: `admin-ui-${pointsUser.value.id}-${Date.now()}`,
      reason: pointsForm.reason.trim(),
    });

    users.value = users.value.map((user) => (user.id === result.user.id ? result.user : user));
    pointsModalOpen.value = false;
    message.success('积分调整已写入账本');
    await refreshOverview();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

function openProviderModal(provider?: AdminProvider): void {
  editingProvider.value = provider ?? null;
  providerForm.baseUrl = provider?.baseUrl ?? '';
  providerForm.code = provider?.code ?? '';
  providerForm.displayName = provider?.displayName ?? '';
  providerForm.enabled = provider?.enabled ?? true;
  providerForm.keyRef = provider?.keyRef ?? '';
  providerForm.priority = provider?.priority ?? 100;
  providerModalOpen.value = true;
}

async function saveProvider(): Promise<void> {
  if (
    !providerForm.code.trim() ||
    !providerForm.displayName.trim() ||
    !providerForm.baseUrl.trim() ||
    !providerForm.keyRef.trim()
  ) {
    message.warning('请完整填写厂商代码、名称、Base URL 和密钥引用');
    return;
  }

  saving.value = true;

  try {
    const updated = editingProvider.value
      ? await updateAdminProvider(editingProvider.value.id, {
          baseUrl: providerForm.baseUrl.trim(),
          displayName: providerForm.displayName.trim(),
          enabled: providerForm.enabled,
          keyRef: providerForm.keyRef.trim(),
          priority: providerForm.priority,
        })
      : await createAdminProvider({
          baseUrl: providerForm.baseUrl.trim(),
          code: providerForm.code.trim(),
          displayName: providerForm.displayName.trim(),
          enabled: providerForm.enabled,
          keyRef: providerForm.keyRef.trim(),
          priority: providerForm.priority,
        });

    providers.value = editingProvider.value
      ? providers.value.map((provider) => (provider.id === updated.id ? updated : provider))
      : [...providers.value, updated].sort((left, right) => left.priority - right.priority);
    providerModalOpen.value = false;
    message.success(editingProvider.value ? '厂商配置已更新' : '厂商配置已创建');
    await refreshOverview();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

function openDiscoveryModal(provider: AdminProvider): void {
  discoveryProvider.value = provider;
  discoveryKey.value = '';
  discoveryLoading.value = false;
  discoveryResult.value = null;
  selectedDiscoveredModels.value = [];
  discoveryModalOpen.value = true;
}

function resetDiscovery(): void {
  discoveryProvider.value = null;
  discoveryKey.value = '';
  discoveryLoading.value = false;
  discoveryResult.value = null;
  selectedDiscoveredModels.value = [];
}

async function runProviderProbe(): Promise<void> {
  if (!discoveryProvider.value) {
    return;
  }

  discoveryLoading.value = true;
  discoveryResult.value = null;
  selectedDiscoveredModels.value = [];

  try {
    const result = await probeAdminProvider(discoveryProvider.value.id, {
      apiKey: discoveryKey.value.trim() || undefined,
      baseUrl: discoveryProvider.value.baseUrl,
      protocol: 'openai-compatible',
      timeoutMs: 15_000,
    });

    discoveryResult.value = result;
    selectedDiscoveredModels.value = result.models.map((model) => model.providerModel);

    if (result.modelCount === 0) {
      message.warning('连接成功，但厂商没有返回可用模型');
    } else {
      message.success(`连接成功，发现 ${result.modelCount} 个模型`);
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    discoveryLoading.value = false;
  }
}

async function importSelectedModels(): Promise<void> {
  if (!discoveryProvider.value || selectedDiscoveredModelItems.value.length === 0) {
    message.warning('请至少选择一个模型');
    return;
  }

  importingDiscoveredModels.value = true;

  try {
    const result = await importAdminDiscoveredModels({
      models: selectedDiscoveredModelItems.value.map((model) => ({
        capabilities: model.capabilities,
        displayName: model.displayName,
        enabled: true,
        providerModel: model.providerModel,
      })),
      providerCode: discoveryProvider.value.code,
    });

    if (result.imported.length > 0) {
      message.success(
        result.skipped.length > 0
          ? `已导入 ${result.imported.length} 个模型，跳过 ${result.skipped.length} 个重复项`
          : `已导入 ${result.imported.length} 个模型`,
      );
    } else {
      message.info(`所选 ${result.skipped.length} 个模型均已存在`);
    }

    discoveryModalOpen.value = false;
    activeTab.value = 'models';
    resetDiscovery();
    await Promise.all([loadModels(), refreshOverview()]);
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    importingDiscoveredModels.value = false;
  }
}

function capabilityLabel(capability: 'chat' | 'embedding' | 'image' | 'video'): string {
  return {
    chat: '对话',
    embedding: '向量',
    image: '图片',
    video: '视频',
  }[capability];
}

function openModelModal(model?: AdminModel): void {
  editingModel.value = model ?? null;
  modelForm.alias = model?.alias ?? '';
  modelForm.capabilities = model
    ? model.capabilities.map((capability) => capability.toLowerCase() as ModelCapability)
    : ['chat'];
  modelForm.contextWindow = model?.contextWindow ?? 128000;
  modelForm.displayName = model?.displayName ?? '';
  modelForm.enabled = model?.enabled ?? true;
  modelForm.providerCode = model?.provider.code ?? providers.value[0]?.code ?? '';
  modelForm.providerModel = model?.providerModel ?? '';
  modelModalOpen.value = true;
}

async function saveModel(): Promise<void> {
  if (
    !modelForm.alias.trim() ||
    !modelForm.displayName.trim() ||
    !modelForm.providerCode ||
    !modelForm.providerModel.trim() ||
    modelForm.capabilities.length === 0
  ) {
    message.warning('请完整填写模型别名、名称、厂商、上游模型和能力');
    return;
  }

  saving.value = true;

  try {
    const updated = editingModel.value
      ? await updateAdminModel(editingModel.value.id, {
          capabilities: modelForm.capabilities,
          contextWindow: modelForm.contextWindow,
          displayName: modelForm.displayName.trim(),
          enabled: modelForm.enabled,
          providerCode: modelForm.providerCode,
          providerModel: modelForm.providerModel.trim(),
        })
      : await createAdminModel({
          alias: modelForm.alias.trim(),
          capabilities: modelForm.capabilities,
          contextWindow: modelForm.contextWindow,
          displayName: modelForm.displayName.trim(),
          enabled: modelForm.enabled,
          providerCode: modelForm.providerCode,
          providerModel: modelForm.providerModel.trim(),
        });

    models.value = editingModel.value
      ? models.value.map((model) => (model.id === updated.id ? updated : model))
      : [...models.value, updated].sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        );
    modelModalOpen.value = false;
    message.success(editingModel.value ? '模型配置已更新' : '模型配置已创建');
    await refreshOverview();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

async function refreshOverview(): Promise<void> {
  overview.value = await fetchAdminOverview();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '操作失败，请稍后重试';
}

onMounted(() => {
  void loadAll();
});
</script>

<template>
  <section class="admin-console">
    <header class="admin-console__header">
      <div>
        <span class="admin-console__eyebrow">
          <SettingOutlined />
          ADMIN CONSOLE
        </span>
        <h1>管理后台</h1>
        <p>用户、积分、模型厂商和模型路由统一管理</p>
      </div>
      <a-button :loading="loading" @click="loadAll">
        <ReloadOutlined />
        刷新数据
      </a-button>
    </header>

    <a-tabs v-model:activeKey="activeTab" class="admin-tabs">
      <a-tab-pane key="overview" tab="总览">
        <div class="admin-stats">
          <article>
            <TeamOutlined />
            <span>用户总数</span>
            <strong>{{ overview?.users.total ?? '--' }}</strong>
            <small>{{ overview?.users.active ?? 0 }} 个活跃账号</small>
          </article>
          <article>
            <UserSwitchOutlined />
            <span>管理员</span>
            <strong>{{ overview?.users.admins ?? '--' }}</strong>
            <small>拥有后台访问权限</small>
          </article>
          <article>
            <CloudServerOutlined />
            <span>模型厂商</span>
            <strong>{{ overview?.providers.total ?? '--' }}</strong>
            <small>{{ overview?.providers.enabled ?? 0 }} 个已启用</small>
          </article>
          <article>
            <DatabaseOutlined />
            <span>模型配置</span>
            <strong>{{ overview?.models.total ?? '--' }}</strong>
            <small>启用率 {{ completionRate }}%</small>
          </article>
          <article>
            <ThunderboltOutlined />
            <span>账户积分总额</span>
            <strong>{{ overview?.points.balanceTotal ?? '--' }}</strong>
            <small>当前所有用户余额</small>
          </article>
          <article>
            <SettingOutlined />
            <span>任务记录</span>
            <strong>
              {{
                overview
                  ? overview.tasks.chatRequests +
                    overview.tasks.imageTasks +
                    overview.tasks.videoTasks
                  : '--'
              }}
            </strong>
            <small>对话、图片和视频任务</small>
          </article>
        </div>

        <div class="admin-overview-grid">
          <section class="admin-panel">
            <header>
              <div>
                <strong>任务分布</strong>
                <span>当前数据库累计任务</span>
              </div>
            </header>
            <div class="admin-task-bars">
              <div>
                <span>模型对话</span>
                <strong>{{ overview?.tasks.chatRequests ?? 0 }}</strong>
              </div>
              <div>
                <span>图片任务</span>
                <strong>{{ overview?.tasks.imageTasks ?? 0 }}</strong>
              </div>
              <div>
                <span>视频任务</span>
                <strong>{{ overview?.tasks.videoTasks ?? 0 }}</strong>
              </div>
            </div>
          </section>

          <section class="admin-panel">
            <header>
              <div>
                <strong>模块状态</strong>
                <span>首版管理范围</span>
              </div>
            </header>
            <dl class="admin-module-status">
              <div>
                <dt>用户与积分</dt>
                <dd><a-tag color="green">已启用</a-tag></dd>
              </div>
              <div>
                <dt>模型厂商与路由</dt>
                <dd><a-tag color="green">已启用</a-tag></dd>
              </div>
              <div>
                <dt>订单与支付</dt>
                <dd><a-tag>未启用</a-tag></dd>
              </div>
            </dl>
          </section>
        </div>
      </a-tab-pane>

      <a-tab-pane key="users" tab="用户管理">
        <section class="admin-panel">
          <header class="admin-panel__toolbar">
            <div>
              <strong>用户列表</strong>
              <span>共 {{ users.length }} 条当前结果</span>
            </div>
            <div class="admin-filters">
              <a-input
                v-model:value="userSearch"
                allow-clear
                placeholder="名称、邮箱或用户 ID"
                @press-enter="loadUsers"
              >
                <template #prefix><SearchOutlined /></template>
              </a-input>
              <a-select
                v-model:value="userRole"
                allow-clear
                placeholder="全部角色"
                :options="[
                  { label: '管理员', value: 'ADMIN' },
                  { label: '普通用户', value: 'USER' },
                ]"
                @change="loadUsers"
              />
              <a-select
                v-model:value="userStatus"
                allow-clear
                placeholder="全部状态"
                :options="[
                  { label: '正常', value: 'ACTIVE' },
                  { label: '已停用', value: 'SUSPENDED' },
                ]"
                @change="loadUsers"
              />
              <a-button @click="loadUsers">筛选</a-button>
            </div>
          </header>

          <a-table
            :columns="userColumns"
            :data-source="users"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 880 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'displayName'">
                <div class="admin-user-cell">
                  <strong>{{ record.displayName }}</strong>
                  <span>{{ record.email || record.id }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'role'">
                <a-tag :color="record.role === 'ADMIN' ? 'purple' : 'default'">
                  {{ record.role === 'ADMIN' ? '管理员' : '普通用户' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === 'ACTIVE' ? 'green' : 'red'">
                  {{ record.status === 'ACTIVE' ? '正常' : '已停用' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'pointsBalance'">
                <strong class="admin-points-value">{{ record.pointsBalance }}</strong>
              </template>
              <template v-else-if="column.key === 'createdAt'">
                {{ formatDate(record.createdAt) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="admin-row-actions">
                  <a-button size="small" @click="openUserModal(record)">
                    <EditOutlined />
                    编辑
                  </a-button>
                  <a-button size="small" @click="openPointsModal(record)"> 积分 </a-button>
                </div>
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>

      <a-tab-pane key="providers" tab="模型厂商">
        <section class="admin-panel">
          <header class="admin-panel__toolbar">
            <div>
              <strong>厂商配置</strong>
              <span>数据库只保存环境变量名称，不保存真实密钥</span>
            </div>
            <a-button type="primary" @click="openProviderModal()">
              <PlusOutlined />
              新增厂商
            </a-button>
          </header>

          <a-table
            :columns="providerColumns"
            :data-source="providers"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 1040 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'displayName'">
                <div class="admin-user-cell">
                  <strong>{{ record.displayName }}</strong>
                  <span>{{ record.code }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'baseUrl'">
                <code class="admin-code">{{ record.baseUrl }}</code>
              </template>
              <template v-else-if="column.key === 'keyRef'">
                <code class="admin-code">{{ record.keyRef }}</code>
              </template>
              <template v-else-if="column.key === 'modelCount'">
                {{ record._count.models }}
              </template>
              <template v-else-if="column.key === 'enabled'">
                <a-tag :color="record.enabled ? 'green' : 'default'">
                  {{ record.enabled ? '启用' : '停用' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="admin-row-actions">
                  <a-button size="small" @click="openProviderModal(record)">
                    <EditOutlined />
                    编辑
                  </a-button>
                  <a-button size="small" type="primary" ghost @click="openDiscoveryModal(record)">
                    检测模型
                  </a-button>
                </div>
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>

      <a-tab-pane key="models" tab="模型配置">
        <section class="admin-panel">
          <header class="admin-panel__toolbar">
            <div>
              <strong>模型路由</strong>
              <span>维护前端别名、厂商绑定、上游模型和能力</span>
            </div>
            <div class="admin-filters">
              <a-input
                v-model:value="modelSearch"
                allow-clear
                placeholder="模型名称或别名"
                @press-enter="loadModels"
              >
                <template #prefix><SearchOutlined /></template>
              </a-input>
              <a-select
                v-model:value="modelProvider"
                allow-clear
                placeholder="全部厂商"
                :options="providerOptions"
                @change="loadModels"
              />
              <a-select
                v-model:value="modelCapability"
                allow-clear
                placeholder="全部能力"
                :options="capabilityOptions"
                @change="loadModels"
              />
              <a-button type="primary" @click="openModelModal()">
                <PlusOutlined />
                新增模型
              </a-button>
            </div>
          </header>

          <a-table
            :columns="modelColumns"
            :data-source="models"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 1080 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'displayName'">
                <div class="admin-user-cell">
                  <strong>{{ record.displayName }}</strong>
                  <span>{{ record.alias }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'provider'">
                {{ record.provider.displayName }}
                <small class="admin-inline-code">{{ record.provider.code }}</small>
              </template>
              <template v-else-if="column.key === 'providerModel'">
                <code class="admin-code">{{ record.providerModel }}</code>
              </template>
              <template v-else-if="column.key === 'capabilities'">
                <div class="admin-capabilities">
                  <a-tag
                    v-for="capability in record.capabilities"
                    :key="capability"
                    :color="
                      capability === 'CHAT'
                        ? 'blue'
                        : capability === 'IMAGE'
                          ? 'purple'
                          : capability === 'VIDEO'
                            ? 'orange'
                            : 'default'
                    "
                  >
                    {{
                      capability === 'CHAT'
                        ? '对话'
                        : capability === 'IMAGE'
                          ? '图片'
                          : capability === 'VIDEO'
                            ? '视频'
                            : '向量'
                    }}
                  </a-tag>
                </div>
              </template>
              <template v-else-if="column.key === 'contextWindow'">
                {{ record.contextWindow ? record.contextWindow.toLocaleString() : '--' }}
              </template>
              <template v-else-if="column.key === 'enabled'">
                <a-tag :color="record.enabled ? 'green' : 'default'">
                  {{ record.enabled ? '启用' : '停用' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-button size="small" @click="openModelModal(record)">
                  <EditOutlined />
                  编辑
                </a-button>
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="userModalOpen" :confirm-loading="saving" title="编辑用户" @ok="saveUser">
      <a-form layout="vertical">
        <a-form-item label="显示名称">
          <a-input v-model:value="userForm.displayName" :maxlength="40" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select
            v-model:value="userForm.role"
            :options="[
              { label: '普通用户', value: 'USER' },
              { label: '管理员', value: 'ADMIN' },
            ]"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="userForm.status"
            :options="[
              { label: '正常', value: 'ACTIVE' },
              { label: '已停用', value: 'SUSPENDED' },
            ]"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="pointsModalOpen"
      :confirm-loading="saving"
      title="调整积分"
      @ok="savePointsAdjustment"
    >
      <a-form layout="vertical">
        <a-form-item label="目标用户">
          <a-input :value="pointsUser?.displayName" disabled />
        </a-form-item>
        <a-form-item label="积分变化">
          <a-input-number
            v-model:value="pointsForm.delta"
            :max="1000000"
            :min="-1000000"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="调整原因">
          <a-textarea v-model:value="pointsForm.reason" :maxlength="240" :rows="3" show-count />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="providerModalOpen"
      :confirm-loading="saving"
      :title="editingProvider ? '编辑厂商' : '新增厂商'"
      width="620px"
      @ok="saveProvider"
    >
      <a-form layout="vertical">
        <div class="admin-form-grid">
          <a-form-item label="厂商代码">
            <a-input
              v-model:value="providerForm.code"
              :disabled="Boolean(editingProvider)"
              placeholder="example-provider"
            />
          </a-form-item>
          <a-form-item label="展示名称">
            <a-input v-model:value="providerForm.displayName" placeholder="Example Provider" />
          </a-form-item>
        </div>
        <a-form-item label="Base URL">
          <a-input v-model:value="providerForm.baseUrl" placeholder="https://api.example.com/v1" />
        </a-form-item>
        <div class="admin-form-grid">
          <a-form-item label="密钥引用">
            <a-input v-model:value="providerForm.keyRef" placeholder="EXAMPLE_PROVIDER_API_KEY" />
          </a-form-item>
          <a-form-item label="优先级">
            <a-input-number
              v-model:value="providerForm.priority"
              :max="10000"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
        </div>
        <a-form-item label="启用状态">
          <a-switch v-model:checked="providerForm.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="modelModalOpen"
      :confirm-loading="saving"
      :title="editingModel ? '编辑模型' : '新增模型'"
      width="680px"
      @ok="saveModel"
    >
      <a-form layout="vertical">
        <div class="admin-form-grid">
          <a-form-item label="模型别名">
            <a-input
              v-model:value="modelForm.alias"
              :disabled="Boolean(editingModel)"
              placeholder="provider-model-alias"
            />
          </a-form-item>
          <a-form-item label="展示名称">
            <a-input v-model:value="modelForm.displayName" placeholder="模型名称" />
          </a-form-item>
        </div>
        <div class="admin-form-grid">
          <a-form-item label="模型厂商">
            <a-select
              v-model:value="modelForm.providerCode"
              :options="providerOptions"
              placeholder="选择厂商"
            />
          </a-form-item>
          <a-form-item label="上游模型 ID">
            <a-input v-model:value="modelForm.providerModel" placeholder="upstream-model-id" />
          </a-form-item>
        </div>
        <a-form-item label="模型能力">
          <a-checkbox-group v-model:value="modelForm.capabilities" :options="capabilityOptions" />
        </a-form-item>
        <div class="admin-form-grid">
          <a-form-item label="上下文长度">
            <a-input-number
              v-model:value="modelForm.contextWindow"
              :max="10000000"
              :min="1"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="启用状态">
            <a-switch v-model:checked="modelForm.enabled" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="discoveryModalOpen"
      :confirm-loading="importingDiscoveredModels"
      :ok-button-props="{ disabled: selectedDiscoveredModels.length === 0 }"
      cancel-text="取消"
      ok-text="导入所选模型"
      title="检测厂商模型"
      width="760px"
      @cancel="resetDiscovery"
      @ok="importSelectedModels"
    >
      <div class="admin-discovery">
        <div class="admin-discovery__intro">
          <strong>{{ discoveryProvider?.displayName }}</strong>
          <code>{{ discoveryProvider?.baseUrl }}/models</code>
          <span>检测 Key 仅用于本次请求，不会保存到数据库、日志或页面响应。</span>
        </div>

        <a-form layout="vertical">
          <a-form-item label="本次检测 Key（可选）">
            <a-input-password
              v-model:value="discoveryKey"
              autocomplete="new-password"
              placeholder="留空时使用服务端环境变量"
              @press-enter="runProviderProbe"
            />
          </a-form-item>
        </a-form>

        <div class="admin-discovery__actions">
          <a-button :loading="discoveryLoading" type="primary" @click="runProviderProbe">
            检测连接并读取模型
          </a-button>
          <span v-if="discoveryResult">
            {{ discoveryResult.latencyMs }} ms · 发现 {{ discoveryResult.modelCount }} 个模型
            <template v-if="discoveryResult.truncated">（仅展示前 200 个）</template>
          </span>
        </div>

        <div v-if="discoveryResult" class="admin-discovery__result">
          <div class="admin-discovery__result-header">
            <div>
              <strong>发现的模型</strong>
              <span
                >已选择 {{ selectedDiscoveredModels.length }} /
                {{ discoveryResult.models.length }}</span
              >
            </div>
            <div>
              <a-button
                size="small"
                @click="
                  selectedDiscoveredModels = discoveryResult.models.map(
                    (item) => item.providerModel,
                  )
                "
              >
                全选
              </a-button>
              <a-button size="small" @click="selectedDiscoveredModels = []">清空</a-button>
            </div>
          </div>

          <a-checkbox-group
            v-model:value="selectedDiscoveredModels"
            class="admin-discovery__models"
          >
            <label
              v-for="model in discoveryResult.models"
              :key="model.providerModel"
              class="admin-discovery-model"
            >
              <a-checkbox :value="model.providerModel" />
              <span class="admin-discovery-model__body">
                <strong>{{ model.displayName }}</strong>
                <code>{{ model.providerModel }}</code>
              </span>
              <span class="admin-discovery-model__capabilities">
                <a-tag
                  v-for="capability in model.capabilities"
                  :key="capability"
                  :color="
                    capability === 'chat'
                      ? 'blue'
                      : capability === 'image'
                        ? 'purple'
                        : capability === 'video'
                          ? 'orange'
                          : 'default'
                  "
                >
                  {{ capabilityLabel(capability) }}
                </a-tag>
              </span>
            </label>
          </a-checkbox-group>
        </div>
      </div>
    </a-modal>
  </section>
</template>

<style scoped>
.admin-console {
  min-height: calc(100vh - 56px);
  padding: 22px;
  background: linear-gradient(180deg, #f3f5f9 0, #f7f8fb 180px, #f7f8fb 100%);
}

.admin-console__header {
  display: flex;
  min-height: 112px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px;
  border: 1px solid #e4e7ee;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.admin-console__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #7251eb;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.admin-console__header h1 {
  margin: 7px 0 0;
  color: #1d2230;
  font-size: 24px;
  line-height: 1.15;
}

.admin-console__header p {
  margin: 7px 0 0;
  color: #7a8393;
  font-size: 12px;
}

.admin-tabs {
  margin-top: 16px;
}

.admin-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 14px;
  padding: 0 16px;
  border: 1px solid #e4e7ee;
  border-radius: 8px;
  background: #fff;
}

.admin-tabs :deep(.ant-tabs-tab) {
  padding: 14px 2px;
  font-size: 13px;
  font-weight: 700;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.admin-stats article {
  display: grid;
  min-width: 0;
  min-height: 132px;
  align-content: start;
  padding: 15px;
  border: 1px solid #e4e7ee;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.admin-stats article > :deep(svg) {
  width: 18px;
  height: 18px;
  color: #7251eb;
}

.admin-stats span {
  margin-top: 12px;
  color: #7c8595;
  font-size: 11px;
}

.admin-stats strong {
  margin-top: 4px;
  overflow: hidden;
  color: #202533;
  font-size: 24px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-stats small {
  margin-top: 8px;
  overflow: hidden;
  color: #9aa1ae;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 12px;
  margin-top: 12px;
}

.admin-panel {
  overflow: hidden;
  border: 1px solid #e4e7ee;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.admin-panel > header {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 16px;
  border-bottom: 1px solid #eceef3;
}

.admin-panel > header strong,
.admin-panel > header span {
  display: block;
}

.admin-panel > header strong {
  color: #252a36;
  font-size: 13px;
}

.admin-panel > header span {
  margin-top: 3px;
  color: #969dab;
  font-size: 10px;
}

.admin-panel__toolbar {
  min-height: 72px;
}

.admin-filters {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.admin-filters > :deep(.ant-input-affix-wrapper) {
  width: 210px;
}

.admin-filters > :deep(.ant-select) {
  width: 130px;
}

.admin-task-bars {
  display: grid;
  gap: 12px;
  padding: 18px;
}

.admin-task-bars div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 12px 13px;
  border: 1px solid #eceef3;
  border-radius: 7px;
  background: #fafbfc;
}

.admin-task-bars span {
  color: #646d7d;
  font-size: 12px;
}

.admin-task-bars strong {
  color: #292f3d;
  font-size: 17px;
}

.admin-module-status {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 8px 18px 18px;
}

.admin-module-status div {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid #f0f1f5;
}

.admin-module-status div:last-child {
  border-bottom: 0;
}

.admin-module-status dt,
.admin-module-status dd {
  margin: 0;
  font-size: 12px;
}

.admin-module-status dt {
  color: #5e6777;
}

.admin-user-cell {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.admin-user-cell strong,
.admin-user-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-user-cell strong {
  color: #313746;
  font-size: 12px;
}

.admin-user-cell span {
  color: #969eac;
  font-size: 10px;
}

.admin-points-value {
  color: #7251eb;
}

.admin-row-actions,
.admin-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.admin-code {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  padding: 3px 6px;
  border: 1px solid #e4e7ee;
  border-radius: 5px;
  background: #f8f9fb;
  color: #555f70;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-inline-code {
  display: block;
  margin-top: 3px;
  color: #9aa1ae;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 9px;
}

.admin-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.admin-discovery {
  display: grid;
  gap: 14px;
}

.admin-discovery__intro {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid #e6e8ef;
  border-radius: 8px;
  background: #f8f9fc;
}

.admin-discovery__intro strong {
  color: #252a36;
  font-size: 14px;
}

.admin-discovery__intro code {
  overflow: hidden;
  color: #6252b8;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-discovery__intro span,
.admin-discovery__actions span,
.admin-discovery__result-header span {
  color: #858d9d;
  font-size: 11px;
}

.admin-discovery__actions,
.admin-discovery__result-header,
.admin-discovery__result-header > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-discovery__actions {
  justify-content: space-between;
}

.admin-discovery__result {
  overflow: hidden;
  border: 1px solid #e6e8ef;
  border-radius: 8px;
}

.admin-discovery__result-header {
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #eceef3;
  background: #fafbfc;
}

.admin-discovery__result-header strong,
.admin-discovery__result-header span {
  display: block;
}

.admin-discovery__result-header strong {
  color: #303644;
  font-size: 12px;
}

.admin-discovery__models {
  display: grid;
  max-height: 360px;
  overflow-y: auto;
}

.admin-discovery-model {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px 14px;
  border-bottom: 1px solid #f0f1f5;
  cursor: pointer;
}

.admin-discovery-model:last-child {
  border-bottom: 0;
}

.admin-discovery-model:hover {
  background: #faf9ff;
}

.admin-discovery-model__body {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.admin-discovery-model__body strong,
.admin-discovery-model__body code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-discovery-model__body strong {
  color: #303644;
  font-size: 12px;
}

.admin-discovery-model__body code {
  color: #8c94a4;
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 10px;
}

.admin-discovery-model__capabilities {
  display: flex;
  gap: 4px;
}

@media (max-width: 1260px) {
  .admin-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .admin-overview-grid {
    grid-template-columns: 1fr;
  }

  .admin-filters {
    flex-wrap: wrap;
  }
}

@media (max-width: 720px) {
  .admin-console {
    padding: 12px;
  }

  .admin-console__header {
    min-height: 100px;
    align-items: flex-start;
    padding: 18px;
  }

  .admin-console__header h1 {
    font-size: 20px;
  }

  .admin-console__header p {
    max-width: 220px;
  }

  .admin-tabs :deep(.ant-tabs-nav) {
    padding: 0 10px;
  }

  .admin-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-stats article {
    min-height: 122px;
  }

  .admin-panel > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .admin-panel__toolbar {
    align-items: stretch !important;
  }

  .admin-filters {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-filters > :deep(.ant-input-affix-wrapper),
  .admin-filters > :deep(.ant-select),
  .admin-filters > :deep(.ant-btn) {
    width: 100%;
  }

  .admin-form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .admin-discovery__actions,
  .admin-discovery__result-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .admin-discovery-model {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .admin-discovery-model__capabilities {
    grid-column: 2;
  }
}

@media (max-width: 460px) {
  .admin-stats {
    grid-template-columns: 1fr;
  }

  .admin-filters {
    grid-template-columns: 1fr;
  }
}
</style>
