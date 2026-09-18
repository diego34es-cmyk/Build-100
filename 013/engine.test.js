import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { catLabels, counts, filterSites, markLive, normalizeCat, rowHref } from "./engine.js";

const catalog = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "catalog.json"), "utf8")
);

test("catalog lists 001–021 with required titles", () => {
  const ids = catalog.sites.map((s) => s.id);
  assert.deepEqual(
    ids,
    [
      "001", "002", "003", "004", "005", "006", "007", "008", "009", "010",
      "011", "012", "013", "014", "015", "016", "017", "018", "019", "020", "021",
    ]
  );
  const by = Object.fromEntries(catalog.sites.map((s) => [s.id, s]));
  assert.equal(by["001"].code, "COMBO");
  assert.equal(by["002"].code, "RETIRE");
  assert.equal(by["003"].code, "PROMPT");
  assert.equal(by["004"].code, "WEEK");
  assert.equal(by["005"].code, "LOCK");
  assert.equal(by["014"].code, "VAULT");
  assert.equal(by["020"].code, "BOTRULES");
  assert.equal(by["021"].code, "LLMSTXT");
  for (const s of catalog.sites) {
    assert.equal(s.live, true, s.id + " should be live");
  }
});

test("category membership matches the brief", () => {
  const inCat = (cat) => filterSites(catalog.sites, cat).map((s) => s.id);
  assert.deepEqual(inCat("finance"), ["002", "008", "009", "012"]);
  assert.deepEqual(inCat("learn"), ["003", "009", "010"]);
  assert.deepEqual(inCat("life"), ["006", "007", "011"]);
  assert.deepEqual(inCat("market"), ["004", "005", "007"]);
  assert.deepEqual(
    inCat("tools"),
    [
      "001", "006", "008", "010", "011",
      "014", "015", "016", "017", "018", "019", "020", "021",
    ]
  );
  assert.equal(filterSites(catalog.sites, "all").length, 21);
  assert.equal(filterSites(catalog.sites, "nope").length, 21);
});

test("live rows have href; markLive flips in-dev", () => {
  const live = catalog.sites.find((s) => s.id === "001");
  assert.equal(rowHref(live), "/001/");
  const flippedOff = markLive(live, false);
  assert.equal(rowHref(flippedOff), null);
  const flippedOn = markLive(flippedOff, true);
  assert.equal(rowHref(flippedOn), "/001/");
});

test("counts and labels", () => {
  const c = counts(catalog.sites);
  assert.equal(c.total, 21);
  assert.equal(c.live, 21);
  assert.equal(c.dev, 0);
  assert.deepEqual(catLabels(["finance", "learn"], "zh"), ["金融", "学习"]);
  assert.equal(normalizeCat("LIFE"), "life");
  assert.equal(normalizeCat("xyz"), "all");
});
