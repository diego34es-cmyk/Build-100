"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

const LINK = /https:\/\/build-100\.com\/058\//g;
const MOVES = ["up", "down", "flat"];
const KEYS = ["usd", "jpy", "eur", "gold", "stocks"];

function src(id) {
  return E.BETS.fomc.sources.find(function (s) { return s.id === id; });
}

function scenario(id) {
  return E.SCENARIOS.find(function (s) { return s.id === id; });
}

test("META.asOf is 2026-10-24", function () {
  assert.equal(E.META.asOf, "2026-10-24");
});

test("countdown: 1 day 2 hours 3 minutes 4 seconds constructed gap", function () {
  var now = Date.UTC(2026, 9, 24, 8, 0, 0);
  var gap = ((1 * 24 * 3600) + (2 * 3600) + (3 * 60) + 4) * 1000;
  var c = E.countdown(now, now + gap);
  assert.equal(c.days, 1);
  assert.equal(c.hours, 2);
  assert.equal(c.minutes, 3);
  assert.equal(c.seconds, 4);
  assert.equal(c.past, false);
});

test("countdown: target at or before now is past with all zeros", function () {
  var now = Date.UTC(2026, 9, 28, 18, 0, 0);
  var past = E.countdown(now, now - 1);
  assert.equal(past.past, true);
  assert.equal(past.days, 0);
  assert.equal(past.hours, 0);
  assert.equal(past.minutes, 0);
  assert.equal(past.seconds, 0);

  var same = E.countdown(now, now);
  assert.equal(same.past, true);
  assert.equal(same.days, 0);
  assert.equal(same.hours, 0);
  assert.equal(same.minutes, 0);
  assert.equal(same.seconds, 0);

  var laterNow = E.countdown(now + 5000, now);
  assert.equal(laterNow.past, true);
  assert.equal(laterNow.days + laterNow.hours + laterNow.minutes + laterNow.seconds, 0);
});

test("countdown never throws on bad input", function () {
  assert.doesNotThrow(function () { E.countdown(); });
  assert.doesNotThrow(function () { E.countdown("x", "y"); });
  assert.doesNotThrow(function () { E.countdown(NaN, Infinity); });
  var bad = E.countdown(null, undefined);
  assert.equal(bad.past, true);
  assert.equal(bad.days, 0);
});

test("EVENTS has 3 items and FOMC anchor is 2026-10-28T18:00:00Z", function () {
  assert.equal(E.EVENTS.length, 3);
  var ids = E.EVENTS.map(function (ev) { return ev.id; });
  assert.deepEqual(ids, ["fomc", "ecb", "boj"]);
  var fomc = E.EVENTS[0];
  assert.equal(fomc.id, "fomc");
  assert.equal(fomc.anchor, "2026-10-28T18:00:00Z");
  assert.equal(fomc.precise, true);
  assert.equal(fomc.dateLabel, "10-27–28");
  assert.ok(fomc.name.zh.trim());
  assert.ok(fomc.name.en.trim());

  var ecb = E.EVENTS[1];
  assert.equal(ecb.id, "ecb");
  assert.equal(ecb.anchor, "2026-10-29");
  assert.equal(ecb.precise, false);
  assert.equal(ecb.dateLabel, "10-29");

  var boj = E.EVENTS[2];
  assert.equal(boj.id, "boj");
  assert.equal(boj.anchor, "2026-10-30");
  assert.equal(boj.precise, false);
  assert.equal(boj.dateLabel, "10-30");
});

test("BETS numbers match baked facts", function () {
  assert.equal(E.BETS.fomc.bar.hold, 90);
  assert.equal(E.BETS.fomc.bar.hike, 10);
  assert.equal(src("cme").hold, 90);
  assert.equal(src("cme").hike, 10);
  assert.equal(src("polymarket").hold, 93.5);
  assert.equal(src("polymarket").hike, 6.5);
  assert.equal(src("kalshi").hold, "91–92.5%");
  assert.equal(src("kalshi").hike, "7.5–8%");
  assert.equal(src("kalshi").note, "10-23/24");
  assert.equal(E.BETS.fomc.dec.kalshiHike, 72);
  assert.equal(E.BETS.fomc.dec.kalshiHikeOver25, 5);
  assert.equal(E.BETS.fomc.rate, "3.75%–4.00%");
  assert.equal(E.BETS.ecb.hike, 3);
  assert.equal(E.BETS.boj.hike, 3);
  assert.equal(E.BETS.boj.dec18Hike, 76);

  ["fomc", "ecb", "boj"].forEach(function (id) {
    var block = E.BETS[id];
    assert.ok(Array.isArray(block.points));
    assert.ok(block.points.length >= 2 && block.points.length <= 3);
    block.points.forEach(function (p) {
      assert.ok(p.zh.trim());
      assert.ok(p.en.trim());
    });
    assert.ok(block.watch.zh.trim());
    assert.ok(block.watch.en.trim());
  });
});

test("SCENARIOS has exactly 3 items, legal moves, and A/B/C directions", function () {
  assert.equal(E.SCENARIOS.length, 3);
  assert.deepEqual(E.SCENARIOS.map(function (s) { return s.id; }), ["A", "B", "C"]);
  E.SCENARIOS.forEach(function (s) {
    assert.ok(s.title.zh.trim() && s.title.en.trim());
    assert.ok(s.desc.zh.trim() && s.desc.en.trim());
    KEYS.forEach(function (k) {
      assert.ok(MOVES.indexOf(s.moves[k]) >= 0, s.id + " " + k);
      assert.ok(s.why[k].zh.trim());
      assert.ok(s.why[k].en.trim());
    });
    assert.equal(Object.keys(s.moves).length, 5);
  });

  var A = scenario("A");
  var B = scenario("B");
  var C = scenario("C");
  assert.equal(A.moves.usd, "up");
  assert.equal(A.moves.jpy, "down");
  assert.equal(A.moves.eur, "down");
  assert.equal(A.moves.gold, "down");
  assert.equal(A.moves.stocks, "down");
  assert.equal(B.moves.usd, "up");
  assert.equal(B.moves.jpy, "down");
  assert.equal(B.moves.eur, "down");
  assert.equal(B.moves.gold, "down");
  assert.equal(B.moves.stocks, "down");
  assert.equal(C.moves.usd, "down");
  assert.equal(C.moves.jpy, "up");
  assert.equal(C.moves.eur, "flat");
  assert.equal(C.moves.gold, "flat");
  assert.equal(C.moves.stocks, "down");
  assert.match(B.desc.zh, /更剧烈|冲击更大/);
});

test("arrow and moveLabel", function () {
  assert.equal(E.arrow("up"), "↑");
  assert.equal(E.arrow("down"), "↓");
  assert.equal(E.arrow("flat"), "→");
  assert.equal(E.arrow("nope"), "→");
  assert.equal(E.moveLabel("up").zh, "偏涨");
  assert.equal(E.moveLabel("up").en, "Up");
  assert.equal(E.moveLabel("down").zh, "偏跌");
  assert.equal(E.moveLabel("down").en, "Down");
  assert.equal(E.moveLabel("flat").zh, "持平/不明");
  assert.equal(E.moveLabel("flat").en, "Flat/unclear");
  assert.equal(E.moveLabel("nope").zh, "持平/不明");
  assert.equal(E.ASSETS.usd.zh, "美元");
  assert.equal(E.ASSETS.usd.en, "USD");
  assert.equal(E.ASSETS.jpy.zh, "日元");
  assert.equal(E.ASSETS.jpy.en, "JPY");
  assert.equal(E.ASSETS.eur.zh, "欧元");
  assert.equal(E.ASSETS.eur.en, "EUR");
  assert.equal(E.ASSETS.gold.zh, "黄金");
  assert.equal(E.ASSETS.gold.en, "Gold");
  assert.equal(E.ASSETS.stocks.zh, "美股");
  assert.equal(E.ASSETS.stocks.en, "US stocks");
});

test("DISCLAIMER contains 非预测 and 不构成投资建议", function () {
  assert.match(E.DISCLAIMER.zh, /非预测/);
  assert.match(E.DISCLAIMER.zh, /不构成投资建议/);
  assert.ok(E.DISCLAIMER.en.trim());
  assert.match(E.DISCLAIMER.en, /Not a forecast/i);
  assert.match(E.DISCLAIMER.en, /Not investment advice/i);
});

test("PREP has 3 bilingual items", function () {
  assert.equal(E.PREP.length, 3);
  var ids = {};
  E.PREP.forEach(function (item) {
    assert.equal(typeof item.id, "string");
    assert.ok(item.id.trim());
    assert.equal(ids[item.id], undefined);
    ids[item.id] = true;
    assert.ok(item.zh.trim());
    assert.ok(item.en.trim());
  });
  assert.ok(E.PREP.some(function (item) { return /杠杆/.test(item.zh); }));
  assert.ok(E.PREP.some(function (item) { return /重仓/.test(item.zh); }));
  assert.ok(E.PREP.some(function (item) { return /72%/.test(item.zh) && /76%/.test(item.zh); }));
});

test("shareText zh/en has exactly one https://build-100.com/058/ and 2026-10-24", function () {
  ["zh", "en"].forEach(function (lang) {
    [undefined, null, "", "A", "B", "C", "nope"].forEach(function (id) {
      var text = E.shareText(lang, id);
      assert.equal((text.match(LINK) || []).length, 1, lang + " " + id + " => " + text);
      assert.match(text, /2026-10-24/);
    });
  });
  assert.match(E.shareText("zh"), /截至 2026-10-24/);
  assert.match(E.shareText("zh", "A"), /情景 A/);
  assert.match(E.shareText("en", "B"), /Scenario B/);
  assert.doesNotThrow(function () { E.shareText(); });
  assert.equal((E.shareText().match(LINK) || []).length, 1);
  assert.match(E.shareText(), /2026-10-24/);
});

test("fmtLocal Europe/Madrid and Asia/Tokyo do not throw and return non-empty", function () {
  var iso = "2026-10-28T18:00:00Z";
  assert.doesNotThrow(function () { E.fmtLocal(iso, "Europe/Madrid", "en"); });
  assert.doesNotThrow(function () { E.fmtLocal(iso, "Asia/Tokyo", "zh"); });
  var madrid = E.fmtLocal(iso, "Europe/Madrid", "en");
  var tokyo = E.fmtLocal(iso, "Asia/Tokyo", "zh");
  assert.ok(madrid && String(madrid).trim());
  assert.ok(tokyo && String(tokyo).trim());
  assert.notEqual(madrid, tokyo);
  var local = E.fmtLocal(iso, undefined, "zh");
  assert.ok(local && String(local).trim());
  assert.doesNotThrow(function () { E.fmtLocal("2026-10-29", "Asia/Tokyo", "en"); });
  assert.ok(E.fmtLocal("2026-10-29", "Asia/Tokyo", "en").trim());
  assert.doesNotThrow(function () { E.fmtLocal("bad", "Not/AZone", "en"); });
});
