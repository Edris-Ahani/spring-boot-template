import assert from "node:assert/strict";
import test from "node:test";
import { createScanInput } from "./maven-scan-input.mjs";

const dependency = (overrides = {}) => ({
  groupId: "example", artifactId: "library", version: "1.0.0", scope: "compile", ...overrides,
});

test("includes resolved transitive, runtime, provided, and test dependencies without the application", () => {
  const result = createScanInput({
    groupId: "example", artifactId: "app", version: "1.0.0-SNAPSHOT",
    children: [dependency({ children: [dependency({ artifactId: "transitive" })] }),
      dependency({ artifactId: "runtime", scope: "runtime" }),
      dependency({ artifactId: "provided", scope: "provided" }),
      dependency({ artifactId: "tests", scope: "test" })],
  });
  assert.deepEqual(result.results[0].packages.map(item => item.package),
    ["library", "transitive", "runtime", "provided", "tests"].map(name => ({
      ecosystem: "Maven", name: `example:${name}`, version: "1.0.0",
    })));
});

test("deduplicates identical versions while retaining distinct versions of a package", () => {
  const result = createScanInput({ children: [dependency(), dependency(), dependency({ version: "2.0.0" })] });
  assert.equal(result.results[0].packages.length, 2);
});

test("fails closed for empty or malformed dependency trees", () => {
  for (const tree of [null, {}, { children: [] }, { children: {} }, { children: [null] }]) {
    assert.throws(() => createScanInput(tree));
  }
});

test("rejects missing coordinates and unresolved Maven properties", () => {
  for (const field of ["groupId", "artifactId", "version"]) {
    for (const value of [undefined, "", " ", "${unresolved.property}"]) {
      assert.throws(() => createScanInput({ children: [dependency({ [field]: value })] }));
    }
  }
});
