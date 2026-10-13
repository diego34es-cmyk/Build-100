"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

function lcg(seed) {
  var s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function linkCount(s) {
  var m = String(s).match(/https:\/\/build-100\.com\/046/g);
  return m ? m.length : 0;
}

function poolSum(pool) {
  return pool.reduce(function (s, p) { return s + p.w; }, 0);
}

test("RELEASE_UTC_MS is 2026-10-14 12:30 UTC", function () {
  assert.equal(E.RELEASE_UTC_MS, Date.UTC(2026, 9, 14, 12, 30));
  assert.equal(new Date(E.RELEASE_UTC_MS).toISOString(), "2026-10-14T12:30:00.000Z");
});

test("CONSENSUS matches the whitelist", function () {
  assert.deepEqual(E.CONSENSUS.headline, [3.6, 3.7]);
  assert.deepEqual(E.CONSENSUS_BAND, [3.6, 3.7]);
  assert.deepEqual(E.CONSENSUS.core, [2.4, 2.5]);
  assert.equal(E.CONSENSUS.augHeadline, 3.4);
  assert.equal(E.CONSENSUS.augCore, 2.4);
  assert.equal(E.CONSENSUS.nowcast.headline, 3.6);
  assert.equal(E.CONSENSUS.nowcast.core, 2.39);
  assert.deepEqual(E.CONSENSUS.fedRange, [3.75, 4]);
  assert.equal(E.CONSENSUS.fedwatch.oct, 19);
  assert.equal(E.CONSENSUS.fedwatch.dec, 70.6);
});

test("HEADLINE_POOL covers 3.0–4.2 step 0.1 and sums to 62", function () {
  assert.equal(poolSum(E.HEADLINE_POOL), 62);
  assert.equal(E.HEADLINE_POOL.length, 13);
  E.HEADLINE_POOL.forEach(function (p, i) {
    assert.equal(Math.round(p.v * 10), 30 + i);
    assert.ok(p.w > 0);
  });
  assert.equal(E.HEADLINE_POOL[6].v, 3.6);
  assert.equal(E.HEADLINE_POOL[6].w, 14);
});

test("CORE_POOL covers 2.0–2.9 step 0.1 and sums to 52", function () {
  assert.equal(poolSum(E.CORE_POOL), 52);
  assert.equal(E.CORE_POOL.length, 10);
  E.CORE_POOL.forEach(function (p, i) {
    assert.equal(Math.round(p.v * 10), 20 + i);
    assert.ok(p.w > 0);
  });
  assert.equal(E.CORE_POOL[4].v, 2.4);
  assert.equal(E.CORE_POOL[4].w, 14);
});

test("weightedPick u=0 returns the first headline bucket", function () {
  assert.equal(E.weightedPick(E.HEADLINE_POOL, function () { return 0; }), 3.0);
  assert.equal(E.weightedPick(E.CORE_POOL, function () { return 0; }), 2.0);
});

test("weightedPick u=0.5 lands on the consensus peak", function () {
  assert.equal(E.weightedPick(E.HEADLINE_POOL, function () { return 0.5; }), 3.6);
  assert.equal(E.weightedPick(E.CORE_POOL, function () { return 0.5; }), 2.4);
});

test("weightedPick u=0.999 returns the last bucket", function () {
  assert.equal(E.weightedPick(E.HEADLINE_POOL, function () { return 0.999; }), 4.2);
  assert.equal(E.weightedPick(E.CORE_POOL, function () { return 0.999; }), 2.9);
});

test("weightedPick clamps u into [0, 1)", function () {
  assert.equal(E.weightedPick(E.HEADLINE_POOL, function () { return -3; }), 3.0);
  assert.equal(E.weightedPick(E.HEADLINE_POOL, function () { return 1; }), 4.2);
  assert.equal(E.weightedPick(E.HEADLINE_POOL, function () { return 4; }), 4.2);
  assert.equal(E.weightedPick(E.HEADLINE_POOL, function () { return NaN; }), 3.0);
  assert.equal(E.weightedPick(null, function () { return 0; }), null);
  assert.equal(E.weightedPick([], function () { return 0.2; }), null);
});

test("fixed-seed LCG: 3.6 is the mode over 10000 headline draws", function () {
  var rng = lcg(1);
  var counts = {};
  var i;
  for (i = 0; i < 10000; i++) {
    var key = E.weightedPick(E.HEADLINE_POOL, rng).toFixed(1);
    counts[key] = (counts[key] || 0) + 1;
  }
  var best = null;
  var bestN = -1;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > bestN) {
      bestN = counts[k];
      best = k;
    }
  });
  assert.equal(best, "3.6");
  assert.ok(counts["3.6"] > counts["3.7"]);
  assert.ok(counts["3.7"] > counts["3.5"]);
});

test("classify boundaries 3.5 / 3.6 / 3.7 / 3.8", function () {
  assert.equal(E.classify(3.5), "dove");
  assert.equal(E.classify(3.6), "inline");
  assert.equal(E.classify(3.7), "inline");
  assert.equal(E.classify(3.8), "hawk");
  assert.equal(E.classify(3.0), "dove");
  assert.equal(E.classify(4.2), "hawk");
  assert.equal(E.classify(3.49), "dove");
  assert.equal(E.classify(3.74), "inline");
  assert.equal(E.classify(3.75), "hawk");
});

test("accuracyPoints 0.1 boundary survives the 3.7-3.6 float", function () {
  assert.ok(Math.abs(3.7 - 3.6) > 0.1);
  var edge = E.accuracyPoints(3.7, 3.6);
  assert.equal(edge.points, 50);
  assert.equal(edge.tier, "bullseye");
  assert.deepEqual(E.accuracyPoints(3.6, 3.7), { points: 50, tier: "bullseye" });
  assert.deepEqual(E.accuracyPoints(3.6, 3.6), { points: 50, tier: "bullseye" });
});

test("accuracyPoints 0.2 boundary uses tenths, not raw subtraction", function () {
  assert.ok(Math.abs(3.2 - 3.0) > 0.2);
  assert.deepEqual(E.accuracyPoints(3.2, 3.0), { points: 30, tier: "close" });
  assert.deepEqual(E.accuracyPoints(3.8, 3.6), { points: 30, tier: "close" });
  assert.deepEqual(E.accuracyPoints(3.9, 3.6), { points: 15, tier: "off" });
});

test("accuracyPoints 0.4 boundary stays off when the raw gap exceeds 0.4", function () {
  assert.ok(Math.abs(4.2 - 3.8) > 0.4);
  assert.deepEqual(E.accuracyPoints(4.2, 3.8), { points: 15, tier: "off" });
  assert.deepEqual(E.accuracyPoints(4.0, 3.6), { points: 15, tier: "off" });
});

test("accuracyPoints beyond 0.4 is wild", function () {
  assert.deepEqual(E.accuracyPoints(4.1, 3.6), { points: 0, tier: "wild" });
  assert.deepEqual(E.accuracyPoints(3.0, 3.6), { points: 0, tier: "wild" });
  assert.deepEqual(E.accuracyPoints(null, 3.6), { points: 0, tier: "wild" });
});

test("directionPoints four combinations", function () {
  assert.equal(E.directionPoints("long", "dove"), 40);
  assert.equal(E.directionPoints("short", "hawk"), 40);
  assert.equal(E.directionPoints("long", "hawk"), 0);
  assert.equal(E.directionPoints("short", "dove"), 0);
});

test("directionPoints pays both sides when the print is in line", function () {
  assert.equal(E.directionPoints("long", "inline"), 20);
  assert.equal(E.directionPoints("short", "inline"), 20);
  assert.equal(E.directionPoints("nope", "dove"), 0);
  assert.equal(E.directionPoints(null, "inline"), 0);
});

test("corePoints blank or illegal is 0", function () {
  assert.equal(E.corePoints(null, 2.4), 0);
  assert.equal(E.corePoints(undefined, 2.4), 0);
  assert.equal(E.corePoints("", 2.4), 0);
  assert.equal(E.corePoints("  ", 2.4), 0);
  assert.equal(E.corePoints("abc", 2.4), 0);
  assert.equal(E.corePoints(false, 2.4), 0);
  assert.equal(E.corePoints(2.4, null), 0);
});

test("corePoints 0.1 boundary uses tenths", function () {
  assert.ok(Math.abs(2.4 - 2.3) > 0.1);
  assert.equal(E.corePoints(2.4, 2.3), 10);
  assert.equal(E.corePoints(2.4, 2.5), 10);
  assert.equal(E.corePoints("2.4", 2.4), 10);
  assert.equal(E.corePoints(2.4, 2.6), 0);
  assert.equal(E.corePoints(2.0, 2.9), 0);
});

test("scoreRound perfect 100 is King of CPI night", function () {
  var r = E.scoreRound({
    guess: 3.5,
    side: "long",
    coreGuess: 2.4,
    actual: 3.5,
    coreActual: 2.4
  });
  assert.equal(r.total, 100);
  assert.equal(r.acc, 50);
  assert.equal(r.dir, 40);
  assert.equal(r.core, 10);
  assert.equal(r.verdict, "dove");
  assert.equal(r.tier, "bullseye");
  assert.deepEqual(r.title, { zh: "CPI 夜之王", en: "King of CPI night" });
});

test("scoreRound title bands at 90, 60, 30, and below", function () {
  var king = E.scoreRound({ guess: 3.5, side: "long", actual: 3.5, coreActual: 2.4 });
  assert.equal(king.total, 90);
  assert.equal(king.title.zh, "CPI 夜之王");

  var seasoned = E.scoreRound({
    guess: 3.8,
    side: "long",
    coreGuess: 2.4,
    actual: 3.6,
    coreActual: 2.4
  });
  assert.equal(seasoned.total, 60);
  assert.equal(seasoned.verdict, "inline");
  assert.equal(seasoned.title.en, "Seasoned trader");

  var almost = E.scoreRound({
    guess: 3.0,
    side: "short",
    coreGuess: 2.5,
    actual: 3.6,
    coreActual: 2.5
  });
  assert.equal(almost.total, 30);
  assert.equal(almost.title.zh, "差点意思");

  var busted = E.scoreRound({ guess: 4.2, side: "long", actual: 3.8, coreActual: 2.4 });
  assert.equal(busted.total, 15);
  assert.equal(busted.dir, 0);
  assert.equal(busted.title.en, "Liquidated by the print");

  var zero = E.scoreRound({ guess: 3.0, side: "long", actual: 4.2 });
  assert.equal(zero.total, 0);
  assert.equal(zero.title.zh, "被打爆");
});

test("illegal input never throws", function () {
  assert.doesNotThrow(function () {
    E.weightedPick(undefined);
    E.classify(undefined);
    E.classify("nope");
    E.accuracyPoints(undefined, {});
    E.directionPoints({}, []);
    E.corePoints({}, []);
    E.scoreRound(null);
    E.scoreRound(undefined);
    E.scoreRound("x");
    E.scoreRound({ guess: "nope", side: 1, actual: {} });
    E.playRound(null);
    E.playRound({ guess: 3.6, side: "long" });
    E.countdown(undefined);
    E.countdown("nope");
    E.shareText(null, "en");
    E.inviteText(undefined, undefined, "zh");
    E.clampGuess(undefined);
  });
  var bad = E.scoreRound(null);
  assert.equal(typeof bad.total, "number");
  assert.ok(bad.total >= 0);
  assert.ok(bad.title && bad.title.zh && bad.title.en);
  var live = E.playRound({ guess: 3.6, side: "short", coreGuess: 2.4 });
  assert.ok(live.total >= 0 && live.total <= 100);
  assert.ok(live.actual >= 3 && live.actual <= 4.2);
  assert.ok(live.coreActual >= 2 && live.coreActual <= 2.9);
});

test("countdown is 24 hours at 2026-10-13T12:30Z and never negative", function () {
  var dayBefore = E.countdown(Date.UTC(2026, 9, 13, 12, 30));
  assert.equal(dayBefore.released, false);
  assert.equal(dayBefore.hours, 24);
  assert.equal(dayBefore.minutes, 0);
  assert.equal(dayBefore.totalMs, 86400000);

  var ninety = E.countdown(E.RELEASE_UTC_MS - 90 * 60 * 1000);
  assert.equal(ninety.hours, 1);
  assert.equal(ninety.minutes, 30);
  assert.ok(ninety.totalMs > 0);

  var twoDays = E.countdown(E.RELEASE_UTC_MS - 48 * 3600 * 1000);
  assert.equal(twoDays.hours, 48);
  assert.equal(twoDays.minutes, 0);

  var at = E.countdown(E.RELEASE_UTC_MS);
  assert.equal(at.released, true);
  assert.equal(at.hours, 0);
  assert.equal(at.minutes, 0);
  assert.equal(at.totalMs, 0);

  var after = E.countdown(E.RELEASE_UTC_MS + 5 * 60 * 1000);
  assert.equal(after.released, true);
  assert.equal(after.hours, 0);
  assert.equal(after.minutes, 0);
  assert.ok(after.totalMs >= 0);

  var early = E.countdown(E.RELEASE_UTC_MS - 1);
  assert.equal(early.released, false);
  assert.ok(early.hours >= 0);
  assert.ok(early.minutes >= 0);
  assert.ok(early.totalMs > 0);
});

test("shareText zh and en each contain one link, the call, and simulated", function () {
  var hawk = E.scoreRound({
    guess: 3.8,
    side: "short",
    coreGuess: 2.4,
    actual: 3.8,
    coreActual: 2.4
  });
  var zh = E.shareText(hawk, "zh");
  var en = E.shareText(hawk, "en");
  assert.equal(linkCount(zh), 1);
  assert.equal(linkCount(en), 1);
  assert.match(zh, /模拟/);
  assert.match(en, /simulated/i);
  assert.match(zh, /3\.8%/);
  assert.match(zh, /偏鹰/);
  assert.match(zh, /做空/);
  assert.match(zh, /CPI 夜之王/);
  assert.match(en, /3\.8%/);
  assert.match(en, /hawkish/);
  assert.match(en, /short/);
  assert.match(en, /King of CPI night/);
  assert.equal(hawk.total, 100);

  var dove = E.scoreRound({ guess: 3.4, side: "long", actual: 3.4, coreActual: 2.2 });
  assert.match(E.shareText(dove, "zh"), /偏鸽/);
  assert.match(E.shareText(dove, "en"), /dovish/);
  assert.equal(linkCount(E.shareText(null, "zh")), 1);
  assert.equal(linkCount(E.shareText(null, "en")), 1);
  assert.match(E.shareText(null, "zh"), /模拟/);
  assert.match(E.shareText(null, "en"), /simulated/i);
});

test("inviteText zh and en each contain one link and the bet", function () {
  var zhLong = E.inviteText(3.6, "long", "zh");
  var zhShort = E.inviteText(3.6, "short", "zh");
  var enLong = E.inviteText(3.6, "long", "en");
  var enShort = E.inviteText("4.9", "short", "en");
  assert.equal(linkCount(zhLong), 1);
  assert.equal(linkCount(zhShort), 1);
  assert.equal(linkCount(enLong), 1);
  assert.equal(linkCount(enShort), 1);
  assert.match(zhLong, /我押 3\.6%，做多/);
  assert.match(zhShort, /我押 3\.6%，做空/);
  assert.match(zhLong, /模拟/);
  assert.match(enLong, /3\.6%/);
  assert.match(enLong, /long/);
  assert.match(enLong, /simulated/i);
  assert.match(enShort, /4\.2%/);
  assert.match(enShort, /short/);
  assert.equal(linkCount(E.inviteText(undefined, undefined, "zh")), 1);
  assert.equal(linkCount(E.inviteText(undefined, undefined, "en")), 1);
});

test("clampGuess stays on one decimal inside 3.0–4.2", function () {
  assert.equal(E.clampGuess(3.6), 3.6);
  assert.equal(E.clampGuess(3.0), 3.0);
  assert.equal(E.clampGuess(4.2), 4.2);
  assert.equal(E.clampGuess(2), 3.0);
  assert.equal(E.clampGuess(9), 4.2);
  assert.equal(E.clampGuess(3.64), 3.6);
  assert.equal(E.clampGuess(3.66), 3.7);
  assert.equal(E.clampGuess("3.4"), 3.4);
  assert.equal(E.clampGuess(null), 3.6);
  assert.equal(E.clampGuess("nope"), 3.6);
  assert.equal(E.clampGuess(3.7), 3.7);
});

test("playRound draws both pools with the injected rng", function () {
  var seq = [0, 0];
  var i = 0;
  var perfect = E.playRound(
    { guess: 3.0, side: "long", coreGuess: 2.0 },
    function () { return seq[i++]; }
  );
  assert.equal(perfect.actual, 3.0);
  assert.equal(perfect.coreActual, 2.0);
  assert.equal(perfect.verdict, "dove");
  assert.equal(perfect.total, 100);
  assert.equal(perfect.title.en, "King of CPI night");

  var j = 0;
  var mids = [0.5, 0.5];
  var mid = E.playRound(
    { guess: 3.6, side: "short" },
    function () { return mids[j++]; }
  );
  assert.equal(mid.actual, 3.6);
  assert.equal(mid.coreActual, 2.4);
  assert.equal(mid.verdict, "inline");
  assert.equal(mid.acc, 50);
  assert.equal(mid.dir, 20);
  assert.equal(mid.core, 0);
  assert.equal(mid.total, 70);
});
