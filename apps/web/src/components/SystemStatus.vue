<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { fetchHealth } from '@/app/api';

const healthQuery = useQuery({
  queryKey: ['system-health'],
  queryFn: fetchHealth,
  refetchInterval: 30_000,
  retry: 1,
});

const state = computed(() => {
  if (healthQuery.isSuccess.value) {
    const dependencies = healthQuery.data.value?.dependencies;
    const allUp = dependencies?.database === 'up' && dependencies.redis === 'up';

    return allUp
      ? {
          className: 'system-status--up',
          label: '服务正常',
        }
      : {
          className: 'system-status--degraded',
          label: '依赖异常',
        };
  }

  if (healthQuery.isError.value) {
    return {
      className: 'system-status--down',
      label: 'API 离线',
    };
  }

  return {
    className: 'system-status--pending',
    label: '检测中',
  };
});
</script>

<template>
  <div class="system-status" :class="state.className" :title="state.label">
    <span class="system-status__dot" aria-hidden="true" />
    <span>{{ state.label }}</span>
  </div>
</template>

<style scoped>
.system-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.system-status__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px rgb(98 112 131 / 10%);
}

.system-status--up {
  color: #0c7f73;
}

.system-status--degraded,
.system-status--pending {
  color: #a45b13;
}

.system-status--down {
  color: #bd3d2d;
}

@media (max-width: 640px) {
  .system-status {
    width: 30px;
    justify-content: center;
    padding: 0;
  }

  .system-status > span:last-child {
    display: none;
  }
}
</style>
