"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

const LINK = /https:\/\/build-100\.com\/055\//g;
const HOST = /build-100\.com\/055/g;
const META_DIGIT = /Meta[^。.]*\d/;

function walkPairs(node, path, acc) {
  if (!node || typeof node !== "object") return;
  if (typeof node.zh === "string" && typeof node.en === "string") {
    acc.push({ path: path, zh: node.zh, en: node.en });
  }
  if (Array.isArray(node)) {
    node.forEach(function (item, i) { walkPairs(item, path + "[" + i + "]", acc); });
    return;
  }
  Object.keys(node).forEach(function (key) {
    if (key === "zh" || key === "en") return;
    var child = node[key];
    if (child && typeof child === "object") walkPairs(child, path + "." + key, acc);
  });
}

test("META.asOf is 2026-10-22", function () {
  assert.equal(E.META.asOf, "2026-10-22");
});

test("capexIntensity returns a ratio and never throws", function () {
  assert.equal(E.capexIntensity(28, 100), 0.28);
  assert.equal(E.capexIntensity(12, 20), 0.6);
  assert.equal(E.capexIntensity(0, 100), 0);
  assert.equal(E.capexIntensity(10, 0), Infinity);
  assert.equal(E.capexIntensity(0, 0), 0);
  assert.equal(E.capexIntensity("28", "100"), 0.28);
  assert.equal(E.capexIntensity(null, 100), null);
  assert.doesNotThrow(function () { E.capexIntensity(); });
  assert.doesNotThrow(function () { E.capexIntensity({}, []); });
});

test("intensityBand boundaries 0.149 / 0.15 / 0.35 are left-closed", function () {
  assert.equal(E.intensityBand(0.149), "light");
  assert.equal(E.intensityBand(0.15), "heavy");
  assert.equal(E.intensityBand(0.349), "heavy");
  assert.equal(E.intensityBand(0.35), "extreme");
  assert.equal(E.intensityBand(0), "light");
  assert.equal(E.intensityBand(1), "extreme");
  assert.equal(E.intensityBand(Infinity), "extreme");
  assert.equal(E.intensityBand(null), "light");
  assert.doesNotThrow(function () { E.intensityBand(); });
  assert.doesNotThrow(function () { E.intensityBand("nope"); });
});

test("fcf is operating cash minus capex", function () {
  assert.equal(E.fcf(42, 28), 14);
  assert.equal(E.fcf(3, 12), -9);
  assert.equal(E.fcf(10, 10), 0);
  assert.equal(E.fcf(null, 1), null);
  assert.doesNotThrow(function () { E.fcf(); });
});

test("runwayQuarters returns Infinity when burn <= 0", function () {
  assert.equal(E.runwayQuarters(18, 9), 2);
  assert.equal(E.runwayQuarters(10, 0), Infinity);
  assert.equal(E.runwayQuarters(10, -1), Infinity);
  assert.equal(E.runwayQuarters(24, 12), 2);
  assert.equal(E.runwayQuarters("18", "9"), 2);
  assert.equal(E.runwayQuarters(null, 1), null);
  assert.doesNotThrow(function () { E.runwayQuarters(); });
  assert.doesNotThrow(function () { E.runwayQuarters("x", "y"); });
});

test("interestCoverage returns Infinity when interest <= 0", function () {
  assert.equal(E.interestCoverage(10, 2), 5);
  assert.equal(E.interestCoverage(35, 4), 8.75);
  assert.equal(E.interestCoverage(10, 0), Infinity);
  assert.equal(E.interestCoverage(10, -1), Infinity);
  assert.equal(E.interestCoverage(2, 4), 0.5);
  assert.doesNotThrow(function () { E.interestCoverage(); });
  assert.doesNotThrow(function () { E.interestCoverage(null, null); });
});

test("coverageLight boundaries 1.49 / 1.5 / 5", function () {
  assert.equal(E.coverageLight(1.49), "red");
  assert.equal(E.coverageLight(1.5), "yellow");
  assert.equal(E.coverageLight(4.99), "yellow");
  assert.equal(E.coverageLight(5), "green");
  assert.equal(E.coverageLight(0), "red");
  assert.equal(E.coverageLight(Infinity), "green");
  assert.equal(E.coverageLight(null), "red");
  assert.doesNotThrow(function () { E.coverageLight(); });
  assert.doesNotThrow(function () { E.coverageLight("nope"); });
});

test("spread is yield minus benchmark", function () {
  assert.equal(E.spread(15, 4), 11);
  assert.equal(E.spread(8.5, 4), 4.5);
  assert.equal(E.spread(5.5, 4), 1.5);
  assert.equal(E.spread(4, 4), 0);
  assert.equal(E.spread(null, 4), null);
  assert.doesNotThrow(function () { E.spread(); });
});

test("spreadBand boundaries 1.99 / 2 / 5 are left-closed", function () {
  assert.equal(E.spreadBand(1.99), "ig");
  assert.equal(E.spreadBand(2), "elevated");
  assert.equal(E.spreadBand(4.99), "elevated");
  assert.equal(E.spreadBand(5), "distress");
  assert.equal(E.spreadBand(0), "ig");
  assert.equal(E.spreadBand(11), "distress");
  assert.equal(E.spreadBand(-1), "ig");
  assert.doesNotThrow(function () { E.spreadBand(); });
  assert.doesNotThrow(function () { E.spreadBand("nope"); });
});

test("COMPANIES has 3 fictional portraits with three intensity bands", function () {
  assert.equal(E.COMPANIES.length, 3);
  var ids = E.COMPANIES.map(function (c) { return c.id; });
  assert.equal(new Set(ids).size, 3);
  var bands = {};
  var portraits = {};
  E.COMPANIES.forEach(function (c, i) {
    assert.ok(c.name && c.name.zh.trim() && c.name.en.trim(), "name " + i);
    assert.equal(typeof c.revenue, "number");
    assert.equal(typeof c.capex, "number");
    assert.equal(typeof c.ocf, "number");
    assert.equal(typeof c.cash, "number");
    assert.equal(typeof c.ebit, "number");
    assert.equal(typeof c.interest, "number");
    var band = E.intensityBand(E.capexIntensity(c.capex, c.revenue));
    bands[band] = true;
    portraits[c.id] = {
      band: band,
      fcf: E.fcf(c.ocf, c.capex),
      light: E.coverageLight(E.interestCoverage(c.ebit, c.interest))
    };
  });
  assert.equal(Object.keys(bands).length, 3);
  assert.equal(bands.light, true);
  assert.equal(bands.heavy, true);
  assert.equal(bands.extreme, true);
  var a = E.COMPANIES.find(function (c) { return c.id === "a"; });
  var b = E.COMPANIES.find(function (c) { return c.id === "b"; });
  var c = E.COMPANIES.find(function (c) { return c.id === "c"; });
  assert.ok(a && b && c);
  assert.equal(E.intensityBand(E.capexIntensity(a.capex, a.revenue)), "heavy");
  assert.ok(E.fcf(a.ocf, a.capex) > 0);
  assert.equal(E.coverageLight(E.interestCoverage(a.ebit, a.interest)), "green");
  assert.equal(E.intensityBand(E.capexIntensity(b.capex, b.revenue)), "extreme");
  assert.ok(E.fcf(b.ocf, b.capex) < 0);
  assert.equal(E.coverageLight(E.interestCoverage(b.ebit, b.interest)), "red");
  assert.equal(E.intensityBand(E.capexIntensity(c.capex, c.revenue)), "light");
  assert.ok(E.fcf(c.ocf, c.capex) > 0);
  assert.equal(E.coverageLight(E.interestCoverage(c.ebit, c.interest)), "yellow");
});

test("BONDS yields are 15 and 8.5 from news", function () {
  assert.equal(E.BONDS.length, 2);
  var cw = E.BONDS.find(function (b) { return b.id === "coreweave"; });
  var ora = E.BONDS.find(function (b) { return b.id === "oracle"; });
  assert.ok(cw && ora);
  assert.equal(cw.yield, 15);
  assert.equal(ora.yield, 8.5);
  assert.equal(cw.source, "news");
  assert.equal(ora.source, "news");
  assert.ok(cw.label && cw.label.zh && cw.label.en);
  assert.ok(ora.label && ora.label.zh && ora.label.en);
});

test("QUIZ has exactly 6 items, both ok and danger, answer === verdict", function () {
  assert.equal(E.QUIZ.length, 6);
  var seen = {};
  var kinds = {};
  E.QUIZ.forEach(function (q, i) {
    assert.equal(typeof q.id, "string", "id " + i);
    assert.ok(q.id.trim(), "empty id " + i);
    assert.equal(seen[q.id], undefined, "dup " + q.id);
    seen[q.id] = true;
    assert.ok(q.snapshot && typeof q.snapshot === "object");
    ["capex", "revenue", "ocf", "cash", "ebit", "interest", "bondYield"].forEach(function (k) {
      assert.equal(typeof q.snapshot[k], "number", q.id + " " + k);
    });
    assert.ok(q.answer === "ok" || q.answer === "danger", q.id + " answer");
    kinds[q.answer] = true;
    assert.equal(q.answer, E.verdict(q.snapshot), q.id + " verdict mismatch");
    assert.ok(q.explain && q.explain.zh.trim() && q.explain.en.trim(), q.id + " explain");
  });
  assert.equal(kinds.ok, true);
  assert.equal(kinds.danger, true);
});

test("verdict is danger at 2+ red lights and ok below that", function () {
  assert.equal(E.verdict({
    capex: 10, revenue: 100, ocf: 40, cash: 40, ebit: 30, interest: 3, bondYield: 5
  }), "ok");
  assert.equal(E.verdict({
    capex: 40, revenue: 100, ocf: 50, cash: 40, ebit: 30, interest: 3, bondYield: 5
  }), "ok");
  assert.equal(E.verdict({
    capex: 40, revenue: 100, ocf: 20, cash: 40, ebit: 30, interest: 3, bondYield: 5
  }), "danger");
  assert.doesNotThrow(function () { E.verdict(); });
  assert.doesNotThrow(function () { E.verdict(null); });
  assert.ok(E.verdict({}) === "ok" || E.verdict({}) === "danger");
});

test("gradeQuiz scores against the 6-key answer key", function () {
  var all = E.QUIZ.map(function (q) { return q.answer; });
  assert.deepEqual(E.gradeQuiz(all), { correct: 6, total: 6 });
  assert.deepEqual(E.gradeQuiz([]), { correct: 0, total: 6 });
  var none = E.QUIZ.map(function (q) { return q.answer === "ok" ? "danger" : "ok"; });
  assert.deepEqual(E.gradeQuiz(none), { correct: 0, total: 6 });
  var mixed = all.slice();
  mixed[0] = mixed[0] === "ok" ? "danger" : "ok";
  assert.deepEqual(E.gradeQuiz(mixed), { correct: 5, total: 6 });
  assert.deepEqual(E.gradeQuiz(all.concat(["ok", "danger"])), { correct: 6, total: 6 });
  assert.doesNotThrow(function () { E.gradeQuiz(); });
  assert.doesNotThrow(function () { E.gradeQuiz(null); });
  assert.deepEqual(E.gradeQuiz(null), { correct: 0, total: 6 });
});

test("rank has at least 3 bands and stable boundaries", function () {
  function band(n) {
    return E.rank(n).zh + "|" + E.rank(n).en;
  }
  assert.equal(band(0), band(1));
  assert.notEqual(band(1), band(2));
  assert.equal(band(2), band(3));
  assert.notEqual(band(3), band(4));
  assert.equal(band(4), band(5));
  assert.notEqual(band(5), band(6));
  var names = {};
  [0, 1, 2, 3, 4, 5, 6].forEach(function (n) {
    assert.ok(E.rank(n).zh.trim());
    assert.ok(E.rank(n).en.trim());
    names[band(n)] = true;
  });
  assert.ok(Object.keys(names).length >= 3);
  assert.equal(band("0"), band(0));
  assert.doesNotThrow(function () { E.rank(); });
  assert.doesNotThrow(function () { E.rank("nope"); });
});

test("shareText zh/en has exactly one https://build-100.com/055/ link", function () {
  var inviteZh = E.shareText("zh");
  assert.equal((inviteZh.match(LINK) || []).length, 1);
  assert.equal((inviteZh.match(HOST) || []).length, 1);
  assert.match(inviteZh, /来测测你会不会读财报/);

  var inviteEn = E.shareText("en", null);
  assert.equal((inviteEn.match(LINK) || []).length, 1);
  assert.match(inviteEn, /read an earnings print/i);

  var zh = E.shareText("zh", 4);
  assert.equal((zh.match(LINK) || []).length, 1);
  assert.equal((zh.match(HOST) || []).length, 1);
  assert.match(zh, /答对 4 \/ 6/);
  assert.equal(zh.indexOf(E.rank(4).zh) !== -1, true);

  var en = E.shareText("en", 6);
  assert.equal((en.match(LINK) || []).length, 1);
  assert.match(en, /Correct 6 \/ 6/);
  assert.equal(en.indexOf(E.rank(6).en) !== -1, true);

  assert.doesNotThrow(function () { E.shareText(); });
  var zero = E.shareText("zh", 0);
  assert.equal((zero.match(LINK) || []).length, 1);
  assert.match(zero, /答对 0 \/ 6/);
});

test("bilingual copy is non-empty and explain never puts a digit after Meta", function () {
  var pairs = [];
  walkPairs({
    COMPANIES: E.COMPANIES,
    BONDS: E.BONDS,
    QUIZ: E.QUIZ,
    RANKS: E.RANKS,
    DISCLAIMER: E.DISCLAIMER,
    THRESHOLD_NOTE: E.THRESHOLD_NOTE
  }, "root", pairs);
  assert.ok(pairs.length > 10);
  pairs.forEach(function (pair) {
    assert.equal(typeof pair.zh, "string", pair.path);
    assert.equal(typeof pair.en, "string", pair.path);
    assert.ok(pair.zh.trim().length > 0, pair.path + " zh");
    assert.ok(pair.en.trim().length > 0, pair.path + " en");
    assert.equal(META_DIGIT.test(pair.zh), false, pair.path + " zh Meta+digit");
    assert.equal(META_DIGIT.test(pair.en), false, pair.path + " en Meta+digit");
  });
  E.QUIZ.forEach(function (q) {
    assert.equal(META_DIGIT.test(q.explain.zh), false, q.id + " zh");
    assert.equal(META_DIGIT.test(q.explain.en), false, q.id + " en");
  });
});
