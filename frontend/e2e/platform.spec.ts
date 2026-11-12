import { expect, test } from "@playwright/test";

test("renders catalog data through the server-side backend adapter", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("strong foundation");
  await expect(page.getByRole("heading", { name: "Reference Platform" })).toBeVisible();
  await expect(page.getByText("API ready", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Catalog pagination" })).toContainText("1 items");
});

test("shows a recoverable state when catalog requests fail", async ({ page }) => {
  await page.goto("/?page=1");
  await expect(page.getByRole("heading", { name: "Your API is not reachable yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toHaveCount(2);
});

test("fits the viewport and supports keyboard access", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Reference Platform" })).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("exposes independent liveness and dependency-aware readiness", async ({ request }) => {
  expect((await request.get("/api/health/liveness")).status()).toBe(200);
  expect((await request.get("/api/health/readiness")).status()).toBe(200);
});
