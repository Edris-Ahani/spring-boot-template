import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "node e2e/backend-fixture.mjs", url: "http://127.0.0.1:19090/readyz", reuseExistingServer: false },
    { command: "npm run start", url: "http://127.0.0.1:3100/api/health/liveness", reuseExistingServer: false,
      env: { BACKEND_URL: "http://127.0.0.1:19090", HOSTNAME: "127.0.0.1", PORT: "3100" }, timeout: 60000 },
  ],
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
