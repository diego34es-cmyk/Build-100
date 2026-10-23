"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./engine.js");

const LINK = /https:\/\/build-100\.com\/056\//g;

function absClose(a, b, eps) {
  assert.ok(Math.abs(a - b) <= (eps == null ? 1e-9 : eps), a + " vs " + b);
}

test("META.asOf is 2026-10-23", function () {
  assert.equal(E.META.asOf, "2026-10-23");
});

test("checkDiscount suspicion boundaries 0.099 / 0.10 / 0.30", function () {
  var none = E.checkDiscount(109900, 100000, 80000);
  absClose(none.listInflation, 0.099);
  assert.equal(none.suspicion, "none");

  var edge = E.checkDiscount(109999, 100000, 80000);
  assert.ok(edge.listInflation < 0.1);
  assert.equal(edge.suspicion, "none");

  var mid = E.checkDiscount(110000, 100000, 80000);
  absClose(mid.listInflation, 0.1);
  assert.equal(mid.suspicion, "medium");

  var midHigh = E.checkDiscount(129999, 100000, 80000);
  assert.ok(midHigh.listInflation < 0.3);
  assert.equal(midHigh.suspicion, "medium");

  var high = E.checkDiscount(130000, 100000, 80000);
  absClose(high.listInflation, 0.3);
  assert.equal(high.suspicion, "high");

  assert.equal(E.checkDiscount(160000, 100000, 80000).suspicion, "high");
});

test("checkDiscount verdict boundaries 0.049 / 0.05 / 0.15 and sale >= usual", function () {
  var trap = E.checkDiscount(120000, 100000, 95100);
  absClose(trap.realDrop, 0.049);
  assert.equal(trap.verdict, "trap");

  var under = E.checkDiscount(120000, 100000, 95001);
  assert.ok(under.realDrop < 0.05);
  assert.equal(under.verdict, "trap");

  var wait = E.checkDiscount(120000, 100000, 95000);
  absClose(wait.realDrop, 0.05);
  assert.equal(wait.verdict, "wait");

  var waitHigh = E.checkDiscount(120000, 100000, 85001);
  assert.ok(waitHigh.realDrop < 0.15);
  assert.ok(waitHigh.realDrop >= 0.05);
  assert.equal(waitHigh.verdict, "wait");

  var deal = E.checkDiscount(120000, 100000, 85000);
  absClose(deal.realDrop, 0.15);
  assert.equal(deal.verdict, "deal");

  assert.equal(E.checkDiscount(120000, 100000, 100000).verdict, "trap");
  assert.ok(E.checkDiscount(120000, 100000, 100000).realDrop === 0);
  var above = E.checkDiscount(150000, 100000, 120000);
  assert.ok(above.realDrop < 0);
  assert.equal(above.verdict, "trap");
  assert.equal(above.suspicion, "high");
});

test("checkDiscount ratios and sample product 3999 / 2999 / 2899", function () {
  var r = E.checkDiscount(200, 100, 80);
  absClose(r.realDrop, 0.2);
  absClose(r.listInflation, 1);
  absClose(r.claimedDrop, 0.6);
  assert.equal(r.verdict, "deal");
  assert.equal(r.suspicion, "high");

  var sample = E.checkDiscount(3999, 2999, 2899);
  absClose(sample.realDrop, 100 / 2999);
  absClose(sample.listInflation, 1000 / 2999);
  absClose(sample.claimedDrop, 1100 / 3999);
  assert.ok(sample.realDrop < 0.05);
  assert.ok(sample.realDrop > 0.03 && sample.realDrop < 0.04);
  assert.equal(sample.verdict, "trap");
  assert.equal(sample.suspicion, "high");
  assert.ok(sample.claimedDrop > sample.realDrop);

  assert.equal(E.checkDiscount("3999", "2,999", "2899").verdict, "trap");
});

test("checkDiscount returns null for non-positive or non-numeric input and never throws", function () {
  assert.equal(E.checkDiscount(0, 100, 80), null);
  assert.equal(E.checkDiscount(-1, 100, 80), null);
  assert.equal(E.checkDiscount(100, 0, 80), null);
  assert.equal(E.checkDiscount(100, -5, 80), null);
  assert.equal(E.checkDiscount(100, 100, 0), null);
  assert.equal(E.checkDiscount(100, 100, -1), null);
  assert.equal(E.checkDiscount("abc", 100, 80), null);
  assert.equal(E.checkDiscount("", 100, 80), null);
  assert.equal(E.checkDiscount("  ", 100, 80), null);
  assert.equal(E.checkDiscount(null, 100, 80), null);
  assert.equal(E.checkDiscount(undefined, 100, 80), null);
  assert.equal(E.checkDiscount(NaN, 100, 80), null);
  assert.equal(E.checkDiscount(Infinity, 100, 80), null);
  assert.equal(E.checkDiscount(100, Infinity, 80), null);
  assert.equal(E.checkDiscount(100, 80, "nope"), null);
  assert.equal(E.checkDiscount("0", "100", "80"), null);
  assert.doesNotThrow(function () { E.checkDiscount(); });
  assert.doesNotThrow(function () { E.checkDiscount({}, [], "x"); });
  assert.equal(E.checkDiscount(), null);
});

test("subsidyAmount caps appliance and digital and returns 0 for none or bad base", function () {
  assert.equal(E.SUBSIDY.appliance.rate, 0.15);
  assert.equal(E.SUBSIDY.appliance.cap, 1500);
  assert.equal(E.SUBSIDY.digital.rate, 0.15);
  assert.equal(E.SUBSIDY.digital.cap, 500);
  assert.equal(E.SUBSIDY.none, null);

  assert.equal(E.subsidyAmount(20000, "appliance"), 1500);
  assert.equal(E.subsidyAmount(10000, "appliance"), 1500);
  assert.equal(E.subsidyAmount(2000, "digital"), 300);
  assert.equal(E.subsidyAmount(5000, "digital"), 500);
  assert.ok(E.subsidyAmount(1000, "digital") < 500);
  absClose(E.subsidyAmount(1000, "digital"), 150);
  assert.equal(E.subsidyAmount(1000, "none"), 0);
  assert.equal(E.subsidyAmount(1000, "phone"), 0);
  assert.equal(E.subsidyAmount(0, "appliance"), 0);
  assert.equal(E.subsidyAmount(-10, "digital"), 0);
  assert.equal(E.subsidyAmount("0", "digital"), 0);
  assert.equal(E.subsidyAmount(null, "appliance"), 0);
  assert.doesNotThrow(function () { E.subsidyAmount(); });
});

test("stack follows ORDER, never goes negative, PLUS sits after coupons and before red packets", function () {
  assert.deepEqual(E.ORDER, ["direct", "coupon", "plus", "redpacket", "tradein", "subsidy"]);
  var price = 1000;
  var opts = {
    direct: 100,
    coupon: 50,
    plus: true,
    redpacket: 20,
    tradein: 30,
    category: "digital"
  };
  var r = E.stack(price, opts);
  assert.deepEqual(r.steps.map(function (s) { return s.key; }), E.ORDER);
  assert.equal(r.steps[0].before, 1000);
  assert.equal(r.steps[0].after, 900);
  assert.equal(r.steps[0].saved, 100);
  assert.equal(r.steps[1].before, 900);
  assert.equal(r.steps[1].after, 850);
  assert.equal(r.steps[1].saved, 50);
  assert.equal(r.steps[1].key, "coupon");
  assert.equal(r.steps[2].key, "plus");
  assert.equal(r.steps[3].key, "redpacket");
  assert.equal(r.steps[2].before, 850);
  assert.equal(r.steps[2].after, 850 * 0.95);
  assert.equal(r.steps[2].saved, 850 - 850 * 0.95);
  var afterPlus = 850 * 0.95;
  assert.equal(r.steps[3].before, afterPlus);
  assert.equal(r.steps[3].after, afterPlus - 20);
  assert.equal(r.steps[3].saved, 20);
  var afterRed = afterPlus - 20;
  assert.equal(r.steps[4].before, afterRed);
  assert.equal(r.steps[4].after, afterRed - 30);
  assert.equal(r.steps[4].saved, 30);
  var payable = afterRed - 30;
  assert.equal(r.steps[5].key, "subsidy");
  assert.equal(r.steps[5].before, payable);
  assert.equal(r.steps[5].saved, E.subsidyAmount(payable, "digital"));
  assert.equal(r.steps[5].after, payable - E.subsidyAmount(payable, "digital"));
  assert.ok(r.steps[5].saved < E.subsidyAmount(price, "digital"));
  assert.ok(r.steps[5].saved < 500);
  assert.equal(r.final, r.steps[5].after);
  assert.equal(r.totalSaved, price - r.final);
  r.steps.forEach(function (s) {
    assert.ok(s.before >= 0);
    assert.ok(s.after >= 0);
    assert.ok(s.saved >= 0);
    absClose(s.before - s.saved, s.after);
  });
});

test("stack clamps each step at zero and caps subsidy on the amount then due", function () {
  var crushed = E.stack(80, {
    direct: 1000,
    coupon: 50,
    plus: true,
    redpacket: 10,
    tradein: 10,
    category: "digital"
  });
  assert.equal(crushed.steps[0].after, 0);
  assert.equal(crushed.steps[0].saved, 80);
  crushed.steps.forEach(function (s) {
    assert.ok(s.after >= 0, s.key);
    assert.ok(s.saved >= 0, s.key);
  });
  assert.equal(crushed.final, 0);
  assert.equal(crushed.steps[5].saved, 0);

  var appliance = E.stack(20000, { category: "appliance" });
  assert.equal(appliance.steps[5].saved, 1500);
  assert.equal(appliance.final, 18500);

  var phoneCap = E.stack(5000, { category: "digital" });
  assert.equal(phoneCap.steps[5].saved, 500);
  assert.equal(phoneCap.final, 4500);

  var phoneOpen = E.stack(2000, { category: "digital" });
  assert.equal(phoneOpen.steps[5].saved, 300);
  assert.equal(phoneOpen.final, 1700);

  var off = E.stack(2000, {
    direct: 0,
    coupon: 0,
    plus: false,
    category: "none"
  });
  assert.equal(off.steps[2].saved, 0);
  assert.equal(off.steps[2].after, off.steps[2].before);
  assert.equal(off.steps[5].saved, 0);
  assert.equal(off.final, 2000);

  assert.doesNotThrow(function () { E.stack(); });
  assert.doesNotThrow(function () { E.stack("nope", null); });
  assert.equal(E.stack().steps.length, 6);
});

test("naiveSubsidyGap is >= 0 and > 0 when a coupon lowers an uncapped subsidy", function () {
  var open = { coupon: 400, category: "digital" };
  var gap = E.naiveSubsidyGap(2000, open);
  assert.equal(E.subsidyAmount(2000, "digital"), 300);
  assert.equal(E.subsidyAmount(1600, "digital"), 240);
  assert.equal(gap, 60);
  assert.ok(gap > 0);

  var plain = E.naiveSubsidyGap(2000, { category: "digital" });
  assert.equal(plain, 0);

  var capped = E.naiveSubsidyGap(20000, { coupon: 1000, category: "appliance" });
  assert.equal(capped, 0);

  var directGap = E.naiveSubsidyGap(1000, { direct: 200, category: "digital" });
  assert.equal(directGap, 30);
  assert.ok(directGap > 0);

  var plusGap = E.naiveSubsidyGap(1000, { plus: true, category: "digital" });
  assert.ok(plusGap > 0);

  var none = E.naiveSubsidyGap(3000, { coupon: 500, category: "none" });
  assert.equal(none, 0);

  [0, -5, null, "x"].forEach(function (p) {
    assert.ok(E.naiveSubsidyGap(p, { coupon: 10, category: "digital" }) >= 0);
  });
  assert.doesNotThrow(function () { E.naiveSubsidyGap(); });
  assert.ok(E.naiveSubsidyGap() >= 0);
});

test("TIMELINE has 6 nodes, 10-20 is past, 11-11 is not", function () {
  assert.equal(E.TIMELINE.length, 6);
  var expect = [
    ["10-20", true, "open"],
    ["10-31–11-03", false, "wave2"],
    ["11-04–11-09", false, "rotate"],
    ["11-11", false, "final"],
    ["11-12–11-13", false, "encore"],
    ["11-27", false, "bf"]
  ];
  expect.forEach(function (row, i) {
    var node = E.TIMELINE[i];
    assert.equal(node.date, row[0]);
    assert.equal(node.past, row[1], node.date);
    assert.equal(node.id, row[2]);
    assert.ok(node.label.zh.trim());
    assert.ok(node.label.en.trim());
  });
  var open = E.TIMELINE.find(function (n) { return n.date.indexOf("10-20") === 0; });
  var finale = E.TIMELINE.find(function (n) { return n.date === "11-11"; });
  assert.equal(open.past, true);
  assert.equal(finale.past, false);
});

test("CATEGORY_ADVICE covers phone, appliance, and daily", function () {
  ["phone", "appliance", "daily"].forEach(function (key) {
    assert.ok(E.CATEGORY_ADVICE[key].zh.trim());
    assert.ok(E.CATEGORY_ADVICE[key].en.trim());
  });
  assert.match(E.CATEGORY_ADVICE.phone.zh, /反弹风险/);
  assert.equal(/大概率/.test(E.CATEGORY_ADVICE.phone.zh), false);
  assert.match(E.CATEGORY_ADVICE.phone.zh, /11-11/);
  assert.match(E.CATEGORY_ADVICE.appliance.zh, /尽早/);
  assert.match(E.CATEGORY_ADVICE.daily.zh, /11-11/);
});

test("CHECKLIST has 5 items and QUIZ has 3 with in-range answers and bilingual explain", function () {
  assert.equal(E.CHECKLIST.length, 5);
  var ids = {};
  E.CHECKLIST.forEach(function (item) {
    assert.equal(typeof item.id, "string");
    assert.ok(item.id.trim());
    assert.equal(ids[item.id], undefined);
    ids[item.id] = true;
    assert.ok(item.zh.trim());
    assert.ok(item.en.trim());
  });
  assert.ok(E.CHECKLIST.some(function (item) { return /价保/.test(item.zh); }));
  assert.ok(E.CHECKLIST.some(function (item) { return /国补资格应恢复/.test(item.zh); }));
  assert.ok(E.CHECKLIST.some(function (item) { return /定金/.test(item.zh); }));
  assert.ok(E.CHECKLIST.some(function (item) { return /三家/.test(item.zh); }));
  assert.ok(E.CHECKLIST.some(function (item) { return /标识/.test(item.zh) && /地址/.test(item.zh); }));

  assert.equal(E.QUIZ.length, 3);
  var qids = {};
  E.QUIZ.forEach(function (q) {
    assert.ok(q.id && !qids[q.id]);
    qids[q.id] = true;
    assert.ok(q.q.zh.trim() && q.q.en.trim());
    assert.equal(q.options.length, 3);
    q.options.forEach(function (op) {
      assert.ok(op.zh.trim() && op.en.trim());
    });
    assert.equal(typeof q.answer, "number");
    assert.ok(q.answer >= 0 && q.answer < q.options.length);
    assert.ok(q.explain.zh.trim() && q.explain.en.trim());
  });
  assert.match(E.QUIZ[0].options[E.QUIZ[0].answer].zh, /实付/);
  assert.match(E.QUIZ[1].options[E.QUIZ[1].answer].zh, /反弹风险/);
  assert.equal(/大概率/.test(E.QUIZ[1].options[E.QUIZ[1].answer].zh), false);
  assert.match(E.QUIZ[1].explain.zh, /据公开报道/);
  assert.match(E.QUIZ[1].explain.zh, /200%/);
  assert.match(E.QUIZ[1].explain.zh, /消息称/);
  assert.match(E.QUIZ[2].options[E.QUIZ[2].answer].zh, /不退/);
  assert.match(E.QUIZ[2].explain.zh, /不退/);
});

test("ORDER_LABELS is bilingual and lines up with ORDER", function () {
  E.ORDER.forEach(function (key) {
    assert.ok(E.ORDER_LABELS[key].zh.trim(), key);
    assert.ok(E.ORDER_LABELS[key].en.trim(), key);
  });
  assert.match(E.ORDER_LABELS.plus.zh, /95/);
  assert.match(E.ORDER_LABELS.subsidy.zh, /15%/);
});

test("gradeQuiz and badge boundaries", function () {
  var all = E.QUIZ.map(function (q) { return q.answer; });
  assert.deepEqual(E.gradeQuiz(all), { correct: 3, total: 3 });
  assert.deepEqual(E.gradeQuiz([]), { correct: 0, total: 3 });
  assert.deepEqual(E.gradeQuiz(null), { correct: 0, total: 3 });
  var none = all.map(function (n) { return n === 0 ? 1 : 0; });
  assert.deepEqual(E.gradeQuiz(none), { correct: 0, total: 3 });
  var two = all.slice();
  two[0] = two[0] === 0 ? 1 : 0;
  assert.deepEqual(E.gradeQuiz(two), { correct: 2, total: 3 });
  var one = all.slice();
  one[0] = 0;
  one[1] = 0;
  assert.deepEqual(E.gradeQuiz(one), { correct: 1, total: 3 });
  assert.deepEqual(E.gradeQuiz(all.concat([1, 0])), { correct: 3, total: 3 });
  assert.doesNotThrow(function () { E.gradeQuiz(); });

  assert.equal(E.badge(0).zh, "还在雾里");
  assert.equal(E.badge(0).en, "Still in the fog");
  assert.notEqual(E.badge(0).zh, E.badge(1).zh);
  assert.equal(E.badge(1).zh, E.badge(2).zh);
  assert.equal(E.badge(1).en, "Sees the trick");
  assert.notEqual(E.badge(2).zh, E.badge(3).zh);
  assert.equal(E.badge(3).zh, "价格猎人");
  assert.equal(E.badge(3).en, "Price hunter");
  assert.equal(E.badge(4).zh, "价格猎人");
  assert.equal(E.badge(-1).zh, E.badge(0).zh);
  assert.equal(E.badge("2").zh, E.badge(2).zh);
  assert.equal(E.badge("3").zh, "价格猎人");
  assert.doesNotThrow(function () { E.badge(); });
  assert.equal(E.badge().zh, E.badge(0).zh);
  assert.equal(E.badge(null).zh, E.badge(0).zh);
});

test("shareText zh/en has exactly one https://build-100.com/056/ link", function () {
  ["zh", "en"].forEach(function (lang) {
    [undefined, null, "", "deal", "wait", "trap", "nope"].forEach(function (verdict) {
      var text = E.shareText(lang, verdict);
      assert.equal((text.match(LINK) || []).length, 1, lang + " " + verdict + " => " + text);
    });
  });
  assert.match(E.shareText("zh"), /3 步看穿/);
  assert.match(E.shareText("en"), /3 steps/i);
  assert.match(E.shareText("zh", "deal"), /真香/);
  assert.match(E.shareText("en", "deal"), /Real deal/);
  assert.match(E.shareText("zh", "wait"), /再等等/);
  assert.match(E.shareText("en", "wait"), /Wait/);
  assert.match(E.shareText("zh", "trap"), /套路价/);
  assert.match(E.shareText("en", "trap"), /Inflated tag/);
  assert.equal((E.shareText("zh", "deal").match(/build-100\.com\/056/g) || []).length, 1);
  assert.doesNotThrow(function () { E.shareText(); });
  assert.equal((E.shareText().match(LINK) || []).length, 1);
});

test("digital subsidy: price 7000 is above the 6000 limit, subsidy 0", function () {
  var r = E.stack(7000, { category: "digital" });
  assert.equal(r.steps[5].saved, 0);
  assert.equal(r.final, 7000);
  assert.equal(E.subsidyAmount(7000, "digital"), 0);
});

test("digital subsidy: price 6000 is at the limit, subsidy capped at 500", function () {
  var r = E.stack(6000, { category: "digital" });
  assert.equal(r.steps[5].saved, 500);
  assert.equal(r.final, 5500);
});

test("digital subsidy: 6500 with a 600 coupon pays 5900, subsidy 500", function () {
  var r = E.stack(6500, { category: "digital", coupon: 600 });
  assert.equal(r.steps[5].before, 5900);
  assert.equal(r.steps[5].saved, 500);
  assert.equal(r.final, 5400);
});
