/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const bodyApi = new URL(env.ASTRO_BODY_PREDICTION_URL || 'https://api-259997c9.fastapicloud.dev/predict');
  const mentalApi = new URL(env.ASTRO_MENTAL_PREDICTION_URL || 'https://mental.fastapicloud.dev/predict');
  const proxy = (api: URL) => ({ target: api.origin, changeOrigin: true, secure: true, rewrite: () => api.pathname });
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Astrohealth - Astronaut Health Monitoring',
        short_name: 'Astrohealth',
        description: 'Offline astronaut health self-assessment for deep space exploration',
        theme_color: '#EEF0F3',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/astrohealth-favicon-64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/astrohealth-logo-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api/prediction/body': proxy(bodyApi),
      '/api/prediction/mental': proxy(mentalApi)
    }
  },
  resolve: {
    alias: [
      { find: /^three$/, replacement: fileURLToPath(new URL('./node_modules/three/build/three.module.js', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }
    ]
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
  };
});
