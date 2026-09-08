#!/usr/bin/env node
/** `node --check` every committed .js/.mjs (skip node_modules). */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = new Set(["node_modules", ".git", "docs"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(root);
let failed = 0;
for (const file of files) {
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (r.status !== 0) {
    failed += 1;
    console.error(r.stderr || r.stdout);
  }
}
if (failed) {
  console.error(`syntax failed: ${failed}/${files.length}`);
  process.exit(1);
}
console.log(`syntax ok: ${files.length} files`);
