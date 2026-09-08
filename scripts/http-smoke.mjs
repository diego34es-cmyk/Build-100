#!/usr/bin/env node
/** Start serve.mjs, hit health / homepage / 014 / week API, then stop. */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.SMOKE_PORT || 4174);
const host = "127.0.0.1";
const base = `http://${host}:${port}`;

function waitForLog(child, needle, ms = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server start timeout")), ms);
    const onData = (buf) => {
      const s = buf.toString();
      if (s.includes(needle)) {
        clearTimeout(t);
        child.stdout.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
  });
}

async function main() {
  const child = spawn(process.execPath, [join(root, "scripts/serve.mjs")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: host, LOG_LEVEL: "info", WEEK_API: "mock" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let exitCode = null;
  child.on("exit", (c) => { exitCode = c; });
  try {
    await waitForLog(child, "listen");
    const health = await fetch(`${base}/health`).then((r) => r.json());
    if (!health.ok || health.completed !== 13) throw new Error("health mismatch: " + JSON.stringify(health));
    const home = await fetch(`${base}/`);
    if (home.status !== 200) throw new Error("home " + home.status);
    const miss = await fetch(`${base}/014/`);
    if (miss.status !== 404) throw new Error("014 should 404, got " + miss.status);
    const week = await fetch(`${base}/api/week`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: "politics", threshold: 60, lang: "en" }),
    }).then((r) => r.json());
    if (!week.ok || week.source !== "fixture") throw new Error("week mock failed: " + JSON.stringify(week));
    const bad = await fetch(`${base}/api/week`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: "nope", threshold: 60, lang: "en" }),
    }).then((r) => r.json());
    if (bad.ok) throw new Error("bad theme should fail");
    const slash = await fetch(`${base}/001/`);
    if (slash.status !== 200) throw new Error("/001/ " + slash.status);
    console.log("http-smoke ok", { port, health: health.completed, weekFacts: week.facts.length });
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 300));
    if (exitCode === null) child.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
