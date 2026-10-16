<script setup lang="ts">
import { CrownFilled, ThunderboltFilled } from '@ant-design/icons-vue';
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/stores/session';

const sessionStore = useSessionStore();
const { initials, points } = storeToRefs(sessionStore);
</script>

<template>
  <div class="account-pill" aria-label="当前账户">
    <span class="account-pill__points">
      <ThunderboltFilled />
      <strong>{{ points }}</strong>
      <small>积分</small>
    </span>
    <span class="account-pill__tier">
      <CrownFilled />
      <span>普通用户</span>
    </span>
    <span class="account-pill__avatar">{{ initials }}</span>
  </div>
</template>

<style scoped>
.account-pill {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  color: var(--ink);
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
