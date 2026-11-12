import { expect, test } from "@playwright/test";

let externalRequests: string[];
let browserErrors: string[];

test.beforeEach(async ({ page, baseURL }) => {
  externalRequests = [];
  browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && /content security policy/i.test(message.text())) {
      browserErrors.push(message.text());
    }
  });
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL) {
      externalRequests.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "Foundry Catalog API", exact: true })).toBeVisible();
});

test.afterEach(() => {
  expect(externalRequests, "The reference must work without external requests").toEqual([]);
  expect(browserErrors, "The reference must not produce JavaScript or CSP errors").toEqual([]);
});

test("renders the contract and authentication controls without developer promotions", async ({ page }) => {
  await expect(page.getByText("Public catalog reads and scoped catalog creation.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Authentication/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Developer Tools/ })).toHaveCount(0);
});

test("executes a public catalog request directly through the embedded client", async ({ page }) => {
  await page.getByRole("button", { name: /^Test Request.*get \/api\/v1\/catalog/i }).click();
  const responsePromise = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/v1/catalog" && response.request().method() === "GET";
  });
  await page.getByRole("button", { name: /Send get request to/ }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(await response.request().headerValue("authorization")).toBeNull();
  expect(response.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  const body = await response.json();
  expect(Array.isArray(body.items)).toBe(true);
  expect(body.size).toBeLessThanOrEqual(50);
});
