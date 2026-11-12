import { defineConfig, devices } from "@playwright/test";

const origin = new URL(process.env.SMOKE_API_URL ?? "http://localhost:8080");
if (origin.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
    || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("API reference browser tests must target a local development origin");
}

export default defineConfig({
  testDir: "./api-e2e",
  outputDir: "./test-results/api-reference",
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: origin.origin,
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
});
