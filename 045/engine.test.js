"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

function haiku() {
  return E.MODELS.find((m) => m.id === "haiku");
}
function sol() {
  return E.MODELS.find((m) => m.id === "sol");
}
function luna() {
  return E.MODELS.find((m) => m.id === "luna");
}
function sonnet() {
  return E.MODELS.find((m) => m.id === "sonnet");
}
function decisions() {
  return E.MODELS.find((m) => m.id === "decisions");
}

function close(actual, expected) {
  assert.ok(
    typeof actual === "number" && isFinite(actual),
    "expected a finite number, got " + actual
  );
  assert.ok(Math.abs(actual - expected) < 1e-9, actual + " !== " + expected);
}

test("DAYS_PER_MONTH is 30", () => {
  assert.equal(E.DAYS_PER_MONTH, 30);
});

test("MODELS: Haiku 5.5 preset $0.10 / $0.50", () => {
  const m = haiku();
  assert.ok(m);
  assert.equal(m.inPerM, 0.1);
  assert.equal(m.outPerM, 0.5);
  assert.equal(m.requiresPrice, false);
});

test("MODELS: GPT-6.1 Sol and Luna use family-bucket $2 / $10", () => {
  assert.equal(sol().inPerM, 2);
  assert.equal(sol().outPerM, 10);
  assert.equal(luna().inPerM, 2);
  assert.equal(luna().outPerM, 10);
  assert.match(luna().noteZh, /全家桶/);
});

test("MODELS: Sonnet has no absolute price and requiresPrice", () => {
  const m = sonnet();
  assert.equal(m.inPerM, null);
  assert.equal(m.outPerM, null);
  assert.equal(m.requiresPrice, true);
});

test("MODELS: Decisions input $0.10, output defaults to 0", () => {
  const m = decisions();
  assert.equal(m.inPerM, 0.1);
  assert.equal(m.outPerM, 0);
  assert.equal(m.requiresPrice, false);
});

test("Haiku month-cost formula: 1M in + 1M out → $18", () => {
  const m = haiku();
  const c = E.monthCost({
    dailyIn: 1e6,
    dailyOut: 1e6,
    inPerM: m.inPerM,
    outPerM: m.outPerM
  });
  close(c, (1e6 / 1e6 * 0.1 + 1e6 / 1e6 * 0.5) * 30);
  close(c, 18);
});

test("Sol month-cost formula: 1M in + 1M out → $360", () => {
  const m = sol();
  const c = E.monthCost({
    dailyIn: 1e6,
    dailyOut: 1e6,
    inPerM: m.inPerM,
    outPerM: m.outPerM
  });
  close(c, (1 * 2 + 1 * 10) * 30);
  close(c, 360);
});

test("Haiku light-preset month cost is $0.90", () => {
  const m = haiku();
  const p = E.PRESETS.light;
  const c = E.monthCost({
    dailyIn: p.dailyIn,
    dailyOut: p.dailyOut,
    inPerM: m.inPerM,
    outPerM: m.outPerM
  });
  close(c, 0.9);
});

test("Sonnet missing price → monthCost null", () => {
  const m = sonnet();
  assert.equal(
    E.monthCost({
      dailyIn: 1e6,
      dailyOut: 1e6,
      inPerM: m.inPerM,
      outPerM: m.outPerM
    }),
    null
  );
});

test("Decisions output=0 still yields a cost from input only", () => {
  const m = decisions();
  const c = E.monthCost({
    dailyIn: 1e6,
    dailyOut: 1e6,
    inPerM: m.inPerM,
    outPerM: m.outPerM
  });
  close(c, (1 * 0.1 + 1 * 0) * 30);
  close(c, 3);
});

test("compare: cheapest, costliest, and ratio", () => {
  const models = [
    { id: "haiku", inPerM: 0.1, outPerM: 0.5 },
    { id: "sol", inPerM: 2, outPerM: 10 }
  ];
  const cmp = E.compare(models, { dailyIn: 1e6, dailyOut: 1e6 });
  assert.equal(cmp.cheapestId, "haiku");
  assert.equal(cmp.costliestId, "sol");
  close(cmp.ratio, 360 / 18);
  close(cmp.ratio, 20);
  assert.equal(cmp.rows[0].id, "haiku");
  assert.equal(cmp.rows[1].id, "sol");
  assert.equal(cmp.rows[0].valid, true);
  assert.equal(cmp.rows[1].valid, true);
});

test("compare: Sonnet missing price is not ranked", () => {
  const cmp = E.compare(E.MODELS, { dailyIn: 1e6, dailyOut: 1e6 });
  const row = cmp.rows.find((r) => r.id === "sonnet");
  assert.ok(row);
  assert.equal(row.valid, false);
  assert.equal(row.cost, null);
  assert.notEqual(cmp.cheapestId, "sonnet");
  assert.notEqual(cmp.costliestId, "sonnet");
  const ranked = cmp.rows.filter((r) => r.valid).map((r) => r.id);
  assert.equal(ranked.includes("sonnet"), false);
});

test("compare: fewer than 2 valid models → ratio null", () => {
  const one = E.compare(
    [{ id: "haiku", inPerM: 0.1, outPerM: 0.5 }],
    { dailyIn: 1e6, dailyOut: 1e6 }
  );
  assert.equal(one.cheapestId, "haiku");
  assert.equal(one.costliestId, "haiku");
  assert.equal(one.ratio, null);

  const none = E.compare(
    [{ id: "sonnet", inPerM: null, outPerM: null }],
    { dailyIn: 1e6, dailyOut: 1e6 }
  );
  assert.equal(none.cheapestId, null);
  assert.equal(none.costliestId, null);
  assert.equal(none.ratio, null);
});

test("illegal input never throws", () => {
  const calls = [
    () => E.monthCost(null),
    () => E.monthCost(undefined),
    () => E.monthCost("nope"),
    () => E.monthCost(42),
    () => E.monthCost([]),
    () => E.monthCost({}),
    () => E.monthCost({ dailyIn: "x", dailyOut: 1, inPerM: 1, outPerM: 1 }),
    () => E.monthCost({ dailyIn: -1, dailyOut: 1, inPerM: 1, outPerM: 1 }),
    () => E.monthCost({ dailyIn: Infinity, dailyOut: 1, inPerM: 1, outPerM: 1 }),
    () => E.compare(null, null),
    () => E.compare(undefined, {}),
    () => E.compare("x", { dailyIn: 1, dailyOut: 1 }),
    () => E.recommend(null),
    () => E.recommend(undefined),
    () => E.recommend("x"),
    () => E.shareText(null, "zh"),
    () => E.shareText(undefined, "en"),
    () => E.formatUsd(null),
    () => E.formatUsd(NaN)
  ];
  for (const fn of calls) {
    assert.doesNotThrow(fn);
  }
  assert.equal(E.monthCost(null), null);
  assert.equal(E.monthCost({ dailyIn: "x", dailyOut: 1, inPerM: 1, outPerM: 1 }), null);
});

test("three presets: light / vibe / agent token amounts", () => {
  assert.equal(E.PRESETS.light.dailyIn, 50000);
  assert.equal(E.PRESETS.light.dailyOut, 50000);
  assert.equal(E.PRESETS.vibe.dailyIn, 2000000);
  assert.equal(E.PRESETS.vibe.dailyOut, 500000);
  assert.equal(E.PRESETS.agent.dailyIn, 5000000);
  assert.equal(E.PRESETS.agent.dailyOut, 1000000);
  assert.ok(E.PRESETS.light.nameZh);
  assert.ok(E.PRESETS.light.nameEn);
  assert.ok(E.PRESETS.vibe.nameZh);
  assert.ok(E.PRESETS.agent.nameEn);
});

test("recommend: light usage → Haiku 5.5 / Luna", () => {
  const r = E.recommend({
    dailyIn: 50000,
    dailyOut: 50000,
    presetId: "light",
    cheapestId: "decisions"
  });
  assert.equal(r.id, "haiku");
  assert.match(r.reasonZh, /Haiku/);
  assert.match(r.reasonZh, /Luna/);
  assert.match(r.reasonEn, /Haiku/);
  assert.match(r.reasonEn, /Luna/);
});

test("recommend: heavy vibe / dailyIn ≥ 1M → Sonnet 5.5", () => {
  const byPreset = E.recommend({
    dailyIn: 10000,
    dailyOut: 10000,
    presetId: "vibe"
  });
  assert.equal(byPreset.id, "sonnet");
  assert.match(byPreset.reasonZh, /手填/);

  const byVolume = E.recommend({
    dailyIn: 1e6,
    dailyOut: 1000,
    presetId: "agent"
  });
  assert.equal(byVolume.id, "sonnet");
  assert.match(byVolume.reasonEn, /official price/i);
});

test("recommend: structured verdicts → Decisions API", () => {
  const r = E.recommend({
    dailyIn: 50000,
    dailyOut: 50000,
    presetId: "decisions"
  });
  assert.equal(r.id, "decisions");
  assert.match(r.reasonZh, /typed verdicts/);
  assert.match(r.reasonEn, /typed verdicts/);
});

test("recommend: other usage falls back to cheapest", () => {
  const r = E.recommend({
    dailyIn: 400000,
    dailyOut: 100000,
    presetId: "custom",
    cheapestId: "haiku"
  });
  assert.equal(r.id, "haiku");
  assert.match(r.reasonZh, /最便宜/);
});

test("shareText zh and en each include https://build-100.com/045", () => {
  const cmp = E.compare(
    [
      { id: "haiku", inPerM: 0.1, outPerM: 0.5 },
      { id: "sol", inPerM: 2, outPerM: 10 }
    ],
    { dailyIn: 1e6, dailyOut: 1e6 }
  );
  const zh = E.shareText(cmp, "zh");
  const en = E.shareText(cmp, "en");
  assert.equal((zh.match(/https:\/\/build-100\.com\/045/g) || []).length, 1);
  assert.equal((en.match(/https:\/\/build-100\.com\/045/g) || []).length, 1);
  assert.match(zh, /Haiku/);
  assert.match(en, /Haiku/);
  assert.match(zh, /20\.0/);
  assert.match(en, /20\.0/);
});

test("formatUsd is a reasonable dollar format", () => {
  assert.equal(E.formatUsd(18), "$18.00");
  assert.equal(E.formatUsd(0.9), "$0.90");
  assert.equal(E.formatUsd(1234.5), "$1,234.50");
  assert.equal(E.formatUsd(null), "—");
});
