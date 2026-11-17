import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { templateRoot, validateTemplateFile } from "./create-project.mjs";

const check = process.argv[2] === "--check";
if (process.argv.length > 3 || (process.argv[2] && !check)) throw new Error("Use --check or no arguments");
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: templateRoot, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
}).split("\0").filter(Boolean).map(validateTemplateFile).sort();
const filename = new URL("../template.json", import.meta.url);
const configuration = JSON.parse(await readFile(filename, "utf8"));
if (check) {
  if (JSON.stringify(configuration.files) !== JSON.stringify(files)) {
    throw new Error("Template inventory is stale; review new files, then run npm run template:sync");
  }
  console.log(`Template inventory matches ${files.length} maintained files`);
} else {
  await writeFile(filename, `${JSON.stringify({ ...configuration, files }, null, 2)}\n`);
  console.log(`Updated template inventory with ${files.length} maintained files`);
}
