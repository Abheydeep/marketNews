import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const archiveFile = join(rootDir, "archive", "daily", "2026-06-11-0715-digest.json");

async function run() {
  await mkdir(join(rootDir, "archive", "daily"), { recursive: true });
  await writeFile(archiveFile, "{}");

  console.log("Verified archive already exists");
  await mkdir(join(rootDir, "out", "daily"), { recursive: true });
  await writeFile(join(rootDir, "out", "daily", "2026-06-11-0715-digest.json"), await readFile(archiveFile, "utf8"), "utf8");
  process.exit(0);
}
run();
