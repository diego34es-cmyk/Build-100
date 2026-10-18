"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

const IDS = ["negbeta", "valuation", "levetf", "cash", "delinq", "concentration"];
const YEARS = ["1987", "2000", "2008"];
const LIGHT_KEYS = ["red", "yellow", "green", "grey"];
const DISC_ZH = "学习内容，非投资建议；信号灯是与历史的定性对比，不是崩盘预测";
const DISC_EN = "Educational content, not investment advice. Lights are qualitative comparisons with history, not crash predictions.";
const PERCENT = /\d+(?:\.\d+)?\s*[%％]/;

function byId(id) {
  return E.SIGNALS.find(function (s) { return s.id === id; });
}

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

test("SIGNALS has 6 items in the fixed id order", function () {
  assert.equal(E.SIGNALS.length, 6);
  assert.deepEqual(E.SIGNALS.map(function (s) { return s.id; }), IDS);
});

test("SIGNALS short names are the strip labels", function () {
  assert.deepEqual(E.SIGNALS.map(function (s) { return s.short.zh; }), [
    "负 beta", "估值杠杆", "杠杆 ETF", "现金仓位", "家庭逾期", "集中度"
  ]);
  assert.deepEqual(E.SIGNALS.map(function (s) { return s.short.en; }), [
    "Neg. beta", "Valuation", "Lev. ETFs", "Cash", "Delinquency", "Concentration"
  ]);
});

test("today lights are 3 red and 3 yellow", function () {
  assert.deepEqual(E.SIGNALS.map(function (s) { return s.light; }), [
    "red", "red", "red", "yellow", "yellow", "yellow"
  ]);
  assert.deepEqual(E.lightSummary(), { red: 3, yellow: 3, green: 0, grey: 0 });
});

test("levetf is grey in 1987 and 2000, red in 2008", function () {
  var cell = byId("levetf").crises;
  assert.equal(cell["1987"].light, "grey");
  assert.equal(cell["2000"].light, "grey");
  assert.equal(cell["2008"].light, "red");
  assert.match(cell["1987"].text.zh, /不比较/);
  assert.match(cell["2000"].text.zh, /不比较/);
  assert.match(cell["1987"].text.zh, /2006/);
});

test("cash is grey for 1987, 2000, and 2008", function () {
  var cell = byId("cash").crises;
  YEARS.forEach(function (year) {
    assert.equal(cell[year].light, "grey");
    assert.match(cell[year].text.zh, /不比较/);
    assert.match(cell[year].text.en, /Not compared/);
  });
});

test("delinq 2008 is green and names 2009–2010", function () {
  var cell = byId("delinq").crises;
  assert.equal(cell["1987"].light, "grey");
  assert.equal(cell["2000"].light, "grey");
  assert.equal(cell["2008"].light, "green");
  assert.match(cell["2008"].text.zh, /2009\u20132010/);
  assert.match(cell["2008"].text.en, /2009\u20132010/);
  assert.match(cell["2008"].text.zh, /2007/);
});

test("concentration is yellow only for 2000", function () {
  var cell = byId("concentration").crises;
  assert.equal(cell["1987"].light, "grey");
  assert.equal(cell["2000"].light, "yellow");
  assert.equal(cell["2008"].light, "grey");
  assert.match(cell["2000"].text.zh, /科技/);
  assert.match(cell["2000"].text.en, /internet/i);
});

test("qualitative readings contain no percent figures; cash keeps 13.3% and 22.5%", function () {
  E.SIGNALS.forEach(function (sig) {
    if (sig.today.precision === "qualitative") {
      assert.equal(PERCENT.test(sig.today.text.zh), false, sig.id + " zh");
      assert.equal(PERCENT.test(sig.today.text.en), false, sig.id + " en");
    }
    assert.equal(PERCENT.test(sig.ref.zh), false);
    assert.equal(PERCENT.test(sig.ref.en), false);
    YEARS.forEach(function (year) {
      var text = sig.crises[year].text;
      assert.equal(PERCENT.test(text.zh), false, sig.id + " " + year + " zh");
      assert.equal(PERCENT.test(text.en), false, sig.id + " " + year + " en");
    });
  });
  var cash = byId("cash").today.text;
  assert.match(cash.zh, /13\.3%/);
  assert.match(cash.en, /13\.3%/);
  assert.match(cash.zh, /22\.5%/);
  assert.match(cash.en, /22\.5%/);
  assert.equal(byId("cash").today.precision, "exact");
});

test("every today reading has a source, a date, and a known precision", function () {
  E.SIGNALS.forEach(function (sig) {
    assert.ok(sig.today.source.zh.trim());
    assert.ok(sig.today.source.en.trim());
    assert.ok(String(sig.today.date).trim());
    assert.ok(sig.today.precision === "exact" || sig.today.precision === "qualitative");
  });
  assert.equal(E.SIGNALS.filter(function (s) { return s.today.precision === "exact"; }).length, 1);
});

test("CRISES has the three episodes, dates, and event figures", function () {
  assert.equal(E.CRISES.length, 3);
  assert.deepEqual(E.CRISES.map(function (c) { return c.year; }), YEARS);
  assert.equal(E.CRISES[0].date, "1987-10-19");
  assert.equal(E.CRISES[1].date, "2000-03-10");
  assert.equal(E.CRISES[2].date, "2008-09-15");
  var blob = JSON.stringify(E.CRISES);
  assert.match(blob, /22\.6/);
  assert.match(blob, /5,048\.62/);
  assert.match(blob, /78/);
  assert.match(blob, /57/);
  assert.match(E.CRISES[0].what.zh, /22\.6%/);
  assert.match(E.CRISES[1].what.zh, /5,048\.62/);
  assert.match(E.CRISES[1].what.zh, /78%/);
  assert.match(E.CRISES[2].what.zh, /57%/);
});

test("each crisis card lists three eve signals that exist", function () {
  assert.deepEqual(E.CRISES[0].eveSignals, ["negbeta", "valuation", "levetf"]);
  assert.deepEqual(E.CRISES[1].eveSignals, ["valuation", "concentration", "levetf"]);
  assert.deepEqual(E.CRISES[2].eveSignals, ["valuation", "delinq", "levetf"]);
  E.CRISES.forEach(function (crisis) {
    assert.equal(crisis.eveSignals.length, 3);
    crisis.eveSignals.forEach(function (id) {
      assert.ok(byId(id), id);
    });
  });
});

test("dashboardRows returns 6 rows for each eve and [] for illegal years", function () {
  YEARS.forEach(function (year) {
    var rows = E.dashboardRows(year);
    assert.equal(rows.length, 6);
    assert.deepEqual(rows.map(function (r) { return r.id; }), IDS);
    rows.forEach(function (row, i) {
      var sig = E.SIGNALS[i];
      assert.equal(row.eve.light, sig.crises[year].light);
      assert.equal(row.today.light, sig.light);
      assert.equal(row.today.date, sig.today.date);
      assert.equal(row.today.text.zh, sig.today.text.zh);
      assert.ok(row.name.zh && row.name.en);
    });
    assert.equal(E.dashboardRows(Number(year)).length, 6);
  });
  assert.deepEqual(E.dashboardRows("1999"), []);
  assert.deepEqual(E.dashboardRows(1999), []);
  assert.deepEqual(E.dashboardRows(null), []);
  assert.deepEqual(E.dashboardRows(undefined), []);
  assert.deepEqual(E.dashboardRows({}), []);
  assert.deepEqual(E.dashboardRows(""), []);
  assert.deepEqual(E.dashboardRows("2000 "), []);
});

test("dashboardRows does not throw on bad input", function () {
  assert.doesNotThrow(function () { E.dashboardRows(); });
  assert.doesNotThrow(function () { E.dashboardRows(Symbol("x")); });
  assert.deepEqual(E.dashboardRows(Symbol("x")), []);
});

test("QUESTIONS has 5 items and legal answer indexes", function () {
  assert.equal(E.QUESTIONS.length, 5);
  E.QUESTIONS.forEach(function (q) {
    assert.equal(q.options.length, 4);
    assert.equal(Number.isInteger(q.answer), true);
    assert.ok(q.answer >= 0 && q.answer < q.options.length);
    assert.ok(q.explain.zh.trim());
    assert.ok(q.explain.en.trim());
    assert.ok(q.q.zh.trim());
    assert.ok(q.q.en.trim());
  });
  assert.match(E.QUESTIONS[0].options[E.QUESTIONS[0].answer].zh, /反向/);
  assert.match(E.QUESTIONS[1].options[E.QUESTIONS[1].answer].zh, /估值杠杆与仓位/);
  assert.match(E.QUESTIONS[2].options[E.QUESTIONS[2].answer].zh, /还没有杠杆 ETF/);
  assert.match(E.QUESTIONS[3].options[E.QUESTIONS[3].answer].zh, /2010 年的水平比今天高/);
  assert.match(E.QUESTIONS[4].options[E.QUESTIONS[4].answer].zh, /不能预测崩盘何时发生/);
});

test("scoreQuiz scores a perfect sheet and a blank sheet", function () {
  var right = E.QUESTIONS.map(function (q) { return q.answer; });
  var perfect = E.scoreQuiz(right);
  assert.deepEqual(perfect, { correct: 5, total: 5 });
  var wrong = E.scoreQuiz([9, 9, 9, 9, 9]);
  assert.deepEqual(wrong, { correct: 0, total: 5 });
  var one = right.slice();
  one[0] = 9;
  assert.equal(E.scoreQuiz(one).correct, 4);
});

test("scoreQuiz treats missing and illegal input as wrong and does not throw", function () {
  assert.doesNotThrow(function () { E.scoreQuiz(); });
  assert.deepEqual(E.scoreQuiz(undefined), { correct: 0, total: 5 });
  assert.deepEqual(E.scoreQuiz(null), { correct: 0, total: 5 });
  assert.deepEqual(E.scoreQuiz("nope"), { correct: 0, total: 5 });
  assert.deepEqual(E.scoreQuiz(3), { correct: 0, total: 5 });
  assert.deepEqual(E.scoreQuiz([]), { correct: 0, total: 5 });
  assert.deepEqual(E.scoreQuiz([null, undefined, "1", {}, []]), { correct: 0, total: 5 });
  var map = {};
  E.QUESTIONS.forEach(function (q) { map[q.id] = q.answer; });
  assert.equal(E.scoreQuiz(map).correct, 5);
});

test("badgeFor maps 5, 4, 3, and 0", function () {
  assert.equal(E.badgeFor(5).id, "eve-watcher");
  assert.equal(E.badgeFor(5).name.zh, "前夜观察员");
  assert.equal(E.badgeFor(5).name.en, "Eve Watcher");
  assert.equal(E.badgeFor(4).id, "apprentice");
  assert.equal(E.badgeFor(4).name.zh, "信号学徒");
  assert.equal(E.badgeFor(4).name.en, "Signal Apprentice");
  assert.equal(E.badgeFor(3).id, "review");
  assert.equal(E.badgeFor(0).id, "review");
  assert.equal(E.badgeFor(3).name.zh, "再看一遍仪表盘");
  assert.equal(E.badgeFor(0).name.en, "Review the dashboard");
  assert.equal(E.badgeFor(2).id, "review");
  assert.equal(E.badgeFor(6).id, "eve-watcher");
});

test("badgeFor does not throw on non-numeric input", function () {
  assert.doesNotThrow(function () { E.badgeFor(); });
  assert.equal(E.badgeFor(undefined).id, "review");
  assert.equal(E.badgeFor(null).id, "review");
  assert.equal(E.badgeFor("nope").id, "review");
  assert.equal(E.badgeFor(NaN).id, "review");
});

test("shareText zh has one link, the light tally, the badge, and a disclaimer last line", function () {
  var text = E.shareText(5, "zh");
  var lines = text.split("\n");
  assert.equal((text.match(/https:\/\/build-100\.com\/051\//g) || []).length, 1);
  assert.equal((text.match(/build-100\.com\/051/g) || []).length, 1);
  assert.match(text, /3 红/);
  assert.match(text, /3 黄/);
  assert.match(text, /5\/5/);
  assert.match(text, /前夜观察员/);
  assert.equal(lines[lines.length - 1], DISC_ZH);
  assert.equal(text.endsWith(DISC_ZH), true);
});

test("shareText en has one link, the light tally, the badge, and a disclaimer last line", function () {
  var text = E.shareText(4, "en");
  var lines = text.split("\n");
  assert.equal((text.match(/https:\/\/build-100\.com\/051\//g) || []).length, 1);
  assert.match(text, /3 red/);
  assert.match(text, /3 yellow/);
  assert.match(text, /4\/5/);
  assert.match(text, /Signal Apprentice/);
  assert.equal(lines[lines.length - 1], DISC_EN);
  var low = E.shareText(0, "en");
  assert.match(low, /Review the dashboard/);
  assert.equal(low.split("\n").pop(), DISC_EN);
  assert.equal((low.match(/https:\/\/build-100\.com\/051\//g) || []).length, 1);
});

test("shareText does not throw on illegal input and still ends with the disclaimer", function () {
  assert.doesNotThrow(function () { E.shareText(); });
  var zh = E.shareText(undefined, "zh");
  var en = E.shareText(null, "en");
  assert.equal((zh.match(/https:\/\/build-100\.com\/051\//g) || []).length, 1);
  assert.equal((en.match(/https:\/\/build-100\.com\/051\//g) || []).length, 1);
  assert.equal(zh.split("\n").pop(), DISC_ZH);
  assert.equal(en.split("\n").pop(), DISC_EN);
  assert.match(E.shareText(3, "zh"), /再看一遍仪表盘/);
});

test("META records the as-of date and the reading window", function () {
  assert.equal(E.META.asOf, "2026-10-14");
  assert.equal(E.META.window.zh, "2026-10-12 至 2026-10-14 前后");
  assert.equal(E.META.window.en, "around Oct 12–14, 2026");
});

test("LIGHTS names red, yellow, green, and grey in both languages", function () {
  assert.deepEqual(Object.keys(E.LIGHTS), LIGHT_KEYS);
  assert.equal(E.LIGHTS.red.zh, "红");
  assert.equal(E.LIGHTS.red.en, "Red");
  assert.equal(E.LIGHTS.yellow.en, "Yellow");
  assert.equal(E.LIGHTS.green.en, "Green");
  assert.equal(E.LIGHTS.grey.zh, "灰");
  assert.equal(E.LIGHTS.grey.en, "Grey");
  LIGHT_KEYS.forEach(function (key) {
    assert.ok(E.LIGHTS[key].meaning.zh.trim());
    assert.ok(E.LIGHTS[key].meaning.en.trim());
  });
});

test("LIGHTS rel words name the comparison, not the color", function () {
  assert.equal(E.LIGHTS.red.rel.zh, "今天更极端");
  assert.equal(E.LIGHTS.red.rel.en, "Today more extreme");
  assert.equal(E.LIGHTS.yellow.rel.zh, "相近");
  assert.equal(E.LIGHTS.yellow.rel.en, "Similar");
  assert.equal(E.LIGHTS.green.rel.zh, "今天较低");
  assert.equal(E.LIGHTS.green.rel.en, "Today lower");
  assert.equal(E.LIGHTS.grey.rel.zh, "不比较");
  assert.equal(E.LIGHTS.grey.rel.en, "Not compared");
  assert.equal(E.LIGHTS.red.zh, "红");
  assert.equal(E.LIGHTS.red.en, "Red");
});

test("negbeta and valuation are red against every eve", function () {
  ["negbeta", "valuation"].forEach(function (id) {
    YEARS.forEach(function (year) {
      assert.equal(byId(id).crises[year].light, "red", id + " " + year);
    });
  });
});

test("every {zh, en} field is a non-empty string", function () {
  var pairs = [];
  walkPairs({
    META: E.META,
    LIGHTS: E.LIGHTS,
    SIGNALS: E.SIGNALS,
    CRISES: E.CRISES,
    QUESTIONS: E.QUESTIONS,
    DISCLAIMER: E.DISCLAIMER
  }, "root", pairs);
  assert.ok(pairs.length > 20);
  pairs.forEach(function (pair) {
    assert.equal(typeof pair.zh, "string", pair.path);
    assert.equal(typeof pair.en, "string", pair.path);
    assert.ok(pair.zh.trim().length > 0, pair.path + " zh");
    assert.ok(pair.en.trim().length > 0, pair.path + " en");
  });
});

test("crisis-cell lights stay inside the four-color set", function () {
  E.SIGNALS.forEach(function (sig) {
    YEARS.forEach(function (year) {
      assert.ok(LIGHT_KEYS.indexOf(sig.crises[year].light) !== -1);
    });
    assert.ok(LIGHT_KEYS.indexOf(sig.light) !== -1);
  });
});
