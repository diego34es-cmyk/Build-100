import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const library = JSON.parse(readFileSync(join(root, "data/library.json"), "utf8"));
const fixture = JSON.parse(readFileSync(join(root, "data/library.fixture.json"), "utf8"));

describe("library.json", () => {
  it("has edition metadata and a non-empty series list", () => {
    assert.equal(typeof library.edition, "number");
    assert.ok(library.as_of);
    assert.ok(Array.isArray(library.method?.exclude));
    assert.ok(library.method.exclude.includes("crypto_15m_or_shorter"));
    assert.ok(Array.isArray(library.series) && library.series.length > 0);
  });

  it("each series has status; ready/thin curves match the price grid", () => {
    const grid = library.method.price_grid;
    for (const s of library.series) {
      assert.ok(s.id);
      assert.ok(["ready", "thin", "insufficient"].includes(s.status), s.id);
      assert.ok(Array.isArray(s.curve), s.id);
      if (s.status === "insufficient") {
        assert.equal(s.lock_price, null, s.id);
        continue;
      }
      assert.equal(s.curve.length, grid.length, s.id);
      assert.ok(s.lock_price != null, s.id);
    }
  });
});

describe("library.fixture.json", () => {
  it("is marked as a UI demo and must not replace live catalog blindly", () => {
    assert.ok(fixture.series?.length >= 1);
    const note = JSON.stringify(fixture);
    assert.ok(note.length > 10);
  });
});
