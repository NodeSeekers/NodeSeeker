import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(root, "dist");
const outputDirectory = path.join(distDirectory, "nodeseek-seeker");
const bundledConfigPath = path.join(outputDirectory, "nsh-preloaded-config.json");
const sampleConfigPath = path.join(root, "examples", "nsh-preloaded-config.json");
const configPayload = JSON.parse(await fs.readFile(sampleConfigPath, "utf8"));
if (configPayload.schema !== "nodeseek-helper-preloaded-config"
    || configPayload.version !== 1
    || !configPayload.options
    || typeof configPayload.options !== "object"
    || Array.isArray(configPayload.options)) {
  throw new Error("示例配置格式错误，停止打包");
}
if (String(configPayload.options.apiKey || "").trim()
    || String(configPayload.options.telegramBotToken || "").trim()
    || !Array.isArray(configPayload.options.telegramTargets)
    || configPayload.options.telegramTargets.length > 0) {
  throw new Error("示例配置不能包含 API Key、Bot Token 或 Telegram 推送目标");
}
delete configPayload.options.commentToolsEnabled;
const bundledConfig = JSON.stringify(configPayload, null, 2);

await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });
for (const entry of ["assets", "options", "src"]) {
  await fs.cp(path.join(root, entry), path.join(outputDirectory, entry), { recursive: true });
}

const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
delete manifest.key;
delete manifest.update_url;
manifest.name = "NodeSeek Seeker";
manifest.action.default_title = manifest.name;
await fs.writeFile(path.join(outputDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
await fs.writeFile(bundledConfigPath, bundledConfig);

console.log(JSON.stringify({
  outputDirectory,
  name: manifest.name,
  version: manifest.version,
  usesSeparateLocalId: !Object.hasOwn(manifest, "key"),
  includedDefaultSettingCount: Object.keys(configPayload.options).length
}));
