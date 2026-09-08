import { test } from "node:test";
import assert from "node:assert/strict";
import { PHASES, buildPack } from "./engine.js";

test("skeleton stays unimplemented and lists four phases", () => {
  assert.deepEqual(PHASES, ["viewing", "contract", "move_in", "move_out"]);
  const r = buildPack({ furnished: true });
  assert.equal(r.ok, false);
  assert.equal(r.error, "not_implemented");
});
