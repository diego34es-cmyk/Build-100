import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWeekFixture, originAllowed, parseWeekRequest } from "./week-api.js";

const fixtures = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures.json"), "utf8")
);

describe("parseWeekRequest", () => {
  it("accepts slider percent and unit interval", () => {
    assert.equal(parseWeekRequest({ theme: "tech", threshold: 60, lang: "zh" }).threshold, 0.6);
    assert.equal(parseWeekRequest({ theme: "tech", threshold: 0.6, lang: "en" }).threshold, 0.6);
  });

  it("rejects empty, bad theme, bad lang, out-of-range threshold", () => {
    assert.equal(parseWeekRequest(null).ok, false);
    assert.equal(parseWeekRequest({ theme: "sports", threshold: 60, lang: "zh" }).error, "unknown_theme");
    assert.equal(parseWeekRequest({ theme: "tech", threshold: 60, lang: "es" }).error, "unknown_lang");
    assert.equal(parseWeekRequest({ theme: "tech", threshold: 10, lang: "zh" }).error, "threshold_range");
    assert.equal(parseWeekRequest({ theme: "tech", threshold: "nope", lang: "zh" }).error, "threshold_not_finite");
  });
});

describe("buildWeekFixture", () => {
  it("filters facts by threshold and never claims live markets", () => {
    const r = buildWeekFixture({ theme: "politics", threshold: 70, lang: "en" }, fixtures);
    assert.equal(r.ok, true);
    assert.equal(r.source, "fixture");
    assert.equal(r.facts.length, 1);
    assert.equal(r.facts[0].confidence, 0.72);
  });

  it("empty/error: threshold too high returns a recoverable miss", () => {
    const r = buildWeekFixture({ theme: "economy", threshold: 90, lang: "zh" }, fixtures);
    assert.equal(r.ok, false);
    assert.match(r.error, /市场/);
  });
});

describe("originAllowed", () => {
  const allow = ["https://build-100.com", "http://127.0.0.1:4173"];
  it("strict mode rejects missing origin", () => {
    assert.equal(originAllowed("", allow, { strict: true }), false);
    assert.equal(originAllowed("https://evil.example", allow, { strict: true }), false);
    assert.equal(originAllowed("https://build-100.com", allow, { strict: true }), true);
  });
  it("local default allows missing origin", () => {
    assert.equal(originAllowed("", allow, { strict: false }), true);
  });
});
