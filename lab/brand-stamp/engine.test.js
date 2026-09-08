import { test } from "node:test";
import assert from "node:assert/strict";
import { planStamp } from "./engine.js";

test("valid id/code is dry-run by default", () => {
  const r = planStamp({ id: "014", code: "GRID" });
  assert.equal(r.ok, true);
  assert.equal(r.dryRun, true);
  assert.equal(r.write, false);
  assert.equal(r.target, "014/og-014.png");
});

test("rejects bad id", () => {
  assert.equal(planStamp({ id: "14", code: "GRID" }).error, "bad_id");
});

test("write flag still does not implement file IO", () => {
  const r = planStamp({ id: "014", code: "GRID" }, { write: true });
  assert.equal(r.write, true);
  assert.equal(r.note, "write_not_implemented");
});
