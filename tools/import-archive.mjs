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
for (const digest of digests) {
  if (!digest?.digestDate) {
    continue;
  }
  const label = scheduledLabelForDigest(digest).replace(":", "");
  const fileName = `${digest.digestDate}-${label}-digest.json`;
  await writeFile(join(archiveDir, fileName), `${JSON.stringify(digest, null, 2)}\n`, "utf8");
  imported += 1;
}

process.stdout.write(`Imported ${imported} archived digest${imported === 1 ? "" : "s"}\n`);

function scheduledLabelForDigest(digest) {
  if (digest.scheduledFor) {
    return digest.scheduledFor.slice(11, 16);
  }
  return "08:30";
}
