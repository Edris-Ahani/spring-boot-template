import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseEnv } from "node:util";
import { createProject, loadTemplate, templateRoot, validateProjectName, validateTemplateFile } from "./create-project.mjs";

test("accepts portable names and rejects traversal, injection, and Windows device names", () => {
  for (const name of ["blue-shop", "shop2", "a1", "a".repeat(40)]) assert.equal(validateProjectName(name), name);
  for (const name of ["", "a", "a".repeat(41), "Blue-Shop", "my app", "../shop", "a/b", "a\\b", "/tmp/app",
    "C:app", "app.", "app-", "app--name", "app_name", "con", "nul", "prn", "aux", "com0", "com1", "lpt9",
    "app&whoami", "$(whoami)", "app\nname", "\u0641\u0631\u0648\u0634\u06af\u0627\u0647"]) {
    assert.throws(() => validateProjectName(name), undefined, name);
  }
});

test("the inventory rejects private files, generated output, and unsafe relative paths", () => {
  for (const filename of [".env.example", "frontend/.env.local.example", "backend/.mvn/wrapper/maven-wrapper.properties",
    ".github/workflows/ci.yml", ".cursor/rules/project.mdc"]) assert.equal(validateTemplateFile(filename), filename);
  for (const filename of ["../outside", "/outside", "C:/outside", "a\\b", "a/../b", "a//b", ".env", ".ENV", ".GIT/config", "frontend/.ENV.local", "frontend/.env.local",
    "infra/production/.env", "custom.env", ".git/config", ".git", "secrets/key.json", "private.pem", "client.p12",
    "node_modules/library/index.js", "backend/target/app.jar", ".tools/scratch.mjs", "tooling/vendor/SKILL.md",
    ".claude/settings.local.json", ".codex/auth.json", ".aws/credentials", "frontend/.next/index.js", "database.dump",
    "next-env.d.ts", "frontend/test-results/results.json"]) assert.throws(() => validateTemplateFile(filename));
});

async function fixture(t) {
  const parent = await realpath(tmpdir());
  const temporary = await mkdtemp(path.join(parent, "template-generator-"));
  t.after(async () => {
    assert.equal(path.dirname(temporary), parent);
    assert.ok(path.basename(temporary).startsWith("template-generator-"));
    await rm(temporary, { recursive: true, force: true });
  });
  const source = path.join(temporary, "template with spaces");
  await mkdir(source);
  const configuration = await loadTemplate(templateRoot);
  for (const filename of configuration.files) {
    const destination = path.join(source, filename);
    const original = path.join(templateRoot, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(original, destination);
    if (process.platform !== "win32") await chmod(destination, (await lstat(original)).mode & 0o777);
  }
  return { source, temporary, configuration };
}

async function json(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

function cli(source, args, input) {
  return spawnSync(process.execPath, [path.join(source, "scripts/create-project.mjs"), ...args], {
    cwd: tmpdir(), encoding: "utf8", input, timeout: 30000, windowsHide: true,
  });
}

test("creates consistent sibling projects with fresh secrets, preserved dependencies, and safe copy boundaries", async t => {
  const { source, configuration } = await fixture(t);
  for (const filename of [".env", ".git/config", "frontend/.env.local", "secrets/key.pem", "node_modules/private.txt",
    ".tools/private.txt", "notes-not-in-inventory.txt"]) {
    await mkdir(path.dirname(path.join(source, filename)), { recursive: true });
    await writeFile(path.join(source, filename), "source-private-value");
  }
  const binary = Buffer.from([0, 255, 128, 10, 13, 1]);
  const binaryPath = "frontend/public/opaque.bin";
  await writeFile(path.join(source, binaryPath), binary);
  configuration.files.push(binaryPath);
  if (process.platform !== "win32") await chmod(path.join(source, "backend/mvnw"), 0o644);
  await writeFile(path.join(source, "template.json"), JSON.stringify(configuration));
  const secretKeys = ["DATABASE_PASSWORD", "IDENTITY_DATABASE_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD", "CATALOG_CLIENT_SECRET"];
  let sourceExample = await readFile(path.join(source, ".env.example"), "utf8");
  for (const key of secretKeys) sourceExample = sourceExample.replace(`${key}=`, `${key}=source-example-private-value`);
  await writeFile(path.join(source, ".env.example"), sourceExample);
  const result = await createProject("blue-shop", { sourceRoot: source });
  assert.equal(result.destination, path.join(path.dirname(source), "blue-shop"));
  const read = filename => readFile(path.join(result.destination, filename), "utf8");
  assert.equal((await json(path.join(result.destination, "template.json"))).project.name, "blue-shop");
  assert.equal((await json(path.join(result.destination, "package.json"))).name, "blue-shop");
  assert.equal((await json(path.join(result.destination, "frontend/package.json"))).name, "@blue-shop/web");
  const lock = await json(path.join(result.destination, "package-lock.json"));
  const originalLock = await json(path.join(source, "package-lock.json"));
  assert.equal(lock.name, "blue-shop");
  assert.equal(lock.packages[""].name, "blue-shop");
  assert.equal(lock.packages.frontend.name, "@blue-shop/web");
  assert.deepEqual(lock.packages["node_modules/@blue-shop/web"], { resolved: "frontend", link: true });
  const originalWorkspace = `node_modules/${originalLock.packages.frontend.name}`;
  if (originalWorkspace !== "node_modules/@blue-shop/web") assert.equal(lock.packages[originalWorkspace], undefined);
  assert.equal(Object.keys(lock.packages).length, Object.keys(originalLock.packages).length);
  for (const [filename, entry] of Object.entries(originalLock.packages)) {
    if (!["", "frontend", originalWorkspace].includes(filename)) assert.deepEqual(lock.packages[filename], entry);
  }
  const environment = parseEnv(await read(".env"));
  assert.equal(environment.COMPOSE_PROJECT_NAME, "blue-shop");
  assert.equal(environment.DATABASE_USERNAME, "blue_shop_app");
  assert.equal(environment.DATABASE_URL, "jdbc:postgresql://localhost:15432/blue_shop");
  const secrets = secretKeys;
  const values = secrets.map(key => environment[key]);
  assert.ok(values.every(value => /^[a-f0-9]{64}$/.test(value)));
  assert.equal(new Set(values).size, secrets.length);
  const example = parseEnv(await read(".env.example"));
  assert.ok(secrets.every(key => example[key] === ""));
  assert.equal(parseEnv(await read("frontend/.env.local")).BACKEND_URL, "http://localhost:8080");
  assert.equal(await readFile(path.join(source, ".env"), "utf8"), "source-private-value");
  assert.ok((await readFile(path.join(source, ".env.example"), "utf8")) === sourceExample);
  for (const filename of [".git", "node_modules", "secrets", ".tools", "notes-not-in-inventory.txt"]) {
    await assert.rejects(lstat(path.join(result.destination, filename)), { code: "ENOENT" });
  }
  assert.deepEqual(await readFile(path.join(result.destination, binaryPath)), binary);
  if (process.platform !== "win32") {
    assert.equal((await lstat(path.join(result.destination, ".env"))).mode & 0o777, 0o600);
    assert.equal((await lstat(path.join(result.destination, "backend/mvnw"))).mode & 0o111, 0o111);
  }
  const compose = await read("infra/compose.yml");
  for (const expected of ["COMPOSE_PROJECT_NAME:-blue-shop", 'POSTGRES_DB: "blue_shop"', "DATABASE_USERNAME:-blue_shop_app",
    'POSTGRES_DB: "blue_shop_identity"', "POSTGRES_USER: blue_shop_identity", "KC_DB_USERNAME: blue_shop_identity",
    "jdbc:postgresql://identity-db:5432/blue_shop_identity", "jdbc:postgresql://postgres:5432/blue_shop\n",
    '"-U", "blue_shop_identity", "-d", "blue_shop_identity"', "localhost/blue-shop-api:dev", "localhost/blue-shop-web:dev"]) {
    assert.ok(compose.includes(expected), expected);
  }
  assert.ok((await read("scripts/platform.mjs")).includes("localhost/blue-shop-${image}:dev"));
  assert.ok((await read("backend/pom.xml")).includes("<artifactId>blue-shop-api</artifactId>"));
  assert.ok((await read("backend/src/main/resources/application.yml")).includes("name: blue-shop-api"));
  const production = parseEnv(await read("infra/production/.env.example"));
  assert.equal(production.DATABASE_USERNAME, "blue_shop_runtime");
  assert.ok(production.DATABASE_URL.endsWith("/blue_shop?sslmode=verify-full"));
  assert.ok(production.API_IMAGE.includes("/blue-shop-api@sha256:"));
  assert.ok((await read("infra/production/compose.yml")).includes("name: blue-shop-production"));
  assert.ok((await read("contracts/openapi.yaml")).includes("title: Blue Shop Catalog API"));
  assert.ok((await read("scripts/smoke-test.mjs")).includes("Blue Shop API Reference"));
  assert.ok((await read("backend/src/test/java/com/acme/platform/platform/web/ApiDocumentationTest.java")).includes("Blue Shop API Reference"));
  assert.ok((await read("frontend/api-e2e/scalar.spec.ts")).includes("Blue Shop Catalog API"));
  assert.ok((await read("backend/src/main/resources/api-reference/index.html")).includes('id="blue-shop-api-reference"'));
  assert.ok((await read("backend/src/main/resources/api-reference/config.js")).includes('"#blue-shop-api-reference"'));
  const verification = spawnSync(process.execPath, [path.join(result.destination, "scripts/verify-repository.mjs")], {
    cwd: result.destination, encoding: "utf8", timeout: 30000, windowsHide: true,
  });
  assert.equal(verification.status, 0, verification.stderr);
  const another = await createProject("book", { sourceRoot: result.destination });
  const third = await createProject("book-store", { sourceRoot: another.destination });
  assert.ok((await readFile(path.join(third.destination, "infra/compose.yml"), "utf8")).includes('POSTGRES_DB: "book_store"'));
  const matchingDatabase = await createProject("book-identity", { sourceRoot: another.destination });
  const matchingCompose = await readFile(path.join(matchingDatabase.destination, "infra/compose.yml"), "utf8");
  assert.deepEqual([...matchingCompose.matchAll(/^      POSTGRES_DB: "([a-z_]+)"$/gm)].map(match => match[1]),
    ["book_identity", "book_identity_identity"]);
  const yamlWord = await createProject("on", { sourceRoot: another.destination });
  assert.ok((await readFile(path.join(yamlWord.destination, "infra/compose.yml"), "utf8")).includes('POSTGRES_DB: "on"'));
  const fromWord = await createProject("other-project", { sourceRoot: yamlWord.destination });
  assert.ok((await readFile(path.join(fromWord.destination, "README.md"), "utf8")).includes("On Linux and macOS"));
  const otherSecrets = parseEnv(await readFile(path.join(another.destination, ".env"), "utf8"));
  assert.ok(secrets.every(key => otherSecrets[key] !== environment[key]));
});

test("interactive and named CLI execution work independently of the current directory", async t => {
  const { source, temporary } = await fixture(t);
  for (const [name, args, input] of [["interactive-shop", [], "interactive-shop\n"], ["named-shop", ["--name", "named-shop"], undefined]]) {
    const result = cli(source, args, input);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(path.join(temporary, name)));
    assert.ok(!/[a-f0-9]{64}/.test(result.stdout));
    assert.ok((await lstat(path.join(temporary, name, ".env"))).isFile());
  }
  assert.equal(cli(source, ["--help"]).status, 0);
  for (const [args, input] of [[["--force"], undefined], [["--name", "../outside"], undefined], [[], ""]]) {
    const result = cli(source, args, input);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
  }
});

test("setup failures leave a clearly identified incomplete directory without deleting or merging it", async t => {
  const { source, temporary } = await fixture(t);
  const script = path.join(source, "scripts/platform.mjs");
  await writeFile(script, `process.exit(2);\n${await readFile(script, "utf8")}`);
  const destination = path.join(temporary, "incomplete-app");
  await assert.rejects(createProject("incomplete-app", { sourceRoot: source }), /Inspect the incomplete directory/);
  assert.ok((await lstat(path.join(destination, "package.json"))).isFile());
  await assert.rejects(createProject("incomplete-app", { sourceRoot: source }), /Destination already exists/);
});

test("existing destinations are preserved without merging files", async t => {
  const { source, temporary } = await fixture(t);
  const destination = path.join(temporary, "existing-app");
  await mkdir(destination);
  await writeFile(path.join(destination, "keep.txt"), "existing user data");
  await assert.rejects(createProject("existing-app", { sourceRoot: source }), /Destination already exists/);
  assert.equal(await readFile(path.join(destination, "keep.txt"), "utf8"), "existing user data");
  await assert.rejects(lstat(path.join(destination, "package.json")), { code: "ENOENT" });
});

test("invalid inventories and missing files fail before creating a destination", async t => {
  const { source, temporary, configuration } = await fixture(t);
  for (const files of [[], [...configuration.files, "../outside"], [...configuration.files, ".env"],
    [...configuration.files, configuration.files[0]], [...configuration.files, "missing-file.txt"]]) {
    await writeFile(path.join(source, "template.json"), JSON.stringify({ ...configuration, files }));
    await assert.rejects(createProject("invalid-app", { sourceRoot: source }));
    await assert.rejects(lstat(path.join(temporary, "invalid-app")), { code: "ENOENT" });
  }
});

test("symbolic-link ancestors cannot escape the source inventory", async t => {
  const { source, temporary, configuration } = await fixture(t);
  const outside = path.join(temporary, "outside");
  await mkdir(outside);
  await writeFile(path.join(outside, "private.txt"), "outside data");
  await symlink(outside, path.join(source, "linked"), "junction");
  configuration.files.push("linked/private.txt");
  await writeFile(path.join(source, "template.json"), JSON.stringify(configuration));
  await assert.rejects(createProject("linked-app", { sourceRoot: source }), /Symbolic links/);
  await assert.rejects(lstat(path.join(temporary, "linked-app")), { code: "ENOENT" });
});
