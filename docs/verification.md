# Verification record

## Review corrections and complete local verification: November 16, 2026

The review corrections add feature-wide architecture enforcement and invalid-fixture regression coverage, bounded safe failure diagnostics, explicit insert-only catalog persistence, and frontend pagination aligned with the API maximum. The frontend records sanitized failure categories and validated support identifiers instead of treating every failure as a network outage.

The compatibility workflow compares the current contract with the PR target commit or preceding push commit using pinned oasdiff v1.38.0. A real negative fixture proves that a response-type change is rejected. New contributor guidance maps the catalog reference files and explains the feature workflow. The `verify:quick` and `verify:full` entry points group the documented checks; the commands below were invoked individually in this verification.

| Check | Observed result |
| --- | --- |
| `npm run backend:verify` on Windows with Corretto 25.0.5 and Podman | 57 unit/security/architecture/contract tests and two real PostgreSQL integration tests passed; zero failures, errors, or skips |
| Insert query count | PostgreSQL creation prepared exactly one statement and inserted one entity; duplicate-slug HTTP behavior also passed |
| `npm test` | 20 frontend tests passed, including diagnostic redaction and the page-limit regression |
| `npm run check` and `npm run build` | ESLint, TypeScript, and the production Next.js build passed |
| `npm run api:compatibility:test` | Unchanged contract accepted; incompatible response type rejected with a breaking-change finding |
| `npm run api:compatibility` | Working contract passed comparison against local `HEAD` |
| `npm run api:check` | OpenAPI lint and generated-type drift checks passed |
| `npm run repository:check`, `npm run repository:test`, `npm run security:test` | Repository policies, nine validator tests, and four scanner-input tests passed |
| `npm run test:e2e` with Edge | Eight desktop/mobile tests passed and the command exited successfully |
| `npm run stack:up` and `npm run test:smoke` | Both application images rebuilt; real Keycloak, PostgreSQL, JWT access, persistence, uniqueness, and Next.js rendering passed |
| `npm run test:api-reference` with Edge | Four desktop/mobile Scalar browser tests passed |
| Workflow YAML and `git diff --check` | YAML parsed, Windows/baseline jobs checked statically, and whitespace checks passed |

An initial sandboxed frontend browser run completed its assertions but stalled while closing child processes. Only its verified test processes were stopped; the final run with the necessary process-management access exited normally. Backend integration tests used isolated Testcontainers PostgreSQL rather than the existing development database. The smoke test added one verification item to the local catalog.

The existing Podman machine was started without changing its resource settings. After testing, the project stack was stopped without deleting database volumes, and temporary verification tooling was removed. The portable JDK checksum was verified before execution; installed Java and persistent environment settings were unchanged. Hosted GitHub jobs and production deployment behavior were not executed or claimed as passing.

## Windows backend CI and response schema validation: November 16, 2026

The Windows Maven Wrapper now checks its cache directory link target before indexing it. A new Windows CI job uses JDK 25 and the project `backend:unit` command through Command Prompt. The existing Ubuntu backend job retains full PostgreSQL integration verification.

Backend contract tests now select response schemas by operation, status, and media type from the canonical OpenAPI 3.1 document. They validate populated and empty catalog pages, nested fields, format assertions, error responses, and documented response headers. Closed response objects preserve the explicit field policy. Nineteen validator regression cases cover valid data and malformed types, required fields, formats, patterns, lengths, bounds, collection sizes, additional fields, headers, statuses, and media types.

| Check | Observed result |
| --- | --- |
| `npm run backend:unit` on Windows with Corretto 25.0.5 | 54 tests passed; zero failures, errors, or skips |
| `npm run api:generate` and `npm run api:check` | Types regenerated without a generated-file diff; contract lint and type drift checks passed |
| `npm test` | 15 frontend tests passed |
| `npm run repository:check` and `npm run repository:test` | Repository policy checks and all nine validator tests passed |
| `git diff --check` | Passed |

Native verification used a temporary JDK archive from the official Corretto distribution after comparing its SHA-256 with the official checksum. `JAVA_HOME` and the Maven JVM user-home override were scoped to the test command; installed Java and machine configuration were not changed. The temporary toolchain was removed after verification. The final backend run used stable source and contract files; an earlier run overlapped a contract edit and failed the byte-for-byte publication test before the complete suite was rerun.

The GitHub workflow was edited locally, not executed on GitHub. Podman connectivity was unavailable, so `backend:verify`, container builds, smoke tests, and browser tests were not run in this phase. Response validation checks implementation against the current contract; it does not compare an edited contract with a previous released version.

## English documentation and shared agent policy: November 12, 2026

All maintained documentation was translated into English, including the architecture, development, security, deployment, API, agent tooling, source, ADR, and historical verification documents. Existing commands, technical decisions, dates, and observed test outcomes were preserved. The former translated README filename now contains an English pointer to the canonical README.

AGENTS.md defines the mandatory repository language policy. Claude Code and Gemini entry points import it; Cursor's always-applied rule and GitHub Copilot's repository instructions reference it. These files were checked statically; sessions were not launched in each AI client.

| Check | Observed result |
| --- | --- |
| Repository validator | Passed for maintained UTF-8 text, file names, JSON, local references, agent imports, and Cursor frontmatter |
| Validator regression suite | Nine tests passed; zero failures, cancellations, or skips |
| Independent Arabic-script search | No matches in maintained project files |
| Negative language cases | Persian Markdown with an RTL wrapper, source comments, Cursor rules, environment examples, presentation forms, supplementary Arabic characters, and other non-Latin letters were rejected |
| Private and generated files | Fixture checks confirmed that secrets, private environments, build output, dependencies, binary assets, and pinned vendor references remained excluded |

A dependency-free repository CI job now runs both the validator and its regression suite. The GitHub workflow was not executed remotely. Application behavior was not changed, so backend, frontend, container, and browser suites were not repeated for this documentation migration. No commit, push, deployment, or machine configuration change was performed.

## Scalar and shared API contract: November 12, 2026

| Check | Observed result |
| --- | --- |
| Maven `package` with Temurin 25.0.5 in Podman | JAR built successfully; 35 tests, zero failures, errors, or skips |
| Contract and problem tests | Registered operations match OpenAPI; success responses, 400, 401, 403, 406, 409, 415, and 500, request correlation, and sanitized details verified |
| Documentation access | Scalar and the contract readable when enabled; controller absent and access denied even with a valid token by default |
| Published specification | `/docs/openapi.yaml` byte-identical to the canonical contract |
| Redocly CLI 2.77.0 | Valid contract and examples under `recommended-strict`, with documented exceptions in `redocly.yaml` |
| openapi-typescript 7.13.0 | Types regenerated and checked for drift |
| TypeScript 5.9.3 | Strict checks passed for the two new browser configuration/test files; the complete frontend check was not repeated in this phase |
| Playwright 1.65.0 with Edge | Four desktop/mobile checks passed: Scalar rendering and real public GET execution, without a Bearer header, external requests, JavaScript errors, or CSP violations |
| Smoke test against the new JAR | Scalar, contract, correlated errors, real Keycloak, PostgreSQL persistence and uniqueness, and Next.js rendering passed |

Initial browser checks exposed Scalar automatic initialization interference and a placeholder token being sent for public GET requests. The host element identifier and global preferred authentication configuration were corrected. All four final browser tests passed without weakening CSP.

The initial Windows bind-mounted build failed on file metadata operations. Building in a temporary Linux directory succeeded. Tests used the existing JDK 25 image without mounting an engine socket. Testcontainers and `mvn verify` were not rerun in this phase; smoke tests used real PostgreSQL and Keycloak from the existing stack. Earlier integration checks have separate dated results below.

The new JAR ran temporarily on port 18080 with a non-root UID and read-only filesystem. Verification containers were removed afterward; original stack images and volumes were preserved. The main API image was not rebuilt in this phase, so publishing these source changes on port 8080 requires a rebuild. Host free space was below the build guard's 2 GiB minimum. Each smoke run created one local test record.

Contract validation and Scalar browser checks were added to CI, but the GitHub workflow was not executed in this phase. Both READMEs and the API guide were updated at that time. No commit or push was performed.

## Completed stack verification: November 12, 2026

| Check | Observed result |
| --- | --- |
| `mvn verify` on Corretto 25.0.5 | Passed: 24 unit, architecture, and security tests plus one integration test; zero failures, errors, or skips |
| Real PostgreSQL with Testcontainers | Flyway, schema validation, creation, reads, and uniqueness passed |
| Backend image | Built with Temurin 25 and ran with a non-root UID and read-only filesystem |
| Frontend image | Next.js built on Alpine; standalone output ran with a non-root UID and read-only filesystem |
| Linux lint and TypeScript | Passed |
| Linux Vitest | 15 tests passed |
| Complete Compose stack | PostgreSQL, identity database, Keycloak, API, and web started |
| `npm run test:smoke` | Liveness, readiness, anonymous write denial, real Keycloak token issuance, persistence, uniqueness, and Next.js rendering passed |
| `npm run stack:start` | Existing images started successfully without rebuilding |
| Low disk guard | Below 2 GiB free, the build stopped with a clear message before invoking Podman; nonzero exit was the expected result |

The Podman engine and standard named pipe were available during this verification, and Testcontainers ran natively on Windows. The Adoptium JDK download timed out; official Corretto was downloaded and its SHA-256 verified instead. Machine configuration and the WSL filesystem were not changed during this continuation.

A conflict with host port 5432 was resolved by publishing development PostgreSQL on 15432. The existing service was not stopped, and generated credentials were preserved. Smoke testing added local catalog items. Disk usage still requires attention: builds are sequential and guarded. The temporary frontend build layer was removed after testing while the runtime image was retained.

The GitHub workflow was updated to test the complete stack but was not run on GitHub. Production deployment, TLS for a real domain, and backup restoration were not verified locally. No commit, push, or external deployment was performed.

## Initial verification: November 11, 2026

Environment: Windows.

| Check | Observed result |
| --- | --- |
| Backend Surefire on JDK 25.0.5 | 24 tests passed, with zero failures, errors, or skips |
| Real JWT validation | Valid tokens accepted; invalid audience, issuer, expiration, and signature rejected, within the 24 tests above |
| Vitest | 15 tests passed across two files |
| ESLint and TypeScript | Passed |
| Next.js production build | Passed |
| Playwright with installed Edge | Eight desktop/mobile checks passed against a controlled test API |
| Generated types versus OpenAPI | Passed |
| Development Compose validation | Passed with the installed provider |
| Independent production Compose validation | Passed with test values, without starting services |
| `npm audit --omit=dev` | Zero known vulnerabilities at verification time |
| Source language, Markdown direction, and local links | Passed under the policy in effect at that time |
| Repeated setup | Existing configuration preserved without overwriting |
| PostgreSQL Testcontainers | Failed: a Docker-compatible runtime was unavailable; one error and zero skips |
| Podman image builds | Failed: insufficient disk space, read-only filesystem errors, and engine connectivity loss |

## Initial environment limitations: November 11, 2026

Chromium download failed with `ENOSPC`; browser tests used the installed Edge browser. Concurrent image builds consumed remaining space, and Podman/WSL became unavailable. Temporary JDK files and reproducible outputs were removed. Restarting the machine failed with `Wsl/Service/CreateInstance/E_FAIL`. The WSL filesystem was not repaired, removed, or recreated.

The integration test was not reported as passing or skipped. Passing 24 backend tests did not establish that `mvn verify` succeeded. Likewise, a local Next.js build did not establish that its Linux image ran successfully. The CI workflow was prepared but not executed on GitHub.

After the initial environment limitations, these commands were recommended. Backend verification and actual stack execution were subsequently confirmed on November 12, as recorded above:

```bat
cmd /c npm ci
cmd /c npm run backend:verify
cmd /c npm run stack:up
```

Native backend verification requires JDK 25 and a compatible container socket. The [development guide](development.md) explains Podman setup and the difference between CLI connectivity and socket availability. No commit, push, or deployment was performed.
