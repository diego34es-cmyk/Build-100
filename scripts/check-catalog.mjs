#!/usr/bin/env node
/** Fail if the numbered sites, homepage counter, and catalog.json drift. */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const errors = [];

function fail(msg) {
  errors.push(msg);
}

const catalog = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"));
const home = readFileSync(join(root, "index.html"), "utf8");
const index013 = JSON.parse(readFileSync(join(root, "013/catalog.json"), "utf8"));

if (!Number.isInteger(catalog.completed) || catalog.completed < 1) fail("catalog.completed invalid");
if (catalog.sites.length !== catalog.completed) {
  fail(`catalog.sites (${catalog.sites.length}) !== completed (${catalog.completed})`);
}

const siteRe = /const SITE = \{ completed: (\d+), total: (\d+), updated: "([^"]+)", started: "([^"]+)" \}/;
const sm = home.match(siteRe);
if (!sm) fail("index.html SITE block not found");
else {
  if (Number(sm[1]) !== catalog.completed) fail(`index.html SITE.completed ${sm[1]} !== catalog ${catalog.completed}`);
  if (Number(sm[2]) !== catalog.total) fail(`index.html SITE.total ${sm[2]} !== catalog ${catalog.total}`);
  if (sm[3] !== catalog.updated) fail(`index.html SITE.updated ${sm[3]} !== catalog ${catalog.updated}`);
  if (sm[4] !== catalog.started) fail(`index.html SITE.started ${sm[4]} !== catalog ${catalog.started}`);
}

const homeIds = [...home.matchAll(/build-100\.com\/(\d{3})\//g)].map((m) => m[1]);
const catalogIds = catalog.sites.map((s) => s.id);
for (const id of catalogIds) {
  if (!homeIds.includes(id)) fail(`homepage missing link for ${id}`);
}

const idxIds = index013.sites.map((s) => s.id);
if (JSON.stringify(idxIds) !== JSON.stringify(catalogIds)) {
  fail(`013/catalog.json ids ${idxIds.join(",")} !== catalog.json ${catalogIds.join(",")}`);
}

const numbered = readdirSync(root).filter((name) => /^\d{3}$/.test(name) && statSync(join(root, name)).isDirectory());
for (const id of catalogIds) {
  const dir = join(root, id);
  if (!existsSync(join(dir, "index.html"))) fail(`missing ${id}/index.html`);
}
for (const name of numbered) {
  if (!catalogIds.includes(name)) fail(`unlisted numbered directory ${name}`);
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
for (const id of catalogIds) {
  if (!sitemap.includes(`/${id}/`)) fail(`sitemap.xml missing /${id}/`);
}

if (errors.length) {
  for (const e of errors) console.error("catalog:", e);
  process.exit(1);
}
console.log(`catalog ok: ${catalog.completed}/${catalog.total} sites, ${numbered.length} dirs`);
