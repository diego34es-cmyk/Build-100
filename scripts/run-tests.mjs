#!/usr/bin/env node
/** Run every package `npm test` plus offline 005 research tests. */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const jobs = [];

function addNpmTest(dir) {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.scripts?.test) jobs.push({ name: dir === root ? "root" : dir.slice(root.length + 1), cwd: dir, cmd: ["npm", "test"] });
}

for (const name of readdirSync(root).sort()) {
  const dir = join(root, name);
  if (!statSync(dir).isDirectory()) continue;
  if (/^\d{3}$/.test(name) || name === "lab") {
    if (name === "lab") {
      for (const child of readdirSync(dir).sort()) addNpmTest(join(dir, child));
    } else {
      addNpmTest(dir);
    }
  }
}

if (existsSync(join(root, "005/research/test_offline.py"))) {
  jobs.push({
    name: "005/research",
    cwd: join(root, "005"),
    cmd: ["python3", "-m", "unittest", "research.test_offline", "-v"],
  });
}

jobs.push({
  name: "http-smoke",
  cwd: root,
  cmd: [process.execPath, join(root, "scripts/http-smoke.mjs")],
});

let failed = 0;
for (const job of jobs) {
  console.log(`\n--- ${job.name} ---`);
  const r = spawnSync(job.cmd[0], job.cmd.slice(1), { cwd: job.cwd, stdio: "inherit", env: process.env });
  if (r.status !== 0) {
    failed += 1;
    console.error(`${job.name} failed with exit ${r.status}`);
  }
}

if (!jobs.length) {
  console.error("no test jobs found");
  process.exit(1);
}
if (failed) {
  console.error(`\nfailed jobs: ${failed}/${jobs.length}`);
  process.exit(1);
}
console.log(`\nall test jobs passed: ${jobs.length}`);
