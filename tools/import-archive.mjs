import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const archivePath = process.argv[2];

if (!archivePath) {
  throw new Error("Usage: node tools/import-archive.mjs <archive.json>");
}

const archive = JSON.parse(await readFile(archivePath, "utf8"));
const digests = Array.isArray(archive) ? archive : archive.digests;
if (!Array.isArray(digests)) {
  throw new Error("archive.json must contain a digests array");
}

const archiveDir = join(rootDir, "archive", "daily");
await mkdir(archiveDir, { recursive: true });

let imported = 0;
let preserved = 0;
for (const digest of digests) {
  if (!digest?.digestDate) {
    continue;
  }
  const safeDigest = publicDigestPayload(digest);
  const label = scheduledLabelForDigest(safeDigest).replace(":", "");
  const fileName = `${safeDigest.digestDate}-${label}-digest.json`;
  const localPath = join(archiveDir, fileName);
  const localDigest = await readExistingDigest(localPath);
  if (localDigest && shouldPreserveLocalDigest(localDigest, safeDigest)) {
    preserved += 1;
    continue;
  }
  await writeFile(localPath, `${JSON.stringify(safeDigest, null, 2)}\n`, "utf8");
  imported += 1;
}

process.stdout.write(`Imported ${imported} archived digest${imported === 1 ? "" : "s"}\n`);
if (preserved) {
  process.stdout.write(`Preserved ${preserved} richer local digest${preserved === 1 ? "" : "s"}\n`);
}

async function readExistingDigest(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function shouldPreserveLocalDigest(localDigest, incomingDigest) {
  const localNewsCount = Array.isArray(localDigest.news) ? localDigest.news.length : 0;
  const incomingNewsCount = Array.isArray(incomingDigest.news) ? incomingDigest.news.length : 0;
  const localThumbnailCount = thumbnailCount(localDigest);
  const incomingThumbnailCount = thumbnailCount(incomingDigest);
  const localGeneratedAt = Date.parse(localDigest.generatedAt ?? "");
  const incomingGeneratedAt = Date.parse(incomingDigest.generatedAt ?? "");

  if (localNewsCount > incomingNewsCount || localThumbnailCount > incomingThumbnailCount) {
    return true;
  }

  if (Number.isFinite(localGeneratedAt) && Number.isFinite(incomingGeneratedAt)) {
    return localGeneratedAt > incomingGeneratedAt;
  }

  return false;
}

function thumbnailCount(digest) {
  if (!Array.isArray(digest.news)) {
    return 0;
  }
  return digest.news.filter((article) => article.thumbnail?.alt).length;
}

function publicDigestPayload(digest) {
  const {
    teleprompterScript,
    reelScript,
    asset,
    ...publicFields
  } = digest;

  return {
    ...publicFields,
    asset: asset
      ? {
        sentimentLabel: asset.sentimentLabel,
        assetUrl: asset.assetUrl
      }
      : null
  };
}

function scheduledLabelForDigest(digest) {
  if (digest.scheduledFor) {
    return digest.scheduledFor.slice(11, 16);
  }
  return "08:30";
}
