const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

function close(actual, expected, eps) {
  eps = eps == null ? 0.05 : eps;
  assert.ok(
    Math.abs(actual - expected) <= eps,
    actual + " ≉ " + expected + " (±" + eps + ")"
  );
}

test("DEVICES has 6 categories with expected shares", () => {
  assert.equal(E.DEVICES.length, 6);
  const ids = E.DEVICES.map((d) => d.id);
  assert.deepEqual(ids, ["phone", "laptop", "desktop", "gpu", "ssd", "console"]);
  assert.equal(E.getDevice("phone").memShare, 0.1);
  assert.equal(E.getDevice("ssd").storShare, 0.5);
  assert.equal(E.getDevice("gpu").storShare, 0);
});

test("RATES match TrendForce pass-through table", () => {
  assert.equal(E.RATES.DRAM, 2.7);
  assert.equal(E.RATES.SSD, 2.35);
  assert.equal(E.RATES.PASS, 0.35);
  assert.equal(E.RATES.SPILL, 0.3);
  assert.equal(E.RATES.HBM_LO, 0.7);
  assert.equal(E.RATES.HBM_HI, 1.4);
});

test("defaultPrice CNY and USD tables", () => {
  assert.equal(E.defaultPrice("phone", "CNY"), 4999);
  assert.equal(E.defaultPrice("laptop", "CNY"), 6999);
  assert.equal(E.defaultPrice("phone", "USD"), 699);
  assert.equal(E.defaultPrice("ssd", "USD"), 69);
  assert.equal(E.defaultPrice("missing", "CNY"), 0);
});

test("phone default mem26 ≈ 472.4", () => {
  const r = E.estimate({ device: "phone", price: 4999, memGB: 12, storGB: 256 });
  close(r.mem26, 4999 * 0.1 * 2.7 * 0.35);
  close(r.mem26, 472.4);
});

test("phone default stor26 ≈ 246.7", () => {
  const r = E.estimate({ device: "phone", price: 4999, memGB: 12, storGB: 256 });
  close(r.stor26, 4999 * 0.06 * 2.35 * 0.35);
  close(r.stor26, 246.7);
});

test("gpu has no storage component (stor26 = 0)", () => {
  const r = E.estimate({ device: "gpu", price: 4999, memGB: 12, storGB: 0 });
  assert.equal(r.stor26, 0);
  assert.equal(r.storCost, 0);
  assert.ok(r.mem26 > 0);
});

test("ssd has no memory component (mem26 = 0)", () => {
  const r = E.estimate({ device: "ssd", price: 499, memGB: 0, storGB: 1024 });
  assert.equal(r.mem26, 0);
  assert.equal(r.memCost, 0);
  assert.ok(r.stor26 > 0);
});

test("capacity ratio clamps at 3 for 64GB phone", () => {
  const r = E.estimate({ device: "phone", price: 4999, memGB: 64, storGB: 256 });
  assert.equal(r.memRatio, 3);
  close(r.mem26, 4999 * 0.1 * 3 * 2.7 * 0.35);
});

test("2027 low < high and both greater than 2026", () => {
  const r = E.estimate({ device: "phone", price: 4999, memGB: 12, storGB: 256 });
  assert.ok(r.total27lo < r.total27hi);
  assert.ok(r.total27lo > r.total26);
  assert.ok(r.total27hi > r.total26);
  assert.ok(r.pct27lo > r.pct26);
  assert.ok(r.pct27hi > r.pct27lo);
});

test("validatePrice empty / 0 / negative / letters / over limit", () => {
  assert.deepEqual(E.validatePrice(""), { ok: false, error: "empty" });
  assert.deepEqual(E.validatePrice("   "), { ok: false, error: "empty" });
  assert.deepEqual(E.validatePrice(null), { ok: false, error: "empty" });
  assert.equal(E.validatePrice("0").error, "range");
  assert.equal(E.validatePrice(0).error, "range");
  assert.equal(E.validatePrice("-12").error, "range");
  assert.equal(E.validatePrice(-1).error, "range");
  assert.equal(E.validatePrice("abc").error, "nan");
  assert.equal(E.validatePrice("12a").error, "nan");
  assert.equal(E.validatePrice("1000001").error, "range");
  assert.equal(E.validatePrice("1,000,001").error, "range");
});

test('validatePrice parses "4999", " 4,999 ", "¥4999", "¥4,999"', () => {
  assert.deepEqual(E.validatePrice("4999"), { ok: true, value: 4999 });
  assert.deepEqual(E.validatePrice(" 4,999 "), { ok: true, value: 4999 });
  assert.deepEqual(E.validatePrice("¥4999"), { ok: true, value: 4999 });
  assert.deepEqual(E.validatePrice("¥4,999"), { ok: true, value: 4999 });
});

test("decide returns buy / wait / minor", () => {
  assert.equal(E.decide({ pct26: 0.144, urgent: true }).kind, "buy");
  assert.equal(E.decide({ pct26: 0.144, urgent: false }).kind, "wait");
  assert.equal(E.decide({ pct26: 0.02, urgent: true }).kind, "minor");
  assert.equal(E.decide({ pct26: 0.029, urgent: false }).kind, "minor");
  assert.equal(E.decide({ pct26: 0.03, urgent: false }).kind, "wait");
});

test("formatMoney uses thousands separators and currency mark", () => {
  assert.equal(E.formatMoney(4999, "CNY"), "¥4,999");
  assert.equal(E.formatMoney(719.1, "CNY"), "¥719");
  assert.equal(E.formatMoney(1234567, "CNY"), "¥1,234,567");
  assert.equal(E.formatMoney(699, "USD"), "$699");
  assert.equal(E.formatMoney(1989.4, "USD"), "$1,989");
});

test("formatPct keeps one decimal and strips trailing .0", () => {
  assert.equal(E.formatPct(10), "10%");
  assert.equal(E.formatPct(10.0), "10%");
  assert.equal(E.formatPct(14.4), "14.4%");
  assert.equal(E.formatPct(14.41), "14.4%");
  assert.equal(E.formatPct(0), "0%");
  assert.equal(E.formatPct(14.4, { sign: true }), "+14.4%");
});

test("8GB phone ratio is 8/12, not clamped to 0.5", () => {
  const r = E.estimate({ device: "phone", price: 4999, memGB: 8, storGB: 256 });
  close(r.memRatio, 8 / 12, 1e-9);
  close(r.mem26, 4999 * 0.1 * (8 / 12) * 2.7 * 0.35);
});

test("2027 cumulative multiple matches the written formula", () => {
  const r = E.estimate({ device: "phone", price: 4999, memGB: 12, storGB: 256 });
  const rateMem26 = 2.7 * 0.35;
  const memCost = 4999 * 0.1;
  const lo = memCost * ((1 + rateMem26) * (1 + 0.7 * 0.3) - 1);
  const hi = memCost * ((1 + rateMem26) * (1 + 1.4 * 0.3) - 1);
  close(r.mem27lo, lo, 1e-6);
  close(r.mem27hi, hi, 1e-6);
});
