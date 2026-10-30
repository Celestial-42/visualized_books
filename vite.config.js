import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // relative base keeps the build working from a GitHub Pages project path
  base: './',
  plugins: [svelte({ preprocess: vitePreprocess() })]
});
