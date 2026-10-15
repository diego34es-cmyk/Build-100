"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

function byId(list, id) {
  return list.find(function (item) { return item.id === id; });
}

function topOf(list) {
  return list.reduce(function (best, item) {
    return item.savedEuro > best.savedEuro ? item : best;
  });
}

function linkCount(text) {
  const found = String(text).match(/https:\/\/build-100\.com\/048/g);
  return found ? found.length : 0;
}

function digits(text) {
  return String(text).replace(/\D/g, "");
}

test("DEFAULTS carries the inputs, prices, factors, and season length", function () {
  const d = E.DEFAULTS;
  assert.equal(d.mode, "gas");
  assert.equal(d.area, 80);
  assert.equal(d.indoor, 20);
  assert.equal(d.outdoor, 5);
  assert.ok(d.indoor > d.outdoor);
  assert.equal(d.hours, 10);
  assert.equal(d.seasonDays, 151);
  assert.equal(d.seasonMonths, 5);
  assert.equal(d.seasonStart, "2026-11-01");
  assert.equal(d.seasonEnd, "2027-03-31");
  assert.ok(Math.abs(d.heatLoadKwPerM2K - 0.005) < 1e-12);
  assert.ok(Math.abs(d.heatLoadWPerM2K - 5) < 1e-12);
  assert.ok(d.sealFactor >= 0.1 && d.sealFactor <= 0.15);
  assert.ok(d.reflectFactor >= 0.05 && d.reflectFactor <= 0.08);
  assert.equal(d.efficiency.gas, 0.9);
  assert.equal(d.efficiency.electric, 1);
  assert.equal(d.efficiency.electricPump, 2.5);
  assert.equal(d.efficiency.district, 1);
  assert.equal(d.efficiency.oil, 0.85);
  assert.ok(d.prices.gas && d.prices.electric && d.prices.district && d.prices.oil);
  assert.equal(d.gasPriceThis, d.prices.gas.thisYear);
  assert.equal(d.gasPriceLast, d.prices.gas.lastYear);
  assert.equal(d.electricPriceThis, d.prices.electric.thisYear);
  assert.equal(d.districtPriceThis, d.prices.district.thisYear);
  assert.equal(d.oilPriceThis, d.prices.oil.thisYear);
});

test("MODES lists gas, electric, district, and oil in both languages", function () {
  assert.equal(E.MODES.length, 4);
  assert.deepEqual(E.MODES.map(function (m) { return m.id; }), ["gas", "electric", "district", "oil"]);
  E.MODES.forEach(function (m) {
    assert.ok(m.label.zh && m.label.en);
    assert.ok(m.unit.zh && m.unit.en);
    assert.ok(m.unit.zh.indexOf("€") !== -1);
    assert.ok(m.efficiency > 0);
    assert.ok(m.priceThis > 0 && m.priceLast > 0);
    assert.ok(m.blurb.zh && m.blurb.en);
  });
});

test("preset prices are higher this year, using the 6.6% and 4% rollbacks", function () {
  const d = E.DEFAULTS;
  ["gas", "electric", "district", "oil"].forEach(function (id) {
    assert.ok(d.prices[id].thisYear > d.prices[id].lastYear, id);
  });
  function near(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 0.002, actual + " vs " + expected);
  }
  near(d.prices.gas.thisYear / d.prices.gas.lastYear, 1.066);
  near(d.prices.district.thisYear / d.prices.district.lastYear, 1.066);
  near(d.prices.oil.thisYear / d.prices.oil.lastYear, 1.066);
  near(d.prices.electric.thisYear / d.prices.electric.lastYear, 1.04);
  assert.ok(Math.abs(d.prices.gas.thisYear - 0.12) < 1e-9);
  assert.ok(Math.abs(d.prices.electric.thisYear - 0.28) < 1e-9);
  assert.ok(Math.abs(d.prices.oil.thisYear - 0.11) < 1e-9);
  assert.ok(d.prices.gas.thisYear > 0.1 && d.prices.gas.thisYear < 0.15);
});

test("seasonDays is 151 for the heating season", function () {
  assert.equal(E.seasonDays(), 151);
  assert.equal(E.seasonDays("2026-11-01", "2027-03-31"), 151);
  const a = Date.UTC(2026, 10, 1);
  const b = Date.UTC(2027, 2, 31);
  assert.equal(Math.round((b - a) / 86400000) + 1, 151);
  assert.equal(E.DEFAULTS.seasonDays, E.seasonDays());
});

test("bad season dates fall back to 151 and a real short span counts", function () {
  assert.equal(E.seasonDays("2026-02-31", "2027-03-31"), 151);
  assert.equal(E.seasonDays("yesterday", "tomorrow"), 151);
  assert.equal(E.seasonDays("2027-03-31", "2026-11-01"), 151);
  assert.equal(E.seasonDays(null, null), 151);
  assert.equal(E.seasonDays("2026-11-01", "2026-11-02"), 2);
});

test("heat demand matches the physical formula", function () {
  const d = E.DEFAULTS;
  const gap = d.indoor - d.outdoor;
  const expect = d.area * d.heatLoadKwPerM2K * gap * d.hours * d.seasonDays / d.efficiency.gas;
  assert.ok(Math.abs(E.heatDemandKwh() - expect) < 1e-6);
  assert.ok(Math.abs(E.heatDemandKwh({ mode: "gas" }) - expect) < 1e-6);
});

test("heat demand rises with floor area", function () {
  const small = E.heatDemandKwh({ area: 40 });
  const large = E.heatDemandKwh({ area: 120 });
  assert.ok(large > small);
  assert.ok(Math.abs(large / small - 3) < 1e-9);
});

test("heat demand rises with the indoor-outdoor gap", function () {
  const mild = E.heatDemandKwh({ indoor: 18, outdoor: 8 });
  const cold = E.heatDemandKwh({ indoor: 22, outdoor: 0 });
  assert.ok(cold > mild);
  const base = E.heatDemandKwh({ indoor: 20, outdoor: 5 });
  const warmerRoom = E.heatDemandKwh({ indoor: 23, outdoor: 5 });
  const colderOut = E.heatDemandKwh({ indoor: 20, outdoor: 2 });
  assert.ok(warmerRoom > base);
  assert.ok(colderOut > base);
});

test("heat demand rises with daily hours", function () {
  const few = E.heatDemandKwh({ hours: 4 });
  const many = E.heatDemandKwh({ hours: 12 });
  assert.ok(many > few);
  assert.ok(Math.abs(many / few - 3) < 1e-9);
});

test("heat demand scales with season length", function () {
  const full = E.heatDemandKwh({ days: 151 });
  const half = E.heatDemandKwh({ days: 75.5 });
  assert.ok(Math.abs(half * 2 - full) < 1e-6);
});

test("heat demand is zero when the temperature gap is zero", function () {
  assert.equal(E.heatDemandKwh({ indoor: 18, outdoor: 18 }), 0);
  assert.equal(E.heatDemandKwh({ indoor: 5, outdoor: 5 }), 0);
  const b = E.bill({ indoor: 12, outdoor: 12 });
  assert.equal(b.kwh, 0);
  assert.equal(b.costThisYear, 0);
});

test("heat demand is zero when the room is colder than outdoors", function () {
  assert.equal(E.heatDemandKwh({ indoor: 10, outdoor: 16 }), 0);
  assert.ok(E.heatDemandKwh({ indoor: 16, outdoor: 15 }) > 0);
});

test("zero heating hours means zero demand and zero savings", function () {
  assert.equal(E.heatDemandKwh({ hours: 0 }), 0);
  const b = E.bill({ hours: 0 });
  assert.equal(b.costThisYear, 0);
  assert.equal(b.costLastYear, 0);
  E.levers({ hours: 0 }).forEach(function (item) {
    assert.equal(item.savedEuro, 0);
  });
});

test("a less efficient system uses more energy", function () {
  const gas = E.heatDemandKwh({ mode: "gas" });
  const oil = E.heatDemandKwh({ mode: "oil" });
  const resist = E.heatDemandKwh({ mode: "electric", electricKind: "resist" });
  assert.ok(oil > gas);
  assert.ok(gas > resist);
  assert.ok(Math.abs(gas / resist - (1 / 0.9)) < 1e-9);
});

test("a heat pump uses COP 2.5 less electricity than resistance", function () {
  const resist = E.heatDemandKwh({ mode: "electric", electricKind: "resist" });
  const pump = E.heatDemandKwh({ mode: "electric", electricKind: "pump" });
  assert.ok(resist > pump);
  assert.ok(Math.abs(resist / pump - 2.5) < 1e-9);
  const billed = E.bill({ mode: "electric", electricKind: "pump" });
  assert.equal(billed.mode, "electric");
  assert.equal(billed.efficiency, 2.5);
});

test("every default mode bills more this year than last year", function () {
  E.MODES.forEach(function (m) {
    const b = E.bill({ mode: m.id });
    assert.equal(b.mode, m.id);
    assert.ok(b.costThisYear > b.costLastYear, m.id);
    assert.equal(b.delta, b.costThisYear - b.costLastYear);
    assert.ok(b.delta > 0);
    assert.ok(b.kwh > 0);
  });
});

test("daily and monthly costs add back to the season", function () {
  const b = E.bill();
  assert.ok(Math.abs(b.daily * E.DEFAULTS.seasonDays - b.rawThis) < 1e-6);
  assert.ok(Math.abs(b.monthly * E.DEFAULTS.seasonMonths - b.rawThis) < 1e-6);
  assert.ok(Math.abs(b.kwhDaily * 151 - b.kwh) < 1e-6);
  assert.ok(Math.abs(b.kwhMonthly * 5 - b.kwh) < 1e-6);
  assert.ok(b.daily > 0 && b.monthly > 0);
});

test("the default gas bill is a household-sized estimate", function () {
  const b = E.bill();
  assert.equal(b.mode, "gas");
  assert.ok(b.costThisYear > 600 && b.costThisYear < 2500, String(b.costThisYear));
  assert.ok(b.kwh > 5000 && b.kwh < 20000);
});

test("levers returns four non-negative savings", function () {
  const list = E.levers();
  assert.equal(list.length, 4);
  assert.deepEqual(list.map(function (item) { return item.id; }), ["degree", "hour", "seal", "reflect"]);
  list.forEach(function (item) {
    assert.ok(item.savedEuro >= 0);
    assert.ok(Number.isFinite(item.savedEuro));
    assert.ok(item.label.zh && item.label.en);
    assert.ok(item.note.zh && item.note.en);
  });
  const ranked = list.map(function (item) { return item.savedEuro; });
  assert.ok(ranked[2] >= ranked[1]);
  assert.ok(ranked[1] > ranked[0]);
  assert.ok(ranked[0] > ranked[3]);
});

test("lowering 1°C matches the formula and lands around 5–8%", function () {
  const base = E.bill();
  const low = E.bill({ indoor: E.DEFAULTS.indoor - 1 });
  const deg = byId(E.levers(), "degree");
  const expectSave = Math.round(base.rawThis - low.rawThis);
  assert.equal(deg.savedEuro, expectSave);
  assert.ok(Math.abs(deg.savedEuro - (base.costThisYear - low.costThisYear)) <= 1);
  const gap = E.DEFAULTS.indoor - E.DEFAULTS.outdoor;
  const ratio = deg.savedEuro / base.costThisYear;
  assert.ok(Math.abs(ratio - 1 / gap) < 0.02);
  assert.ok(ratio > 0.05 && ratio < 0.08);
});

test("one hour less matches the formula", function () {
  const base = E.bill({ hours: 10 });
  const less = E.bill({ hours: 9 });
  const hour = byId(E.levers({ hours: 10 }), "hour");
  assert.equal(hour.savedEuro, Math.round(base.rawThis - less.rawThis));
  assert.ok(Math.abs(hour.savedEuro / base.costThisYear - 0.1) < 0.02);
  const few = E.levers({ hours: 4 });
  assert.equal(topOf(few).id, "hour");
});

test("sealing and reflectors match their factors", function () {
  const base = E.bill();
  const list = E.levers();
  const seal = byId(list, "seal");
  const reflect = byId(list, "reflect");
  assert.equal(seal.savedEuro, Math.round(base.rawThis * E.DEFAULTS.sealFactor));
  assert.equal(reflect.savedEuro, Math.round(base.rawThis * E.DEFAULTS.reflectFactor));
  assert.ok(seal.savedEuro > reflect.savedEuro);
  assert.ok(seal.note.zh.indexOf("12") !== -1);
  assert.ok(reflect.note.en.indexOf("6") !== -1);
});

test("share text in Chinese has the bill, the top lever, and one link", function () {
  const result = E.bill();
  const text = E.shareText(result, "zh");
  const top = topOf(E.levers());
  assert.equal(linkCount(text), 1);
  assert.ok(text.indexOf("https://build-100.com/048") !== -1);
  assert.equal((text.match(/https:\/\/build-100\.com/g) || []).length, 1);
  assert.ok(digits(text).indexOf(String(result.costThisYear)) !== -1);
  assert.ok(text.indexOf(top.label.zh) !== -1);
  assert.ok(digits(text).indexOf(String(top.savedEuro)) !== -1);
  assert.ok(text.indexOf("估算") !== -1);
});

test("share text in English has the bill, the top lever, and one link", function () {
  const result = E.bill();
  const text = E.shareText(result, "en");
  const top = topOf(E.levers());
  assert.equal(linkCount(text), 1);
  assert.ok(text.indexOf("https://build-100.com/048") !== -1);
  assert.equal((text.match(/build-100\.com\/048/g) || []).length, 1);
  assert.ok(digits(text).indexOf(String(result.costThisYear)) !== -1);
  assert.ok(text.indexOf(top.label.en) !== -1);
  assert.ok(digits(text).indexOf(String(top.savedEuro)) !== -1);
  assert.ok(text.indexOf("Estimate only") !== -1);
  assert.ok(text.indexOf("供暖") === -1);
});

test("share text follows the result you pass in", function () {
  const custom = E.bill({ area: 40, hours: 4, mode: "oil" });
  const base = E.bill();
  assert.notEqual(custom.costThisYear, base.costThisYear);
  const text = E.shareText(custom, "en");
  assert.equal(linkCount(text), 1);
  assert.ok(digits(text).indexOf(String(custom.costThisYear)) !== -1);
  const top = topOf(E.levers(custom.input));
  assert.ok(text.indexOf(top.label.en) !== -1);
  const quiet = E.shareText(null, "zh");
  assert.equal(linkCount(quiet), 1);
  assert.equal(linkCount(E.shareText({}, "en")), 1);
  assert.equal(linkCount(E.shareText(undefined, "zh")), 1);
});

test("illegal input never throws and clamps to a non-negative bill", function () {
  assert.doesNotThrow(function () {
    E.seasonDays("nope");
    E.heatDemandKwh(null);
    E.heatDemandKwh(undefined);
    E.heatDemandKwh("bad");
    E.heatDemandKwh({ area: -80, indoor: NaN, outdoor: Infinity, hours: -3, priceThis: -1 });
    E.bill(null);
    E.bill(undefined);
    E.bill(42);
    E.bill("nope");
    E.bill([]);
    E.bill({
      mode: "coal",
      area: -10,
      hours: 99,
      indoor: 9999,
      outdoor: -9999,
      priceThis: "abc",
      priceLast: -4,
      heatLoad: -1,
      efficiency: 0
    });
    E.levers(null);
    E.levers(undefined);
    E.levers({ area: -5, hours: -1, sealFactor: -2, reflectFactor: 9 });
    E.shareText(null, "en");
    E.shareText(undefined, "zh");
    E.shareText("x", "en");
    E.normalize(null);
  });
  const b = E.bill({
    area: -50,
    hours: -8,
    priceThis: -3,
    priceLast: -2,
    indoor: "no",
    outdoor: "no",
    mode: "pellet"
  });
  assert.equal(b.mode, "gas");
  assert.ok(Number.isFinite(b.kwh) && b.kwh >= 0);
  assert.ok(b.costThisYear >= 0 && b.costLastYear >= 0);
  assert.ok(b.kwh < E.heatDemandKwh({ area: 500, hours: 24 }));
  const ls = E.levers({ area: -20, priceThis: -1 });
  assert.equal(ls.length, 4);
  ls.forEach(function (item) {
    assert.ok(item.savedEuro >= 0);
  });
});

test("numeric strings and odd modes do not throw", function () {
  const b = E.bill({
    area: "100",
    indoor: "21",
    outdoor: "4",
    hours: "8",
    priceThis: "0,20",
    priceLast: "0.10",
    mode: "OIL"
  });
  assert.equal(b.mode, "oil");
  assert.ok(b.kwh > 0);
  assert.ok(b.costThisYear > b.costLastYear);
  assert.equal(E.bill({ mode: "ELECTRIC", electricKind: "Heat-Pump" }).efficiency, 2.5);
  const clamped = E.normalize({ area: 99999, hours: 80, indoor: -100, priceThis: 50 });
  assert.equal(clamped.area, 500);
  assert.equal(clamped.hours, 24);
  assert.equal(clamped.indoor, -10);
  assert.equal(clamped.priceThis, 3);
  assert.ok(clamped.priceThis >= 0);
});
