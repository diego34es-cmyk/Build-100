"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var E = require("./engine.js");

test("tier: cash 13.3 is full, cash 22.5 with stock under 71.8 is ample, stock 71.8 is full", function () {
  assert.equal(E.tier(50, 13.3), "full");
  assert.equal(E.tier(71.8, 30), "full");
  assert.equal(E.tier(71.8, 22.5), "full");
  assert.equal(E.tier(50, 22.5), "ample");
  assert.equal(E.tier(71.7, 22.5), "ample");
  assert.equal(E.tier(60, 22.4), "neutral");
  assert.equal(E.tier(60, 13.4), "neutral");
  assert.equal(E.tier(0, 13.4), "neutral");
});

test("tier: endpoints 0 and 100", function () {
  assert.equal(E.tier(0, 0), "full");
  assert.equal(E.tier(0, 100), "ample");
  assert.equal(E.tier(100, 0), "full");
  assert.equal(E.tier(100, 100), "full");
  assert.equal(E.tier(0, 22.5), "ample");
  assert.equal(E.tier(71.8, 0), "full");
});

test("tier: non-finite inputs return a tier, never NaN", function () {
  function ok(v) {
    assert.ok(v === "full" || v === "neutral" || v === "ample");
  }
  ok(E.tier(NaN, NaN));
  ok(E.tier(Infinity, 50));
  ok(E.tier(-Infinity, Infinity));
  ok(E.tier("x", "y"));
  assert.equal(E.tier(NaN, 0), "full");
  assert.equal(E.tier(0, NaN), "full");
});

test("clampPct: NaN, abc, Infinity fall back to def", function () {
  assert.equal(E.clampPct(NaN, 20), 20);
  assert.equal(E.clampPct("abc", 15), 15);
  assert.equal(E.clampPct(Infinity, 8), 8);
  assert.equal(E.clampPct(-Infinity, 8), 8);
  assert.equal(E.clampPct(undefined, 12.34), 12.3);
});

test("clampPct: clamps to 0–100 and keeps one decimal", function () {
  assert.equal(E.clampPct(-5, 0), 0);
  assert.equal(E.clampPct(150, 0), 100);
  assert.equal(E.clampPct(13.34, 0), 13.3);
  assert.equal(E.clampPct(13.36, 0), 13.4);
  assert.equal(E.clampPct(60, 0), 60);
  assert.equal(E.clampPct(0, 50), 0);
  assert.equal(E.clampPct(100, 50), 100);
});

test("normalize: dragging stock to 90 presses cash to 10", function () {
  var n = E.normalize(90, 20, "stock");
  assert.equal(n.stock, 90);
  assert.equal(n.cash, 10);
  assert.equal(n.other, 0);
});

test("normalize: dragging cash presses stock, other stays non-negative", function () {
  var n = E.normalize(60, 80, "cash");
  assert.equal(n.cash, 80);
  assert.equal(n.stock, 20);
  assert.equal(n.other, 0);
  assert.ok(n.other >= 0);
  var capped = E.normalize(100, 100, "stock");
  assert.equal(capped.cash, 0);
  assert.equal(capped.stock, 100);
  assert.ok(capped.other >= 0);
  assert.ok(capped.stock + capped.cash + capped.other <= 100.001);
  var idle = E.normalize(60, 20, "stock");
  assert.deepEqual(idle, { stock: 60, cash: 20, other: 20 });
});

test("normalize: invalid inputs stay finite and other is not negative", function () {
  var n = E.normalize(NaN, "abc", "cash");
  assert.equal(n.stock, 0);
  assert.equal(n.cash, 0);
  assert.equal(n.other, 100);
  var m = E.normalize(-20, 140, "stock");
  assert.ok(m.stock >= 0 && m.stock <= 100);
  assert.ok(m.cash >= 0 && m.cash <= 100);
  assert.ok(m.other >= 0);
  assert.ok(Number.isFinite(m.stock + m.cash + m.other));
});

test("barPos: clamps into 0–100 and min==max returns 0", function () {
  assert.equal(E.barPos(20, 0, 40), 50);
  assert.equal(E.barPos(-10, 0, 40), 0);
  assert.equal(E.barPos(80, 0, 40), 100);
  assert.equal(E.barPos(5, 5, 5), 0);
  assert.equal(E.barPos(NaN, 0, 100), 0);
  assert.equal(E.barPos(10, 10, 10), 0);
  var p = E.barPos(71.8, 30, 90);
  assert.ok(Number.isFinite(p));
  assert.ok(p > 60 && p < 80);
  assert.equal(E.barPos(13.3, 0, 40), (13.3 / 40) * 100);
});

test("compare: signs and one decimal place", function () {
  var a = E.compare(20);
  assert.equal(a.vsAaii, 6.7);
  assert.equal(a.vsAvg, -2.5);
  var b = E.compare(13.3);
  assert.equal(b.vsAaii, 0);
  assert.equal(b.vsAvg, -9.2);
  var c = E.compare(22.5);
  assert.equal(c.vsAaii, 9.2);
  assert.equal(c.vsAvg, 0);
  var d = E.compare(0);
  assert.equal(d.vsAaii, -13.3);
  assert.equal(d.vsAvg, -22.5);
  assert.ok(E.compare(100).vsAaii > 0);
});

test("cashOption: drop 0, 0.2, 0.9 and NaN stay finite with buyingPower >= cash", function () {
  var a = E.cashOption({ total: 100000, cashPct: 20, drop: 0 });
  assert.equal(a.cash, 20000);
  assert.equal(a.buyingPower, 20000);
  assert.ok(a.buyingPower >= a.cash);
  assert.equal(a.aaiiCash, 13300);

  var b = E.cashOption({ cashPct: 20, drop: 0.2 });
  assert.ok(Math.abs(b.cash - 20000) < 1e-6);
  assert.ok(Math.abs(b.buyingPower - 25000) < 1e-6);
  assert.ok(b.buyingPower >= b.cash);
  assert.ok(Math.abs(b.aaiiBuyingPower - 16625) < 1e-6);
  assert.ok(b.aaiiBuyingPower >= b.aaiiCash);

  var c = E.cashOption({ cashPct: 20, drop: 0.9 });
  assert.ok(Number.isFinite(c.buyingPower));
  assert.ok(Math.abs(c.buyingPower - 200000) < 1e-4);
  assert.ok(c.buyingPower >= c.cash);

  var d = E.cashOption({ cashPct: 20, drop: NaN });
  assert.ok(Number.isFinite(d.cash));
  assert.ok(Number.isFinite(d.buyingPower));
  assert.ok(Number.isFinite(d.aaiiCash));
  assert.ok(Number.isFinite(d.aaiiBuyingPower));
  assert.ok(d.buyingPower >= d.cash);
  assert.equal(d.buyingPower, d.cash);

  var hi = E.cashOption({ cashPct: 20, drop: 5 });
  assert.ok(Number.isFinite(hi.buyingPower));
  assert.ok(hi.buyingPower >= hi.cash);
  var lo = E.cashOption({ cashPct: -4, drop: -1 });
  assert.equal(lo.cash, 0);
  assert.ok(lo.buyingPower >= lo.cash);
});

test("grade: all correct, all wrong, partial, and illegal input", function () {
  var keys = E.QUIZ.map(function (q) { return q.correct; });
  var all = E.grade(keys);
  assert.equal(all.correct, 3);
  assert.equal(all.total, 3);

  var wrong = keys.map(function (k, i) {
    return k === 0 ? 1 : 0;
  });
  assert.equal(E.grade(wrong).correct, 0);
  assert.equal(E.grade(wrong).total, 3);

  var partial = keys.slice();
  partial[1] = (partial[1] + 1) % E.QUIZ[1].options.length;
  assert.equal(E.grade(partial).correct, 2);

  assert.doesNotThrow(function () { E.grade(null); });
  assert.deepEqual(E.grade(undefined), { correct: 0, total: 3 });
  assert.equal(E.grade(["x", -1, 99, 1.5]).correct, 0);
  assert.equal(E.grade([]).correct, 0);
  assert.equal(E.grade([keys[0]]).correct, 1);
  assert.equal(E.grade({ 0: keys[0] }).correct, 0);
});

test("DATA: funds + direct approximates stock within 0.05", function () {
  assert.ok(Math.abs(E.DATA.funds + E.DATA.direct - E.DATA.stock) < 0.05);
  assert.equal(E.DATA.stock, 71.8);
  assert.equal(E.DATA.cash, 13.3);
  assert.equal(E.DATA.cashAvg, 22.5);
  assert.equal(E.DATA.bearish, 53.3);
  assert.equal(E.DATA.funds, 38.35);
  assert.equal(E.DATA.direct, 33.44);
  assert.equal(E.DATA.date, "2026-10-08");
  assert.equal(E.DATA.bearWeek, "2026-09-19");
  assert.equal(E.QUIZ.length, 3);
});

test("fmtPct strips a trailing .0 and fmtUSD uses $ and thousands", function () {
  assert.equal(E.fmtPct(20), "20%");
  assert.equal(E.fmtPct(13.3), "13.3%");
  assert.equal(E.fmtPct(71.8), "71.8%");
  assert.equal(E.fmtPct(71.79), "71.8%");
  assert.equal(E.fmtPct(-2.5), "-2.5%");
  assert.equal(E.fmtPct(6.7, { sign: true }), "+6.7%");
  assert.equal(E.fmtPct(0, { sign: true }), "+0%");
  assert.equal(E.fmtPct(NaN), "—");
  assert.equal(E.fmtPct(Infinity), "—");
  assert.equal(E.fmtUSD(100000), "$100,000");
  assert.equal(E.fmtUSD(16625), "$16,625");
  assert.equal(E.fmtUSD(19999.6), "$20,000");
  assert.equal(E.fmtUSD(-1200), "-$1,200");
  assert.equal(E.fmtUSD(Infinity), "—");
  assert.equal(E.fmtUSD(NaN), "—");
});

test("cashOption defaults total to 100000 and clamps cash percent", function () {
  var r = E.cashOption({ cashPct: 13.3, drop: 0 });
  assert.equal(r.cash, 13300);
  assert.equal(r.aaiiCash, 13300);
  assert.ok(r.buyingPower >= r.cash);
  var over = E.cashOption({ total: 50000, cashPct: 250, drop: 0.2 });
  assert.ok(Number.isFinite(over.buyingPower));
  assert.ok(over.cash <= 50000);
  assert.ok(over.buyingPower >= over.cash);
});

test("sweep stock and cash from 0 to 100 step 0.5: tier, normalize, compare have no NaN", function () {
  var s;
  var c;
  for (s = 0; s <= 100 + 1e-9; s += 0.5) {
    for (c = 0; c <= 100 + 1e-9; c += 0.5) {
      var stock = Math.round(s * 10) / 10;
      var cash = Math.round(c * 10) / 10;
      var kind = E.tier(stock, cash);
      assert.ok(kind === "full" || kind === "neutral" || kind === "ample");
      var ch;
      var changed = ["stock", "cash"];
      for (ch = 0; ch < changed.length; ch++) {
        var n = E.normalize(stock, cash, changed[ch]);
        assert.ok(Number.isFinite(n.stock));
        assert.ok(Number.isFinite(n.cash));
        assert.ok(Number.isFinite(n.other));
        assert.ok(n.other >= 0);
        assert.ok(n.stock >= 0 && n.stock <= 100);
        assert.ok(n.cash >= 0 && n.cash <= 100);
        assert.ok(n.stock + n.cash <= 100 + 1e-6);
        assert.ok(Math.abs(n.stock + n.cash + n.other - 100) < 0.11);
      }
      var cmp = E.compare(cash);
      assert.ok(Number.isFinite(cmp.vsAaii));
      assert.ok(Number.isFinite(cmp.vsAvg));
      assert.equal(cmp.vsAaii, Math.round(cmp.vsAaii * 10) / 10);
      assert.equal(cmp.vsAvg, Math.round(cmp.vsAvg * 10) / 10);
    }
  }
});
