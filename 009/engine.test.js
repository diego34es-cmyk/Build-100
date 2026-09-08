import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { annuityFV, catchUpMonthly, delayCost, validateDelayInput } from "./engine.js";

test("annuityFV: zero rate is monthly × months", () => {
  assert.equal(annuityFV(100, 0, 1), 1200);
});

test("annuityFV: 12% annual, 100/mo, 1 year", () => {
  const r = 0.01;
  const expected = 100 * (Math.pow(1 + r, 12) - 1) / r;
  assert.ok(Math.abs(annuityFV(100, 0.12, 1) - expected) < 1e-9);
});

test("annuityFV: zero monthly or years", () => {
  assert.equal(annuityFV(0, 0.06, 30), 0);
  assert.equal(annuityFV(2000, 0.06, 0), 0);
});

test("catchUpMonthly inverts annuityFV", () => {
  const fv = annuityFV(3000, 0.06, 30);
  const p = catchUpMonthly(fv, 0.06, 30);
  assert.ok(Math.abs(p - 3000) < 1e-6);
});

test("delayCost: 1 year delay is a real gap, not just 12 deposits", () => {
  const r = delayCost({ monthly: 3000, annualRate: 0.06, years: 30, delayYears: 1 });
  assert.equal(r.ok, true);
  const twelveDeposits = 3000 * 12;
  assert.ok(r.gap > twelveDeposits);
  assert.ok(r.now > r.later);
  assert.ok(r.catchUpMonthly > 3000);
  assert.ok(r.extraMonthly > 0);
});

test("delayCost: delay 0 → gap 0", () => {
  const r = delayCost({ monthly: 2000, annualRate: 0.05, years: 20, delayYears: 0 });
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.gap) < 1e-6);
  assert.ok(Math.abs(r.catchUpMonthly - 2000) < 1e-6);
});

test("delayCost: delay >= years → unreachable", () => {
  const r = delayCost({ monthly: 1000, annualRate: 0.04, years: 10, delayYears: 10 });
  assert.equal(r.ok, true);
  assert.equal(r.later, 0);
  assert.equal(r.reachable, false);
  assert.equal(r.catchUpMonthly, Infinity);
});

test("validateDelayInput rejects junk", () => {
  assert.equal(validateDelayInput(null), "bad_input");
  assert.equal(validateDelayInput({ monthly: -1, annualRate: 0.06, years: 30, delayYears: 1 }), "monthly_range");
  assert.equal(validateDelayInput({ monthly: 100, annualRate: 0.06, years: 0, delayYears: 0 }), "years_range");
  assert.equal(delayCost({ monthly: 100, annualRate: 9, years: 10, delayYears: 1 }).ok, false);
});

test("catalog: 40 lessons, ids 01–40, only 01 is ready", () => {
  const data = JSON.parse(readFileSync(new URL("./lessons.json", import.meta.url), "utf8"));
  assert.equal(data.lessons.length, 40);
  const ids = data.lessons.map((l) => l.id);
  const expected = Array.from({ length: 40 }, (_, i) => String(i + 1).padStart(2, "0"));
  assert.deepEqual(ids, expected);
  const ready = data.lessons.filter((l) => l.status === "ready");
  assert.equal(ready.length, 1);
  assert.equal(ready[0].id, "01");
  assert.equal(ready[0].calc, "delay");
  assert.ok(Array.isArray(ready[0].body_zh) && ready[0].body_zh.length >= 2);
  const cols = new Set(data.lessons.map((l) => l.col));
  assert.deepEqual([...cols].sort(), ["cash", "lock", "odds"]);
  assert.equal(data.columns.length, 3);
  data.lessons.filter((l) => l.status !== "ready").forEach((l) => {
    assert.equal(l.status, "soon");
    assert.ok(!l.body_zh);
    assert.ok(!l.body_en);
  });
});
