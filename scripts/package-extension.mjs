import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import("./package-local.mjs");
const dist = path.join(root, "dist");
const packageDirectory = path.join(dist, "nodeseek-seeker");
const manifest = JSON.parse(await fs.readFile(path.join(packageDirectory, "manifest.json"), "utf8"));
const archive = path.join(dist, `nodeseek-seeker-v${manifest.version}.zip`);

await fs.mkdir(dist, { recursive: true });
await fs.rm(archive, { force: true });
execFileSync("zip", ["-r", "-q", "-X", archive, "."], {
  cwd: packageDirectory,
  stdio: "inherit"
});
console.log(`Packaged extension: ${path.relative(root, archive)}`);
