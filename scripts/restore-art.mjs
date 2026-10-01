/** Reassemble lossless source-art fragments; no network or external tools needed. */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, "assets/source-art/manifest.json"), "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const asset of manifest.assets) {
  const destination = resolve(root, asset.path);
  if (existsSync(destination)) {
    const current = readFileSync(destination);
    if (current.length === asset.size && digest(current) === asset.sha256) continue;
  }
  const pieces = asset.parts.map((part) => {
    const bytes = readFileSync(resolve(root, part.path));
    if (bytes.length !== part.size || digest(bytes) !== part.sha256) {
      throw new Error(`Source-art fragment failed verification: ${part.path}`);
    }
    return bytes;
  });
  const bytes = Buffer.concat(pieces);
  if (bytes.length !== asset.size || digest(bytes) !== asset.sha256) {
    throw new Error(`Reconstructed source art failed verification: ${asset.path}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.restore-tmp`;
  writeFileSync(temporary, bytes);
  renameSync(temporary, destination);
  console.log(`Restored ${asset.path} (${asset.size} bytes, SHA-256 verified)`);
}
