import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  reporter: 'line',
  use: {
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    viewport: { width: 1600, height: 1000 },
  },
});
