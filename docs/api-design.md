# API structure and Scalar documentation

## Canonical contract

The [OpenAPI document](../contracts/openapi.yaml) is the single API contract. Maven packages the same file unchanged into the JAR. Scalar reads it from `/docs/openapi.yaml`, and frontend TypeScript types are generated from it. There is no separately maintained documentation schema. Scalar renders and exercises the contract; Java annotation-based contract generation is not enabled.

In the development stack, the interactive reference is available at http://localhost:8080/docs. The Catalog group includes request and response examples, pagination parameters, models, and error statuses. JavaScript comes from the official `com.scalar.maven:scalar-core:0.7.1` dependency and is served from the backend's origin. The browser needs no CDN or Scalar proxy. This module is independent of Spring Boot 3 auto-configuration.

## Shared operation conventions

| Concern | Convention |
| --- | --- |
| Routes | Resources under `/api/v1`; breaking changes require a new version |
| Grouping | Domain tags such as Catalog; unique, stable `operationId` values |
| Input | Explicit DTOs, JSON, and validation at the HTTP boundary |
| Success responses | Resource or page DTOs, without an additional generic envelope |
| Pagination | Zero-based `page` up to 10000; `size` from 1 to 50, defaulting to 12 |
| Ordering | `createdAt DESC, id DESC` for stable results |
| Identifiers and time | UUIDs and UTC timestamps in RFC 3339 format |
| Correlation | Server-generated `X-Request-ID` on responses; client identifiers are not trusted |
| Errors | RFC 9457 `application/problem+json`, actual HTTP statuses, and sanitized details |
| Security | Deny by default; public access must be explicit in both the contract and Spring Security |

The current contract exposes public `GET /api/v1/catalog` and `POST /api/v1/catalog` requiring `catalog:write`. New APIs belong in their feature packages and use only shared HTTP policy from `platform/web` and `platform/security`. Health and documentation paths are not business operations and are not listed in this contract.

## Errors

OpenAPI defines errors for 400, 401, 403, 406, 409, 415, and 500. Each problem includes `type`, `status`, `title`, `detail`, `instance`, and `requestId`. The `requestId` matches the response header. Body validation failures may include `invalidFields`, containing field names only. Responses do not expose exception messages, SQL, tokens, or submitted invalid values.

Undefined routes remain subject to the deny-by-default policy. Security may reject them with 401 or 403 before MVC handles the request.

## Test requests in Scalar

Catalog reads need no token. To create an item, paste a short-lived access token into the `bearerAuth` Authorize control. Scalar builds the Bearer header. The token needs a valid signature, the correct issuer, the `platform-api` audience, and the `catalog:write` scope. Never enter the Keycloak service client secret into a browser. Obtain tokens through a service or development tool.

Authentication is not persisted in local storage. Telemetry, Agent, and external proxying are disabled. The contract's relative server URL keeps requests on the current origin. CSP permits same-origin connections and scripts without `unsafe-inline` for scripts; inline styles required by Scalar are permitted. Interactive POST requests create real database records.

## Enablement

`platform.api-docs.enabled` defaults to `false`. The `local` profile and development Compose enable it. Production Compose explicitly sets `PLATFORM_API_DOCS_ENABLED=false`. When disabled, the documentation controller is absent and its routes are denied even with a valid token. Exposing production documentation is a separate deployment decision requiring an appropriate access policy.

## Add an API

1. Define the versioned route, tag, operation identifier, authorization, DTOs, examples, and response statuses in the contract.
2. Implement the controller, validation, application service, and matching security rules. Declare public access explicitly in both layers.
3. Generate frontend types and verify the contract:

```bat
cmd /c npm ci
cmd /c npm run api:generate
cmd /c npm run api:check
cmd /c npm run backend:unit
```

`api:check` runs Redocly lint and checks generated TypeScript for drift. The `recommended-strict` ruleset is enabled. The license requirement is disabled until a project license is selected, and the relative server `/` is intentionally allowed. Backend tests compare registered operations with the contract and check response fields, sanitized errors, correlation identifiers, documentation access, and byte-for-byte publication of the canonical file. These checks do not claim complete JSON Schema validation of all runtime data. Add behavior and boundary-value tests for each new feature.

4. Rebuild the backend image after changes. `stack:start` uses an existing image and does not rebuild source changes. The stack smoke test also checks Scalar and its contract.

After starting the stack and installing Playwright's Chromium, `npm run test:api-reference` verifies rendering and public GET execution through Scalar on desktop and mobile. These tests fail on external requests, JavaScript errors, or CSP violations. Set `PLAYWRIGHT_CHANNEL=msedge` to use an installed Edge browser, or `SMOKE_API_URL` for a different local API port. This suite does not create data.
