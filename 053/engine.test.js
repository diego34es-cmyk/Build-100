"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

const LINK = /https:\/\/build-100\.com\/053\//g;
const HOST = /build-100\.com\/053/g;
const DISC_ZH = "仅供学习参考，不构成投资建议";
const DISC_EN = "For education only, not investment advice.";
const ZERO_CD = { done: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };

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

test("META.asOf is 2026-10-20 and EARN_CALL is Madrid 22:30 CEST", function () {
  assert.equal(E.META.asOf, "2026-10-20");
  assert.equal(E.EARN_CALL, Date.UTC(2026, 9, 20, 20, 30, 0));
});

test("COMPANIES has SPCX preset, NFLX blank, and custom", function () {
  assert.equal(E.COMPANIES.length, 3);
  assert.deepEqual(E.COMPANIES.map(function (c) { return c.id; }), ["spcx", "nflx", "custom"]);
  var spcx = E.COMPANIES[0];
  assert.equal(spcx.name, "SPCX");
  assert.equal(spcx.quarter, "Q3");
  assert.equal(spcx.expEps, 0.14);
  assert.equal(spcx.expRevB, 128.9);
  assert.equal(spcx.revYoY, 65);
  assert.equal(spcx.lastEps, -0.09);
  assert.equal(spcx.preset, true);
  var nflx = E.COMPANIES[1];
  assert.equal(nflx.expEps, null);
  assert.equal(nflx.expRevB, null);
  assert.equal(nflx.preset, false);
  assert.equal(E.COMPANIES[2].preset, false);
  assert.equal(E.COMPANIES[2].expEps, null);
});

test("HISTORY has 4 illustrative rows and last quarter actual EPS is -0.09", function () {
  assert.equal(E.HISTORY.length, 4);
  assert.equal(E.HISTORY.isIllustrative, true);
  E.HISTORY.forEach(function (row) {
    assert.equal(row.isIllustrative, true);
    assert.equal(typeof row.quarter, "string");
    assert.equal(typeof row.expEps, "number");
    assert.equal(typeof row.actEps, "number");
    assert.ok(row.result === "beat" || row.result === "miss");
    assert.equal(row.surprisePct, E.surprisePct(row.actEps, row.expEps));
  });
  assert.equal(E.HISTORY[0].actEps, -0.09);
});

test("THRESHOLDS lists S A B C D with the surprise cutoffs", function () {
  assert.deepEqual(E.THRESHOLDS.map(function (t) { return t.grade; }), ["S", "A", "B", "C", "D"]);
  assert.equal(E.THRESHOLDS[0].min, 10);
  assert.equal(E.THRESHOLDS[1].min, 3);
  assert.equal(E.THRESHOLDS[2].min, 0);
  assert.equal(E.THRESHOLDS[3].min, -5);
  assert.equal(E.THRESHOLDS[4].min, null);
  E.THRESHOLDS.forEach(function (t) {
    assert.ok(t.range.zh.trim());
    assert.ok(t.range.en.trim());
  });
});

test("parseNum handles unicode minus, comma decimals, blanks, and junk", function () {
  assert.equal(E.parseNum("−0.09"), -0.09);
  assert.equal(E.parseNum("-0.09"), -0.09);
  assert.equal(E.parseNum("0,14"), 0.14);
  assert.equal(E.parseNum("  1.5  "), 1.5);
  assert.equal(E.parseNum("+0.14"), 0.14);
  assert.equal(E.parseNum(0), 0);
  assert.equal(E.parseNum(0.14), 0.14);
  assert.equal(E.parseNum(""), null);
  assert.equal(E.parseNum("   "), null);
  assert.equal(E.parseNum("abc"), null);
  assert.equal(E.parseNum(null), null);
  assert.equal(E.parseNum(undefined), null);
  assert.equal(E.parseNum("—"), null);
  assert.doesNotThrow(function () { E.parseNum({}); });
  assert.equal(E.parseNum({}), null);
  assert.equal(E.parseNum("$0.14"), 0.14);
});

test("surprisePct positive, negative, zero expected, and negative expected uses abs", function () {
  assert.equal(E.surprisePct(20, 10), 100);
  assert.equal(E.surprisePct(5, 10), -50);
  assert.equal(E.surprisePct(10, 10), 0);
  assert.equal(E.surprisePct(-5, -10), 50);
  assert.equal(E.surprisePct(-15, -10), -50);
  assert.equal(E.surprisePct(-0.09, -0.06), -50);
  assert.ok(Math.abs(E.surprisePct(0.15, 0.10) - 50) < 1e-9);
  assert.equal(E.surprisePct(1, 0), null);
  assert.equal(E.surprisePct(1, "0"), null);
  assert.equal(E.surprisePct(1, null), null);
  assert.equal(E.surprisePct(null, 0.14), null);
  assert.equal(E.surprisePct("abc", 0.14), null);
  assert.equal(E.surprisePct("0,154", "0,14"), E.surprisePct(0.154, 0.14));
  assert.doesNotThrow(function () { E.surprisePct("x", "y"); });
});

test("gradeFor boundaries: 10 S, 3 A, 0 B, -5 C, -5.01 D", function () {
  assert.equal(E.gradeFor(10), "S");
  assert.equal(E.gradeFor(12), "S");
  assert.equal(E.gradeFor(9.99), "A");
  assert.equal(E.gradeFor(3), "A");
  assert.equal(E.gradeFor(2.99), "B");
  assert.equal(E.gradeFor(0), "B");
  assert.equal(E.gradeFor(-0.01), "C");
  assert.equal(E.gradeFor(-5), "C");
  assert.equal(E.gradeFor(-5.01), "D");
  assert.equal(E.gradeFor(-20), "D");
  assert.equal(E.gradeFor(null), null);
  assert.equal(E.gradeFor("abc"), null);
  assert.equal(E.gradeFor(""), null);
  assert.doesNotThrow(function () { E.gradeFor(undefined); });
});

test("combine averages points and rounds .5 up; missing side copies the other", function () {
  assert.equal(E.combine("S", "S"), "S");
  assert.equal(E.combine("S", "A"), "S");
  assert.equal(E.combine("A", "B"), "A");
  assert.equal(E.combine("B", "C"), "B");
  assert.equal(E.combine("C", "D"), "C");
  assert.equal(E.combine("S", "B"), "A");
  assert.equal(E.combine("A", "C"), "B");
  assert.equal(E.combine("A", "D"), "B");
  assert.equal(E.combine("S", "C"), "A");
  assert.equal(E.combine("S", "D"), "B");
  assert.equal(E.combine("B", "D"), "C");
  assert.equal(E.combine("S", null), "S");
  assert.equal(E.combine(null, "C"), "C");
  assert.equal(E.combine(null, null), null);
  assert.equal(E.combine("S", "nope"), "S");
  assert.doesNotThrow(function () { E.combine(undefined, undefined); });
});

test("verdict covers double beat, mixed, double miss, and the guidance extra", function () {
  var bothStrong = E.verdict("A", "S");
  assert.match(bothStrong.zh, /双 beat/);
  assert.match(bothStrong.zh, /数字好不等于会涨/);
  assert.match(bothStrong.zh, /guidance/);
  assert.match(bothStrong.en, /Beat on both/i);
  assert.match(bothStrong.en, /guidance/i);

  var bothBeat = E.verdict("B", "B");
  assert.match(bothBeat.zh, /双 beat/);
  assert.equal(/数字好不等于会涨/.test(bothBeat.zh), false);

  var revBeatEpsMiss = E.verdict("C", "A");
  assert.match(revBeatEpsMiss.zh, /营收 beat/);
  assert.match(revBeatEpsMiss.zh, /EPS miss/);
  assert.match(revBeatEpsMiss.zh, /毛利率/);
  assert.match(revBeatEpsMiss.en, /gross margin/i);

  var epsBeatRevMiss = E.verdict("A", "D");
  assert.match(epsBeatRevMiss.zh, /EPS beat/);
  assert.match(epsBeatRevMiss.zh, /营收 miss/);
  assert.match(epsBeatRevMiss.zh, /省钱|回购/);
  assert.match(epsBeatRevMiss.en, /buybacks/i);

  var bothMiss = E.verdict("C", "D");
  assert.match(bothMiss.zh, /双 miss/);
  assert.match(bothMiss.en, /Miss on both/i);

  var one = E.verdict("A", null);
  assert.match(one.zh, /综合按 EPS/);
  assert.ok(E.verdict(null, null).zh.trim());
  assert.ok(E.verdict(null, null).en.trim());
  assert.doesNotThrow(function () { E.verdict(); });
});

test("reaction returns good-drop, bad-pop, aligned, and null", function () {
  assert.equal(E.reaction("S", -1.2).kind, "good-drop");
  assert.match(E.reaction("B", -0.01).text.zh, /好财报跌/);
  assert.equal(E.reaction("C", 2).kind, "bad-pop");
  assert.match(E.reaction("D", 0.5).text.en, /Bad print/i);
  assert.equal(E.reaction("A", 1).kind, "aligned");
  assert.equal(E.reaction("B", 0).kind, "aligned");
  assert.equal(E.reaction("C", -3).kind, "aligned");
  assert.match(E.reaction("S", 0.4).text.zh, /市场认可这份成绩/);
  assert.equal(E.reaction("B", null).kind, null);
  assert.equal(E.reaction("B", "").kind, null);
  assert.equal(E.reaction("B", "abc").kind, null);
  assert.equal(E.reaction(null, 1).kind, null);
  assert.equal(E.reaction("B", undefined).kind, null);
  assert.doesNotThrow(function () { E.reaction(); });
});

test("report wires pct, grade, overall, verdict, and reaction", function () {
  var r = E.report({
    expEps: 0.14,
    expRevB: 128.9,
    actEps: 0.20,
    actRevB: 140,
    ahPct: -3
  });
  assert.ok(Math.abs(r.eps.pct - (0.20 - 0.14) / 0.14 * 100) < 1e-9);
  assert.equal(r.eps.grade, "S");
  assert.equal(r.rev.grade, "A");
  assert.equal(r.overall, "S");
  assert.match(r.verdict.zh, /数字好不等于会涨/);
  assert.equal(r.reaction.kind, "good-drop");

  var miss = E.report({ expEps: 0.14, expRevB: 128.9, actEps: 0.10, actRevB: 100, ahPct: 4 });
  assert.equal(miss.eps.grade, "D");
  assert.equal(miss.rev.grade, "D");
  assert.equal(miss.overall, "D");
  assert.equal(miss.reaction.kind, "bad-pop");

  var half = E.report({ expEps: 0.14, actEps: 0.14 });
  assert.equal(half.eps.grade, "B");
  assert.equal(half.rev.grade, null);
  assert.equal(half.overall, "B");
  assert.equal(half.reaction.kind, null);

  var zeroExp = E.report({ expEps: 0, actEps: 0.14 });
  assert.equal(zeroExp.eps.pct, null);
  assert.equal(zeroExp.eps.grade, null);

  var blank = E.report({});
  assert.equal(blank.overall, null);
  assert.equal(blank.reaction.kind, null);

  assert.doesNotThrow(function () { E.report(null); });
  assert.doesNotThrow(function () { E.report("nope"); });
  assert.equal(E.report("nope").overall, null);
});

test("countdown future split, past done, illegal input does not throw", function () {
  var t0 = 1_000_000;
  var cd = E.countdown(t0 + (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000 + 50, t0);
  assert.equal(cd.done, false);
  assert.equal(cd.days, 1);
  assert.equal(cd.hours, 2);
  assert.equal(cd.minutes, 3);
  assert.equal(cd.seconds, 4);
  assert.equal(cd.totalMs, (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000 + 50);

  assert.deepEqual(E.countdown(t0, t0), ZERO_CD);
  assert.deepEqual(E.countdown(t0 - 1, t0), ZERO_CD);
  assert.deepEqual(E.countdown("x", t0), ZERO_CD);
  assert.deepEqual(E.countdown(t0, null), ZERO_CD);
  assert.deepEqual(E.countdown(undefined, undefined), ZERO_CD);
  assert.deepEqual(E.countdown(NaN, 1), ZERO_CD);
  assert.deepEqual(E.countdown(Infinity, 1), ZERO_CD);
  assert.doesNotThrow(function () { E.countdown(); });
  assert.doesNotThrow(function () { E.countdown({}, []); });

  var untilCall = E.countdown(E.EARN_CALL, Date.UTC(2026, 9, 20, 20, 29, 0));
  assert.equal(untilCall.done, false);
  assert.equal(untilCall.minutes, 1);
  assert.equal(untilCall.seconds, 0);
  assert.equal(E.countdown(E.EARN_CALL, E.EARN_CALL).done, true);
});

test("CHECKLIST has at least 6 items and checklistProgress dedupes and ignores unknown", function () {
  assert.ok(E.CHECKLIST.length >= 6);
  var ids = E.CHECKLIST.map(function (c) { return c.id; });
  assert.equal(new Set(ids).size, ids.length);
  ["guidance", "keywords", "volume", "valuation", "sameway", "tone"].forEach(function (id) {
    assert.ok(ids.indexOf(id) !== -1, id);
  });
  E.CHECKLIST.forEach(function (item) {
    assert.ok(item.text.zh.trim());
    assert.ok(item.text.en.trim());
  });
  var total = E.CHECKLIST.length;
  assert.deepEqual(E.checklistProgress([]), { done: 0, total: total });
  assert.deepEqual(E.checklistProgress(["guidance", "guidance", "nope", "volume"]), { done: 2, total: total });
  assert.deepEqual(E.checklistProgress({ guidance: true, volume: true, nope: true, tone: false }), { done: 2, total: total });
  assert.deepEqual(E.checklistProgress(null), { done: 0, total: total });
  assert.deepEqual(E.checklistProgress("guidance"), { done: 0, total: total });
  assert.doesNotThrow(function () { E.checklistProgress(); });
});

test("shareText has exactly one https://build-100.com/053/ link", function () {
  var inviteZh = E.shareText("zh", null, "SPCX");
  assert.equal((inviteZh.match(LINK) || []).length, 1);
  assert.equal((inviteZh.match(HOST) || []).length, 1);
  assert.match(inviteZh, /来给今晚财报判分/);
  assert.equal(inviteZh.split("\n").pop(), DISC_ZH);

  var inviteEn = E.shareText("en");
  assert.equal((inviteEn.match(LINK) || []).length, 1);
  assert.match(inviteEn, /grade tonight/i);
  assert.equal(inviteEn.split("\n").pop(), DISC_EN);

  var graded = E.report({ expEps: 0.14, expRevB: 128.9, actEps: 0.20, actRevB: 140 });
  var zh = E.shareText("zh", graded, "SPCX");
  assert.equal((zh.match(LINK) || []).length, 1);
  assert.equal((zh.match(HOST) || []).length, 1);
  assert.match(zh, /SPCX/);
  assert.match(zh, /综合 S/);
  assert.match(zh, /2026-10-20/);
  assert.equal(zh.split("\n").pop(), DISC_ZH);

  var en = E.shareText("en", graded, "NFLX");
  assert.equal((en.match(LINK) || []).length, 1);
  assert.match(en, /NFLX/);
  assert.match(en, /overall S/);
  assert.equal(en.split("\n").pop(), DISC_EN);

  assert.doesNotThrow(function () { E.shareText(); });
  var bad = E.shareText("zh", { overall: "nope" }, null);
  assert.equal((bad.match(LINK) || []).length, 1);
  assert.match(bad, /来给今晚财报判分/);
});

test("DISCLAIMER matches the required education line", function () {
  assert.equal(E.DISCLAIMER.zh, DISC_ZH);
  assert.equal(E.DISCLAIMER.en, DISC_EN);
});

test("static {zh,en} copy is non-empty", function () {
  var pairs = [];
  walkPairs({
    COMPANIES: E.COMPANIES,
    THRESHOLDS: E.THRESHOLDS,
    CHECKLIST: E.CHECKLIST,
    DISCLAIMER: E.DISCLAIMER
  }, "root", pairs);
  assert.ok(pairs.length > 8);
  pairs.forEach(function (pair) {
    assert.equal(typeof pair.zh, "string", pair.path);
    assert.equal(typeof pair.en, "string", pair.path);
    assert.ok(pair.zh.trim().length > 0, pair.path + " zh");
    assert.ok(pair.en.trim().length > 0, pair.path + " en");
  });
});
