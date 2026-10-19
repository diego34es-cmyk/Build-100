"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

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

test("META records the as-of date", function () {
  assert.equal(E.META.asOf, "2026-10-19");
});

test("EU_SWITCH and US_SWITCH are the UTC millisecond constants", function () {
  assert.equal(E.EU_SWITCH, Date.UTC(2026, 9, 25, 1, 0, 0));
  assert.equal(E.US_SWITCH, Date.UTC(2026, 10, 1, 6, 0, 0));
  assert.equal(new Date(E.EU_SWITCH).toISOString(), "2026-10-25T01:00:00.000Z");
  assert.equal(new Date(E.US_SWITCH).toISOString(), "2026-11-01T06:00:00.000Z");
});

test("countdown splits a remaining duration", function () {
  var now = Date.UTC(2026, 9, 23, 1, 0, 0);
  var cd = E.countdown(E.EU_SWITCH, now);
  assert.equal(cd.done, false);
  assert.equal(cd.days, 2);
  assert.equal(cd.hours, 0);
  assert.equal(cd.minutes, 0);
  assert.equal(cd.seconds, 0);
  assert.equal(cd.totalMs, 2 * 86400000);
});

test("countdown splits mixed units", function () {
  var ms = 2 * 86400000 + 3 * 3600000 + 4 * 60000 + 5 * 1000;
  var cd = E.countdown(ms, 0);
  assert.equal(cd.done, false);
  assert.equal(cd.days, 2);
  assert.equal(cd.hours, 3);
  assert.equal(cd.minutes, 4);
  assert.equal(cd.seconds, 5);
  assert.equal(cd.totalMs, ms);
});

test("countdown is done at and after the target, remaining fields are 0", function () {
  var at = E.countdown(E.EU_SWITCH, E.EU_SWITCH);
  var after = E.countdown(E.EU_SWITCH, E.EU_SWITCH + 1);
  var oneSec = E.countdown(E.EU_SWITCH, E.EU_SWITCH - 1000);
  [at, after].forEach(function (cd) {
    assert.equal(cd.done, true);
    assert.equal(cd.days, 0);
    assert.equal(cd.hours, 0);
    assert.equal(cd.minutes, 0);
    assert.equal(cd.seconds, 0);
    assert.equal(cd.totalMs, 0);
  });
  assert.equal(oneSec.done, false);
  assert.equal(oneSec.seconds, 1);
  assert.equal(oneSec.days, 0);
});

test("countdown does not throw on illegal input", function () {
  assert.doesNotThrow(function () { E.countdown(); });
  assert.doesNotThrow(function () { E.countdown(null, undefined); });
  assert.doesNotThrow(function () { E.countdown("x", {}); });
  assert.doesNotThrow(function () { E.countdown(Symbol("t"), Symbol("n")); });
  var bad = E.countdown("nope", NaN);
  assert.equal(bad.done, true);
  assert.equal(bad.totalMs, 0);
  assert.equal(bad.days, 0);
});

test("phaseAt maps the three boundary instants", function () {
  assert.equal(E.phaseAt(E.EU_SWITCH - 1), "before");
  assert.equal(E.phaseAt(E.EU_SWITCH), "gap");
  assert.equal(E.phaseAt(E.EU_SWITCH + 1), "gap");
  assert.equal(E.phaseAt(E.US_SWITCH - 1), "gap");
  assert.equal(E.phaseAt(E.US_SWITCH), "after");
  assert.equal(E.phaseAt(E.US_SWITCH + 1), "after");
});

test("phaseAt does not throw on illegal input", function () {
  assert.doesNotThrow(function () { E.phaseAt(); });
  assert.equal(E.phaseAt(undefined), "before");
  assert.equal(E.phaseAt(null), "before");
  assert.equal(E.phaseAt("nope"), "before");
  assert.doesNotThrow(function () { E.phaseAt(Symbol("t")); });
});

test("PHASES has three rows with the whitelist offsets and NYSE times", function () {
  assert.equal(E.PHASES.length, 3);
  assert.deepEqual(E.PHASES.map(function (p) { return p.id; }), ["before", "gap", "after"]);
  assert.deepEqual(E.PHASES.map(function (p) { return p.madrid; }), [
    "CEST UTC+2", "CET UTC+1", "CET UTC+1"
  ]);
  assert.deepEqual(E.PHASES.map(function (p) { return p.ny; }), [
    "EDT UTC-4", "EDT UTC-4", "EST UTC-5"
  ]);
  assert.deepEqual(E.PHASES.map(function (p) { return p.gapHours; }), [6, 5, 6]);
  assert.deepEqual(E.PHASES.map(function (p) { return p.nyseOpen; }), ["15:30", "14:30", "15:30"]);
  assert.deepEqual(E.PHASES.map(function (p) { return p.nyseClose; }), ["22:00", "21:00", "22:00"]);
  E.PHASES.forEach(function (p) {
    assert.ok(p.label.zh && p.label.en);
    assert.ok(p.range.zh && p.range.en);
  });
});

test("madridTimeForNY adds the phase offset, it does not look up the table", function () {
  assert.equal(E.madridTimeForNY(9, 30, "before"), "15:30");
  assert.equal(E.madridTimeForNY(9, 30, "gap"), "14:30");
  assert.equal(E.madridTimeForNY(9, 30, "after"), "15:30");
  assert.equal(E.madridTimeForNY(16, 0, "before"), "22:00");
  assert.equal(E.madridTimeForNY(16, 0, "gap"), "21:00");
  assert.equal(E.madridTimeForNY(16, 0, "after"), "22:00");
  assert.equal(E.madridTimeForNY("9", "30", "gap"), "14:30");
  E.PHASES.forEach(function (p) {
    assert.equal(E.madridTimeForNY(9, 30, p.id), p.nyseOpen);
    assert.equal(E.madridTimeForNY(16, 0, p.id), p.nyseClose);
  });
});

test("madridTimeForNY does not throw on illegal input", function () {
  assert.doesNotThrow(function () { E.madridTimeForNY(); });
  assert.equal(E.madridTimeForNY(9, 30, "nope"), "");
  assert.equal(E.madridTimeForNY(null, null, "before"), "");
  assert.doesNotThrow(function () { E.madridTimeForNY(Symbol("h"), Symbol("m"), Symbol("p")); });
});

test("CITIES matches the three-band offset table", function () {
  assert.equal(E.CITIES.length, 4);
  var byId = {};
  E.CITIES.forEach(function (c) { byId[c.id] = c; });
  assert.deepEqual(byId.london.diffs, { before: -1, gap: -1, after: -1 });
  assert.deepEqual(byId.newyork.diffs, { before: -6, gap: -5, after: -6 });
  assert.deepEqual(byId.beijing.diffs, { before: 6, gap: 7, after: 7 });
  assert.deepEqual(byId.tokyo.diffs, { before: 7, gap: 8, after: 8 });
  assert.equal(byId.london.name.zh, "伦敦");
  assert.equal(byId.newyork.name.en, "New York");
  assert.equal(byId.beijing.name.zh, "北京");
  assert.equal(byId.tokyo.name.en, "Tokyo");
});

test("CHECKLIST has items and checklistProgress ignores unknown ids and dedupes", function () {
  assert.ok(E.CHECKLIST.length >= 8);
  var ids = E.CHECKLIST.map(function (c) { return c.id; });
  var uniq = {};
  ids.forEach(function (id) { uniq[id] = true; });
  assert.equal(Object.keys(uniq).length, ids.length);
  var empty = E.checklistProgress([]);
  assert.deepEqual(empty, { done: 0, total: E.CHECKLIST.length });
  var one = E.checklistProgress([ids[0], ids[0], "not-a-real-id"]);
  assert.deepEqual(one, { done: 1, total: E.CHECKLIST.length });
  var all = E.checklistProgress(ids.concat(ids).concat(["ghost"]));
  assert.deepEqual(all, { done: E.CHECKLIST.length, total: E.CHECKLIST.length });
  var fromMap = {};
  fromMap[ids[0]] = true;
  fromMap.ghost = true;
  assert.equal(E.checklistProgress(fromMap).done, 1);
});

test("checklistProgress does not throw on illegal input", function () {
  assert.doesNotThrow(function () { E.checklistProgress(); });
  assert.deepEqual(E.checklistProgress(null), { done: 0, total: E.CHECKLIST.length });
  assert.deepEqual(E.checklistProgress("nope"), { done: 0, total: E.CHECKLIST.length });
});

test("QUESTIONS has 3 items and legal answer indexes", function () {
  assert.equal(E.QUESTIONS.length, 3);
  E.QUESTIONS.forEach(function (q) {
    assert.equal(q.options.length, 4);
    assert.equal(Number.isInteger(q.answer), true);
    assert.ok(q.answer >= 0 && q.answer < q.options.length);
    assert.ok(q.q.zh.trim() && q.q.en.trim());
    assert.ok(q.explain.zh.trim() && q.explain.en.trim());
  });
  assert.match(E.QUESTIONS[0].options[E.QUESTIONS[0].answer].zh, /14:30/);
  assert.match(E.QUESTIONS[1].options[E.QUESTIONS[1].answer].zh, /烤箱或微波炉/);
  assert.match(E.QUESTIONS[2].options[E.QUESTIONS[2].answer].zh, /02:00–03:00/);
});

test("scoreQuiz scores a perfect sheet and a blank sheet", function () {
  var right = E.QUESTIONS.map(function (q) { return q.answer; });
  assert.deepEqual(E.scoreQuiz(right), { correct: 3, total: 3 });
  assert.deepEqual(E.scoreQuiz([9, 9, 9]), { correct: 0, total: 3 });
  var two = right.slice();
  two[0] = 9;
  assert.equal(E.scoreQuiz(two).correct, 2);
  var map = {};
  E.QUESTIONS.forEach(function (q) { map[q.id] = q.answer; });
  assert.equal(E.scoreQuiz(map).correct, 3);
});

test("scoreQuiz treats missing and illegal input as wrong and does not throw", function () {
  assert.doesNotThrow(function () { E.scoreQuiz(); });
  assert.deepEqual(E.scoreQuiz(undefined), { correct: 0, total: 3 });
  assert.deepEqual(E.scoreQuiz(null), { correct: 0, total: 3 });
  assert.deepEqual(E.scoreQuiz("nope"), { correct: 0, total: 3 });
  assert.deepEqual(E.scoreQuiz([]), { correct: 0, total: 3 });
});

test("badgeFor maps 3, 2, and <=1", function () {
  assert.equal(E.badgeFor(3).id, "survivor");
  assert.equal(E.badgeFor(3).name.zh, "冬令时幸存者");
  assert.equal(E.badgeFor(3).name.en, "DST Survivor");
  assert.equal(E.badgeFor(2).id, "almost");
  assert.equal(E.badgeFor(2).name.zh, "差一点就调对了");
  assert.equal(E.badgeFor(2).name.en, "Almost in sync");
  assert.equal(E.badgeFor(1).id, "review");
  assert.equal(E.badgeFor(0).id, "review");
  assert.equal(E.badgeFor(1).name.zh, "再看一遍对照表");
  assert.equal(E.badgeFor(0).name.en, "Check the table again");
  assert.equal(E.badgeFor(4).id, "survivor");
});

test("badgeFor does not throw on non-numeric input", function () {
  assert.doesNotThrow(function () { E.badgeFor(); });
  assert.equal(E.badgeFor(undefined).id, "review");
  assert.equal(E.badgeFor(null).id, "review");
  assert.equal(E.badgeFor("nope").id, "review");
  assert.equal(E.badgeFor(NaN).id, "review");
});

test("shareText zh has exactly one 052 link, the score, and the badge", function () {
  var text = E.shareText("zh", 3);
  assert.equal((text.match(/https:\/\/build-100\.com\/052\//g) || []).length, 1);
  assert.equal((text.match(/build-100\.com\/052/g) || []).length, 1);
  assert.match(text, /3\/3/);
  assert.match(text, /冬令时幸存者/);
  assert.match(text, /14:30/);
  assert.match(text, /2026-10-19/);
});

test("shareText en has exactly one 052 link, the score, and the badge", function () {
  var text = E.shareText("en", 2);
  assert.equal((text.match(/https:\/\/build-100\.com\/052\//g) || []).length, 1);
  assert.match(text, /2\/3/);
  assert.match(text, /Almost in sync/);
  var low = E.shareText("en", 0);
  assert.match(low, /Check the table again/);
  assert.equal((low.match(/https:\/\/build-100\.com\/052\//g) || []).length, 1);
});

test("shareText does not throw on illegal input and still has one link", function () {
  assert.doesNotThrow(function () { E.shareText(); });
  var zh = E.shareText(undefined, undefined);
  var en = E.shareText("en", null);
  assert.equal((zh.match(/https:\/\/build-100\.com\/052\//g) || []).length, 1);
  assert.equal((en.match(/https:\/\/build-100\.com\/052\//g) || []).length, 1);
});

test("every {zh, en} field is a non-empty string", function () {
  var pairs = [];
  walkPairs({
    PHASES: E.PHASES,
    CITIES: E.CITIES,
    CHECKLIST: E.CHECKLIST,
    QUESTIONS: E.QUESTIONS,
    DISCLAIMER: E.DISCLAIMER
  }, "root", pairs);
  assert.ok(pairs.length > 10);
  pairs.forEach(function (pair) {
    assert.equal(typeof pair.zh, "string", pair.path);
    assert.equal(typeof pair.en, "string", pair.path);
    assert.ok(pair.zh.trim().length > 0, pair.path + " zh");
    assert.ok(pair.en.trim().length > 0, pair.path + " en");
  });
});
