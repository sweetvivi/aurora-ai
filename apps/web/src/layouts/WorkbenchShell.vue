<script setup lang="ts">
import { RouterView } from 'vue-router';
import AccountPill from '@/components/AccountPill.vue';
import BrandMark from '@/components/BrandMark.vue';
import StatusBadge from '@/components/StatusBadge.vue';

const settings = ['文档类型', '输出语言', '篇幅与结构', '引用来源'];
const history = ['季度业务复盘', '产品发布方案', '会议纪要整理'];
</script>

<template>
  <div class="workbench-shell">
    <header class="workbench-shell__header">
      <BrandMark />
      <div class="workbench-shell__title">
        <StatusBadge tone="brand">Workbench</StatusBadge>
        <strong>文档工作台</strong>
      </div>
      <AccountPill />
    </header>

    <div class="workbench-shell__body">
      <aside class="workbench-shell__panel workbench-shell__panel--left">
        <span class="muted-label">生成设置</span>
        <div v-for="item in settings" :key="item" class="workbench-shell__setting">
          <span>{{ item }}</span>
          <span aria-hidden="true">+</span>
        </div>
      </aside>

      <main class="workbench-shell__main">
        <RouterView />
      </main>

      <aside class="workbench-shell__panel workbench-shell__panel--right">
        <span class="muted-label">最近文档</span>
        <button
          v-for="item in history"
          :key="item"
          class="workbench-shell__history-item"
          type="button"
        >
          <span>{{ item }}</span>
          <small>草稿</small>
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.workbench-shell {
  display: grid;
  height: 100vh;
  grid-template-rows: 62px minmax(0, 1fr);
  overflow: hidden;
  background: #edf0f2;
}

.workbench-shell__header {
  display: grid;
  align-items: center;
  gap: 20px;
  grid-template-columns: minmax(150px, 1fr) auto minmax(150px, 1fr);
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.workbench-shell__title {
  display: flex;
  align-items: center;
  gap: 9px;
}

.workbench-shell__title strong {
  color: var(--ink);
  font-size: 13px;
}

.workbench-shell__header > :last-child {
  justify-self: end;
}

.workbench-shell__body {
  display: grid;
  min-height: 0;
  gap: 1px;
  grid-template-columns: 230px minmax(0, 1fr) 250px;
  background: var(--line);
}

.workbench-shell__panel {
  min-width: 0;
  overflow-y: auto;
  padding: 20px 16px;
  background: #f8fafb;
}

.workbench-shell__panel--left {
  display: grid;
  align-content: start;
  gap: 8px;
}

.workbench-shell__setting,
.workbench-shell__history-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  color: #465365;
  font-size: 12px;
  text-align: left;
}

.workbench-shell__history-item {
  margin-top: 8px;
  cursor: pointer;
}

.workbench-shell__history-item:hover {
  border-color: #b8c7ca;
}

.workbench-shell__history-item small {
  color: #8a96a5;
  font-size: 9px;
}

.workbench-shell__main {
  min-width: 0;
  overflow-y: auto;
  background: #fff;
}

@media (max-width: 900px) {
  .workbench-shell {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .workbench-shell__header {
    grid-template-columns: 1fr auto;
  }

  .workbench-shell__title {
    display: none;
  }

  .workbench-shell__body {
    display: block;
    background: transparent;
  }

  .workbench-shell__panel {
    display: none;
  }
}
</style>
