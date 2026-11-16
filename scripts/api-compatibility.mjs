import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
export const OASDIFF_MODULE = "github.com/oasdiff/oasdiff@v1.38.0";

export function compareContracts(baseline, revision, stdio = "pipe") {
  const result = spawnSync("go", ["run", OASDIFF_MODULE, "breaking", "--fail-on", "ERR", baseline, revision], {
    cwd: root, encoding: "utf8", stdio, timeout: 300_000,
  });
  if (result.error) throw new Error("API compatibility requires Go 1.26 or newer and access to the Go module proxy", { cause: result.error });
  return result;
}

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 15_000 });
  if (result.error || result.status !== 0) throw new Error("Cannot read the requested API baseline from Git");
  return result.stdout.trim();
}

function main() {
  const reference = process.argv[2] ?? process.env.API_BASE_REF ?? "HEAD";
  if (/^0{40}$/.test(reference)) {
    console.log("Initial push: no earlier API baseline exists.");
    return;
  }
  const commit = git(["rev-parse", "--verify", "--end-of-options", `${reference}^{commit}`]);
  if (!git(["ls-tree", "--name-only", commit, "--", "contracts/openapi.yaml"])) {
    console.log("The baseline has no API contract; this is the first introduction of the API.");
    return;
  }
  const temporary = mkdtempSync(path.join(tmpdir(), "foundry-api-compatibility-"));
  try {
    const baseline = path.join(temporary, "baseline.yaml");
    writeFileSync(baseline, git(["show", `${commit}:contracts/openapi.yaml`]) + "\n");
    const result = compareContracts(baseline, path.join(root, "contracts/openapi.yaml"), "inherit");
    process.exitCode = result.status ?? 1;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
