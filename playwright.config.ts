import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
export default defineConfig({
  timeout: 60000, expect: { timeout: 15000 }, testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4178', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'node server/index.mjs', url: 'http://127.0.0.1:4178/api/health', reuseExistingServer: false, env: { SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', PORT: '4178', HOST: '127.0.0.1', DATA_DIR: mkdtempSync(path.join(tmpdir(), 'agrotrace-browser-')) } }
});
