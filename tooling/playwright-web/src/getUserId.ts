import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getBetterAuthUserId(browserName: string): string {
  // Path relative to config file location (tooling/playwright-web/)
  const userIdFile = path.resolve(
    __dirname,
    "..",
    "playwright",
    ".better-auth",
    `userId-${browserName}.json`,
  );
  try {
    const data = readFileSync(userIdFile, "utf-8");
    const { userId } = JSON.parse(data) as { userId: string };
    if (!userId) {
      throw new Error(`userId not found in userId-${browserName}.json`);
    }
    return userId;
  } catch (_) {
    throw new Error(
      `Failed to read userId from ${userIdFile}. Make sure authentication setup has run for browser: ${browserName}.`,
    );
  }
}
