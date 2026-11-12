# Sources and version selection

The original runtime sources were checked on November 11, 2026. Runtime versions were selected from official metadata and Maven/npm releases. A version described as current at verification time is not guaranteed to remain the latest.

- [Spring Boot and stable releases](https://docs.spring.io/spring-boot/)
- [Java and build requirements](https://docs.spring.io/spring-boot/system-requirements.html)
- [Dependency management with the BOM](https://docs.spring.io/spring-boot/reference/using/build-systems.html)
- [Spring Initializr](https://start.spring.io/) for the official Maven Wrapper and Spring Boot 4 starter names
- [JWT Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
- [Testcontainers service connections](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html)
- [Supported Testcontainers environments](https://java.testcontainers.org/supported_docker_environment/)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Podman installation and Windows differences](https://podman.io/docs/installation)
- [Podman machines](https://docs.podman.io/en/stable/markdown/podman-machine.1.html)
- [Compose providers](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)
- [Keycloak realm import](https://www.keycloak.org/server/importExport)
- [PostgreSQL releases](https://www.postgresql.org/docs/release/)
- [Scalar for Spring Boot](https://scalar.com/docs-for/spring-boot) and [reference configuration](https://scalar.com/products/api-references/configuration)
- [Official Scalar Core Maven metadata](https://repo.maven.apache.org/maven2/com/scalar/maven/scalar-core/maven-metadata.xml), checked November 12, 2026; selected version 0.7.1
- [Redocly rules](https://redocly.com/docs/cli/rules/built-in-rules) for contract and example validation
- [RFC 9457 problem details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [Adoptium API](https://api.adoptium.net/) for a verification JDK with SHA-256
- [Official Corretto 25 downloads and SHA-256](https://docs.aws.amazon.com/corretto/latest/corretto-25-ug/downloads-list.html) for the additional November 12 verification JDK

Exact repositories and revisions for the five agent reference sources are recorded in `tooling/agent-sources.json`. Architectural choices, including a modular application and public catalog reads, are template decisions rather than mandatory requirements of every source listed above.

Client instruction discovery sources are listed in the [agent tooling guide](agent-tooling.md).
