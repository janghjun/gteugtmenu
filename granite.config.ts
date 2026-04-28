import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'food-time-quiz',

  brand: {
    displayName: '먹퀴즈',
    primaryColor: '#3182F6',
    icon: 'https://gteugtmenu-app.vercel.app/assets/icons/icon-light.png',
  },

  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite dev',
      build: 'vite build',
    },
  },

  permissions: [],

  outdir: 'dist',
})
