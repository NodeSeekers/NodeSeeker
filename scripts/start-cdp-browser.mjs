import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Start Chromium directly; Playwright connects separately through the local CDP port.
const child = spawn(chromium.executablePath(), [
  `--user-data-dir=${path.join(root, ".debug", "chromium-profile")}`,
  "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=9223",
  `--disable-extensions-except=${root}`,
  `--load-extension=${root}`,
  "--window-position=-32000,-32000",
  "https://www.nodeseek.com/"
], { stdio: "inherit" });

if (process.platform === "darwin") {
  const hideTestChrome = () => {
    const hideProcess = spawn("/usr/bin/osascript", [
      "-e",
      'tell application "System Events" to tell process "Google Chrome for Testing" to set visible to false'
    ], { stdio: "ignore" });
    hideProcess.on("error", () => {});
  };
  setTimeout(hideTestChrome, 1500).unref();
}

child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
