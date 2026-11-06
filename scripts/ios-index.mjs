import { copyFileSync, existsSync } from "node:fs";

if (!existsSync("dist-ios/ios-index.html")) {
  console.error("dist-ios/ios-index.html is missing");
  process.exit(1);
}
copyFileSync("dist-ios/ios-index.html", "dist-ios/index.html");
