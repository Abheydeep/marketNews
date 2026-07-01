import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "./logger.mjs";
import { publicSiteOrigin } from "./public-page-registry.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const siteOrigin = publicSiteOrigin();

export function ogImageUrl(fileName, origin = siteOrigin) {
  return `${origin.replace(/\/+$/, "")}/assets/og/${basename(fileName)}`;
}

export async function writeOgImageAsset(buffer, fileName, options = {}) {
  if (!buffer) return null;
  const safeName = basename(fileName);
  const outputRoot = options.outputRoot ?? join(rootDir, "out", "vercel", "assets", "og");
  await mkdir(outputRoot, { recursive: true });
  const imagePath = join(outputRoot, safeName);
  await writeFile(imagePath, buffer);
  log.info("article image asset written", { imagePath, bytes: buffer.length });
  return { imagePath, url: ogImageUrl(safeName, options.origin) };
}
