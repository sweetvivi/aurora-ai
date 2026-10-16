<script setup lang="ts">
import { Button } from 'ant-design-vue';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <section class="not-found">
    <span class="not-found__code">404</span>
    <h1>没有找到这个页面</h1>
    <p>当前地址不在 M0 路由骨架中，可以返回工作台继续浏览已建入口。</p>
    <Button type="primary" size="large" @click="router.push('/')">返回工作台</Button>
  </section>
</template>

<style scoped>
.not-found {
  display: grid;
  min-height: 520px;
  place-items: center;
  align-content: center;
  gap: 12px;
  padding: 40px 18px;
  text-align: center;
}

.not-found__code {
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.not-found h1 {
  margin: 0;
  color: var(--ink);
  font-size: 32px;
}

.not-found p {
  max-width: 520px;
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}
</style>
