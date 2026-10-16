import { defineConfig, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss';

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      accent: '#e65f3c',
      brand: '#0f766e',
      ink: '#172033',
      line: '#dce2e8',
      muted: '#627083',
      surface: '#f5f7f9',
    },
  },
  shortcuts: {
    'surface-panel': 'border border-line bg-white rounded-6px shadow-sm',
    'muted-label': 'text-11px text-muted font-650 tracking-0.08em uppercase',
  },
});
