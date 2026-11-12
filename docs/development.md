# Development and troubleshooting

## Local tools

For native development, `JAVA_HOME` must point to JDK 25, and Java on `PATH` should preferably use the same version. Container execution does not require a host JDK. A global Maven installation is unnecessary: the official wrapper under `backend` downloads the distribution specified in its properties file. The portable JDK used for initial verification was removed afterward and is not part of this project.

`npm run doctor` checks tool versions, Podman connectivity, the Compose provider, and local configuration availability. It also recognizes Podman in its usual per-user Windows installation directory. Set `PODMAN_BIN` for a custom installation. This command does not create or start a virtual machine.

When preparing Podman manually, run `podman machine init` only if no machine exists, then `podman machine start`. Do not reconfigure an existing machine without reviewing it. On Windows, Podman uses a Linux machine backed by WSL. Install a Compose provider separately.

## Development with reload

```bat
cmd /c npm run infra:up
cmd /c npm run dev --workspace frontend
```

The frontend uses its own `.env.local` backend address. To run the backend in an IDE, launch `PlatformApplication` with JDK 25 and add the root `.env` variables to the IDE run configuration. Spring Boot does not automatically load the root dotenv file. The IDE environment must include the `local` profile and the generated database password.

The default PostgreSQL host port is 15432 to avoid a common local PostgreSQL installation on 5432. If you change `POSTGRES_PORT`, update `DATABASE_URL` for native execution as well. Container-to-container connections still use port 5432.

`npm run stack:up` builds images sequentially and then starts services. Each build requires at least 2 GiB of free host disk space; at least 8 GB is recommended for the first complete run. `npm run stack:start` starts existing images, and `npm run stack:build` only builds them. Rebuild an image after changing its source.

## Verification layers

| Command | Coverage |
| --- | --- |
| `npm run repository:check` | English repository text, valid JSON, local links, and shared agent entry points |
| `npm run repository:test` | Regression checks for the repository policy validator |
| `npm run backend:unit` | Domain rules, application services, architecture boundaries, HTTP validation, and JWT security |
| `npm run backend:verify` | The checks above plus Flyway/JPA against real PostgreSQL through Testcontainers |
| `npm run api:check` | OpenAPI validity, examples, references, and generated type drift |
| `npm run test:api-reference` | Scalar rendering and real GET requests on desktop and mobile; requires the development stack |
| `npm run check` | ESLint and TypeScript |
| `npm test` | Contract validation, page parameters, and the frontend HTTP adapter |
| `npm run build` | Next.js production build |
| `npm run test:e2e` | Rendering, API failures, keyboard access, and mobile/desktop layouts |
| `npm run test:smoke` | Real Keycloak, JWT, API, PostgreSQL, slug uniqueness, and Next.js rendering |

The application browser suite runs after the build, starts two dedicated test servers, and stops them after testing. Ports 3100 and 19090 must be available. Its data comes from fixtures; backend integration tests prove real PostgreSQL connectivity.

If Chromium cannot be downloaded, set `PLAYWRIGHT_CHANNEL=msedge` to use the installed Edge browser. CI downloads the browser matching the pinned Playwright version by default.

JWT tests use an ephemeral RSA key and local JWK server. They verify valid tokens and reject invalid issuers, audiences, signatures, and expiration times. Tokens are not printed.

The smoke test accepts only local HTTP origins and does not follow redirects. Start the stack with `stack:up` or `stack:start` first. The test reads the development service secret within its own process without printing it and leaves one test item in the local database per run. Use `SMOKE_API_URL`, `SMOKE_WEB_URL`, and `SMOKE_IDENTITY_URL` for custom local ports.

## API reference

After starting the development stack, Scalar is available at http://localhost:8080/docs. The contract is served at `/docs/openapi.yaml`. After changing the contract, run `npm run api:generate` and `npm run api:check`. See the [API design guide](api-design.md) for routing, errors, security, and feature extension conventions.

## Testcontainers and Podman

On Windows, `DOCKER_HOST` commonly points to the machine's named pipe:

```text
npipe:////./pipe/podman-machine-default
```

Get the actual path from `podman machine inspect`. An SSH connection for the CLI does not imply that the pipe is active. If the pipe is absent, setting an environment variable alone cannot make integration tests connect. Start or repair machine forwarding according to the Podman documentation. Linux CI runs these tests with a compatible runtime.

On Linux, activate the socket for the appropriate Podman user and point `DOCKER_HOST` at its actual location. For a remote runtime, `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` must refer to the socket path inside the machine. Follow the [official Testcontainers guide](https://java.testcontainers.org/supported_docker_environment/) when changing Ryuk or rootless behavior. Do not disable Ryuk merely to make tests pass.

## Version control boundaries

The root `.gitignore` excludes private environment files, credentials and keystores, Maven/Next.js output, dependency caches, test reports, browser authentication state, local agent sessions, downloaded references, database backups, logs, and IDE/OS files.

Keep placeholder-only environment examples, `package-lock.json`, Maven Wrapper files, Flyway migrations, OpenAPI contracts, generated API types, and shared agent instructions in version control. In particular, `frontend/src/lib/api.generated.ts` is maintained for contract drift checks. Next.js regenerates `next-env.d.ts` during `next typegen`, development, or build, so that file is ignored.

An ignore rule does not remove a file that Git already tracks. Review tracked files and the staged diff before publishing. The project scripts do not initialize Git, untrack files, commit, or push automatically.

## Common failures

- Placeholder errors: check backend process environment variables without printing secrets into logs.
- HTTP 401: check the token signature, expiration, issuer, and audience.
- HTTP 403: the scope claim must grant `catalog:write`.
- HTTP 409: slugs must be unique; the database constraint covers concurrent creation.
- Changing a password in `.env` does not update PostgreSQL credentials on an existing volume or a previously imported Keycloak client. Rotate credentials through the service's own tooling; do not delete data to resolve a mismatch.
- Realm configuration is imported when the realm is created. Editing the import file does not automatically update an existing realm.
