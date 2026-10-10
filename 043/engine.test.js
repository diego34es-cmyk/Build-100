"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

const S = 332.83;

test("expectedMoveIV(332.83, 40, 7) move is about 18.43", function () {
  var r = E.expectedMoveIV(S, 40, 7);
  assert.ok(r);
  var exact = S * 0.4 * Math.sqrt(7 / 365);
  assert.ok(Math.abs(exact - 18.43) <= 0.01);
  assert.ok(Math.abs(r.move - 18.43) <= 0.01);
  assert.ok(Math.abs(r.move - exact) < 1e-9);
});

test("expectedMoveIV pct is about 5.54%", function () {
  var r = E.expectedMoveIV(S, 40, 7);
  var exactPct = 40 * Math.sqrt(7 / 365);
  assert.ok(Math.abs(exactPct - 5.54) <= 0.01);
  assert.ok(Math.abs(r.pct - 5.54) <= 0.01);
  assert.ok(Math.abs(r.pct - exactPct) < 1e-9);
  assert.ok(Math.abs(r.low - (S - r.move)) < 1e-9);
  assert.ok(Math.abs(r.high - (S + r.move)) < 1e-9);
});

test("straddle method is (7.35+7.35)/332.83", function () {
  var call = 7.35;
  var put = 7.35;
  var r = E.expectedMoveStraddle(S, call, put);
  assert.equal(r.move, call + put);
  assert.ok(Math.abs(r.pct / 100 - (call + put) / S) < 1e-12);
  assert.ok(Math.abs(r.low - (S - r.move)) < 1e-9);
  assert.ok(Math.abs(r.high - (S + r.move)) < 1e-9);
});

test("ATM straddle is near 0.8 sigma of the IV move", function () {
  var iv = E.expectedMoveIV(S, 40, 7);
  var str = E.straddlePrice(S, S, 40, 7);
  var factor = Math.sqrt(2 / Math.PI);
  assert.ok(str > 0);
  assert.ok(Math.abs(str / iv.move - factor) < 0.02);
});

test("normCdf is a standard normal CDF", function () {
  assert.ok(Math.abs(E.normCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(E.normCdf(1) - 0.841344746) < 1e-4);
  assert.ok(Math.abs(E.normCdf(-1) - (1 - E.normCdf(1))) < 1e-8);
  assert.ok(E.normCdf(8) > 0.999);
  assert.ok(E.normCdf(-8) < 0.001);
});

test("put-call parity at r=0: C − P = S − K", function () {
  var cases = [
    [100, 100, 25, 30],
    [100, 90, 30, 45],
    [332.83, 300, 40, 7],
    [50, 60, 80, 10]
  ];
  cases.forEach(function (c) {
    var call = E.bsPrice("call", c[0], c[1], c[2], c[3]);
    var put = E.bsPrice("put", c[0], c[1], c[2], c[3]);
    assert.ok(call != null && put != null);
    assert.ok(Math.abs((call - put) - (c[0] - c[1])) < 1e-4);
  });
});

test("days=0 and iv<=0 return intrinsic value", function () {
  assert.equal(E.bsPrice("call", 100, 90, 40, 0), 10);
  assert.equal(E.bsPrice("put", 100, 90, 40, 0), 0);
  assert.equal(E.bsPrice("call", 100, 110, 40, 0), 0);
  assert.equal(E.bsPrice("put", 100, 110, 40, 0), 10);
  assert.equal(E.bsPrice("call", 100, 90, 0, 30), 10);
  assert.equal(E.bsPrice("put", 100, 110, -5, 12), 10);
  assert.equal(E.bsPrice("call", 100, 90, 20, -3), 10);
  assert.equal(E.bsPrice("Call", 80, 100, 15, 0), 0);
  var c = E.bsPrice("call", 100, 90, 0, 0);
  var p = E.bsPrice("put", 100, 90, 0, 0);
  assert.equal(c - p, 100 - 90);
});

test("straddlePrice equals call plus put", function () {
  var c = E.bsPrice("c", S, S, 40, 7);
  var p = E.bsPrice("p", S, S, 40, 7);
  assert.ok(Math.abs(E.straddlePrice(S, S, 40, 7) - (c + p)) < 1e-9);
  assert.ok(Math.abs(c - 7.35) < 0.15);
});

test("ivCrush default +1.5% with IV 40→20 and 7→6 loses on the call", function () {
  var r = E.ivCrush({
    S: S,
    ivBefore: 40,
    ivAfter: 20,
    daysBefore: 7,
    daysAfter: 6,
    movePct: 1.5
  });
  assert.ok(r);
  assert.ok(r.callPnl < 0);
  assert.ok(r.callPnlPct < 0);
  assert.ok(r.strPnl < 0);
  assert.ok(r.breakevenCallPct > 1.5);
});

test("ivCrush +5% call is profitable and breakeven sits between 1.5 and 5", function () {
  var base = {
    S: S,
    ivBefore: 40,
    ivAfter: 20,
    daysBefore: 7,
    daysAfter: 6
  };
  var win = E.ivCrush(Object.assign({ movePct: 5 }, base));
  var loss = E.ivCrush(Object.assign({ movePct: 1.5 }, base));
  assert.ok(win.callPnl > 0);
  assert.ok(win.callPnlPct > 0);
  assert.ok(loss.breakevenCallPct < 5);
  assert.ok(loss.breakevenCallPct > 1.5);
});

test("breakeven is monotonic in IV crush and the call P&L is monotonic in the move", function () {
  function be(ivAfter) {
    return E.ivCrush({
      S: S,
      ivBefore: 40,
      ivAfter: ivAfter,
      daysBefore: 7,
      daysAfter: 6,
      movePct: 0
    }).breakevenCallPct;
  }
  assert.ok(be(15) > be(20));
  assert.ok(be(20) > be(30));
  assert.ok(be(30) > be(40));
  assert.ok(be(40) > 0);

  var prev = -Infinity;
  [-10, -5, 0, 1.5, 5, 10, 15].forEach(function (m) {
    var r = E.ivCrush({
      S: S,
      ivBefore: 40,
      ivAfter: 20,
      daysBefore: 7,
      daysAfter: 6,
      movePct: m
    });
    assert.ok(r.callPnl > prev);
    prev = r.callPnl;
  });
});

test("breakeven call and straddle actually get back to the premium", function () {
  var r = E.ivCrush({
    S: S,
    ivBefore: 40,
    ivAfter: 20,
    daysBefore: 7,
    daysAfter: 6,
    movePct: 1.5
  });
  var atCall = E.ivCrush({
    S: S,
    ivBefore: 40,
    ivAfter: 20,
    daysBefore: 7,
    daysAfter: 6,
    movePct: r.breakevenCallPct
  });
  var atStr = E.ivCrush({
    S: S,
    ivBefore: 40,
    ivAfter: 20,
    daysBefore: 7,
    daysAfter: 6,
    movePct: r.breakevenStrPct
  });
  assert.ok(Math.abs(atCall.callPnl) < 0.02);
  assert.ok(Math.abs(atStr.strPnl) < 0.02);
  assert.ok(r.breakevenStrPct > 0);
});

test("unchanged IV and days breaks even at a zero move", function () {
  var r = E.ivCrush({
    S: 100,
    ivBefore: 30,
    ivAfter: 30,
    daysBefore: 10,
    daysAfter: 10,
    movePct: 0
  });
  assert.ok(Math.abs(r.callPnl) < 1e-8);
  assert.ok(Math.abs(r.strPnl) < 1e-8);
  assert.ok(Math.abs(r.breakevenCallPct) < 1e-3);
  assert.equal(r.breakevenStrPct, 0);
});

test("classifyRow boundaries: equal is under, abs(actual) decides", function () {
  assert.equal(E.classifyRow(5, 5), "under");
  assert.equal(E.classifyRow(5, -5), "under");
  assert.equal(E.classifyRow(5, 0), "under");
  assert.equal(E.classifyRow(5, 5.0001), "over");
  assert.equal(E.classifyRow(5, -5.0001), "over");
  assert.equal(E.classifyRow(0, 0), "under");
  assert.equal(E.classifyRow(0, 0.1), "over");
});

test("classifyRow and math helpers return null on illegal input, never NaN", function () {
  assert.equal(E.classifyRow("5", 1), null);
  assert.equal(E.classifyRow(5, "1"), null);
  assert.equal(E.classifyRow(null, 1), null);
  assert.equal(E.classifyRow(undefined, 1), null);
  assert.equal(E.classifyRow(NaN, 1), null);
  assert.equal(E.classifyRow(Infinity, 1), null);
  assert.equal(E.classifyRow(5, NaN), null);
  assert.equal(E.expectedMoveIV(-1, 40, 7), null);
  assert.equal(E.expectedMoveIV(0, 40, 7), null);
  assert.equal(E.expectedMoveIV(100, -1, 7), null);
  assert.equal(E.expectedMoveIV(100, 40, -1), null);
  assert.equal(E.expectedMoveIV("332.83", 40, 7), null);
  assert.equal(E.expectedMoveIV(NaN, 40, 7), null);
  assert.equal(E.expectedMoveIV(Infinity, 40, 7), null);
  assert.equal(E.expectedMoveStraddle(0, 1, 1), null);
  assert.equal(E.expectedMoveStraddle(100, -1, 1), null);
  assert.equal(E.expectedMoveStraddle(100, 1, NaN), null);
  assert.equal(E.bsPrice("call", -1, 100, 20, 10), null);
  assert.equal(E.bsPrice("nope", 100, 100, 20, 10), null);
  assert.equal(E.bsPrice("call", 100, 0, 20, 10), null);
  assert.equal(E.bsPrice("call", 100, 100, "20", 10), null);
  assert.equal(E.straddlePrice(100, -5, 20, 10), null);
  assert.equal(E.normCdf(NaN), null);
  assert.equal(E.normCdf("0"), null);
  assert.equal(E.normCdf(Infinity), null);
  assert.equal(E.ivCrush(null), null);
  assert.equal(E.ivCrush({}), null);
  assert.equal(E.ivCrush({
    S: 100, ivBefore: 40, ivAfter: 20, daysBefore: 7, daysAfter: 6, movePct: -100
  }), null);
  assert.equal(E.ivCrush({
    S: 100, ivBefore: -1, ivAfter: 20, daysBefore: 7, daysAfter: 6, movePct: 1
  }), null);
  assert.equal(E.summarizeHistory(null), null);
  assert.equal(E.summarizeHistory({}), null);
  assert.equal(E.validate("spot", -1), null);
  assert.equal(E.validate("spot", 0), null);
  assert.equal(E.validate("iv", -0.1), null);
  assert.equal(E.validate("days", -2), null);
  assert.equal(E.validate("premium", -1), null);
  assert.equal(E.validate("movePct", -100), null);
  assert.equal(E.validate("nope", 1), null);
  assert.equal(E.validate("spot", NaN), null);
});

test("validate accepts legal numbers and zero IV or days still price a move of zero", function () {
  assert.equal(E.validate("spot", 10), 10);
  assert.equal(E.validate("iv", 0), 0);
  assert.equal(E.validate("days", 0), 0);
  assert.equal(E.validate("actual", -3.5), -3.5);
  var z = E.expectedMoveIV(100, 40, 0);
  assert.equal(z.move, 0);
  assert.equal(z.pct, 0);
  assert.equal(z.low, 100);
  assert.equal(z.high, 100);
  var flat = E.expectedMoveStraddle(100, 0, 0);
  assert.equal(flat.move, 0);
  assert.equal(flat.pct, 0);
});

test("summarizeHistory counts sample rows: 2 over, 2 under", function () {
  var sum = E.summarizeHistory(E.DATA.sampleHistory);
  assert.equal(sum.count, 4);
  assert.equal(sum.over, 2);
  assert.equal(sum.under, 2);
  assert.equal(sum.blank, 0);
  assert.deepEqual(E.summarizeHistory([
    { impliedPct: 4, actualPct: 9 },
    { implied: 4, actual: 1 },
    { impliedPct: "4", actualPct: 1 },
    null,
    [3, 3],
    ["2026-01-01", 2, -2.5]
  ]), { count: 6, over: 2, under: 2, blank: 2, rated: 4 });
});

test("fmtUSD is two decimals and fmtPct / formatters never return NaN", function () {
  assert.equal(E.fmtUSD(18.43), "$18.43");
  assert.equal(E.fmtUSD(18.436778755), "$18.44");
  assert.equal(E.fmtUSD(-1.2), "-$1.20");
  assert.equal(E.fmtUSD(1234.5), "$1,234.50");
  assert.equal(E.fmtUSD(0), "$0.00");
  assert.equal(E.fmtUSD(NaN), "—");
  assert.equal(E.fmtUSD("12"), "—");
  assert.equal(E.fmtPct(5.5393981177, 2), "5.54%");
  assert.equal(E.fmtPct(1.5, { sign: true, digits: 1 }), "+1.5%");
  assert.equal(E.fmtPct(-1.5, { digits: 1 }), "-1.5%");
  assert.equal(E.fmtPct(0, { sign: true }), "0.00%");
  assert.equal(E.fmtPct(Infinity), "—");
  assert.equal(E.fmtPct(NaN), "—");
});

test("illegal inputs do not throw", function () {
  assert.doesNotThrow(function () {
    E.expectedMoveIV();
    E.expectedMoveStraddle();
    E.normCdf();
    E.bsPrice();
    E.straddlePrice();
    E.ivCrush();
    E.classifyRow();
    E.summarizeHistory();
    E.validate();
    E.fmtUSD();
    E.fmtPct();
    E.ivCrush({
      S: S, ivBefore: 40, ivAfter: 20, daysBefore: 7, daysAfter: 6, movePct: NaN
    });
  });
});

test("DATA carries the JPM anchor used by the page", function () {
  assert.equal(E.DATA.close, 332.83);
  assert.equal(E.DATA.defaultIv, 40);
  assert.equal(E.DATA.defaultDays, 7);
  assert.equal(E.DATA.defaultCall, 7.35);
  assert.equal(E.DATA.defaultPut, 7.35);
  assert.equal(E.DATA.earningsAt, "2026-10-13T06:45:00-04:00");
  assert.equal(E.DATA.historyKey, "earn043-history");
  assert.equal(E.DATA.eps, 5.93);
  assert.equal(E.DATA.revenueB, 51.19);
  assert.equal(E.DATA.kbwFromAugHighPct, -13);
  assert.equal(E.DATA.spxQ3EpsYoY, 29.5);
});
