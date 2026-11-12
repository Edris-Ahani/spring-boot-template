import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { localEnvironment } from "./lib/environment.mjs";

const environment = localEnvironment();

function localOrigin(value, fallback) {
  const origin = new URL(value ?? fallback);
  if (origin.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
      || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Infrastructure smoke tests must target local development origins");
  }
  return origin;
}

const api = localOrigin(environment.SMOKE_API_URL, "http://localhost:8080");
const web = localOrigin(environment.SMOKE_WEB_URL, "http://localhost:3000");
const identity = localOrigin(environment.SMOKE_IDENTITY_URL, "http://localhost:8180");

async function request(origin, pathname, options = {}) {
  return fetch(new URL(pathname, origin), { ...options, redirect: "error", signal: AbortSignal.timeout(5000) });
}

async function waitUntilReady(origin, pathname) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const response = await request(origin, pathname);
      if (response.ok) return;
      await response.body?.cancel();
    } catch {}
    await setTimeout(1000);
  }
  throw new Error(`Service did not become ready: ${origin.origin}${pathname}`);
}

try {
  if (!environment.CATALOG_CLIENT_SECRET) throw new Error("Run npm run setup before the local smoke test");
  await Promise.all([
    waitUntilReady(api, "/readyz"),
    waitUntilReady(web, "/api/health/readiness"),
    waitUntilReady(identity, "/realms/platform/.well-known/openid-configuration"),
  ]);

  for (const [origin, pathname] of [[api, "/livez"], [web, "/api/health/liveness"]]) {
    const response = await request(origin, pathname);
    assert.equal(response.status, 200, "Live processes must expose a successful liveness probe");
    await response.body?.cancel();
  }
  const suffix = randomUUID();
  const reference = await request(api, "/docs");
  assert.equal(reference.status, 200, "The development stack must expose its Scalar API reference");
  assert((await reference.text()).includes("Foundry API Reference"));
  const specification = await request(api, "/docs/openapi.yaml");
  assert.equal(specification.status, 200, "Scalar must be able to fetch the canonical OpenAPI document");
  const source = await specification.text();
  assert(source.includes("openapi: 3.1.0") && source.includes("/api/v1/catalog:"));
  const item = { slug: `smoke-${suffix}`, name: `Verified platform ${suffix}`, description: "Created by the local infrastructure verification" };
  const unauthorized = await request(api, "/api/v1/catalog", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item),
  });
  assert.equal(unauthorized.status, 401, "Anonymous catalog writes must be rejected");
  const unauthorizedProblem = await unauthorized.json();
  assert.equal(unauthorizedProblem.requestId, unauthorized.headers.get("X-Request-ID"));
  assert.equal(unauthorizedProblem.instance, "/api/v1/catalog");

  const tokenResponse = await request(identity, "/realms/platform/protocol/openid-connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: "catalog-writer", client_secret: environment.CATALOG_CLIENT_SECRET }),
  });
  assert.equal(tokenResponse.status, 200, "Keycloak must issue a client credentials token");
  const token = await tokenResponse.json();
  assert.equal(typeof token.access_token, "string", "The identity provider must return an access token");
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.access_token}` },
    body: JSON.stringify(item),
  };
  const creation = await request(api, "/api/v1/catalog", options);
  assert.equal(creation.status, 201, "A real signed token must authorize catalog creation");
  const created = await creation.json();
  assert.equal(created.slug, item.slug, "The API must preserve the created slug");

  const duplicate = await request(api, "/api/v1/catalog", options);
  assert.equal(duplicate.status, 409, "PostgreSQL must enforce slug uniqueness");
  await duplicate.body?.cancel();
  const listing = await request(api, "/api/v1/catalog?size=50");
  assert.equal(listing.status, 200);
  const page = await listing.json();
  assert(page.items.some((entry) => entry.id === created.id), "The saved item must be readable through the API");
  const document = await request(web, "/");
  assert.equal(document.status, 200);
  assert((await document.text()).includes(item.name), "The Next.js page must render the persisted item");
  console.log("Infrastructure smoke test passed: readiness, Scalar reference, OpenAPI document, correlated errors, anonymous access denial, real OIDC, creation, persistence, uniqueness, and server rendering");
  console.log("One verification item was added to the local development catalog");
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message.split("\n")[0]
    : error instanceof Error ? error.message : "Infrastructure smoke test failed");
  process.exitCode = 1;
}
