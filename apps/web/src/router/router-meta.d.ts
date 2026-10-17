import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAdmin?: boolean;
    shell?: 'discovery' | 'legacy' | 'media' | 'platform' | 'standalone' | 'workbench';
    title?: string;
  }
}
