import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 300000,
  // Las herramientas que usan FFmpeg WASM (30,7 MB) necesitan memoria y
  // tiempo; con 4 workers en paralelo el navegador se ahoga y los tests
  // se quedan colgados. Con 2 workers son estables.
  workers: 2,
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
