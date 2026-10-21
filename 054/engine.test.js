"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

const LINK = /https:\/\/build-100\.com\/054\//g;
const HOST = /build-100\.com\/054/g;

const BANNED = [
  /能看到你的聊天/,
  /看到(你的)?聊天(内容|记录)/,
  /advertisers? can see (your )?chats?/i
];

const COVERAGE = {
  "current-chat": 2,
  "history-memory": 1,
  "personalize-off": 1,
  "temp-chat": 1,
  "plus-plan": 1,
  "health-block": 1,
  "mental-block": 1,
  "list-match": 1,
  "eea-personalize": 1
};

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

function blobOf(round) {
  var parts = [];
  function pushPair(p) {
    if (!p) return;
    if (typeof p.zh === "string") parts.push(p.zh);
    if (typeof p.en === "string") parts.push(p.en);
  }
  pushPair(round.chat);
  pushPair(round.context);
  pushPair(round.reveal);
  pushPair(round.why);
  (round.options || []).forEach(function (opt) {
    pushPair(opt.label);
    if (opt.sponsor) parts.push(String(opt.sponsor));
  });
  return parts.join("\n");
}

test("META.asOf is 2026-10-21", function () {
  assert.equal(E.META.asOf, "2026-10-21");
});

test("ROUNDS has exactly 10 questions with 4 options and a valid answer", function () {
  assert.equal(E.ROUNDS.length, 10);
  var ids = {};
  E.ROUNDS.forEach(function (round, i) {
    assert.equal(typeof round.id, "string", "round " + i + " id");
    assert.ok(round.id.trim(), "round " + i + " id empty");
    assert.equal(ids[round.id], undefined, "duplicate id " + round.id);
    ids[round.id] = true;
    assert.equal(round.options.length, 4, round.id + " options");
    var optIds = {};
    round.options.forEach(function (opt, j) {
      assert.equal(typeof opt.id, "string", round.id + " opt " + j);
      assert.ok(opt.label && opt.label.zh.trim() && opt.label.en.trim(), round.id + " label");
      assert.equal(optIds[opt.id], undefined, "dup option " + opt.id);
      optIds[opt.id] = true;
      assert.ok(Object.prototype.hasOwnProperty.call(opt, "sponsor"));
    });
    assert.ok(optIds[round.answer], round.id + " answer missing from options");
    assert.ok(round.reveal.zh.trim() && round.reveal.en.trim(), round.id + " reveal");
    assert.ok(round.why.zh.trim() && round.why.en.trim(), round.id + " why");
    assert.ok(round.chat.zh.trim() && round.chat.en.trim(), round.id + " chat");
    assert.ok(round.context.zh.trim() && round.context.en.trim(), round.id + " context");
    assert.ok(E.MECHANISMS[round.mechanism], round.id + " mechanism " + round.mechanism);
    assert.ok(E.MECHANISMS[round.mechanism].title.zh.trim());
    assert.ok(E.MECHANISMS[round.mechanism].fact.en.trim());
  });
});

test("mechanism coverage matches the required list", function () {
  var counts = {};
  E.ROUNDS.forEach(function (round) {
    counts[round.mechanism] = (counts[round.mechanism] || 0) + 1;
  });
  Object.keys(COVERAGE).forEach(function (key) {
    assert.ok((counts[key] || 0) >= COVERAGE[key], key + " got " + (counts[key] || 0));
  });
  assert.ok(counts["current-chat"] >= 2);
});

test("a round contains 25,000 for list matching", function () {
  var hit = E.ROUNDS.some(function (round) {
    return blobOf(round).indexOf("25,000") !== -1;
  });
  assert.equal(hit, true);
  var list = E.ROUNDS.filter(function (r) { return r.mechanism === "list-match"; });
  assert.equal(list.length >= 1, true);
  assert.match(blobOf(list[0]), /25,000/);
});

test("reveal/why copy does not claim advertisers can see chats", function () {
  E.ROUNDS.forEach(function (round) {
    var texts = [round.reveal.zh, round.reveal.en, round.why.zh, round.why.en];
    texts.forEach(function (text) {
      BANNED.forEach(function (re) {
        assert.equal(re.test(text), false, round.id + " banned " + re + " in " + text);
      });
    });
  });
  Object.keys(E.MECHANISMS).forEach(function (key) {
    var m = E.MECHANISMS[key];
    [m.title.zh, m.title.en, m.fact.zh, m.fact.en].forEach(function (text) {
      BANNED.forEach(function (re) {
        assert.equal(re.test(text), false, key + " banned " + re);
      });
    });
  });
});

test("scoreAnswer returns correct/answer and never throws", function () {
  var round = E.ROUNDS[0];
  var ok = E.scoreAnswer(round, round.answer);
  assert.equal(ok.correct, true);
  assert.equal(ok.answer, round.answer);
  var missId = round.options[0].id === round.answer ? round.options[1].id : round.options[0].id;
  var miss = E.scoreAnswer(round, missId);
  assert.equal(miss.correct, false);
  assert.equal(miss.answer, round.answer);
  assert.deepEqual(E.scoreAnswer(round.id, round.answer), ok);
  assert.equal(E.scoreAnswer("nope", "x").correct, false);
  assert.doesNotThrow(function () { E.scoreAnswer(); });
  assert.doesNotThrow(function () { E.scoreAnswer(null, null); });
});

test("newState / answer are immutable and repeat answers are ignored", function () {
  var s0 = E.newState();
  assert.equal(s0.index, 0);
  assert.equal(s0.correctCount, 0);
  assert.equal(E.isDone(s0), false);
  var round = E.currentRound(s0);
  assert.equal(round.id, E.ROUNDS[0].id);
  var missId = round.options[0].id === round.answer ? round.options[1].id : round.options[0].id;

  var s1 = E.answer(s0, missId);
  assert.notEqual(s1, s0);
  assert.equal(s0.index, 0);
  assert.equal(s0.correctCount, 0);
  assert.equal(Object.keys(s0.picks).length, 0);
  assert.equal(s1.picks[round.id], missId);
  assert.equal(s1.correctCount, 0);
  assert.equal(s1.index, 0);

  var s2 = E.answer(s1, round.answer);
  assert.equal(s2.picks[round.id], missId);
  assert.equal(s2.correctCount, 0);
  assert.equal(s2.index, 0);

  var s3 = E.next(s1);
  assert.equal(s3.index, 1);
  assert.equal(s1.index, 0);
  var round2 = E.currentRound(s3);
  assert.ok(round2);
  assert.notEqual(round2.id, round.id);

  var skip = E.next(s0);
  assert.equal(skip.index, 0);
});

test("createGame honors seedOrder of ids and answering a correct pick scores", function () {
  var ids = E.ROUNDS.map(function (r) { return r.id; }).reverse();
  var g = E.createGame(ids);
  assert.deepEqual(g.order, ids.map(function (id) {
    return E.ROUNDS.findIndex(function (r) { return r.id === id; });
  }));
  var first = E.currentRound(g);
  assert.equal(first.id, ids[0]);
  var hit = E.answer(g, first.answer);
  assert.equal(hit.correctCount, 1);
  assert.equal(E.isDone(hit), false);
});

test("playing all 10 rounds marks done and counts corrects", function () {
  var s = E.newState();
  var i;
  for (i = 0; i < 10; i++) {
    var round = E.currentRound(s);
    assert.ok(round, "round " + i);
    var pick = i % 2 === 0 ? round.answer : round.options[0].id === round.answer ? round.options[1].id : round.options[0].id;
    s = E.answer(s, pick);
    if (i < 9) s = E.next(s);
  }
  assert.equal(E.isDone(s), true);
  assert.equal(s.correctCount, 5);
  var extra = E.answer(s, E.ROUNDS[0].answer);
  assert.equal(extra.correctCount, 5);
  assert.doesNotThrow(function () { E.answer(); });
  assert.doesNotThrow(function () { E.next(null); });
  assert.doesNotThrow(function () { E.isDone("nope"); });
});

test("radar and rank boundaries at 0 3 4 6 7 8 9 10", function () {
  assert.equal(E.radar(0), 100);
  assert.equal(E.radar(3), 70);
  assert.equal(E.radar(4), 60);
  assert.equal(E.radar(6), 40);
  assert.equal(E.radar(7), 30);
  assert.equal(E.radar(8), 20);
  assert.equal(E.radar(9), 10);
  assert.equal(E.radar(10), 0);
  assert.equal(E.radar(null), 100);
  assert.doesNotThrow(function () { E.radar(); });

  function band(n) {
    return E.rank(n).zh + "|" + E.rank(n).en;
  }
  assert.equal(band(0), band(3));
  assert.notEqual(band(3), band(4));
  assert.equal(band(4), band(6));
  assert.notEqual(band(6), band(7));
  assert.equal(band(7), band(8));
  assert.notEqual(band(8), band(9));
  assert.equal(band(9), band(10));
  ["zh", "en"].forEach(function (lang) {
    [0, 3, 4, 6, 7, 8, 9, 10].forEach(function (n) {
      assert.ok(E.rank(n)[lang].trim());
    });
  });
  assert.doesNotThrow(function () { E.rank("nope"); });
});

test("ACTIONS has at least 5 items with unique ids", function () {
  assert.ok(E.ACTIONS.length >= 5);
  var ids = E.ACTIONS.map(function (a) { return a.id; });
  assert.equal(new Set(ids).size, ids.length);
  E.ACTIONS.forEach(function (item) {
    assert.ok(item.text.zh.trim());
    assert.ok(item.text.en.trim());
  });
  var joined = E.ACTIONS.map(function (a) { return a.text.zh + a.text.en; }).join("\n");
  assert.match(joined, /Personalize ads/i);
  assert.match(joined, /Past chats and memory/i);
  assert.match(joined, /Delete ads data/i);
  assert.match(joined, /Temporary Chats/i);
  assert.match(joined, /Plus/);
  assert.deepEqual(E.actionProgress([]), { done: 0, total: E.ACTIONS.length });
  assert.deepEqual(
    E.actionProgress([E.ACTIONS[0].id, E.ACTIONS[0].id, "nope"]),
    { done: 1, total: E.ACTIONS.length }
  );
});

test("shareText has exactly one https://build-100.com/054/ link", function () {
  var inviteZh = E.shareText("zh");
  assert.equal((inviteZh.match(LINK) || []).length, 1);
  assert.equal((inviteZh.match(HOST) || []).length, 1);
  assert.match(inviteZh, /来测测广告商能读你多少/);

  var inviteEn = E.shareText("en", null);
  assert.equal((inviteEn.match(LINK) || []).length, 1);
  assert.match(inviteEn, /advertisers can read you/i);

  var zh = E.shareText("zh", 7);
  assert.equal((zh.match(LINK) || []).length, 1);
  assert.equal((zh.match(HOST) || []).length, 1);
  assert.match(zh, /答对 7 \/ 10/);
  assert.equal(zh.indexOf(String(E.radar(7))) !== -1, true);
  assert.equal(zh.indexOf(E.rank(7).zh) !== -1, true);

  var en = E.shareText("en", 10);
  assert.equal((en.match(LINK) || []).length, 1);
  assert.match(en, /Correct 10 \/ 10/);
  assert.equal(en.indexOf(E.rank(10).en) !== -1, true);

  assert.doesNotThrow(function () { E.shareText(); });
  var zero = E.shareText("zh", 0);
  assert.equal((zero.match(LINK) || []).length, 1);
  assert.match(zero, /答对 0 \/ 10/);
});

test("static {zh,en} copy is non-empty", function () {
  var pairs = [];
  walkPairs({
    ROUNDS: E.ROUNDS,
    MECHANISMS: E.MECHANISMS,
    ACTIONS: E.ACTIONS,
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
