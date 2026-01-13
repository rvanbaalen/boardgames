import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://rvanbaalen.github.io',
  base: '/boardgames',
  integrations: [react()],
  output: 'static',
});
