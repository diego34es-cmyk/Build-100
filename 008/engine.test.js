import { test } from "node:test";
import assert from "node:assert/strict";
import { DAYS_PER_MONTH, computeRegret, aggregate } from "./engine.js";

test("DAYS_PER_MONTH is 30", () => {
  assert.equal(DAYS_PER_MONTH, 30);
});

test("full use → waste 0, actual daily equals every-day cost", () => {
  const r = computeRegret({ monthlyFee: 30, months: 2, usedDays: 60 });
  assert.equal(r.ok, true);
  assert.equal(r.waste, 0);
  assert.equal(r.unusedDays, 0);
  assert.equal(r.dailyIfFull, 1);
  assert.equal(r.actualDaily, 1);
  assert.equal(r.totalPaid, 60);
});

test("waste = unused days × daily fee", () => {
  const r = computeRegret({ monthlyFee: 30, months: 2, usedDays: 10 });
  assert.equal(r.totalDays, 60);
  assert.equal(r.unusedDays, 50);
  assert.equal(r.dailyIfFull, 1);
  assert.equal(r.actualDaily, 6);
  assert.equal(r.waste, 50);
});

test("zero use → all paid is waste, actual daily is null", () => {
  const r = computeRegret({ monthlyFee: 18, months: 3, usedDays: 0 });
  assert.equal(r.totalPaid, 54);
  assert.equal(r.waste, 54);
  assert.equal(r.actualDaily, null);
  assert.equal(r.unusedDays, 90);
});

test("used more than calendar days → no waste", () => {
  const r = computeRegret({ monthlyFee: 10, months: 1, usedDays: 40 });
  assert.equal(r.waste, 0);
  assert.equal(r.overUsed, true);
  assert.equal(r.actualDaily, 10 / 40);
});

test("rejects invalid inputs", () => {
  assert.equal(computeRegret({ monthlyFee: -1, months: 1, usedDays: 1 }).ok, false);
  assert.equal(computeRegret({ monthlyFee: 1, months: 0, usedDays: 1 }).ok, false);
  assert.equal(computeRegret({ monthlyFee: 1, months: 1, usedDays: -2 }).ok, false);
  assert.equal(computeRegret({ monthlyFee: "x", months: 1, usedDays: 1 }).ok, false);
});

test("aggregate sums paid and waste across items", () => {
  const a = aggregate([
    { monthlyFee: 30, months: 2, usedDays: 10 },
    { monthlyFee: 10, months: 1, usedDays: 30 },
  ]);
  assert.equal(a.count, 2);
  assert.equal(a.totalPaid, 70);
  assert.equal(a.waste, 50);
  assert.equal(a.usedDays, 40);
  assert.equal(a.totalDays, 90);
});
