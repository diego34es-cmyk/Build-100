"use strict";

/* ROTATE-050. Pure functions. No DOM. Returns are basis points (1 bp = 0.01%). */

var PAGE_URL = "https://build-100.com/050/";

var DISCLAIMER = Object.freeze({
  zh: "游戏涨跌为简化数值，非真实行情，仅供娱乐学习",
  en: "Game returns are simplified numbers, not real market data — for fun and learning only.",
});

var THRESHOLDS = Object.freeze({ S: 2.5, A: 0.5, B: -2 });

var BENCHMARKS = Object.freeze({
  balanced: Object.freeze({
    id: "60/40",
    stock: 60,
    bond: 40,
    cash: 0,
    weight: Object.freeze({ stock: 0.6, bond: 0.4, cash: 0 }),
  }),
  cash: Object.freeze({
    id: "cash",
    stock: 0,
    bond: 0,
    cash: 100,
    weight: Object.freeze({ stock: 0, bond: 0, cash: 1 }),
  }),
});

/** Integer basis points for each round. Parallel to ROUNDS, in appendix order. */
var RET_BP = Object.freeze([
  Object.freeze({ stock: -150, bond: -80, cash: 10 }),
  Object.freeze({ stock: -300, bond: 120, cash: 10 }),
  Object.freeze({ stock: -50, bond: 60, cash: 10 }),
  Object.freeze({ stock: 180, bond: 20, cash: 10 }),
  Object.freeze({ stock: -100, bond: -50, cash: 10 }),
]);

function pctFromBp(bp) {
  return bp / 100;
}

function pair(zh, en) {
  return Object.freeze({ zh: zh, en: en });
}

var ROUNDS = Object.freeze([
  Object.freeze({
    id: 1,
    date: pair("10-14", "10-14"),
    title: pair("9 月 CPI 同比 3.7%，超预期", "September CPI up 3.7% year on year, above expectations"),
    what: pair(
      "9 月 CPI 同比 3.7%，超出市场预期。",
      "September CPI was up 3.7% year on year, above market expectations."
    ),
    react: pair(
      "加息押注升温，股债双杀。",
      "Rate-hike bets heated up, and stocks and bonds sold off together."
    ),
    why: pair(
      "加息押注升温 → 股债双杀，只有现金不亏。",
      "Rate-hike bets heated up → stocks and bonds sold off together, and only cash did not lose."
    ),
    ret: Object.freeze({
      stock: pctFromBp(RET_BP[0].stock),
      bond: pctFromBp(RET_BP[0].bond),
      cash: pctFromBp(RET_BP[0].cash),
    }),
  }),
  Object.freeze({
    id: 2,
    date: pair("10-15", "10-15"),
    title: pair("AI 信用惊魂", "AI credit scare"),
    what: pair(
      "CoreWeave CDS 飙破 1200bp、2031 债券跌到 78 美分（收益率超 16%），韩国 KOSPI -7.57%、日经 -4.9%。",
      "CoreWeave CDS blew past 1200bp, the 2031 bond fell to 78 cents (yield above 16%), Korea's KOSPI fell 7.57% and the Nikkei fell 4.9%."
    ),
    react: pair(
      "恐慌资金涌入美债，10 年期收益率单日大跌 10bp 至 5.086%。",
      "Panic money rushed into Treasuries, and the 10-year yield dropped 10bp in a day to 5.086%."
    ),
    why: pair(
      "恐慌资金涌入美债 → 债市上涨，股票承压。",
      "Panic money rushed into Treasuries → bonds rose and stocks stayed under pressure."
    ),
    ret: Object.freeze({
      stock: pctFromBp(RET_BP[1].stock),
      bond: pctFromBp(RET_BP[1].bond),
      cash: pctFromBp(RET_BP[1].cash),
    }),
  }),
  Object.freeze({
    id: 3,
    date: pair("10-15", "10-15"),
    title: pair("9 月 PPI 环比 +1.3%，大超预期", "September PPI up 1.3% month on month, far above expectations"),
    what: pair(
      "9 月 PPI 环比 +1.3%，市场预期只有 0.6%。",
      "September PPI was up 1.3% month on month, and the market expected only 0.6%."
    ),
    react: pair(
      "通胀恐惧被 AI 信用恐惧盖过，避险情绪延续、债市继续涨。",
      "Inflation fear was overshadowed by the AI credit scare, risk-off continued, and bonds kept rising."
    ),
    why: pair(
      "通胀恐惧被 AI 信用恐惧盖过 → 避险情绪延续，债市继续涨。",
      "Inflation fear was overshadowed by the AI credit scare → risk-off continued and bonds kept rising."
    ),
    ret: Object.freeze({
      stock: pctFromBp(RET_BP[2].stock),
      bond: pctFromBp(RET_BP[2].bond),
      cash: pctFromBp(RET_BP[2].cash),
    }),
  }),
  Object.freeze({
    id: 4,
    date: pair("10-16", "10-16"),
    title: pair("BofA 资金流向", "BofA fund flows"),
    what: pair(
      "BofA 资金流向：股票基金单周流入 645 亿美元（科技股年内流入创纪录），现金流出 531 亿。",
      "BofA fund flows: equity funds took in $64.5 billion in a week (a record year-to-date inflow for tech stocks), and $53.1 billion left cash."
    ),
    react: pair(
      "波动之后资金回流风险资产。",
      "After the volatility, money flowed back into risk assets."
    ),
    why: pair(
      "波动之后资金回流风险资产 → 股票领涨。",
      "After the volatility, money flowed back into risk assets → stocks led."
    ),
    ret: Object.freeze({
      stock: pctFromBp(RET_BP[3].stock),
      bond: pctFromBp(RET_BP[3].bond),
      cash: pctFromBp(RET_BP[3].cash),
    }),
  }),
  Object.freeze({
    id: 5,
    date: pair("10-12 当周", "Week of 10-12"),
    title: pair(
      "美联储 9 月加息至 3.75%–4.00%",
      "The Fed hiked in September to 3.75%–4.00%"
    ),
    what: pair(
      "美联储 9 月加息至 3.75%–4.00%，会议纪要暗示年底或再加息。",
      "The Fed hiked in September to 3.75%–4.00%, and the minutes hinted at another hike by year-end."
    ),
    react: pair(
      "利率押注重新定价。",
      "Rate bets were repriced."
    ),
    why: pair(
      "利率押注重新定价 → 股债一起承压，只有现金不亏。",
      "Rate bets were repriced → stocks and bonds both came under pressure, and only cash did not lose."
    ),
    ret: Object.freeze({
      stock: pctFromBp(RET_BP[4].stock),
      bond: pctFromBp(RET_BP[4].bond),
      cash: pctFromBp(RET_BP[4].cash),
    }),
  }),
]);

function pctToBp(pct) {
  var n = Number(pct);
  if (!Number.isFinite(n)) return null;
  var scaled = n * 100;
  var adj = scaled + (scaled < 0 ? -1 : 1) * 1e-8;
  if (scaled === 0) return 0;
  return Math.round(adj);
}

function formatBp(bp) {
  var n = Math.round(Number(bp));
  if (!Number.isFinite(n)) return "—";
  var sign = n > 0 ? "+" : n < 0 ? "-" : "";
  var abs = Math.abs(n);
  var whole = Math.floor(abs / 100);
  var frac = String(abs % 100).padStart(2, "0");
  return sign + whole + "." + frac + "%";
}

function formatPct(pct) {
  var bp = pctToBp(pct);
  if (bp == null) return "—";
  return formatBp(bp);
}

function validateAllocation(a) {
  var empty = { ok: false, total: null, diff: null };
  if (!a || typeof a !== "object" || Array.isArray(a)) return empty;
  var stock = a.stock;
  var bond = a.bond;
  var cash = a.cash;
  if (typeof stock !== "number" || typeof bond !== "number" || typeof cash !== "number") return empty;
  if (!Number.isFinite(stock) || !Number.isFinite(bond) || !Number.isFinite(cash)) return empty;
  var total = stock + bond + cash;
  var diff = total - 100;
  var ok =
    Number.isInteger(stock) && stock >= 0 && stock <= 100 &&
    Number.isInteger(bond) && bond >= 0 && bond <= 100 &&
    Number.isInteger(cash) && cash >= 0 && cash <= 100 &&
    total === 100;
  return { ok: ok, total: total, diff: diff };
}

function roundHalfAway(x) {
  if (x >= 0) return Math.round(x);
  return -Math.round(-x);
}

function roundReturnBp(alloc, roundIndex) {
  if (typeof roundIndex !== "number" || !Number.isInteger(roundIndex)) return null;
  if (roundIndex < 0 || roundIndex >= ROUNDS.length) return null;
  var v = validateAllocation(alloc);
  if (!v.ok) return null;
  var r = RET_BP[roundIndex];
  var num = alloc.stock * r.stock + alloc.bond * r.bond + alloc.cash * r.cash;
  return roundHalfAway(num / 100);
}

function roundReturn(alloc, roundIndex) {
  var bp = roundReturnBp(alloc, roundIndex);
  if (bp == null) return null;
  return bp / 100;
}

function seriesBp(allocs) {
  if (!Array.isArray(allocs)) return null;
  var out = [];
  var i;
  for (i = 0; i < allocs.length; i++) {
    var bp = roundReturnBp(allocs[i], i);
    if (bp == null) return null;
    out.push(bp);
  }
  return out;
}

function cumulativeSeries(allocs) {
  var bps = seriesBp(allocs);
  if (!bps) return null;
  var out = [];
  var sum = 0;
  var i;
  for (i = 0; i < bps.length; i++) {
    sum += bps[i];
    out.push(sum / 100);
  }
  return out;
}

function totalReturn(allocs) {
  var series = cumulativeSeries(allocs);
  if (!series) return null;
  if (!series.length) return 0;
  return series[series.length - 1];
}

function runBook(alloc) {
  var rounds = [];
  var sum = 0;
  var i;
  for (i = 0; i < ROUNDS.length; i++) {
    var bp = roundReturnBp(alloc, i);
    rounds.push(bp / 100);
    sum += bp;
  }
  return {
    allocation: { stock: alloc.stock, bond: alloc.bond, cash: alloc.cash },
    rounds: rounds,
    total: sum / 100,
  };
}

function benchmark6040() {
  var book = runBook(BENCHMARKS.balanced);
  book.id = "60/40";
  book.name = pair("60/40", "60/40");
  return book;
}

function benchmarkCash() {
  var book = runBook(BENCHMARKS.cash);
  book.id = "cash";
  book.name = pair("全现金", "All cash");
  return book;
}

function grade(total) {
  if (typeof total !== "number" || !Number.isFinite(total)) return "C";
  var bp = pctToBp(total);
  if (bp == null) return "C";
  if (bp > pctToBp(THRESHOLDS.S)) return "S";
  if (bp > pctToBp(THRESHOLDS.A)) return "A";
  if (bp > pctToBp(THRESHOLDS.B)) return "B";
  return "C";
}

function finishedBp(allocs) {
  var bps = seriesBp(allocs);
  if (!bps || bps.length !== ROUNDS.length) return null;
  return bps;
}

function compareTail(totalBp, lang) {
  var benchBp = pctToBp(benchmark6040().total);
  var cashBp = pctToBp(benchmarkCash().total);
  var db = totalBp - benchBp;
  var dc = totalBp - cashBp;
  var b = formatBp(benchBp);
  var c = formatBp(cashBp);
  if (lang === "en") {
    if (db > 0 && dc > 0) return "ahead of the 60/40 at " + b + " and ahead of all cash at " + c;
    if (db > 0 && dc === 0) return "ahead of the 60/40 at " + b + " and tied with all cash at " + c;
    if (db > 0 && dc < 0) return "ahead of the 60/40 at " + b + " and behind all cash at " + c;
    if (db === 0 && dc > 0) return "tied with the 60/40 at " + b + " and ahead of all cash at " + c;
    if (db === 0 && dc === 0) return "tied with the 60/40 at " + b + " and tied with all cash at " + c;
    if (db === 0 && dc < 0) return "tied with the 60/40 at " + b + " and behind all cash at " + c;
    if (db < 0 && dc > 0) return "behind the 60/40 at " + b + " and ahead of all cash at " + c;
    if (db < 0 && dc === 0) return "behind the 60/40 at " + b + " and tied with all cash at " + c;
    return "behind the 60/40 at " + b + " and behind all cash at " + c;
  }
  if (db > 0 && dc > 0) return "跑赢 60/40 的 " + b + "，也跑赢全现金的 " + c;
  if (db > 0 && dc === 0) return "跑赢 60/40 的 " + b + "，与全现金的 " + c + " 打平";
  if (db > 0 && dc < 0) return "跑赢 60/40 的 " + b + "，但没跑赢全现金的 " + c;
  if (db === 0 && dc > 0) return "与 60/40 的 " + b + " 打平，并跑赢全现金的 " + c;
  if (db === 0 && dc === 0) return "与 60/40 的 " + b + "、全现金的 " + c + " 都打平";
  if (db === 0 && dc < 0) return "与 60/40 的 " + b + " 打平，但没跑赢全现金的 " + c;
  if (db < 0 && dc > 0) return "没跑赢 60/40 的 " + b + "，但跑赢了全现金的 " + c;
  if (db < 0 && dc === 0) return "没跑赢 60/40 的 " + b + "，与全现金的 " + c + " 打平";
  return "没跑赢 60/40 的 " + b + "，也没跑赢全现金的 " + c;
}

function recap(allocs, lang) {
  var en = lang === "en";
  var bps = finishedBp(allocs);
  if (!bps) {
    if (en) {
      return [
        "Finish all five rounds to read the recap.",
        "Each round needs a 100% split across stocks, bonds, and cash.",
        "The score is then compared with the 60/40 and with all cash.",
      ];
    }
    return [
      "五轮都分完，才有复盘。",
      "每一轮都要把股票、债券和现金分成 100%。",
      "做完才能和 60/40、全现金比。",
    ];
  }
  var bestI = 0;
  var worstI = 0;
  var i;
  for (i = 1; i < bps.length; i++) {
    if (bps[i] > bps[bestI]) bestI = i;
    if (bps[i] < bps[worstI]) worstI = i;
  }
  var totalBp = 0;
  for (i = 0; i < bps.length; i++) totalBp += bps[i];
  var best = ROUNDS[bestI];
  var worst = ROUNDS[worstI];
  var bestNo = bestI + 1;
  var worstNo = worstI + 1;
  var bestPct = formatBp(bps[bestI]);
  var worstPct = formatBp(bps[worstI]);
  var you = formatBp(totalBp);
  var s1;
  var s2;
  var s3;
  if (bps[bestI] === bps[worstI]) {
    if (en) {
      s1 = "Every round returned the same " + bestPct + ".";
      s2 = "No single round pulled ahead, from round 1 through round 5.";
    } else {
      s1 = "五轮收益相同，每轮都是 " + bestPct + "。";
      s2 = "没有单独拉开的一轮，第 1 轮到第 5 轮打平。";
    }
  } else if (en) {
    s1 = "Your best round was round " + bestNo + " (" + best.date.en + "), at " + bestPct + ".";
    s2 = (bps[worstI] >= 0 ? "Your weakest round" : "Your worst round") +
      " was round " + worstNo + " (" + worst.date.en + "), at " + worstPct + ".";
  } else {
    s1 = "最好的一轮是第 " + bestNo + " 轮（" + best.date.zh + "），这一轮收益 " + bestPct + "。";
    s2 = (bps[worstI] >= 0 ? "最弱的一轮" : "最痛的一轮") +
      "是第 " + worstNo + " 轮（" + worst.date.zh + "），这一轮收益 " + worstPct + "。";
  }
  if (en) s3 = "Five rounds add up to " + you + ", " + compareTail(totalBp, "en") + ".";
  else s3 = "五轮累计 " + you + "，" + compareTail(totalBp, "zh") + "。";
  return [s1, s2, s3];
}

function shareText(allocs, lang) {
  var en = lang === "en";
  var bps = finishedBp(allocs);
  var totalBp = null;
  if (bps) {
    totalBp = 0;
    var i;
    for (i = 0; i < bps.length; i++) totalBp += bps[i];
  }
  var totalLabel = totalBp == null ? "—" : formatBp(totalBp);
  var g = totalBp == null ? "C" : grade(totalBp / 100);
  var bLabel = formatPct(benchmark6040().total);
  var cLabel = formatPct(benchmarkCash().total);
  if (en) {
    return [
      "ROTATE-050 · Stock-bond roulette",
      "Grade " + g + " · cumulative " + totalLabel,
      "You " + totalLabel + " · 60/40 " + bLabel + " · all cash " + cLabel,
      PAGE_URL,
      DISCLAIMER.en,
    ].join("\n");
  }
  return [
    "ROTATE-050 · 股债轮盘",
    "评级 " + g + " · 累计收益 " + totalLabel,
    "你 " + totalLabel + " · 60/40 " + bLabel + " · 全现金 " + cLabel,
    PAGE_URL,
    DISCLAIMER.zh,
  ].join("\n");
}

function asPctInt(n) {
  var x = Number(n);
  if (!Number.isFinite(x)) return 0;
  var r = Math.round(x);
  if (r < 0) return 0;
  if (r > 100) return 100;
  return r;
}

function fillCash(alloc) {
  var src = alloc && typeof alloc === "object" ? alloc : {};
  var stock = asPctInt(src.stock);
  var bond = asPctInt(src.bond);
  var sum = stock + bond;
  if (sum > 100) {
    var sExact = (stock * 100) / sum;
    var bExact = (bond * 100) / sum;
    var s = Math.floor(sExact);
    var b = Math.floor(bExact);
    var rem = 100 - s - b;
    if (rem > 0) {
      if (sExact - s >= bExact - b) s += rem;
      else b += rem;
    }
    stock = s;
    bond = b;
  }
  return { stock: stock, bond: bond, cash: 100 - stock - bond };
}

function evenSplit() {
  return { stock: 34, bond: 33, cash: 33 };
}

var API = {
  PAGE_URL: PAGE_URL,
  DISCLAIMER: DISCLAIMER,
  ROUNDS: ROUNDS,
  THRESHOLDS: THRESHOLDS,
  BENCHMARKS: BENCHMARKS,
  validateAllocation: validateAllocation,
  roundReturn: roundReturn,
  totalReturn: totalReturn,
  cumulativeSeries: cumulativeSeries,
  benchmark6040: benchmark6040,
  benchmarkCash: benchmarkCash,
  grade: grade,
  recap: recap,
  shareText: shareText,
  fillCash: fillCash,
  evenSplit: evenSplit,
  formatPct: formatPct,
  formatBp: formatBp,
};

if (typeof module !== "undefined" && module.exports) module.exports = API;
if (typeof window !== "undefined") window.RotateEngine = API;
