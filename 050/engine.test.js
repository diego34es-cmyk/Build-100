"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const E = require("./engine.js");

const allStock = { stock: 100, bond: 0, cash: 0 };
const allBond = { stock: 0, bond: 100, cash: 0 };
const allCash = { stock: 0, bond: 0, cash: 100 };
const mix6040 = { stock: 60, bond: 40, cash: 0 };
const perfect = [allCash, allBond, allBond, allStock, allCash];
const worst = [allStock, allStock, allStock, allCash, allStock];

function countLinks(text) {
  const m = text.match(/https:\/\/build-100\.com\/050\//g);
  return m ? m.length : 0;
}

test("ROUNDS has 5 cards in appendix order with whitelist dates", () => {
  assert.equal(E.ROUNDS.length, 5);
  assert.deepEqual(E.ROUNDS.map((r) => r.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(E.ROUNDS.map((r) => r.date.zh), ["10-14", "10-15", "10-15", "10-16", "10-12 当周"]);
  assert.deepEqual(E.ROUNDS.map((r) => r.date.en), ["10-14", "10-15", "10-15", "10-16", "Week of 10-12"]);
  assert.equal(E.ROUNDS[4].date.zh, "10-12 当周");
  assert.equal(E.ROUNDS[4].date.en, "Week of 10-12");
  for (const r of E.ROUNDS) {
    assert.equal(typeof r.title.zh, "string");
    assert.equal(typeof r.title.en, "string");
    assert.equal(typeof r.what.zh, "string");
    assert.equal(typeof r.what.en, "string");
    assert.equal(typeof r.why.zh, "string");
    assert.equal(typeof r.why.en, "string");
    assert.equal(typeof r.react.zh, "string");
    assert.equal(typeof r.react.en, "string");
    assert.notEqual(r.title.zh, r.title.en);
    assert.notEqual(r.what.zh, r.what.en);
    assert.notEqual(r.why.zh, r.why.en);
    assert.notEqual(r.react.zh, r.react.en);
    assert.deepEqual(Object.keys(r.ret).sort(), ["bond", "cash", "stock"]);
  }
});

test("ROUNDS returns match the whitelist exactly", () => {
  assert.deepEqual(E.ROUNDS.map((r) => r.ret), [
    { stock: -1.5, bond: -0.8, cash: 0.1 },
    { stock: -3, bond: 1.2, cash: 0.1 },
    { stock: -0.5, bond: 0.6, cash: 0.1 },
    { stock: 1.8, bond: 0.2, cash: 0.1 },
    { stock: -1, bond: -0.5, cash: 0.1 },
  ]);
  assert.equal(E.ROUNDS[0].ret.stock, -1.5);
  assert.equal(E.ROUNDS[0].ret.bond, -0.8);
  assert.equal(E.ROUNDS[0].ret.cash, 0.1);
  assert.equal(E.ROUNDS[1].ret.stock, -3);
  assert.equal(E.ROUNDS[1].ret.bond, 1.2);
});

test("news cards keep whitelist facts and do not invent figures", () => {
  const r = E.ROUNDS;
  assert.match(r[0].title.zh, /3\.7%/);
  assert.match(r[0].title.zh, /超预期/);
  assert.match(r[0].what.zh, /超出市场预期/);
  assert.doesNotMatch(r[0].title.zh + r[0].what.zh, /加息押注升温/);
  assert.doesNotMatch(r[0].title.zh + r[0].what.zh, /股债双杀/);
  assert.match(r[0].title.en, /3\.7%/);

  assert.match(r[1].title.zh, /AI 信用惊魂/);
  assert.match(r[1].what.zh, /1200bp/);
  assert.match(r[1].what.zh, /78 美分/);
  assert.match(r[1].what.zh, /16%/);
  assert.match(r[1].what.zh, /KOSPI -7\.57%/);
  assert.match(r[1].what.zh, /日经 -4\.9%/);
  assert.doesNotMatch(r[1].what.zh, /10bp/);
  assert.doesNotMatch(r[1].what.zh, /5\.086%/);
  assert.match(r[1].what.zh, /CoreWeave/);
  assert.match(r[1].what.en, /1200bp/);
  assert.match(r[1].what.en, /78 cents/);
  assert.match(r[1].what.en, /16%/);
  assert.match(r[1].what.en, /7\.57%/);
  assert.match(r[1].what.en, /4\.9%/);
  assert.doesNotMatch(r[1].what.en, /10bp/);
  assert.doesNotMatch(r[1].what.en, /5\.086%/);
  assert.match(r[1].react.zh, /10bp/);
  assert.match(r[1].react.zh, /5\.086%/);
  assert.match(r[1].react.en, /10bp/);
  assert.match(r[1].react.en, /5\.086%/);

  assert.match(r[2].title.zh, /\+1\.3%/);
  assert.match(r[2].what.zh, /0\.6%/);
  assert.doesNotMatch(r[2].title.zh + r[2].what.zh, /AI 信用恐惧/);
  assert.doesNotMatch(r[2].title.zh + r[2].what.zh, /债市继续涨/);
  assert.match(r[2].react.zh, /AI 信用恐惧/);
  assert.match(r[2].react.zh, /债市继续涨/);
  assert.match(r[2].title.en, /1\.3%/);
  assert.match(r[2].what.en, /0\.6%/);

  assert.match(r[3].title.zh, /BofA/);
  assert.match(r[3].what.zh, /645 亿美元/);
  assert.match(r[3].what.zh, /531 亿/);
  assert.doesNotMatch(r[3].title.zh + r[3].what.zh, /资金回流风险资产/);
  assert.match(r[3].react.zh, /资金回流风险资产/);
  assert.match(r[3].title.en, /BofA/);
  assert.match(r[3].what.en, /64\.5 billion/);
  assert.match(r[3].what.en, /53\.1 billion/);

  assert.match(r[4].title.zh, /3\.75%/);
  assert.match(r[4].title.zh, /4\.00%/);
  assert.match(r[4].what.zh, /会议纪要/);
  assert.doesNotMatch(r[4].title.zh + r[4].what.zh, /利率押注重新定价/);
  assert.match(r[4].react.zh, /利率押注重新定价/);
  assert.match(r[4].title.en, /3\.75%/);
  assert.match(r[4].title.en, /4\.00%/);

  const whatZh = [
    "9 月 CPI 同比 3.7%，超出市场预期。",
    "CoreWeave CDS 飙破 1200bp、2031 债券跌到 78 美分（收益率超 16%），韩国 KOSPI -7.57%、日经 -4.9%。",
    "9 月 PPI 环比 +1.3%，市场预期只有 0.6%。",
    "BofA 资金流向：股票基金单周流入 645 亿美元（科技股年内流入创纪录），现金流出 531 亿。",
    "美联储 9 月加息至 3.75%–4.00%，会议纪要暗示年底或再加息。",
  ];
  const reactZh = [
    "加息押注升温，股债双杀。",
    "恐慌资金涌入美债，10 年期收益率单日大跌 10bp 至 5.086%。",
    "通胀恐惧被 AI 信用恐惧盖过，避险情绪延续、债市继续涨。",
    "波动之后资金回流风险资产。",
    "利率押注重新定价。",
  ];
  r.forEach((card, i) => {
    assert.equal(card.what.zh, whatZh[i], "what zh round " + (i + 1));
    assert.equal(card.react.zh, reactZh[i], "react zh round " + (i + 1));
    const preZh = card.title.zh + card.what.zh;
    const preEn = card.title.en + card.what.en;
    assert.equal(preZh.includes(card.react.zh), false, "zh title+what contains react on round " + (i + 1));
    assert.equal(preEn.includes(card.react.en), false, "en title+what contains react on round " + (i + 1));
  });
});

test("pre-reveal copy does not leak game return prints", () => {
  E.ROUNDS.forEach((r, i) => {
    const pre = r.title.zh + r.title.en + r.what.zh + r.what.en;
    ["-1.5%", "-0.8%", "-3.0%", "-3%", "+1.2%", "+1.8%", "+0.2%", "-1.0%"].forEach((bad) => {
      if (i === 2 && bad === "+0.6%") return;
      assert.equal(pre.includes(bad), false, "round " + (i + 1) + " leaked " + bad);
    });
    assert.doesNotMatch(pre, /现金 \+0\.1|cash \+0\.1/i);
  });
  assert.doesNotMatch(E.ROUNDS[0].what.zh + E.ROUNDS[0].title.zh, /-1\.5|-0\.8/);
  assert.doesNotMatch(E.ROUNDS[1].what.zh + E.ROUNDS[1].title.zh, /-3\.0|\+1\.2/);
  assert.match(E.ROUNDS[0].why.zh, /只有现金不亏/);
  assert.match(E.ROUNDS[4].why.zh, /只有现金不亏/);
});

test("THRESHOLDS and BENCHMARKS are the locked rules", () => {
  assert.deepEqual({ ...E.THRESHOLDS }, { S: 2.5, A: 0.5, B: -2 });
  assert.equal(E.BENCHMARKS.balanced.id, "60/40");
  assert.equal(E.BENCHMARKS.balanced.stock, 60);
  assert.equal(E.BENCHMARKS.balanced.bond, 40);
  assert.equal(E.BENCHMARKS.balanced.cash, 0);
  assert.equal(E.BENCHMARKS.balanced.weight.stock, 0.6);
  assert.equal(E.BENCHMARKS.balanced.weight.bond, 0.4);
  assert.equal(E.BENCHMARKS.balanced.weight.cash, 0);
  assert.equal(E.BENCHMARKS.cash.stock, 0);
  assert.equal(E.BENCHMARKS.cash.bond, 0);
  assert.equal(E.BENCHMARKS.cash.cash, 100);
  assert.equal(E.BENCHMARKS.cash.weight.cash, 1);
  assert.equal(E.PAGE_URL, "https://build-100.com/050/");
});

test("validateAllocation accepts integer mixes that sum to 100", () => {
  assert.deepEqual(E.validateAllocation({ stock: 34, bond: 33, cash: 33 }), { ok: true, total: 100, diff: 0 });
  assert.deepEqual(E.validateAllocation(mix6040), { ok: true, total: 100, diff: 0 });
  assert.deepEqual(E.validateAllocation(allStock), { ok: true, total: 100, diff: 0 });
  assert.deepEqual(E.validateAllocation(allCash), { ok: true, total: 100, diff: 0 });
  assert.equal(E.validateAllocation({ stock: 0, bond: 100, cash: 0 }).ok, true);
});

test("validateAllocation reports short and over totals", () => {
  const short = E.validateAllocation({ stock: 40, bond: 30, cash: 20 });
  assert.equal(short.ok, false);
  assert.equal(short.total, 90);
  assert.equal(short.diff, -10);
  const over = E.validateAllocation({ stock: 50, bond: 50, cash: 5 });
  assert.equal(over.ok, false);
  assert.equal(over.total, 105);
  assert.equal(over.diff, 5);
  const zero = E.validateAllocation({ stock: 0, bond: 0, cash: 0 });
  assert.equal(zero.ok, false);
  assert.equal(zero.total, 0);
  assert.equal(zero.diff, -100);
});

test("validateAllocation rejects floats, negatives, and out of range", () => {
  assert.equal(E.validateAllocation({ stock: 33.5, bond: 33.5, cash: 33 }).ok, false);
  assert.equal(E.validateAllocation({ stock: 50.5, bond: 49.5, cash: 0 }).ok, false);
  assert.equal(E.validateAllocation({ stock: 50.5, bond: 49.5, cash: 0 }).total, 100);
  const neg = E.validateAllocation({ stock: -1, bond: 50, cash: 51 });
  assert.equal(neg.ok, false);
  assert.equal(neg.total, 100);
  assert.equal(neg.diff, 0);
  const hi = E.validateAllocation({ stock: 101, bond: 0, cash: 0 });
  assert.equal(hi.ok, false);
  assert.equal(hi.total, 101);
  assert.equal(hi.diff, 1);
  assert.equal(E.validateAllocation({ stock: 200, bond: -50, cash: -50 }).ok, false);
});

test("validateAllocation rejects non-numeric input and does not throw", () => {
  const bad = [
    null,
    undefined,
    100,
    "34/33/33",
    [],
    [34, 33, 33],
    {},
    { stock: "34", bond: "33", cash: "33" },
    { stock: 34, bond: 33 },
    { stock: NaN, bond: 50, cash: 50 },
    { stock: Infinity, bond: 0, cash: 0 },
    { stock: true, bond: 0, cash: 0 },
  ];
  for (const sample of bad) {
    let out;
    assert.doesNotThrow(() => {
      out = E.validateAllocation(sample);
    });
    assert.equal(out.ok, false);
    assert.equal(out.total, null);
    assert.equal(out.diff, null);
  }
});

test("roundReturn examples: all stock round 2 and 60/40 round 1", () => {
  assert.equal(E.roundReturn(allStock, 1), -3);
  assert.equal(E.formatPct(E.roundReturn(allStock, 1)), "-3.00%");
  assert.equal(E.roundReturn(mix6040, 0), -1.22);
  assert.equal(E.formatPct(E.roundReturn(mix6040, 0)), "-1.22%");
  assert.equal(E.roundReturn(allBond, 1), 1.2);
  assert.equal(E.formatPct(E.roundReturn(allBond, 1)), "+1.20%");
  assert.equal(E.roundReturn(allCash, 0), 0.1);
  assert.equal(E.formatPct(E.roundReturn(allCash, 0)), "+0.10%");
});

test("roundReturn matches every 60/40 and cash print", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => E.roundReturn(mix6040, i)),
    [-1.22, -1.32, -0.06, 1.16, -0.8]
  );
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => E.formatPct(E.roundReturn(mix6040, i))),
    ["-1.22%", "-1.32%", "-0.06%", "+1.16%", "-0.80%"]
  );
  for (let i = 0; i < 5; i++) assert.equal(E.roundReturn(allCash, i), 0.1);
});

test("roundReturn returns null for illegal input and does not throw", () => {
  assert.equal(E.roundReturn(null, 0), null);
  assert.equal(E.roundReturn({ stock: 90, bond: 0, cash: 0 }, 0), null);
  assert.equal(E.roundReturn(allStock, 5), null);
  assert.equal(E.roundReturn(allStock, -1), null);
  assert.equal(E.roundReturn(allStock, 1.5), null);
  assert.doesNotThrow(() => E.roundReturn(undefined, "x"));
  assert.equal(E.roundReturn(allStock, "1"), null);
});

test("60/40 benchmark is -2.24 and all cash is +0.50, simple sums", () => {
  const b = E.benchmark6040();
  const c = E.benchmarkCash();
  assert.deepEqual(b.rounds, [-1.22, -1.32, -0.06, 1.16, -0.8]);
  assert.equal(b.total, -2.24);
  assert.equal(E.formatPct(b.total), "-2.24%");
  assert.equal(b.rounds.reduce((s, n) => s + Math.round(n * 100), 0), -224);
  assert.deepEqual(c.rounds, [0.1, 0.1, 0.1, 0.1, 0.1]);
  assert.equal(c.total, 0.5);
  assert.equal(E.formatPct(c.total), "+0.50%");
  assert.equal(c.rounds.reduce((s, n) => s + Math.round(n * 100), 0), 50);
  assert.equal(E.totalReturn([mix6040, mix6040, mix6040, mix6040, mix6040]), -2.24);
  assert.equal(E.totalReturn([allCash, allCash, allCash, allCash, allCash]), 0.5);
  const again = E.benchmark6040();
  b.allocation.stock = 0;
  b.total = 0;
  assert.equal(again.total, -2.24);
  assert.equal(again.allocation.stock, 60);
});

test("perfect ceiling is 3.80 and the worst book is -5.90", () => {
  assert.equal(E.totalReturn(perfect), 3.8);
  assert.equal(E.formatPct(E.totalReturn(perfect)), "+3.80%");
  assert.deepEqual(E.cumulativeSeries(perfect), [0.1, 1.3, 1.9, 3.7, 3.8]);
  assert.equal(E.totalReturn(worst), -5.9);
  assert.equal(E.formatPct(E.totalReturn(worst)), "-5.90%");
  assert.notEqual(E.totalReturn(perfect), 0.1 + 1.2 + 0.6 + 1.8 + 0.1);
});

test("totalReturn is the sum of rounded rounds and cumulativeSeries steps", () => {
  const book = Array.from({ length: 5 }, () => E.evenSplit());
  const rounds = book.map((a, i) => E.roundReturn(a, i));
  assert.deepEqual(rounds.map(E.formatPct), ["-0.74%", "-0.59%", "+0.06%", "+0.71%", "-0.47%"]);
  assert.deepEqual(E.cumulativeSeries(book), [-0.74, -1.33, -1.27, -0.56, -1.03]);
  assert.equal(E.totalReturn(book), -1.03);
  const summed = rounds.reduce((s, n) => s + Math.round(n * 100), 0) / 100;
  assert.equal(E.totalReturn(book), summed);
  assert.deepEqual(E.cumulativeSeries([allStock, allStock]), [-1.5, -4.5]);
  assert.equal(E.totalReturn([]), 0);
  assert.equal(E.totalReturn(null), null);
  assert.equal(E.cumulativeSeries([allStock, { stock: 1, bond: 1, cash: 1 }]), null);
});

test("grade uses strict thresholds and does not promote equals", () => {
  assert.equal(E.grade(2.51), "S");
  assert.equal(E.grade(2.5), "A");
  assert.equal(E.grade(3.8), "S");
  assert.equal(E.grade(0.51), "A");
  assert.equal(E.grade(0.5), "B");
  assert.equal(E.grade(0), "B");
  assert.equal(E.grade(-1.99), "B");
  assert.equal(E.grade(-2), "C");
  assert.equal(E.grade(-2.01), "C");
  assert.equal(E.grade(-2.24), "C");
  assert.equal(E.grade(-5.9), "C");
  assert.equal(E.grade(E.totalReturn(perfect)), "S");
  assert.equal(E.grade(E.benchmarkCash().total), "B");
  assert.equal(E.grade(E.benchmark6040().total), "C");
  assert.equal(E.grade(NaN), "C");
  assert.equal(E.grade(undefined), "C");
  assert.equal(E.grade("2.6"), "C");
});

test("recap returns exactly 3 bilingual sentences from the real book", () => {
  const stocks = [allStock, allStock, allStock, allStock, allStock];
  const zh = E.recap(stocks, "zh");
  const en = E.recap(stocks, "en");
  assert.equal(zh.length, 3);
  assert.equal(en.length, 3);
  assert.match(zh[0], /第 4 轮/);
  assert.match(zh[0], /10-16/);
  assert.match(zh[0], /\+1\.80%/);
  assert.match(zh[1], /最痛的一轮/);
  assert.doesNotMatch(zh[1], /最弱的一轮/);
  assert.match(zh[1], /第 2 轮/);
  assert.match(zh[1], /10-15/);
  assert.match(zh[1], /-3\.00%/);
  assert.match(zh[2], /-4\.20%/);
  assert.match(zh[2], /-2\.24%/);
  assert.match(zh[2], /\+0\.50%/);
  assert.match(zh[2], /没跑赢 60\/40/);
  assert.match(zh[2], /没跑赢全现金/);
  assert.match(en[0], /round 4/);
  assert.match(en[0], /10-16/);
  assert.match(en[0], /\+1\.80%/);
  assert.match(en[1], /Your worst round/);
  assert.doesNotMatch(en[1], /Your weakest round/);
  assert.match(en[1], /round 2/);
  assert.match(en[1], /-3\.00%/);
  assert.match(en[2], /behind the 60\/40 at -2\.24%/);
  assert.match(en[2], /behind all cash at \+0\.50%/);
  assert.equal(zh.join("").includes("Your best"), false);
  assert.equal(en.join("").includes("最好"), false);

  const cash = [allCash, allCash, allCash, allCash, allCash];
  const czh = E.recap(cash, "zh");
  const cen = E.recap(cash, "en");
  assert.equal(czh.length, 3);
  assert.match(czh.join(""), /\+0\.10%/);
  assert.match(czh[2], /\+0\.50%/);
  assert.match(czh[2], /打平/);
  assert.match(czh[2], /跑赢 60\/40/);
  assert.doesNotMatch(czh[2], /没跑赢全现金/);
  assert.match(cen[2], /tied with all cash at \+0\.50%/);
  assert.match(cen[2], /ahead of the 60\/40/);

  const pz = E.recap(perfect, "zh");
  const pe = E.recap(perfect, "en");
  assert.match(pz[1], /最弱的一轮/);
  assert.doesNotMatch(pz[1], /最痛的一轮/);
  assert.match(pz[1], /\+0\.10%/);
  assert.match(pe[1], /Your weakest round/);
  assert.doesNotMatch(pe[1], /Your worst round/);
  assert.match(pz[2], /\+3\.80%/);
  assert.match(pz[2], /跑赢 60\/40/);
  assert.match(pz[2], /也跑赢全现金/);
  assert.match(pe[0], /round 4/);
  assert.match(pe[2], /ahead of the 60\/40/);
  assert.match(pe[2], /ahead of all cash/);

  const flatZero = [
    { stock: 4, bond: 4, cash: 92 },
    allBond,
    allBond,
    allStock,
    allCash,
  ];
  assert.equal(E.roundReturn(flatZero[0], 0), 0);
  const zz = E.recap(flatZero, "zh");
  const ze = E.recap(flatZero, "en");
  assert.match(zz[1], /最弱的一轮/);
  assert.match(zz[1], /0\.00%/);
  assert.doesNotMatch(zz[1], /最痛的一轮/);
  assert.match(ze[1], /Your weakest round/);
  assert.doesNotMatch(ze[1], /Your worst round/);

  const broken = E.recap([{ stock: 1, bond: 1, cash: 1 }], "zh");
  assert.equal(broken.length, 3);
  assert.equal(E.recap(null, "en").length, 3);
});

test("shareText zh has one link, the grade, both benchmarks, and a disclaimer last line", () => {
  const text = E.shareText(perfect, "zh");
  const lines = text.split("\n");
  assert.equal(countLinks(text), 1);
  assert.equal(lines[lines.length - 1], E.DISCLAIMER.zh);
  assert.match(text, /评级 S/);
  assert.match(text, /累计收益 \+3\.80%/);
  assert.match(text, /60\/40 -2\.24%/);
  assert.match(text, /全现金 \+0\.50%/);
  assert.match(text, /https:\/\/build-100\.com\/050\//);
  assert.equal(text.includes("https://build-100.com/049"), false);
  const cash = E.shareText([allCash, allCash, allCash, allCash, allCash], "zh");
  assert.match(cash, /评级 B/);
  assert.match(cash, /\+0\.50%/);
  assert.equal(countLinks(cash), 1);
});

test("shareText en has one link and the English disclaimer on the last line", () => {
  const text = E.shareText(worst, "en");
  const lines = text.split("\n");
  assert.equal(countLinks(text), 1);
  assert.equal(lines[lines.length - 1], "Game returns are simplified numbers, not real market data — for fun and learning only.");
  assert.match(text, /Grade C/);
  assert.match(text, /cumulative -5\.90%/);
  assert.match(text, /60\/40 -2\.24%/);
  assert.match(text, /all cash \+0\.50%/);
  assert.equal(text.includes("仅供娱乐学习"), false);
  const empty = E.shareText(null, "en");
  assert.equal(countLinks(empty), 1);
  assert.equal(empty.split("\n").pop(), E.DISCLAIMER.en);
  assert.doesNotThrow(() => E.shareText([{ stock: 10 }], "zh"));
});

test("fillCash and evenSplit always total 100", () => {
  assert.deepEqual(E.evenSplit(), { stock: 34, bond: 33, cash: 33 });
  assert.equal(E.validateAllocation(E.evenSplit()).ok, true);
  assert.deepEqual(E.fillCash({ stock: 40, bond: 30, cash: 0 }), { stock: 40, bond: 30, cash: 30 });
  assert.deepEqual(E.fillCash({ stock: 10, bond: 10, cash: 90 }), { stock: 10, bond: 10, cash: 80 });
  assert.deepEqual(E.fillCash({ stock: 70, bond: 50, cash: 5 }), { stock: 58, bond: 42, cash: 0 });
  assert.deepEqual(E.fillCash({ stock: 150, bond: 50 }), { stock: 67, bond: 33, cash: 0 });
  assert.deepEqual(E.fillCash({ stock: -10, bond: 25, cash: 0 }), { stock: 0, bond: 25, cash: 75 });
  assert.deepEqual(E.fillCash(null), { stock: 0, bond: 0, cash: 100 });
  assert.deepEqual(E.fillCash({ stock: 33.6, bond: 33.4, cash: 80 }), { stock: 34, bond: 33, cash: 33 });
  const samples = [
    null,
    {},
    { stock: 0, bond: 0, cash: 0 },
    { stock: 100, bond: 100, cash: 100 },
    { stock: -5, bond: 120, cash: 3 },
    { stock: 33.2, bond: 33.2, cash: 33.2 },
    { stock: 99, bond: 99, cash: 99 },
    { stock: "nope", bond: 40, cash: 10 },
    { stock: 1, bond: 2, cash: 97 },
  ];
  for (const sample of samples) {
    const a = E.fillCash(sample);
    assert.equal(E.validateAllocation(a).ok, true, JSON.stringify(sample) + " -> " + JSON.stringify(a));
  }
  const once = E.evenSplit();
  once.stock = 0;
  assert.equal(E.evenSplit().stock, 34);
});

test("benchmark labels are computed, not hardcoded bp constants", () => {
  const src = fs.readFileSync(path.join(__dirname, "engine.js"), "utf8");
  const tail = src.slice(src.indexOf("function compareTail"), src.indexOf("function recap"));
  const share = src.slice(src.indexOf("function shareText"), src.indexOf("function asPctInt"));
  assert.match(tail, /benchmark6040\(\)/);
  assert.match(tail, /benchmarkCash\(\)/);
  assert.doesNotMatch(tail, /-224|\b50\b/);
  assert.match(share, /benchmark6040\(\)/);
  assert.match(share, /benchmarkCash\(\)/);
  assert.doesNotMatch(share, /-224|\b50\b/);
  const zh = E.shareText(perfect, "zh");
  assert.match(zh, new RegExp(E.formatPct(E.benchmark6040().total).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(zh, new RegExp(E.formatPct(E.benchmarkCash().total).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("engine is a classic UMD script with no DOM", () => {
  const src = fs.readFileSync(path.join(__dirname, "engine.js"), "utf8");
  assert.match(src, /if \(typeof module !== "undefined" && module\.exports\) module\.exports = API;/);
  assert.match(src, /if \(typeof window !== "undefined"\) window\.RotateEngine = API;/);
  assert.doesNotMatch(src, /\bexport\s/);
  assert.doesNotMatch(src, /\bimport\s/);
  assert.doesNotMatch(src, /\bdocument\b/);
  assert.doesNotMatch(src, /\blocalStorage\b/);
  assert.doesNotMatch(src, /\binnerHTML\b/);
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.equal(typeof E.roundReturn, "function");
  assert.equal(typeof E.shareText, "function");
});

test("index.html passes the 12-point page format checklist", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>ROTATE-050 · 股债轮盘<\/title>/);
  assert.match(html, /property="og:title" content="ROTATE-050 · 股债轮盘"/);
  assert.match(html, /name="twitter:title" content="ROTATE-050 · 股债轮盘"/);
  assert.doesNotMatch(html, /· BUILD-100<\/title>/);
  assert.match(html, /name="description" content="[^"]*[\u4e00-\u9fff][^"]*"/);
  assert.match(html, /property="og:description" content="[^"]*[\u4e00-\u9fff][^"]*"/);
  assert.match(html, /name="twitter:description" content="[^"]*Game returns are simplified numbers[^"]*"/);
  assert.match(html, /name="theme-color" content="#060709"/);
  assert.match(html, /rel="canonical" href="https:\/\/build-100\.com\/050\/"/);
  assert.match(html, /property="og:type" content="website"/);
  assert.match(html, /property="og:url" content="https:\/\/build-100\.com\/050\/"/);
  assert.match(html, /property="og:image" content="https:\/\/build-100\.com\/050\/og-050\.png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="628"/);
  assert.match(html, /property="og:image:alt" content="ROTATE-050 · 股债轮盘"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="twitter:image" content="https:\/\/build-100\.com\/050\/og-050\.png"/);
  assert.match(html, /y='42'/);
  assert.match(html, /font-size='20'/);
  assert.match(html, /%3Crect width='64' height='64' rx='12'/);
  assert.match(html, /%3Ctext x='32' y='42'/);
  assert.match(html, /050%3C\/text%3E/);
  assert.doesNotMatch(html, /%3Crect x=/);
  assert.match(html, /data-en="← BUILD-100">← 返回主站/);
  assert.match(html, /class="nav-brand">ROTATE<span>·050<\/span>/);
  assert.match(html, /id="langBtn"/);
  assert.match(html, /aria-label="Switch language"/);
  assert.match(html, /function applyLang/);
  assert.match(html, /function t\(zh, en\)/);
  assert.match(html, /localStorage\.getItem\("lang"\)/);
  assert.match(html, /localStorage\.setItem\("lang"/);
  assert.match(html, /class="share-row"/);
  assert.match(html, /class="share-btn" id="copyBtn"/);
  assert.match(html, /id="shareImgBtn"/);
  assert.match(html, /class="share-canvas-wrap" id="shareWrap"/);
  assert.match(html, /<canvas id="shareCanvas" width="1200" height="630"/);
  assert.match(html, /main \{ max-width: 880px/);
  assert.match(html, /font-size: clamp\(2rem, 5\.5vw, 3\.4rem\)/);
  assert.match(html, /line-height: 1\.14/);
  assert.match(html, /font-size: clamp\(1\.05rem, 2vw, 1\.25rem\)/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /transition-duration: 0\.01ms !important/);
  assert.match(html, /<script src="engine\.js"><\/script>/);
  assert.doesNotMatch(html, /type="module"/);
  assert.match(html, /<script src="\/beacon\.js"><\/script>\s*<\/body>/);
  assert.match(html, /--bg: #060709;/);
  assert.match(html, /--ink: #edeff1;/);
  assert.match(html, /--live: #4ade80;/);
  assert.match(html, /--delta: #fbbf24;\s+\/\* 「再加 \$X」的视觉锚点色 \*\//);
  assert.match(html, /--accent: #a855f7;/);
  assert.match(html, /--accent-glow: rgba\(168,85,247,0\.35\);/);
  assert.doesNotMatch(html, /fonts\.google|cdnjs|unpkg|jsdelivr|cdn\.jsdelivr/i);
  assert.match(html, /游戏涨跌为简化数值，非真实行情，仅供娱乐学习/);
  assert.match(html, /Game returns are simplified numbers, not real market data — for fun and learning only\./);
  assert.match(html, /全现金比一比/);
  assert.doesNotMatch(html, /全程现金/);
  assert.match(html, /data-en="Market reaction">市场反应/);
  assert.match(html, /id="reactText"/);
  const reactAt = html.indexOf('id="reactText"');
  const whyAt = html.indexOf('id="whyText"');
  assert.ok(reactAt > 0 && whyAt > reactAt);
  assert.match(html, /新闻全部真实，涨跌为游戏简化数值/);
  assert.match(html, /All news is real; returns are simplified game values\./);
  assert.match(html, /data-en="ROTATE-050 · Stock-bond roulette">ROTATE-050 · 股债轮盘/);
  assert.match(html, /https:\/\/x\.com\/JCheng557/);
  assert.match(html, /Mini Games · ROTATE-050/);
  assert.doesNotMatch(html, /-2\.24%|−2\.24%/);
  const inline = html.split('<script src="engine.js"></script>')[1].split('<script src="/beacon.js">')[0];
  assert.match(inline, /RotateEngine/);
  new Function(inline.replace(/^\s*<script>/, "").replace(/<\/script>\s*$/, ""));
});
