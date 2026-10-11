"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

function correctOptionZh(i) {
  const q = E.QUIZ[i];
  const idx = q.correct != null ? q.correct : q.answer;
  const opt = q.options[idx];
  return typeof opt === "string" ? opt : opt.zh;
}

function httpLinks(text) {
  return text.match(/https?:\/\/\S+/g) || [];
}

test("DATA has announceDate, aiActDate, name", () => {
  assert.equal(E.DATA.announceDate, "2026-10-05");
  assert.equal(E.DATA.aiActDate, "2026-08-02");
  assert.equal(E.DATA.name, "textGrain");
});

test("FACTS has four ids with zh/en", () => {
  assert.equal(E.FACTS.length, 4);
  assert.deepEqual(E.FACTS.map((f) => f.id), ["identity", "detect", "rewrite", "api"]);
  E.FACTS.forEach((f) => {
    assert.equal(typeof f.zh, "string");
    assert.equal(typeof f.en, "string");
    assert.ok(f.zh.length > 0);
    assert.ok(f.en.length > 0);
  });
});

test("REGIONS PRODUCTS OPTIN lists", () => {
  assert.deepEqual(E.REGIONS, ["eu", "non_eu"]);
  assert.deepEqual(E.PRODUCTS, ["chatgpt", "codex", "api"]);
  assert.deepEqual(E.OPTIN, ["on", "off", "unsure"]);
});

test("needsOptIn is true only for api", () => {
  assert.equal(E.needsOptIn("api"), true);
  assert.equal(E.needsOptIn("chatgpt"), false);
  assert.equal(E.needsOptIn("codex"), false);
  assert.equal(E.needsOptIn("API"), false);
  assert.equal(E.needsOptIn(null), false);
});

test("assess EU + ChatGPT → will / eu_consumer", () => {
  const r = E.assess({ region: "eu", product: "chatgpt" });
  assert.equal(r.status, "will");
  assert.equal(r.reason, "eu_consumer");
  assert.ok(Array.isArray(r.facts));
});

test("assess EU + Codex → will / eu_consumer", () => {
  const r = E.assess({ region: "eu", product: "codex" });
  assert.equal(r.status, "will");
  assert.equal(r.reason, "eu_consumer");
});

test("EU consumer facts are identity, detect, and rewrite", () => {
  ["chatgpt", "codex"].forEach((product) => {
    const r = E.assess({ region: "eu", product });
    assert.deepEqual(r.facts, ["identity", "detect", "rewrite"]);
  });
});

test("assess EU + API on → will / api_on", () => {
  const r = E.assess({ region: "eu", product: "api", optIn: "on" });
  assert.equal(r.status, "will");
  assert.equal(r.reason, "api_on");
});

test("assess EU + API off → wont / api_off", () => {
  const r = E.assess({ region: "eu", product: "api", optIn: "off" });
  assert.equal(r.status, "wont");
  assert.equal(r.reason, "api_off");
});

test("assess EU + API unsure → depends / api_unsure", () => {
  const r = E.assess({ region: "eu", product: "api", optIn: "unsure" });
  assert.equal(r.status, "depends");
  assert.equal(r.reason, "api_unsure");
});

test("assess non-EU + ChatGPT → wont / non_eu_consumer", () => {
  const r = E.assess({ region: "non_eu", product: "chatgpt" });
  assert.equal(r.status, "wont");
  assert.equal(r.reason, "non_eu_consumer");
});

test("assess non-EU + Codex → wont / non_eu_consumer", () => {
  const r = E.assess({ region: "non_eu", product: "codex" });
  assert.equal(r.status, "wont");
  assert.equal(r.reason, "non_eu_consumer");
});

test("assess non-EU + API on → will / api_on", () => {
  const r = E.assess({ region: "non_eu", product: "api", optIn: "on" });
  assert.equal(r.status, "will");
  assert.equal(r.reason, "api_on");
});

test("assess non-EU + API off → wont / api_off", () => {
  const r = E.assess({ region: "non_eu", product: "api", optIn: "off" });
  assert.equal(r.status, "wont");
  assert.equal(r.reason, "api_off");
});

test("assess non-EU + API unsure → depends / api_unsure", () => {
  const r = E.assess({ region: "non_eu", product: "api", optIn: "unsure" });
  assert.equal(r.status, "depends");
  assert.equal(r.reason, "api_unsure");
});

test("assess empty / missing input is incomplete", () => {
  const empty = E.assess({});
  assert.equal(empty.status, "incomplete");
  assert.deepEqual(empty.missing, ["region", "product"]);
  const none = E.assess();
  assert.equal(none.status, "incomplete");
  assert.ok(none.missing.indexOf("region") !== -1);
  assert.ok(none.missing.indexOf("product") !== -1);
  const nil = E.assess(null);
  assert.equal(nil.status, "incomplete");
});

test("assess only Q1 (region) is incomplete missing product", () => {
  const r = E.assess({ region: "eu" });
  assert.equal(r.status, "incomplete");
  assert.deepEqual(r.missing, ["product"]);
});

test("assess API without optIn is incomplete", () => {
  const r = E.assess({ region: "eu", product: "api" });
  assert.equal(r.status, "incomplete");
  assert.deepEqual(r.missing, ["optIn"]);
  const r2 = E.assess({ region: "non_eu", product: "api", optIn: null });
  assert.equal(r2.status, "incomplete");
  assert.ok(r2.missing.indexOf("optIn") !== -1);
});

test("assess illegal values are incomplete and never throw", () => {
  const cases = [
    { region: "us", product: "chatgpt" },
    { region: "eu", product: "gpt" },
    { region: "eu", product: "api", optIn: "maybe" },
    { region: 1, product: true },
    "eu",
    42,
    [],
    { region: "EU", product: "ChatGPT" }
  ];
  cases.forEach((input) => {
    const r = E.assess(input);
    assert.equal(r.status, "incomplete");
    assert.ok(Array.isArray(r.missing));
    assert.ok(r.missing.length >= 1);
  });
});

test("non-API ignores optIn", () => {
  const a = E.assess({ region: "eu", product: "chatgpt", optIn: "off" });
  assert.equal(a.status, "will");
  assert.equal(a.reason, "eu_consumer");
  const b = E.assess({ region: "non_eu", product: "codex", optIn: "on" });
  assert.equal(b.status, "wont");
  assert.equal(b.reason, "non_eu_consumer");
  const c = E.assess({ region: "eu", product: "codex", optIn: "unsure" });
  assert.equal(c.status, "will");
  assert.equal(c.reason, "eu_consumer");
});

test("QUIZ correct answers are 关闭 / 授权机构 / 削弱", () => {
  assert.equal(E.QUIZ.length, 3);
  assert.equal(E.QUIZ[0].correct, 0);
  assert.equal(E.QUIZ[0].answer, 0);
  assert.equal(E.QUIZ[1].correct, 1);
  assert.equal(E.QUIZ[1].answer, 1);
  assert.equal(E.QUIZ[2].correct, 2);
  assert.equal(E.QUIZ[2].answer, 2);
  assert.match(correctOptionZh(0), /关闭/);
  assert.match(correctOptionZh(1), /授权机构/);
  assert.match(correctOptionZh(2), /削弱/);
  assert.equal(E.QUIZ[0].options[0].zh, "关闭（需 opt-in）");
  assert.equal(E.QUIZ[2].options[2].zh, "被削弱");
  assert.equal(E.checkAnswer(0, 0), true);
  assert.equal(E.checkAnswer(1, 1), true);
  assert.equal(E.checkAnswer(2, 2), true);
  assert.equal(E.checkAnswer(0, 1), false);
  assert.equal(E.checkAnswer(2, 1), false);
});

test("gradeQuiz all correct is 3/3", () => {
  const g = E.gradeQuiz([0, 1, 2]);
  assert.equal(g.total, 3);
  assert.equal(g.score, 3);
  assert.deepEqual(g.results, [true, true, true]);
});

test("gradeQuiz all wrong is 0/3", () => {
  const g = E.gradeQuiz([1, 0, 0]);
  assert.equal(g.total, 3);
  assert.equal(g.score, 0);
  assert.deepEqual(g.results, [false, false, false]);
  const g2 = E.gradeQuiz([2, 2, 1]);
  assert.equal(g2.score, 0);
  assert.deepEqual(g2.results, [false, false, false]);
});

test("gradeQuiz partial answers keep null slots", () => {
  const g = E.gradeQuiz([0, null, 0]);
  assert.equal(g.score, 1);
  assert.equal(g.total, 3);
  assert.deepEqual(g.results, [true, null, false]);
  const g2 = E.gradeQuiz([0, 1]);
  assert.deepEqual(g2.results, [true, true, null]);
  assert.equal(g2.score, 2);
  const g3 = E.gradeQuiz([]);
  assert.deepEqual(g3.results, [null, null, null]);
  assert.equal(g3.score, 0);
});

test("gradeQuiz illegal input does not throw", () => {
  assert.doesNotThrow(() => E.gradeQuiz(null));
  assert.doesNotThrow(() => E.gradeQuiz("x"));
  assert.doesNotThrow(() => E.gradeQuiz({ 0: 1 }));
  const g = E.gradeQuiz("x");
  assert.equal(g.total, 3);
  assert.deepEqual(g.results, [null, null, null]);
  const g2 = E.gradeQuiz([9, -1, "a"]);
  assert.equal(g2.results[0], null);
  assert.equal(g2.results[1], null);
  assert.equal(g2.results[2], null);
});

test("checkAnswer out of bounds returns null", () => {
  assert.equal(E.checkAnswer(-1, 0), null);
  assert.equal(E.checkAnswer(3, 0), null);
  assert.equal(E.checkAnswer(99, 1), null);
  assert.equal(E.checkAnswer(0, 99), null);
  assert.equal(E.checkAnswer(0, -1), null);
  assert.equal(E.checkAnswer(1, 3), null);
  assert.equal(E.checkAnswer(0, 1.5), null);
  assert.equal(E.checkAnswer("0", 1), null);
  assert.equal(E.checkAnswer(0, 0), true);
  assert.equal(E.checkAnswer(0, 1), false);
  assert.equal(E.checkAnswer(2, 2), true);
});

test("shareText zh has conclusion and a single http link", () => {
  const will = E.shareText(E.assess({ region: "eu", product: "chatgpt" }), "zh");
  assert.match(will, /会被加水印/);
  assert.ok(will.indexOf("https://build-100.com/044/") !== -1);
  assert.equal(httpLinks(will).length, 1);
  assert.equal((will.match(/https?:\/\//g) || []).length, 1);

  const wont = E.shareText(E.assess({ region: "non_eu", product: "chatgpt" }), "zh");
  assert.match(wont, /不会/);
  assert.equal(httpLinks(wont).length, 1);

  const dep = E.shareText(E.assess({ region: "eu", product: "api", optIn: "unsure" }), "zh");
  assert.match(dep, /取决于/);
  assert.equal(httpLinks(dep).length, 1);
});

test("shareText en has conclusion and a single http link", () => {
  const will = E.shareText(E.assess({ region: "eu", product: "codex" }), "en");
  assert.match(will, /watermark/i);
  assert.ok(will.indexOf("https://build-100.com/044/") !== -1);
  assert.equal(httpLinks(will).length, 1);
  assert.equal((will.match(/https?:\/\//g) || []).length, 1);

  const wont = E.shareText(E.assess({ region: "non_eu", product: "api", optIn: "off" }), "en");
  assert.match(wont, /will not/i);
  assert.equal(httpLinks(wont).length, 1);

  const dep = E.shareText(E.assess({ region: "non_eu", product: "api", optIn: "unsure" }), "en");
  assert.match(dep, /depends/i);
  assert.equal(httpLinks(dep).length, 1);
});

test("non-EU consumer shareText names the EU target without 强制", () => {
  const zh = E.shareText(E.assess({ region: "non_eu", product: "chatgpt" }), "zh");
  assert.equal(zh.includes("强制"), false);
  assert.match(zh, /ChatGPT \/ Codex 文本水印针对的是欧盟区/);
  assert.equal(httpLinks(zh).length, 1);
  const en = E.shareText(E.assess({ region: "non_eu", product: "codex" }), "en");
  assert.equal(/mandatory/i.test(en), false);
  assert.match(en, /the ChatGPT \/ Codex text watermark targets the EU; policy may change/);
  assert.equal(httpLinks(en).length, 1);
});

test("assess and quiz never throw on junk", () => {
  assert.doesNotThrow(() => E.assess(undefined));
  assert.doesNotThrow(() => E.assess({ region: {}, product: [], optIn: {} }));
  assert.doesNotThrow(() => E.checkAnswer(undefined, undefined));
  assert.doesNotThrow(() => E.shareText(undefined, undefined));
  assert.doesNotThrow(() => E.shareText({ status: "will" }, "zh"));
});
