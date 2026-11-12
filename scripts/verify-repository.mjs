import { isUtf8 } from "node:buffer";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const ignoredDirectories = new Set([
  ".git", ".next", ".tools", ".playwright-cli", "node_modules", "target",
  "test-results", "playwright-report", "coverage", "secrets",
]);
const markdownExtensions = new Set([".md", ".mdc", ".mdx"]);
const textExtensions = new Set([
  ...markdownExtensions, ".java", ".js", ".ts", ".tsx", ".html", ".mjs", ".cjs",
  ".json", ".yaml", ".yml", ".xml", ".sql", ".css", ".svg", ".cmd", ".bat",
  ".properties", ".toml", ".txt", ".sh", ".ps1", ".ini", ".conf", ".http",
]);
const nonEnglishText = /\p{Script=Arabic}|(?!\p{Script=Latin})\p{Letter}/u;
const entryPoints = [
  "CLAUDE.md", "GEMINI.md", ".cursor/rules/project.mdc", ".github/copilot-instructions.md",
];

function isPrivateFile(name) {
  return (name.startsWith(".env") && !name.endsWith(".example"))
    || /\.(?:log|pem|key|p12|pfx|jks)$/i.test(name);
}

function references(content, filename) {
  const links = Array.from(content.matchAll(/\]\(([^)\n]+)\)/g), match => match[1]);
  if (["CLAUDE.md", "GEMINI.md"].includes(path.basename(filename))) {
    links.push(...Array.from(content.matchAll(/^@([^\s]+\.md)\s*$/gm), match => match[1]));
  }
  return links;
}

function localTarget(root, filename, reference) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(reference)) return undefined;
  const destination = decodeURIComponent(reference.replace(/^<|>$/g, "").split("#")[0]);
  const target = path.resolve(path.dirname(filename), destination);
  const relative = path.relative(root, target);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("local link escapes the project");
  }
  return target;
}

export async function verifyRepository(directory) {
  const root = path.resolve(directory);
  const errors = [];
  let files = 0;

  async function inspect(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const filename = path.join(current, entry.name);
      const relative = path.relative(root, filename);
      if (entry.isSymbolicLink() || isPrivateFile(entry.name)) continue;
      if (entry.isDirectory()
          && (ignoredDirectories.has(entry.name) || relative === path.join("tooling", "vendor"))) continue;
      if (nonEnglishText.test(entry.name)) errors.push(relative + ": file and directory names must be in English");
      if (entry.isDirectory()) {
        await inspect(filename);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      const buffer = await readFile(filename);
      if (buffer.includes(0) || !isUtf8(buffer)) {
        if (!extension || textExtensions.has(extension) || entry.name.startsWith(".env")) {
          errors.push(relative + ": maintained text files must use UTF-8 without null bytes");
        }
        continue;
      }
      const content = buffer.toString("utf8");
      files += 1;
      if (nonEnglishText.test(content)) {
        errors.push(relative + ": documentation, explanations, comments, and source text must be in English");
      }
      if (extension === ".json") {
        try { JSON.parse(content); } catch { errors.push(relative + ": invalid JSON"); }
      }
      if (markdownExtensions.has(extension)) {
        for (const reference of references(content, filename)) {
          try {
            const target = localTarget(root, filename, reference);
            if (target && !(await stat(target)).isFile()) throw new Error("local reference must point to a file");
          } catch (error) {
            const reason = error.code === "ENOENT" ? "missing local reference"
              : error instanceof URIError ? "invalid encoded reference" : error.message;
            errors.push(relative + ": " + reason + ": " + reference);
          }
        }
      }
    }
  }

  await inspect(root);
  const canonical = path.join(root, "AGENTS.md");
  try {
    if (!(await readFile(canonical, "utf8")).trim()) errors.push("AGENTS.md: shared project instructions must not be empty");
  } catch {
    errors.push("AGENTS.md: shared project instructions are required");
  }
  for (const entryPoint of entryPoints) {
    const filename = path.join(root, entryPoint);
    try {
      const content = await readFile(filename, "utf8");
      const pointsToPolicy = references(content, filename).some(reference => {
        try { return localTarget(root, filename, reference) === canonical; } catch { return false; }
      });
      if (!pointsToPolicy) errors.push(entryPoint + ": must import or link to the root AGENTS.md");
      if (entryPoint.endsWith(".mdc")) {
        const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? "";
        if (!/^alwaysApply:[ \t]*true[ \t]*$/m.test(frontmatter)) {
          errors.push(entryPoint + ": the shared Cursor rule must always apply");
        }
      }
    } catch {
      errors.push(entryPoint + ": agent instruction entry point is required");
    }
  }
  return { files, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await verifyRepository(projectRoot);
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Repository checks passed for " + result.files + " maintained text files");
  }
}
