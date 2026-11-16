# Installation and first run

Use this guide before starting the project on a new computer. Run project commands from the repository root. The complete container stack is the shortest path to a working application; host development adds a JDK and local JavaScript dependencies.

## Choose an execution path

| Path | Install on the host | Provided by the project |
| --- | --- | --- |
| Complete container stack | Node.js 24.x, npm 11.21.2 or newer 11.x, Podman, and a Compose provider | JDK and Maven in the API build; frontend dependencies in its build; PostgreSQL and Keycloak containers |
| Native backend and frontend, container infrastructure | Everything above, plus JDK 25 for the backend; run `npm ci` for frontend tooling | Maven Wrapper; PostgreSQL and Keycloak through `npm run infra:up` |
| Backend unit tests only | JDK 25; Node.js 24.x and supported npm when using `npm run backend:unit` | Maven Wrapper downloads Maven; a container engine is not required for unit tests |

Git is needed to clone and update the repository. An extracted source archive can also be used; on Linux and macOS it may require restoring the executable permission of `backend/mvnw`. A modern browser is needed to use the interface. An IDE, AI client, globally installed Maven, and locally installed PostgreSQL or Keycloak are not required for the container path.

The version requirements come from [package.json](../package.json) and [backend/pom.xml](../backend/pom.xml). Select Node.js **24.x** explicitly; a different current LTS major does not satisfy this project's engine requirement. JDK 17 and 21 do not satisfy the backend build requirement. The project does not currently pin a minimum Podman or Compose provider version; use a maintained release and verify it with the checks below.

## Install the tools for your operating system

Download Node.js 24.x from the [official Node.js downloads](https://nodejs.org/en/download). Verify the bundled npm version separately. If it is outside `>=11.21.2 <12`, select a compatible npm 11 release before installing project dependencies. The reproducible version used by this repository is 11.21.2. Follow your Node installation method's instructions for changing npm; project scripts do not update global tools.

| Platform | Container preparation | Shell |
| --- | --- | --- |
| Windows | Install Podman using the [official Windows setup](https://podman-desktop.io/docs/installation/windows-install). For the default WSL provider, enable virtualization and the required WSL 2 features. Create and start a Podman Linux machine. | Command Prompt, or PowerShell invoking the documented `cmd /c` commands |
| Linux | Install Podman using the [distribution instructions](https://podman.io/docs/installation). Ensure it works for the current user, including rootless prerequisites when applicable. A Podman machine is not normally needed. | A POSIX shell such as bash |
| macOS | Follow the [official macOS setup](https://podman-desktop.io/docs/installation/macos-install). Create and start a Podman Linux machine. | Terminal with zsh or bash |

Install a Compose provider as a separate step. Podman Desktop users can follow [Setting up Compose](https://podman-desktop.io/docs/compose/setting-up-compose). CLI installations can use a distribution-packaged `podman-compose` or another provider documented by [Podman Compose](https://docs.podman.io/en/latest/markdown/podman-compose.1.html). The project invokes `podman compose`, which delegates to that provider. Having the Podman executable or Docker alone is insufficient. Python is needed on the host only if your chosen provider installation requires it.

On Windows and macOS, inspect existing machines before creating one:

Windows:

```bat
cmd /c podman machine list
```

Linux or macOS:

```sh
podman machine list
```

If no suitable machine exists on Windows or macOS, initialize one with `podman machine init`. Start a stopped machine with `podman machine start`, specifying its name if needed. Prefix these commands with `cmd /c` on Windows. Podman Desktop can perform the same steps. Keep using an existing working machine; project setup does not create, reset, or reconfigure it. See the [Podman machine guide](https://docs.podman.io/en/latest/markdown/podman-machine.1.html).

For native backend development, install a **JDK 25** distribution for your OS and CPU, for example [Temurin 25](https://adoptium.net/temurin/releases/?version=25). Set `JAVA_HOME` to the JDK directory and put its `bin` directory on `PATH`. Reopen the terminal and select the same JDK in your IDE. Java is not needed on the host when the complete application runs in containers.

## Check resources, permissions, and connectivity

| Item | Before the first run |
| --- | --- |
| Memory and CPU | As an initial planning estimate, allow an 8 GB RAM host and, on Windows/macOS, about 4 GiB RAM and 2 CPUs for the container machine. These are recommendations, not benchmarked minimums. Running an IDE or building images may require more headroom. |
| Disk space | Start with at least 8 GB free. Allow extra space for the Podman machine, downloaded images, build caches, npm, and Maven. The build script checks for 2 GiB free on the checkout's host filesystem before each image build; it does not measure free space inside the machine or image store. |
| Ports | Keep TCP 3000, 8080, 8180, and 15432 available for the default development stack. Browser tests additionally use 3100 and 19090. Native backend execution also binds management port 9090. |
| Writable directories | The current user needs write access to the checkout, npm cache, Maven cache for native builds, and Podman storage. Use a normal writable user checkout rather than a protected system directory. |
| Internet access | Initial setup needs the npm registry, Maven Central, Docker Hub, and Quay. Optional agent references need GitHub; Playwright browser installation needs its download hosts. Configure trusted proxy/CA settings for the relevant tools if your network requires them. |
| CPU architecture | Use tools and images compatible with your CPU. Windows verification was performed on x64. macOS and ARM-specific execution have not been verified for this template. |

The memory estimate allows headroom beyond the service limits in [development Compose](../infra/compose.yml); it is not a guarantee that every build fits. Check both the host and the container machine when investigating memory or disk failures. Do not disable TLS certificate validation to work around download problems.

## Verify the installation

Windows:

```bat
cmd /c node --version
cmd /c npm --version
cmd /c podman --version
cmd /c podman info
cmd /c podman compose version
```

Linux and macOS:

```sh
node --version
npm --version
podman --version
podman info
podman compose version
```

Expect Node.js `v24.x`, npm `11.21.2` or newer `11.x`, a reachable Podman engine, and a working Compose provider. Installing the CLI without starting its machine does not establish engine connectivity. Keep infrastructure diagnostic output local when it contains machine details.

Native backend developers should also run `cmd /c java -version` and `cmd /c backend\mvnw.cmd -v` on Windows, or `java -version` and `./backend/mvnw -v` on Linux/macOS. The wrapper output must identify Java 25; it can use a different Java from the first executable on `PATH` when `JAVA_HOME` is set. If an extracted archive lost executable permissions, run `chmod +x backend/mvnw` on Linux/macOS first. The wrapper downloads and verifies Maven automatically when it is not already cached.

## Start the complete development stack

After the tool checks pass, use the following commands from the repository root.

Windows:

```bat
cmd /c npm run setup
cmd /c npm run doctor
cmd /c npm run stack:up
```

Linux and macOS:

```sh
npm run setup
npm run doctor
npm run stack:up
```

`setup` creates the root `.env` and frontend `.env.local` when missing and preserves existing files. It generates development credentials without printing them. Do not commit these files. Restrict their access to the intended user; POSIX permissions and Windows NTFS permissions require different tooling.

`doctor` verifies Node.js major version and Podman/Compose connectivity, reports Java availability, and reports whether the root `.env` exists. It does **not** validate npm, port availability, available memory, disk capacity, Maven cache permissions, or Testcontainers connectivity. Missing Java does not fail the container workflow. A successful doctor result is a preliminary check, not proof that the application has started.

`stack:up` builds the two application images sequentially and starts PostgreSQL, the identity database, Keycloak, the API, and the frontend. No host `npm ci`, JDK, global Maven, or manual database installation is needed for this path. Wait for startup, then open [the frontend](http://localhost:3000), [API readiness](http://localhost:8080/readyz), and [the API reference](http://localhost:8080/docs). Readiness should return `{"status":"UP"}`. An empty catalog is expected on a fresh database.

For an end-to-end check after startup, run `npm run test:smoke` with the Windows prefix where applicable. It uses the real identity service and database and creates one catalog item per run.

Use `npm run stack:start` to restart existing images and `npm run stack:down` to stop this project's stack while preserving database volumes. Rebuild with `stack:up` after source changes. These are local development services; public deployment has separate requirements in the [deployment guide](deployment.md).

## Develop on the host

After installing JDK 25 and confirming npm compatibility, run `npm ci` and `npm run infra:up`, using `cmd /c` on Windows. This installs JavaScript tooling and starts only the supplied databases and identity service.

Run `npm run dev --workspace frontend` in your development terminal. Start `PlatformApplication` from your IDE with JDK 25, the root `.env` variables, and the `local` Spring profile. Spring Boot and the Maven Wrapper do not automatically load the root `.env`; use your IDE's environment-file support without printing credentials. The frontend uses `frontend/.env.local`. Keep native application ports free by stopping containerized API/web instances before running their host equivalents. See [development and troubleshooting](development.md) for details and checks.

Native backend unit tests use `npm run backend:unit` and do not require a container socket. Full backend verification uses `npm run backend:verify` and requires a **Docker-API-compatible socket** accessible to Testcontainers. Successful `podman info` or a running Compose stack alone does not prove this. Obtain the actual named pipe on Windows or socket path on Linux/macOS from your runtime and follow the [project Testcontainers notes](development.md) and [official runtime requirements](https://java.testcontainers.org/supported_docker_environment/). Do not substitute H2 or silently skip PostgreSQL integration tests.

Browser testing additionally needs a production frontend build and a Playwright browser. See the [verification commands](development.md); neither Playwright nor downloaded AI references are prerequisites for simply starting the application.

The optional API compatibility command and `verify:full` also need Go 1.26 or newer to run the pinned oasdiff module. CI uses Go 1.27.1. Install it from the [official Go downloads](https://go.dev/dl/) if you use these checks. Go is not required for application startup or `verify:quick`.

## Resolve common first-run failures

| Symptom | Next step |
| --- | --- |
| Unsupported engine during `npm ci` | Select Node.js 24.x and npm `>=11.21.2 <12`, reopen the terminal, and verify both versions. |
| Podman cannot connect | On Windows/macOS, check that the selected machine is running. On Linux, check the current user's engine configuration. |
| `podman compose` cannot find a provider | Install a provider and verify `podman compose version`; installing Podman alone is insufficient. |
| Port already in use | Check which process owns the port. Review the port settings in Compose and the development guide before changing them; changing `POSTGRES_PORT` also requires updating the native `DATABASE_URL`. |
| Cannot create the Maven local repository | Check the path in the error and Maven/IDE configuration. Use a writable user cache; running the build as administrator is not the default solution. |
| Backend rejects the Java version | Check both `JAVA_HOME` and wrapper `-v` output, and configure JDK 25 in the terminal and IDE. |
| Backend cannot resolve environment placeholders | Supply the generated configuration to the native backend process and activate `local`; do not print `.env` contents into diagnostics. |
| PostgreSQL integration tests cannot find a runtime | Configure the real Docker-compatible socket for Testcontainers; application startup and test runtime discovery are separate checks. |
| Build runs out of disk space | Check host and Podman storage capacity. Starting existing images avoids rebuilding; preserve volumes and unrelated images when planning cleanup. |

These instructions describe the platform setup path, not certification of every OS or CPU. Historical execution results and unverified deployment behavior are recorded in [verification](verification.md). CI is configured for Linux verification and Windows backend unit tests; macOS execution has not been verified, and the current CI has no macOS job. A committed workflow is not evidence that a hosted run passed.
