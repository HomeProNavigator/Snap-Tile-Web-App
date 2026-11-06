import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const iosApp = path.join(root, "ios", "App", "App");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build:ios"]);

if (!existsSync(path.join(root, "ios"))) {
  run("npx", ["cap", "add", "ios"]);
}

run("npx", ["cap", "sync", "ios"]);
mkdirSync(iosApp, { recursive: true });
for (const file of ["SnapBillingPlugin.swift", "PrivacyInfo.xcprivacy"]) {
  cpSync(path.join(root, "ios-native", file), path.join(iosApp, file));
}
cpSync(path.join(root, "ios-native", "SnapTile.storekit"), path.join(root, "ios", "App", "SnapTile.storekit"));

const configPath = path.join(iosApp, "capacitor.config.json");
const capConfig = JSON.parse(readFileSync(configPath, "utf8"));
const classes = new Set(capConfig.packageClassList ?? []);
classes.add("SnapBillingPlugin");
capConfig.packageClassList = [...classes];
writeFileSync(configPath, `${JSON.stringify(capConfig, null, "\t")}\n`);
console.log("Open it on a Mac with: npm run ios:open");
console.log("TestFlight: leave CAP_SERVER_URL unset, then Product > Archive in Xcode.");
