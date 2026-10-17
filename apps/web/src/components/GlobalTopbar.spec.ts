import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalTopbar from './GlobalTopbar.vue';

const apiMocks = vi.hoisted(() => ({
  fetchModuleDisplayConfigs: vi.fn(),
}));

vi.mock('@/app/api', async () => {
  const actual = await vi.importActual<typeof import('@/app/api')>('@/app/api');

  return {
    ...actual,
    ...apiMocks,
  };
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { component: { template: '<div />' }, path: '/' },
    { component: { template: '<div />' }, path: '/retouch' },
    { component: { template: '<div />' }, path: '/video' },
  ],
});

describe('GlobalTopbar global search', () => {
  beforeEach(async () => {
    apiMocks.fetchModuleDisplayConfigs.mockResolvedValue({
      items: [],
      source: 'defaults',
    });
    await router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('focuses with Ctrl+K and opens a matching result with Enter', async () => {
    const wrapper = mount(GlobalTopbar, {
      attachTo: document.body,
      global: {
        plugins: [createPinia(), router],
        stubs: {
          AccountPill: true,
          BrandMark: true,
        },
      },
    });
    const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        ctrlKey: true,
        key: 'k',
      }),
    );
    await nextTick();

    expect(document.activeElement).toBe(input.element);

    await input.setValue('抠图');
    await nextTick();

    const results = wrapper.findAll('[data-testid="global-search-result"]');
    expect(results[0]?.text()).toContain('智能修图');

    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/retouch');
    wrapper.unmount();
  });

  it('shows an empty state and opens video entries in a new window', async () => {
    const openMock = vi.spyOn(window, 'open').mockReturnValue(window);
    const wrapper = mount(GlobalTopbar, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          AccountPill: true,
          BrandMark: true,
        },
      },
    });
    const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');

    await input.trigger('focus');
    await input.setValue('不存在的功能');
    await nextTick();

    expect(wrapper.get('.global-topbar__search-empty').text()).toContain('没有找到匹配功能');

    await input.setValue('做视频');
    await nextTick();
    await input.trigger('keydown', { key: 'Enter' });

    expect(openMock).toHaveBeenCalledWith('/video', '_blank');
    expect(router.currentRoute.value.path).toBe('/');
    wrapper.unmount();
  });
});
