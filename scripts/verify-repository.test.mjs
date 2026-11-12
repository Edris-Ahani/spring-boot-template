import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyRepository } from "./verify-repository.mjs";

async function fixture(context) {
  const temporaryRoot = path.resolve(tmpdir());
  const root = await mkdtemp(path.join(temporaryRoot, "foundry-policy-"));
  context.after(async () => {
    if (path.dirname(root) !== temporaryRoot || !path.basename(root).startsWith("foundry-policy-")) {
      throw new Error("Unexpected test directory; cleanup refused");
    }
    await rm(root, { recursive: true, force: true });
  });
  async function write(filename, content) {
    const target = path.resolve(root, filename);
    const relative = path.relative(root, target);
    assert(!relative.startsWith("..") && !path.isAbsolute(relative), "Fixture writes must remain in the test directory");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await write("AGENTS.md", "# Project instructions\nWrite all repository files in English.\n");
  await write("CLAUDE.md", "# Claude instructions\n\n@AGENTS.md\n");
  await write("GEMINI.md", "# Gemini instructions\n\n@./AGENTS.md\n");
  await write(".cursor/rules/project.mdc", "---\nalwaysApply: true\n---\n\nRead [project instructions](../../AGENTS.md).\n");
  await write(".github/copilot-instructions.md", "Read [project instructions](../AGENTS.md).\n");
  return { root, write };
}

test("accepts English text, Unicode typography, valid links, and agent imports", async context => {
  const { root, write } = await fixture(context);
  await write("README.md", "# Project\n\nRead [instructions](AGENTS.md#project-instructions).\nChecks passed \u2713\n");
  await write("src/example.js", "// Keep comments in English.\nconst name = 'Foundry';\n");
  await write("settings.json", '{"enabled":true}\n');
  assert.deepEqual((await verifyRepository(root)).errors, []);
});

test("rejects Persian Markdown even with an RTL wrapper and an uppercase extension", async context => {
  const { root, write } = await fixture(context);
  await write("docs/guide.md", '<div dir="rtl">\n\u0645\u062a\u0646\n</div>\n');
  await write("docs/OTHER.MD", "# \u0645\u062a\u0646\n");
  const { errors } = await verifyRepository(root);
  assert(errors.some(error => error.includes("guide.md:") && error.includes("must be in English")));
  assert(errors.some(error => error.includes("OTHER.MD:") && error.includes("must be in English")));
});

test("checks comments, Cursor rules, extensionless configuration, and environment examples", async context => {
  const { root, write } = await fixture(context);
  const files = ["src/Example.java", ".cursor/rules/extra.mdc", "Containerfile", ".editorconfig", ".env.example", "frontend/.env.local.example"];
  for (const filename of files) await write(filename, "# \u0645\u062a\u0646\n");
  const { errors } = await verifyRepository(root);
  for (const filename of files) {
    assert(errors.some(error => error.startsWith(path.normalize(filename) + ":") && error.includes("must be in English")), filename);
  }
});

test("rejects Arabic presentation forms, supplementary Arabic characters, and other non-Latin letters", async context => {
  const { root, write } = await fixture(context);
  for (const [name, content] of [["presentation.md", "\uFB8E"], ["supplementary.md", "\u{1EE00}"], ["other.md", "\u041F\u0440\u0438\u0432\u0435\u0442"]]) {
    await write(name, content);
  }
  assert.equal((await verifyRepository(root)).errors.filter(error => error.includes("must be in English")).length, 3);
});

test("rejects non-English file and directory names", async context => {
  const { root, write } = await fixture(context);
  await write("docs/\u0645\u062a\u0646.md", "English content\n");
  await write("\u0645\u062a\u0646/guide.md", "English content\n");
  assert.equal((await verifyRepository(root)).errors.filter(error => error.includes("names must be in English")).length, 2);
});

test("preserves private files, generated outputs, dependencies, and pinned vendor references", async context => {
  const { root, write } = await fixture(context);
  const ignored = [
    ".env", ".env.local", "secrets/password.txt", "backend/target/report.md", "node_modules/reference.md",
    "tooling/vendor/reference.md", "frontend/.next/report.md", "frontend/test-results/report.md",
  ];
  for (const filename of ignored) await write(filename, "\u0645\u062a\u0646\n");
  await write("public/mark.png", Buffer.from([0, 255, 254, 128]));
  assert.deepEqual((await verifyRepository(root)).errors, []);
});

test("rejects missing, malformed, and escaping local references without reading their targets", async context => {
  const { root, write } = await fixture(context);
  await write("docs/links.md", "[missing](missing.md)\n[invalid](%ZZ.md)\n[outside](../../" + path.basename(root) + "-sibling/secret.md)\n");
  const { errors } = await verifyRepository(root);
  assert(errors.some(error => error.includes("missing local reference")));
  assert(errors.some(error => error.includes("invalid encoded reference")));
  assert(errors.some(error => error.includes("local link escapes the project")));
});

test("requires valid JSON, native agent imports, and Cursor frontmatter that always applies", async context => {
  const { root, write } = await fixture(context);
  await write("settings.json", "{invalid}");
  await write("CLAUDE.md", "@missing.md\n");
  await write(".cursor/rules/project.mdc", "Read [instructions](../../AGENTS.md).\n\nalwaysApply: true\n");
  const { errors } = await verifyRepository(root);
  assert(errors.some(error => error.includes("invalid JSON")));
  assert(errors.some(error => error.includes("CLAUDE.md: must import or link")));
  assert(errors.some(error => error.includes("shared Cursor rule must always apply")));
  await rm(path.join(root, "GEMINI.md"));
  assert((await verifyRepository(root)).errors.some(error => error.includes("GEMINI.md: agent instruction entry point is required")));
});

test("rejects non-UTF-8 documentation instead of treating it as a binary asset", async context => {
  const { root, write } = await fixture(context);
  await write("README.md", Buffer.from("# \u0645\u062a\u0646\n", "utf16le"));
  assert((await verifyRepository(root)).errors.some(error => error.includes("README.md: maintained text files must use UTF-8")));
});
