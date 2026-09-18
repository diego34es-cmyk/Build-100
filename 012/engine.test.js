import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TIME_LIMIT_SEC,
  annuityFV,
  compoundGap,
  oddsResidual,
  leveredEquity,
  liquidateMove,
  grade,
  remainingMs,
  shuffleInPlace,
} from "./engine.js";

test("TIME_LIMIT_SEC is 3 minutes", () => {
  assert.equal(TIME_LIMIT_SEC, 180);
});

test("compoundGap: 10y delay is larger than skipped principal", () => {
  const g = compoundGap({ monthly: 2000, annualRate: 0.06, yearsFull: 30, yearsLate: 20 });
  assert.ok(g.full > g.late);
  assert.ok(g.gap > g.principalSkipped);
  assert.ok(g.gapRatio > 0.4);
});

test("annuityFV zero rate", () => {
  assert.equal(annuityFV(2000, 0, 10), 2000 * 12 * 10);
});

test("oddsResidual 0.62 leaves 38%", () => {
  const o = oddsResidual(0.62);
  assert.equal(o.ok, true);
  assert.ok(Math.abs(o.residual - 0.38) < 1e-12);
  assert.ok(Math.abs(o.payoutIfYes - 1 / 0.62) < 1e-12);
  assert.equal(oddsResidual(0).ok, false);
  assert.equal(oddsResidual(1).ok, false);
});

test("leveredEquity 5× −12% → 40%", () => {
  assert.equal(leveredEquity(100000, 5, -0.12), 40000);
  assert.equal(leveredEquity(100000, 1, -0.12), 88000);
  assert.ok(Math.abs(liquidateMove(5) + 0.2) < 1e-12);
  assert.ok(leveredEquity(100000, 5, -0.12) > 0);
  assert.equal(leveredEquity(100000, 5, -0.2), 0);
});

test("grade: ok / wrong / timeout", () => {
  assert.equal(grade("b", "b", 12).outcome, "ok");
  assert.equal(grade("b", "a", 12).ok, false);
  assert.equal(grade("b", "a", 12).outcome, "wrong");
  assert.equal(grade("b", "b", 181).outcome, "timeout");
  assert.equal(grade("b", null, 10).outcome, "timeout");
  assert.equal(grade("b", "b", 180).outcome, "ok");
  assert.equal(grade("b", "b", 180.001).outcome, "timeout");
});

test("remainingMs clamps at 0", () => {
  assert.equal(remainingMs(1000, 1000 + 180000), 0);
  assert.equal(remainingMs(1000, 1000 + 1000), 179000);
  assert.equal(remainingMs(1000, 1000 + 200000), 0);
});

test("shuffleInPlace permutes with a stub rng", () => {
  const a = [1, 2, 3, 4];
  let i = 0;
  const rng = () => {
    const seq = [0.9, 0.1, 0.5];
    return seq[i++] ?? 0;
  };
  shuffleInPlace(a, rng);
  assert.equal(a.length, 4);
  assert.deepEqual([...a].sort((x, y) => x - y), [1, 2, 3, 4]);
});

test("games.json: 3 levels, 2–3 choices, one correct each", () => {
  const data = JSON.parse(readFileSync(new URL("./games.json", import.meta.url), "utf8"));
  assert.equal(data.timeLimitSec, 180);
  assert.equal(data.levels.length, 3);
  assert.deepEqual(data.levels.map((l) => l.id), ["compound", "odds", "leverage"]);
  data.levels.forEach((lv) => {
    assert.ok(lv.choices.length >= 2 && lv.choices.length <= 3);
    assert.ok(lv.choices.some((c) => c.id === lv.correct));
    assert.ok(lv.scenario_zh && lv.scenario_en);
    assert.ok(!/RPG|升级|经验/i.test(JSON.stringify(lv)));
  });
});
