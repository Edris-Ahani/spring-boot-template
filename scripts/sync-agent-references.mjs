import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, "tooling/agent-sources.json"), "utf8"));
const checksums = [];

async function get(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { "User-Agent": "spring-next-platform-reference-sync" },
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  return response;
}

for (const source of manifest.sources) {
  if (!/^[a-f0-9]{40}$/.test(source.revision)) throw new Error("An immutable Git revision is required");
  const treeResponse = await get(`https://api.github.com/repos/${source.repository}/git/trees/${source.revision}?recursive=1`);
  const tree = await treeResponse.json();
  if (tree.truncated) throw new Error(`Incomplete source tree: ${source.name}`);
  const selected = tree.tree.filter((entry) => entry.type === "blob"
    && (entry.path.endsWith(".md") || /(^|\/)LICENSE(\.md|\.txt)?$/.test(entry.path))
    && source.paths.some((prefix) => entry.path === prefix || entry.path.startsWith(`${prefix}/`)));
  if (selected.length === 0) throw new Error(`No references found: ${source.name}`);
  for (let index = 0; index < selected.length; index += 4) {
    await Promise.all(selected.slice(index, index + 4).map(async (entry) => {
      const destination = path.join(root, "tooling/vendor", source.name, entry.path);
      const base = path.join(root, "tooling/vendor", source.name) + path.sep;
      if (!destination.startsWith(base)) throw new Error("Invalid source path");
      const response = await get(`https://raw.githubusercontent.com/${source.repository}/${source.revision}/${entry.path}`);
      const content = Buffer.from(await response.arrayBuffer());
      const gitHash = createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
      if (gitHash !== entry.sha) throw new Error(`Content integrity mismatch: ${entry.path}`);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content);
      checksums.push({ source: source.name, path: entry.path, sha256: createHash("sha256").update(content).digest("hex") });
    }));
  }
  console.log(`Synchronized ${source.name}: ${selected.length} reference files`);
}

checksums.sort((left, right) => `${left.source}/${left.path}`.localeCompare(`${right.source}/${right.path}`));
await writeFile(path.join(root, "tooling/vendor/checksums.json"), JSON.stringify(checksums, null, 2) + "\n");
