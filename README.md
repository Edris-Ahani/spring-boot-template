# Foundry: Spring Boot, Next.js, and Podman

An extensible starting point with a modular backend, an explicit API contract, and container-based execution. The sample catalog demonstrates the complete path from the frontend to PostgreSQL. Reads are public; writes require a token with the `catalog:write` scope. The sample does not include end-user sign-in or an administration panel.

## Technology stack

| Area | Choice |
| --- | --- |
| Backend | Spring Boot 4.1.2, Java 25 LTS, Maven Wrapper |
| Data | PostgreSQL 18.6, Flyway, JPA with Open Session in View disabled |
| Security | Spring Security; JWT signature, issuer, audience, and scope validation; Keycloak 26.8.2 for development |
| Frontend | Next.js 16.4.6, React 19.3.1, TypeScript, Server Components, Zod |
| Infrastructure | Podman and Compose, with separate development and production configurations |
| Quality | JUnit, ArchUnit, Testcontainers, Vitest, Playwright, ESLint, GitHub Actions |

Versions were checked against official sources on November 11, 2026. Java dependencies follow the Spring Boot BOM; JavaScript dependencies are locked in `package-lock.json`.

## Quick start on Windows

Container execution requires Node.js 24, Podman with a running machine, and a Compose provider. Running the backend directly also requires JDK 25 and a correctly configured `JAVA_HOME`. The scripts do not install or reconfigure the Podman machine. Run these commands from the project root:

```bat
cmd /c npm run setup
cmd /c npm run doctor
cmd /c npm run stack:up
```

You do not need to install npm dependencies on the host to run the container stack. Image builds run sequentially, and each build checks for at least 2 GiB of free host disk space. At least 8 GB of free space is recommended for the first complete setup. Use `npm run stack:start` to restart the stack with existing images. Use `npm run stack:build` to build the images without starting services.

The `setup` command generates random development credentials without overwriting existing configuration. It does not print secret values. Keep `.env` private and restrict its NTFS permissions on Windows.

| Service | Local address |
| --- | --- |
| Web interface | http://localhost:3000 |
| Catalog API | http://localhost:8080/api/v1/catalog |
| Scalar API reference | http://localhost:8080/docs |
| OpenAPI document | http://localhost:8080/docs/openapi.yaml |
| Keycloak | http://localhost:8180 |
| PostgreSQL | localhost:15432 |

To stop this project's services while preserving database data:

```bat
cmd /c npm run stack:down
```

All published development ports bind to loopback. The development Compose configuration is unsuitable for public deployment. Read the [deployment guide](docs/deployment.md) and use the separate `infra/production/compose.yml` configuration.

## Development and testing

```bat
cmd /c npm ci
cmd /c npm run repository:check
cmd /c npm run repository:test
cmd /c npm run api:check
cmd /c npm run backend:unit
cmd /c npm run backend:verify
cmd /c npm run check
cmd /c npm test
cmd /c npm run build
cmd /c npm exec --workspace frontend -- playwright install chromium
cmd /c npm run test:e2e
cmd /c npm run test:api-reference
cmd /c npm run test:smoke
```

Backend integration tests require a Docker-compatible container socket and intentionally fail when it is unavailable. Browser tests use a controlled test API; they do not replace PostgreSQL integration tests or verification of the complete stack. See the [development guide](docs/development.md) for details.

Run `test:smoke` after starting the stack. It verifies the real Keycloak, API, PostgreSQL, and Next.js rendering flow. Each run leaves one test item in the local catalog.
Run `test:api-reference` against the running development stack to verify Scalar on desktop and mobile. This browser suite only reads catalog data.

## API structure and Scalar

The canonical contract in `contracts/openapi.yaml` drives the self-hosted Scalar reference and generated frontend types. It defines versioned routes, domain tags, request and response examples, bounded pagination, bearer authentication, and RFC 9457 errors with matching `X-Request-ID` and `requestId` values. Paste a short-lived access token into Scalar's Authorize control to test protected operations; never paste a client secret. Interactive writes create real data.

Documentation is enabled in local development and disabled by default and in production Compose. Scalar's JavaScript is bundled with the backend; the reference uses no external CDN or proxy and does not persist authentication in local storage. See the [API design guide](docs/api-design.md) for the conventions and extension workflow.

After changing the contract, run `npm run api:generate` and `npm run api:check`. Rebuild the backend image to publish the updated reference. CI validates the contract and checks generated types for drift.

## Agent reference repositories

```bat
cmd /c npm run skills:sync
```

Selected references from Superpowers, Matt Pocock's skills, Han, Vercel, and Playwright CLI are downloaded at pinned revisions and verified with hashes. This command does not install global plugins, hooks, or executable code from those repositories. See the [agent tooling guide](docs/agent-tooling.md) for the selection rationale and usage instructions.

## Further reading

All maintained documentation, explanations, comments, and agent instructions are written in English. The mandatory language policy is defined in [AGENTS.md](AGENTS.md). Claude, Gemini, Cursor, and Copilot entry points load or reference the same instructions. Run `npm run repository:check` and `npm run repository:test` to verify repository conventions.

- [Architecture and module boundaries](docs/architecture.md)
- [API conventions and Scalar](docs/api-design.md)
- [Development and troubleshooting](docs/development.md)
- [Security and limitations](docs/security.md)
- [Deployment, backups, and rollback](docs/deployment.md)
- [Official sources and versions](docs/sources.md)
- [Verification results and environment limitations](docs/verification.md)
- [OpenAPI contract](contracts/openapi.yaml)

Features such as end-user authentication, multitenancy, payments, queues, and caching require separate decisions based on actual business needs. They are not implemented in this template. Production use requires a review of the target environment and its requirements.
