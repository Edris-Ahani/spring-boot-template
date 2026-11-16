import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compareContracts } from "./api-compatibility.mjs";

test("accepts an unchanged contract and detects an incompatible response type", { timeout: 300_000 }, () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "foundry-api-regression-"));
  try {
    const baseline = new URL("../contracts/openapi.yaml", import.meta.url);
    const current = readFileSync(baseline, "utf8");
    const revision = path.join(temporary, "revision.yaml");
    writeFileSync(revision, current);
    const accepted = compareContracts(fileURLToPath(baseline), revision);
    assert.equal(accepted.status, 0, accepted.stderr);
    const changed = current.replace("name: { type: string, minLength: 1, maxLength: 120 }", "name: { type: integer }");
    assert.notEqual(changed, current, "The regression fixture must actually change a response field");
    writeFileSync(revision, changed);
    const rejected = compareContracts(fileURLToPath(baseline), revision);
    assert.equal(rejected.status, 1, rejected.stderr);
    assert.match(rejected.stdout + rejected.stderr, /response-property-type-changed/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
