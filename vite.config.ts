/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';
import { execSync } from 'node:child_process';
import { viteApiPlugin } from './server/viteApi';

function gitSha(): string {
  try {
    return process.env.COMMIT_REF ?? execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(process.env.TRUSTSHIELD_E2E ? [viteApiPlugin()] : mode === 'test' ? [] : [netlify({ edgeFunctions: { enabled: false } })]),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(gitSha().slice(0, 7)),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
    // node_modules sits on a OneDrive-synced, virus-scanned disk here: DOM libraries take
    // seconds to load, so cap parallel workers and allow generous timeouts.
    maxWorkers: 2,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
}));
