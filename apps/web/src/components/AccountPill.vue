<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/stores/session';

const sessionStore = useSessionStore();
const { initials, points, tier } = storeToRefs(sessionStore);
</script>

<template>
  <div class="account-pill" aria-label="当前账户">
    <span class="account-pill__avatar">{{ initials }}</span>
    <span class="account-pill__copy">
      <strong>{{ tier }}</strong>
      <small>{{ points }} 积分</small>
    </span>
  </div>
</template>

<style scoped>
.account-pill {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 5px 9px 5px 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
}

.account-pill__avatar {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  border-radius: 50%;
  background: #d8f0ec;
  color: #0a5d57;
  font-size: 12px;
  font-weight: 760;
}

.account-pill__copy {
  display: grid;
  min-width: 0;
  line-height: 1.1;
}

.account-pill__copy strong,
.account-pill__copy small {
  overflow: hidden;
  max-width: 94px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-pill__copy strong {
  color: var(--ink);
  font-size: 11px;
  font-weight: 680;
}

.account-pill__copy small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

@media (max-width: 640px) {
  .account-pill__copy {
    display: none;
  }

  .account-pill {
    padding-right: 5px;
  }
}
</style>
