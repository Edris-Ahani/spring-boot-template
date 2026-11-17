# Create a project from the template

Run the generator with Node.js 24. It uses only built-in Node.js modules and does not require Git, npm dependencies, Java, or Podman to generate a project. Windows, Linux, and macOS use the same generator. Run this from the template directory:

```sh
node scripts/create-project.mjs
```

On Windows Command Prompt or PowerShell:

```bat
cmd /c node scripts\create-project.mjs
```

The prompt asks for a name such as `blue-shop`. Use 2-40 lowercase ASCII letters, digits, and single hyphens, starting with a letter. Windows device names, whitespace, path separators, and shell metacharacters are rejected. The script can also run without a prompt:

```sh
node scripts/create-project.mjs --name blue-shop
```

After choosing the name, the generator creates a sibling of the template directory. The destination is based on the script's location, independently of the terminal's current directory:

```text
MyProjects/
  spring-boot-template/
  blue-shop/
```

## Generated names

| Setting | Example |
| --- | --- |
| Project directory and root npm package | `blue-shop` |
| Frontend workspace | `@blue-shop/web` |
| Maven artifact and Spring application | `blue-shop-api` |
| Development Compose project | `blue-shop` |
| Development images | `localhost/blue-shop-api:dev`, `localhost/blue-shop-web:dev` |
| Application database and role | `blue_shop`, `blue_shop_app` |
| Identity database and role | `blue_shop_identity`, `blue_shop_identity` |
| Production Compose project | `blue-shop-production` |
| Production example database role | `blue_shop_runtime` |

Compose uses the [project name](https://docs.docker.com/compose/how-tos/project-name/) to separate its networks, containers, and named volumes. The generator updates JDBC URLs, database health checks, Keycloak database configuration, npm lockfile workspace links, production examples, frontend branding, and Scalar titles and their backend/browser/smoke checks together. Dependency versions are preserved.

The Java package namespace, API paths, OAuth realm, scopes, and audience remain the reference application's technical contracts. Database names do not change those contracts. Production hostnames, image digests, credentials, and managed database roles still require real deployment configuration; the generator does not provision them.

## Private configuration and startup

The generator runs the copied project's existing setup command to create `.env` with fresh independent random credentials and `frontend/.env.local`. Credentials are never printed. It does not install dependencies, create a Git repository, start containers, change global tools, commit, or push. Existing source configuration and runtime data are preserved.

Run these commands in the new directory after preparing the host tools described in the [installation guide](getting-started.md):

```sh
npm run doctor
npm run stack:up
```

For native development, install the supported npm version and run `npm ci` first. Container builds install their own npm dependencies. On Windows, prefix shell commands with `cmd /c`.

Default published host ports remain 3000, 8080, 8180, and 15432. Stop the template's stack before starting the generated stack on those ports. Separate Compose names isolate volumes and networks, but do not remove host port conflicts. For simultaneous stacks, configure distinct host ports and the corresponding frontend and identity URLs before starting them.

An existing destination is never merged into or overwritten. Invalid names, inventory entries, missing source files, and symbolic links fail before creating the destination. If a filesystem or setup failure occurs during copying, the error identifies the incomplete directory. Inspect that directory before removing it or choosing another name; the generator does not recursively delete user-visible directories automatically.

## Maintain the template inventory

[template.json](../template.json) contains the project naming metadata, reviewed relative file inventory, and executable entries. Only listed regular files are copied, so unlisted notes, private configuration, `.git`, installed dependencies, build output, agent state, downloaded tooling, and database data cannot enter the generated project. Binary files are copied without text conversion. Unix permissions are preserved, and the Maven Wrapper receives executable permissions on Unix even if its source archive lost those permissions.

After adding or removing maintained template files, review them and update the inventory in the template's Git checkout:

```sh
npm run template:sync
npm run template:check
npm run template:test
```

Inventory maintenance requires Git; project generation does not. `template:sync` includes tracked and untracked non-ignored files and rejects known private or generated paths. Review the inventory diff before publishing; listing a file is an explicit decision to distribute its content. Do not populate environment examples with real credentials.

The generated project retains its adjusted metadata and generator, so it can generate another sibling with different names and fresh credentials. Run inventory maintenance after initializing its own Git repository if you add maintained files.
