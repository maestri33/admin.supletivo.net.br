// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const isNode = process.env.DEPLOY_TARGET === 'node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: isNode
    ? node({ mode: 'standalone' })
    : cloudflare({ imageService: 'passthrough' }),
  redirects: {
    '/autenticacao/login': {
      status: 308,
      destination: '/login',
    },
    '/painel': {
      status: 308,
      destination: '/',
    },
    '/admin': {
      status: 308,
      destination: '/',
    },
    '/audit': {
      status: 308,
      destination: '/auditoria',
    },
    '/documents': {
      status: 308,
      destination: '/documentos',
    },
    '/finance': {
      status: 308,
      destination: '/financeiro',
    },
    '/hubs': {
      status: 308,
      destination: '/polos',
    },
    '/pricing': {
      status: 308,
      destination: '/precos',
    },
    '/training': {
      status: 308,
      destination: '/treinamento',
    },
    '/users': {
      status: 308,
      destination: '/usuarios',
    },
  },
  integrations: [svelte(), react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['zod'],
    },
  },
});
