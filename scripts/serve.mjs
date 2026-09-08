#!/usr/bin/env node
/**
 * Local static server + /health + optional WEEK-004 fixture API.
 * Writes nothing to disk. Default WEEK_API=mock (no live markets).
 */

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWeekFixture, originAllowed } from "../004/week-api.js";
import { createLogger } from "./lib/log.mjs";
import { intEnv, loadDotEnv } from "./lib/env.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
loadDotEnv(root);

const HOST = process.env.HOST || "127.0.0.1";
const PORT = intEnv("PORT", 4173);
const WEEK_API = (process.env.WEEK_API || "mock").toLowerCase();
const STRICT_ORIGIN = process.env.WEEK_API_STRICT_ORIGIN === "1";
const ALLOW_ORIGIN = (process.env.ALLOW_ORIGIN || "http://127.0.0.1:4173,http://localhost:4173,https://build-100.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const catalog = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"));
const fixtures = JSON.parse(readFileSync(join(root, "004/fixtures.json"), "utf8"));
const log = createLogger(process.env.LOG_LEVEL);
const started = Date.now();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

const NOOP_BEACON = "/* local noop: production beacon.js is not in git */\n";

function send(res, status, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "");
  res.writeHead(status, { "Content-Length": payload.length, ...headers });
  res.end(payload);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
}

function safeJoin(base, reqPath) {
  const decoded = decodeURIComponent(reqPath.split("?")[0]);
  const rel = decoded.replace(/^\/+/, "");
  const abs = normalize(join(base, rel));
  if (abs !== base && !abs.startsWith(base + sep)) return null;
  return abs;
}

function health() {
  return {
    ok: true,
    service: "build-100",
    completed: catalog.completed,
    total: catalog.total,
    weekApi: WEEK_API,
    uptime_s: Math.round((Date.now() - started) / 1000),
  };
}

async function readBody(req, limit = 32_000) {
  const chunks = [];
  let n = 0;
  for await (const chunk of req) {
    n += chunk.length;
    if (n > limit) throw new Error("body_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function handleWeek(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }
  if (req.method === "GET") {
    sendJson(res, 404, { error: "not found" });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (WEEK_API === "off") {
    sendJson(res, 503, { error: "week_api_off" });
    return;
  }
  const origin = req.headers.origin || "";
  if (!originAllowed(origin, ALLOW_ORIGIN, { strict: STRICT_ORIGIN })) {
    sendJson(res, 403, { error: "forbidden origin" });
    return;
  }
  try {
    const raw = await readBody(req);
    let body = {};
    if (raw.trim()) {
      try {
        body = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
    }
    const result = buildWeekFixture(body, fixtures);
    sendJson(res, 200, result);
  } catch (err) {
    log.error("week_api_failed", { err: err.message });
    sendJson(res, 400, { error: err.message === "body_too_large" ? "body_too_large" : "bad_request" });
  }
}

function resolveStatic(path) {
  const abs = safeJoin(root, path);
  if (!abs) return { error: 400 };
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    const index = join(abs, "index.html");
    if (existsSync(index)) return { file: index };
  }
  if (existsSync(abs) && statSync(abs).isFile()) return { file: abs };
  return { error: 404 };
}

const server = createServer((req, res) => {
  const startedAt = Date.now();
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  res.on("finish", () => {
    log.info("http", { method: req.method, path, status: res.statusCode, ms: Date.now() - startedAt });
  });

  Promise.resolve()
    .then(async () => {
      if (path === "/api/week") {
        await handleWeek(req, res);
        return;
      }
      if (path === "/collect") {
        send(res, 204, "");
        return;
      }
      if (path === "/beacon.js") {
        send(res, 200, NOOP_BEACON, { "Content-Type": "text/javascript; charset=utf-8" });
        return;
      }
      if (path === "/health" || path === "/health.json") {
        sendJson(res, 200, health());
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        send(res, 405, "method not allowed");
        return;
      }
      const hit = resolveStatic(path);
      if (hit.error) {
        send(res, hit.error, hit.error === 400 ? "bad path" : "Not Found");
        return;
      }
      const type = MIME[extname(hit.file).toLowerCase()] || "application/octet-stream";
      if (req.method === "HEAD") {
        res.writeHead(200, { "Content-Type": type });
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": type });
      createReadStream(hit.file).pipe(res);
    })
    .catch((err) => {
      log.error("serve_crash", { err: err.message });
      if (!res.headersSent) send(res, 500, "internal");
    });
});

server.listen(PORT, HOST, () => {
  log.info("listen", { host: HOST, port: PORT, weekApi: WEEK_API, root });
});

function shutdown(sig) {
  log.info("shutdown", { sig });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
