"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

function labelFor(input) {
  const n = E.normalizeLossPct(input);
  assert.equal(n.ok, true);
  return E.formatPct(E.requiredGain(n.loss) * 100, { sign: true });
}

test("-26% needs +35.1%", () => {
  const n = E.normalizeLossPct("-26");
  assert.equal(n.ok, true);
  assert.equal(n.loss, 0.26);
  assert.equal(E.formatPct(E.requiredGain(n.loss) * 100, { sign: true }), "+35.1%");
});

test("-50% needs +100%", () => {
  assert.equal(labelFor("-50"), "+100%");
});

test("-80% needs +400%", () => {
  assert.equal(labelFor("-80"), "+400%");
});

test("-10% needs +11.1%", () => {
  assert.equal(labelFor("-10"), "+11.1%");
});

test("0% loss shows +0%", () => {
  const n = E.normalizeLossPct("0");
  assert.equal(n.ok, true);
  assert.equal(n.loss, 0);
  assert.equal(E.formatPct(E.requiredGain(0) * 100, { sign: true }), "+0%");
});

test("100% wipeout is Infinity formatted as ∞", () => {
  const n = E.normalizeLossPct("100%");
  assert.equal(n.ok, true);
  assert.equal(n.loss, 1);
  assert.equal(E.requiredGain(1), Infinity);
  assert.equal(E.formatPct(Infinity, { sign: true }), "∞");
});

test("loss above 100% is a range error", () => {
  const a = E.normalizeLossPct("101");
  assert.equal(a.ok, false);
  assert.equal(a.error, "range");
  const b = E.normalizeLossPct("-150");
  assert.equal(b.ok, false);
  assert.equal(b.error, "range");
});

test("empty string is an empty error", () => {
  const n = E.normalizeLossPct("");
  assert.equal(n.ok, false);
  assert.equal(n.error, "empty");
  assert.equal(E.normalizeLossPct("   ").error, "empty");
});

test("letters are a nan error", () => {
  const n = E.normalizeLossPct("abc");
  assert.equal(n.ok, false);
  assert.equal(n.error, "nan");
  assert.equal(E.normalizeLossPct("26x").error, "nan");
});

test("normalizeLossPct accepts 26, 26%, and padded 26", () => {
  assert.equal(E.normalizeLossPct("26").loss, 0.26);
  assert.equal(E.normalizeLossPct("26%").loss, 0.26);
  assert.equal(E.normalizeLossPct(" 26 ").loss, 0.26);
  assert.equal(E.normalizeLossPct("+26").loss, 0.26);
});

test("buy 100 / current 50 → loss 0.5", () => {
  const r = E.lossFromPrices(100, 50);
  assert.equal(r.ok, true);
  assert.equal(r.loss, 0.5);
  assert.equal(E.formatPct(E.requiredGain(r.loss) * 100, { sign: true }), "+100%");
});

test("current above buy is a gain, not a loss", () => {
  const r = E.lossFromPrices(100, 120);
  assert.equal(r.ok, true);
  assert.equal(r.loss, 0);
  assert.ok(Math.abs(r.gain - 0.2) < 1e-12);
});

test("negative or zero buy / negative current are range errors", () => {
  assert.equal(E.lossFromPrices(100, -1).ok, false);
  assert.equal(E.lossFromPrices(100, -1).error, "range");
  assert.equal(E.lossFromPrices(-5, 10).error, "range");
  assert.equal(E.lossFromPrices(0, 10).error, "range");
});

test("maxDrawdown(1) = 0.5", () => {
  assert.equal(E.maxDrawdown(1), 0.5);
});

test("maxDrawdown of ~35.135% is ~26%", () => {
  const g = E.requiredGain(0.26);
  assert.ok(Math.abs(g - 0.351351351351351) < 1e-10);
  assert.ok(Math.abs(E.maxDrawdown(g) - 0.26) < 1e-12);
  assert.ok(Math.abs(E.maxDrawdown(0.351351351351351) - 0.26) < 1e-6);
});

test("maxDrawdown(0) = 0; negative gain is NaN", () => {
  assert.equal(E.maxDrawdown(0), 0);
  assert.ok(Number.isNaN(E.maxDrawdown(-0.1)));
});

test("requiredGain out of range is NaN; 1 is Infinity", () => {
  assert.ok(Number.isNaN(E.requiredGain(-0.01)));
  assert.ok(Number.isNaN(E.requiredGain(1.01)));
  assert.equal(E.requiredGain(0), 0);
  assert.equal(E.requiredGain(1), Infinity);
});

test("formatPct strips .0, keeps one decimal, commas above 10000%", () => {
  assert.equal(E.formatPct(100, { sign: true }), "+100%");
  assert.equal(E.formatPct(35.135, { sign: true }), "+35.1%");
  assert.equal(E.formatPct(11.111, { sign: true }), "+11.1%");
  assert.equal(E.formatPct(400, { sign: true }), "+400%");
  assert.equal(E.formatPct(12345.6, { sign: true }), "+12,345.6%");
  assert.equal(E.formatPct(0, { sign: true }), "+0%");
});

test("table has the eight classic rows including -33.3% → +50%", () => {
  const rows = E.table();
  assert.equal(rows.length, 8);
  assert.equal(rows[0].loss, 0.1);
  assert.equal(E.formatPct(rows[3].lossPct), "33.3%");
  assert.equal(E.formatPct(rows[3].gainPct, { sign: true }), "+50%");
  assert.equal(E.formatPct(rows[4].gainPct, { sign: true }), "+100%");
  assert.equal(E.formatPct(rows[6].gainPct, { sign: true }), "+400%");
});

test("PRESETS include gold -26% and four cases", () => {
  assert.equal(E.PRESETS.length, 4);
  assert.equal(E.PRESETS[0].id, "gold");
  assert.equal(E.PRESETS[0].loss, 0.26);
  assert.equal(E.formatPct(E.requiredGain(0.26) * 100, { sign: true }), "+35.1%");
});

test("curvePoints covers 0–90% and ends at +900%", () => {
  const pts = E.curvePoints(0.9, 10);
  assert.equal(pts.length, 10);
  assert.equal(pts[0].loss, 0);
  assert.equal(pts[0].gain, 0);
  assert.equal(pts[pts.length - 1].loss, 0.9);
  assert.ok(Math.abs(pts[pts.length - 1].gain - 9) < 1e-9);
});

test("non-numeric prices error; equal prices are zero loss", () => {
  assert.equal(E.lossFromPrices("foo", 50).error, "nan");
  assert.equal(E.lossFromPrices("", 50).error, "empty");
  const eq = E.lossFromPrices(100, 100);
  assert.equal(eq.ok, true);
  assert.equal(eq.loss, 0);
  assert.equal(eq.gain, 0);
});
