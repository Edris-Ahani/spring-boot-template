# Architecture

The backend is a single application organized by feature. This keeps transactions and deployment straightforward, while ArchUnit checks the code boundaries. Introduce an independent service only when there is a demonstrated operational need or a team requires independent ownership.

```text
Browser
  -> Next.js Server Component
    -> Catalog HTTP API
      -> CatalogService (transaction)
        -> CatalogRepository
          -> JpaCatalogRepository
            -> PostgreSQL
```

## Code boundaries

- `catalog/domain`: business rules and immutable data, without Spring, HTTP, or JPA dependencies.
- `catalog/application`: use cases, transaction boundaries, and the persistence port. Both the JPA adapter and an in-memory test adapter implement that port.
- `catalog/persistence`: entities and Spring Data, with package-private access where appropriate to prevent direct consumption.
- `catalog/web`: explicit DTOs, input validation, and HTTP mapping.
- `platform`: security configuration, problem responses, request identifiers, and API documentation.

Pagination is bounded to a maximum page size of 50 and page number of 10000. The order `created_at DESC, id DESC` has a matching index. The current model has no lazy relationships; new features must review their query plans and N+1 risks independently. Total counts and offset pagination suit this example. Move to cursor pagination for larger datasets when performance evidence justifies it.

Flyway is the only schema migration authority, and Hibernate only validates the schema. Never edit an applied migration. Timestamps use UTC. Virtual threads do not give the database unlimited capacity; the default connection pool has 10 connections.

## Frontend and contract

Server Components read data directly over the internal network. Backend addresses and secrets do not enter the browser bundle. Data loading and readiness have independent Suspense boundaries. Only the refresh button needs a Client Component. API failures expose a recoverable state; fabricated data never replaces a failed real response.

The contract lives in `contracts/openapi.yaml`, and TypeScript types are generated from it. Zod validates external responses at runtime. Review the contract, schemas, and tests together whenever a DTO changes. Type generation alone does not prove full equivalence between the Java implementation and OpenAPI.

Scalar displays the same contract at `/docs`. Maven packages the canonical file into the JAR without a manually maintained copy. The backend serves the official Scalar bundle, and documentation routes are permitted only when the documentation setting is enabled. See the [API design guide](api-design.md) for the shared error contract and the workflow for adding operations.

```bat
cmd /c npm run api:generate
cmd /c npm run api:check
```

## Recorded decisions

- [Modular backend application](adr/backend-modular-application.md)
- [Bearer resource server security](adr/auth-bearer-resource-server.md)

Redis, Kafka, Kubernetes, an event bus, and generic repositories are not included because the current behavior does not require them.
