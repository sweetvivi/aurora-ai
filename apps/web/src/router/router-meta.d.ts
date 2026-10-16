import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    shell?: 'discovery' | 'legacy' | 'media' | 'platform' | 'workbench';
    title?: string;
  }
}
