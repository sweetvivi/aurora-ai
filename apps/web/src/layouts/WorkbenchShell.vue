<script setup lang="ts">
import { RouterView } from 'vue-router';
import GlobalTopbar from '@/components/GlobalTopbar.vue';

const settings = [
  { label: '文档类型', value: '研究报告' },
  { label: '输出语言', value: '简体中文' },
  { label: '篇幅与结构', value: '标准章节' },
  { label: '引用来源', value: '允许联网' },
];
const history = ['季度业务复盘', '产品发布方案', '会议纪要整理'];
</script>

<template>
  <div class="workbench-shell">
    <GlobalTopbar />

    <div class="workbench-shell__body">
      <aside class="workbench-shell__panel workbench-shell__panel--left">
        <div class="workbench-shell__panel-heading">
          <span class="muted-label">生成设置</span>
          <small>自动应用</small>
        </div>
        <button
          v-for="item in settings"
          :key="item.label"
          class="workbench-shell__setting"
          type="button"
        >
          <span>
            <small>{{ item.label }}</small>
            <strong>{{ item.value }}</strong>
          </span>
          <i aria-hidden="true">›</i>
        </button>
        <div class="workbench-shell__tip">
          <strong>写作提示</strong>
          <p>在正文中粘贴大纲或资料，生成结果会更贴近你的目标。</p>
        </div>
      </aside>

      <main class="workbench-shell__main">
        <RouterView />
      </main>

      <aside class="workbench-shell__panel workbench-shell__panel--right">
        <div class="workbench-shell__panel-heading">
          <span class="muted-label">最近文档</span>
          <small>{{ history.length }} 篇</small>
        </div>
        <button
          v-for="item in history"
          :key="item"
          class="workbench-shell__history-item"
          type="button"
        >
          <span class="workbench-shell__history-mark" aria-hidden="true" />
          <span>
            <strong>{{ item }}</strong>
            <small>刚刚编辑</small>
          </span>
          <i aria-hidden="true">›</i>
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.workbench-shell {
  display: grid;
  min-height: 100vh;
  grid-template-rows: 56px minmax(0, 1fr);
  overflow: hidden;
  background: #f1f3f6;
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
  gap: 7px;
}

.workbench-shell__panel-heading {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.workbench-shell__panel-heading small {
  color: #a1a8b3;
  font-size: 8px;
}

.workbench-shell__setting {
  display: grid;
  width: 100%;
  align-items: center;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.workbench-shell__setting:hover,
.workbench-shell__history-item:hover {
  border-color: #c8d2d9;
}

.workbench-shell__setting > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.workbench-shell__setting small {
  color: #9aa2ad;
  font-size: 8px;
}

.workbench-shell__setting strong {
  overflow: hidden;
  color: #465365;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-shell__setting i,
.workbench-shell__history-item > i {
  color: #aeb5bf;
  font-size: 14px;
  font-style: normal;
}

.workbench-shell__tip {
  margin-top: 9px;
  padding: 12px;
  border: 1px solid #e3e5ee;
  border-radius: 7px;
  background: #f4f2ff;
}

.workbench-shell__tip strong {
  color: #6548c9;
  font-size: 10px;
}

.workbench-shell__tip p {
  margin: 6px 0 0;
  color: #797d93;
  font-size: 9px;
  line-height: 1.65;
}

.workbench-shell__history-item {
  display: grid;
  width: 100%;
  align-items: center;
  gap: 8px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-top: 2px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.workbench-shell__history-mark {
  width: 7px;
  height: 34px;
  border-radius: 999px;
  background: #dce5f5;
}

.workbench-shell__history-item > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.workbench-shell__history-item strong {
  overflow: hidden;
  color: #4d5867;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-shell__history-item small {
  color: #9da5b0;
  font-size: 8px;
}

.workbench-shell__main {
  min-width: 0;
  overflow-y: auto;
  background: #fff;
}

@media (max-width: 900px) {
  .workbench-shell {
    min-height: 100vh;
    overflow: visible;
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
