# Add a feature with a coding assistant

Read [AGENTS.md](../AGENTS.md), [architecture](architecture.md), and [API conventions](api-design.md) first. The catalog is the maintained reference implementation. Keep changes within one feature unless a shared policy actually needs to change.

## Find the relevant files

| Responsibility | Catalog reference |
| --- | --- |
| Business invariants and immutable values | [CatalogItem](../backend/src/main/java/com/acme/platform/catalog/domain/CatalogItem.java) |
| Use cases, transactions, and persistence port | [CatalogService](../backend/src/main/java/com/acme/platform/catalog/application/CatalogService.java), [CatalogRepository](../backend/src/main/java/com/acme/platform/catalog/application/CatalogRepository.java) |
| Database mapping and queries | [JpaCatalogRepository](../backend/src/main/java/com/acme/platform/catalog/persistence/JpaCatalogRepository.java), [CatalogItemEntity](../backend/src/main/java/com/acme/platform/catalog/persistence/CatalogItemEntity.java) |
| HTTP DTOs and validation | [CatalogController](../backend/src/main/java/com/acme/platform/catalog/web/CatalogController.java) |
| Routes, models, examples, and error contracts | [OpenAPI](../contracts/openapi.yaml) |
| Authorization policy | [SecurityConfiguration](../backend/src/main/java/com/acme/platform/platform/security/SecurityConfiguration.java) |
| Server-side reads and response validation | [Backend adapter](../frontend/src/lib/backend.ts), [catalog schemas](../frontend/src/lib/catalog-schema.ts) |
| Independent architecture checks | [ArchitectureTest](../backend/src/test/java/com/acme/platform/architecture/ArchitectureTest.java) |
| HTTP contract checks | [CatalogApiContractTest](../backend/src/test/java/com/acme/platform/catalog/web/CatalogApiContractTest.java), [OpenApiContract](../backend/src/test/java/com/acme/platform/support/OpenApiContract.java) |
| Real persistence checks | [CatalogPostgresIT](../backend/src/test/java/com/acme/platform/catalog/CatalogPostgresIT.java) |

## Implement one vertical slice

1. Describe the user-visible behavior, access policy, invariants, and important failure cases. Read the existing implementation and tests before editing. Identify existing callers when changing a shared interface.
2. Define the HTTP contract first: versioned route, operation identifier, request/response shapes, limits, examples, scopes, and error statuses. Preserve existing versioned operations. Adding a new API version does not authorize removing an older version.
3. Place the feature under `com.acme.platform.<feature>` with `domain`, `application`, `persistence`, and `web` packages as needed. Keep domain rules independent of Spring, HTTP, JPA, JDBC, Hibernate, and shared infrastructure. Application services own transactions; adapters own transport and entity mapping.
4. Expose a small `<feature>.api` package only if another feature needs an interface. Do not import another feature's domain, application, persistence, or web internals. Feature dependencies must stay acyclic. Shared `platform` code contains technical policies and must not acquire business dependencies.
5. Create a new Flyway migration for schema changes. Preserve already applied migrations. Review indexes, query plans, uniqueness races, transaction boundaries, and database permissions. The catalog's create-only adapter uses `persist` for assigned IDs and flushes before returning so uniqueness errors keep their existing HTTP behavior. Design updates separately; do not assume a create operation also updates detached entities.
6. Add explicit DTO validation and explicit Spring Security matchers. Undefined operations remain denied. Adding cookie authentication requires a separate CSRF decision. Do not put a service-client secret into the frontend or browser.
7. Regenerate frontend types with `npm run api:generate`. Update runtime Zod schemas, the server-side backend adapter, and relevant views together. Preserve timeouts, safe failure diagnostics, recoverable UI states, and pagination limits. A generated type does not enforce runtime constraints by itself.
8. Add tests at the meaningful seams: domain invariants, application behavior, authenticated/unauthenticated HTTP requests, populated and empty responses, and real PostgreSQL behavior. Use the shared response validator with the method and path so schema selection follows the documented status and media type. If you add another application service, supply its test dependency in the MVC slice; keep discovery of all business controllers enabled.
9. Compare the edited contract with its Git baseline. A runtime response test can pass when code and contract break compatibility together. `npm run api:compatibility -- <base-ref>` provides the separate compatibility check. Do not hide a breaking finding with an ignore rule or by editing the baseline; design a compatible change or introduce a new version while retaining the old one.
10. After adding or removing maintained template files, review the copy inventory and run `npm run template:sync`, `npm run template:check`, and `npm run template:test`. Run the checks below, review the complete diff, and report exact results. Keep unrelated work, credentials, local outputs, and temporary files out of the change. Create a local commit only when explicitly requested; leave remote pushes to the user.

On Windows, prefix commands with `cmd /c`. On Linux and macOS, run npm commands directly.

## Verify the change

`npm run verify:quick` runs repository policy checks, project-generator and scanner-input tests, OpenAPI and generated-type checks, frontend lint/types/unit tests, and backend unit/security/architecture/contract tests. It needs installed JavaScript dependencies and JDK 25 but no container socket.

`npm run verify:full` runs the same shared checks with complete backend verification, then compatibility regression and baseline checks, the production frontend build, browser suites, and the real stack smoke test. Prepare a compatible container socket, Go 1.26 or newer for the pinned compatibility tool, a Playwright browser, and a running development stack first. CI selects Go 1.27.1. The smoke test creates one catalog record. A missing prerequisite must fail the check; do not substitute a different database or silently skip a suite.

For a local baseline, compatibility defaults to `HEAD` versus the working tree. Pass a release tag or target-branch commit to check a larger change. CI uses the PR target commit, or the previous commit from a push event. Initial API introduction is reported explicitly when no prior contract exists. Hosted CI still needs to run before claiming that its platform checks passed.

## Report evidence

State what changed and why, which checks ran, their results, and any unverified runtime or hosted-CI behavior. Include the relevant files and material limitations. Follow the [safe logging policy](security.md); exception messages, bodies, URLs with credentials, arbitrary correlation headers, and raw stack traces are not diagnostic output.
