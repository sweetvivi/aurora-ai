import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { appRoutes } from './routes';

describe('application routes', () => {
  it('registers the active product shells', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: appRoutes,
    });

    await router.push('/');
    await router.isReady();

    expect(router.resolve('/').matched[0]?.meta.shell).toBe('platform');
    expect(router.resolve('/map').matched[0]?.meta.shell).toBe('discovery');
    expect(router.resolve('/workbench').matched[0]?.meta.shell).toBe('workbench');
    expect(router.resolve('/draw').matched[0]?.meta.shell).toBe('platform');
    expect(router.resolve('/video').matched[0]?.meta.shell).toBe('platform');
    expect(router.resolve('/image-tools').matched[0]?.meta.shell).toBe('platform');
    expect(router.resolve('/agents/create').matched[0]?.meta.shell).toBe('platform');
    expect(router.resolve('/agents/code-mentor').matched[0]?.meta.shell).toBe('media');
    expect(router.resolve('/legacy').matched[0]?.meta.shell).toBe('legacy');
  });

  it('resolves unknown routes to the not-found page', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: appRoutes,
    });

    expect(router.resolve('/missing-page').name).toBe('not-found');
  });
});
