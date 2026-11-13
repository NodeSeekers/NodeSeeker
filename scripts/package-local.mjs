import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(root, "dist");
const outputDirectory = path.join(distDirectory, "nodeseeker");
const bundledConfigPath = path.join(outputDirectory, "nsh-preloaded-config.json");
const exampleConfigPath = path.join(root, "examples", "nsh-preloaded-config.json");
const configPayload = JSON.parse(await fs.readFile(exampleConfigPath, "utf8"));
if (configPayload.schema !== "nodeseek-helper-preloaded-config"
    || configPayload.version !== 1
    || !configPayload.options
    || typeof configPayload.options !== "object"
    || Array.isArray(configPayload.options)) {
  throw new Error("源码预置配置文件格式异常，已停止打包");
}
delete configPayload.options.linkPurifierEnabled;
delete configPayload.options.commentToolsEnabled;
delete configPayload.options.uploadEndpoint;
Object.assign(configPayload.options, {
  apiKey: "",
  telegramBotToken: "",
  telegramTargets: [],
  telegramKeywordRules: [],
  telegramBlockedKeywords: [],
  telegramBoardSlugs: [],
  telegramMonitorPaused: false,
  telegramMessageCursors: {},
  telegramRssInitialized: false,
  telegramRssSeenIds: []
});
for (const key of [
  "telegramChatId", "telegramRssHistory", "telegramPendingDirectTopics",
  "telegramPendingPersonalChatId", "telegramPendingPersonalTargetName",
  "telegramPersonalStartWatchUntil", "telegramPersonalStartWatchSince",
  "telegramPersonalStartOffset", "telegramPersonalStartRepliedUpdateId",
  "telegramPendingPersonalStartUpdateId", "telegramMonitorLastCheck", "telegramMonitorLastError"
]) {
  delete configPayload.options[key];
}
const bundledConfig = JSON.stringify(configPayload, null, 2);

await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });
for (const entry of ["assets", "options", "src"]) {
  await fs.cp(path.join(root, entry), path.join(outputDirectory, entry), { recursive: true });
}

const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
delete manifest.key;
delete manifest.update_url;
manifest.name = "NodeSeeker";
manifest.action.default_title = manifest.name;
await fs.writeFile(path.join(outputDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
await fs.writeFile(bundledConfigPath, bundledConfig);

console.log(JSON.stringify({
  outputDirectory,
  name: manifest.name,
  version: manifest.version,
  usesSeparateLocalId: !Object.hasOwn(manifest, "key"),
  preservedSettingCount: Object.keys(configPayload.options).length
}));
