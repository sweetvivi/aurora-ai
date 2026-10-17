<script setup lang="ts">
import { CrownFilled, LogoutOutlined, ThunderboltFilled } from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useSessionStore } from '@/stores/session';

const sessionStore = useSessionStore();
const { authenticated, error, initials, points, status, tier, user } = storeToRefs(sessionStore);

const open = ref(false);
const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const displayName = ref('');
const localError = ref('');

const busy = computed(() => status.value === 'loading');
const errorMessage = computed(() => localError.value || error.value?.message || '');

function openAccount(): void {
  localError.value = '';
  open.value = true;
}

function switchMode(nextMode: 'login' | 'register'): void {
  mode.value = nextMode;
  localError.value = '';
  sessionStore.error = null;
}

async function submit(): Promise<void> {
  localError.value = '';

  if (!email.value.trim() || !email.value.includes('@')) {
    localError.value = '请输入有效邮箱';
    return;
  }

  if (password.value.length < 8) {
    localError.value = '密码至少需要 8 个字符';
    return;
  }

  if (mode.value === 'register' && !displayName.value.trim()) {
    localError.value = '请输入显示名称';
    return;
  }

  const succeeded =
    mode.value === 'login'
      ? await sessionStore.loginWithEmail(email.value, password.value)
      : await sessionStore.registerWithEmail(displayName.value, email.value, password.value);

  if (succeeded) {
    open.value = false;
    password.value = '';
  }
}

async function loginAsGuest(): Promise<void> {
  localError.value = '';
  await sessionStore.loginAsGuest();

  if (authenticated.value) {
    open.value = false;
  } else if (sessionStore.error) {
    localError.value = sessionStore.error.message;
  }
}

async function logout(): Promise<void> {
  await sessionStore.logout();
  open.value = false;
}
</script>

<template>
  <button class="account-pill" type="button" aria-label="当前账户" @click="openAccount">
    <span class="account-pill__points">
      <ThunderboltFilled />
      <strong>{{ authenticated ? points : '--' }}</strong>
      <small>积分</small>
    </span>
    <span class="account-pill__tier">
      <CrownFilled />
      <span>{{ tier }}</span>
    </span>
    <span class="account-pill__avatar">{{ initials }}</span>
  </button>

  <a-modal
    v-model:open="open"
    :footer="null"
    :mask-closable="!busy"
    :title="authenticated ? '账户信息' : '登录极光AI'"
    width="420px"
  >
    <div v-if="authenticated" class="account-panel">
      <div class="account-panel__summary">
        <span class="account-panel__avatar">{{ initials }}</span>
        <div>
          <strong>{{ user?.displayName }}</strong>
          <p>{{ user?.email || '开发账号' }}</p>
        </div>
      </div>

      <dl class="account-panel__details">
        <div>
          <dt>可用积分</dt>
          <dd>{{ points }}</dd>
        </div>
        <div>
          <dt>账户类型</dt>
          <dd>{{ tier }}</dd>
        </div>
      </dl>

      <a-button block :loading="busy" @click="logout">
        <LogoutOutlined />
        退出登录
      </a-button>
    </div>

    <div v-else class="account-panel">
      <div class="account-panel__tabs">
        <button type="button" :class="{ active: mode === 'login' }" @click="switchMode('login')">
          邮箱登录
        </button>
        <button
          type="button"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >
          注册账号
        </button>
      </div>

      <a-alert v-if="errorMessage" :message="errorMessage" show-icon type="error" />

      <label v-if="mode === 'register'" class="account-panel__field">
        <span>显示名称</span>
        <a-input v-model:value="displayName" :maxlength="40" placeholder="你的名称" />
      </label>

      <label class="account-panel__field">
        <span>邮箱</span>
        <a-input v-model:value="email" :maxlength="254" placeholder="name@example.com" />
      </label>

      <label class="account-panel__field">
        <span>密码</span>
        <a-input-password
          v-model:value="password"
          :maxlength="128"
          placeholder="至少 8 个字符"
          @press-enter="submit"
        />
      </label>

      <a-button block :loading="busy" type="primary" @click="submit">
        {{ mode === 'login' ? '登录' : '创建账号' }}
      </a-button>

      <div class="account-panel__divider">
        <span>或</span>
      </div>

      <a-button block :loading="busy" @click="loginAsGuest">进入开发体验账号</a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.account-pill {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

.account-pill__points,
.account-pill__tier {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  white-space: nowrap;
}

.account-pill__points {
  border: 1px solid #ded6ff;
  background: #f4f1ff;
  color: #7251eb;
}

.account-pill__points strong {
  font-size: 12px;
}

.account-pill__points small {
  color: #8d78df;
  font-size: 9px;
}

.account-pill__tier {
  border: 1px solid #fedba1;
  background: linear-gradient(90deg, #fff5dc, #fff0c7);
  color: #9a6408;
  font-weight: 700;
}

.account-pill__tier :deep(svg),
.account-pill__points :deep(svg) {
  width: 12px;
  height: 12px;
}

.account-pill__avatar {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border: 1px solid #d9dce5;
  border-radius: 50%;
  background: linear-gradient(145deg, rgb(255 255 255 / 65%), transparent), #dfe2e8;
  color: #3d4350;
  font-size: 12px;
  font-weight: 800;
}

.account-panel {
  display: grid;
  gap: 16px;
}

.account-panel__summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e7e9ef;
  border-radius: 10px;
  background: #f8f9fb;
}

.account-panel__summary strong {
  font-size: 14px;
}

.account-panel__summary p {
  margin: 4px 0 0;
  color: #858e9d;
  font-size: 11px;
}

.account-panel__avatar {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 11px;
  background: #7251eb;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
}

.account-panel__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.account-panel__details div {
  padding: 12px;
  border: 1px solid #e7e9ef;
  border-radius: 9px;
}

.account-panel__details dt {
  color: #8992a0;
  font-size: 10px;
}

.account-panel__details dd {
  margin: 6px 0 0;
  color: #303641;
  font-size: 16px;
  font-weight: 800;
}

.account-panel__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-radius: 9px;
  background: #f2f4f7;
}

.account-panel__tabs button {
  height: 34px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #697283;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.account-panel__tabs button.active {
  background: #fff;
  color: #6544e8;
  box-shadow: 0 2px 8px rgb(29 38 59 / 8%);
}

.account-panel__field {
  display: grid;
  gap: 7px;
}

.account-panel__field > span {
  color: #5f6877;
  font-size: 11px;
  font-weight: 700;
}

.account-panel__divider {
  position: relative;
  height: 1px;
  background: #eceef2;
}

.account-panel__divider span {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 0 8px;
  background: #fff;
  color: #a0a7b3;
  font-size: 10px;
  transform: translate(-50%, -50%);
}

@media (max-width: 720px) {
  .account-pill__tier {
    display: none;
  }
}

@media (max-width: 520px) {
  .account-pill__points small,
  .account-pill__points :deep(svg) {
    display: none;
  }
}
</style>
