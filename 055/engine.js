/**
 * CAPEX-055 · AI burn class (no DOM).
 * Capex intensity, FCF, interest coverage, credit spread. Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/055/";
  var DEFAULT_BENCH = 4;

  var META = { asOf: "2026-10-22" };

  var DISCLAIMER = {
    zh: "教学演示，不构成投资建议。",
    en: "Teaching demo, not investment advice."
  };

  var THRESHOLD_NOTE = {
    zh: "经验口径，非硬规则",
    en: "Rules of thumb, not hard cutoffs"
  };

  var COMPANIES = [
    {
      id: "a",
      name: { zh: "云巨头 A", en: "Hyperscaler A" },
      portrait: { zh: "现金牛重投入", en: "Cash cow, heavy spend" },
      revenue: 100,
      capex: 28,
      ocf: 42,
      cash: 50,
      ebit: 35,
      interest: 4
    },
    {
      id: "b",
      name: { zh: "算力租赁商 B", en: "GPU lessor B" },
      portrait: { zh: "高杠杆烧钱", en: "High-leverage burn" },
      revenue: 20,
      capex: 12,
      ocf: 3,
      cash: 18,
      ebit: 2,
      interest: 4
    },
    {
      id: "c",
      name: { zh: "老牌软件商 C", en: "Legacy software C" },
      portrait: { zh: "中间档", en: "Middle of the pack" },
      revenue: 40,
      capex: 4,
      ocf: 14,
      cash: 22,
      ebit: 10,
      interest: 3
    }
  ];

  var BONDS = [
    {
      id: "coreweave",
      label: { zh: "CoreWeave · 存量债券到期收益率", en: "CoreWeave · existing bonds, yield to maturity" },
      display: { zh: "约 15%", en: "~15%" },
      yield: 15,
      source: "news"
    },
    {
      id: "oracle",
      label: { zh: "甲骨文 · 10–12 年期债券", en: "Oracle · 10–12 year bonds" },
      display: { zh: "约 8–8.5%", en: "~8–8.5%" },
      yield: 8.5,
      source: "news"
    }
  ];

  var QUIZ = [
    {
      id: "cow",
      snapshot: { capex: 22, revenue: 100, ocf: 40, cash: 45, ebit: 30, interest: 5, bondYield: 5.5 },
      answer: "ok",
      explain: {
        zh: "这份快照像现金牛在加码建设：资本开支偏重但还没到极重，自由现金流为正，利息覆盖是绿灯，发债利差也在投资级感区间。四盏灯里没有红灯，判撑得住。",
        en: "A cash-cow builder: capex is heavy but not extreme, free cash flow is positive, interest coverage is green, and the credit spread still feels investment-grade. No red lights, so it holds up."
      }
    },
    {
      id: "burn",
      snapshot: { capex: 48, revenue: 90, ocf: 20, cash: 42, ebit: 12, interest: 2, bondYield: 5.8 },
      answer: "danger",
      explain: {
        zh: "资本开支强度已是极重，经营现金流盖不住资本开支，自由现金流为负。两盏红灯：一边在猛建，一边在烧现金。类似高杠杆算力租赁商的画像，判危险。",
        en: "Capex intensity is already extreme, operating cash cannot cover capex, and free cash flow is negative. Two red lights: building hard and burning cash. A high-leverage GPU-lessor portrait. Danger."
      }
    },
    {
      id: "spread",
      snapshot: { capex: 40, revenue: 100, ocf: 50, cash: 70, ebit: 22, interest: 4, bondYield: 11 },
      answer: "danger",
      explain: {
        zh: "资本开支极重，同时债券收益率把信用利差推到困境感。即便自由现金流暂时为正，两盏红灯已经亮了——市场在用利率告诉你：钱很贵。",
        en: "Capex is extreme, and the bond yield pushes the credit spread into distress. Free cash flow can still be positive and you still get two red lights — the market is saying money is expensive."
      }
    },
    {
      id: "one-red",
      snapshot: { capex: 38, revenue: 100, ocf: 52, cash: 80, ebit: 28, interest: 4, bondYield: 5.2 },
      answer: "ok",
      explain: {
        zh: "资本开支是极重，但这是现金牛：经营现金流仍高于资本开支，利息覆盖是绿灯，利差也还在投资级感。按本课规则，一盏红灯仍判撑得住。极重投入不等于立刻缺钱。",
        en: "Capex is extreme, but this is a cash cow: operating cash still tops capex, coverage is green, and the spread still feels investment-grade. One red light still grades as ok. Extreme spend is not the same as being short on cash today."
      }
    },
    {
      id: "cover",
      snapshot: { capex: 30, revenue: 120, ocf: 18, cash: 24, ebit: 4, interest: 5, bondYield: 5.6 },
      answer: "danger",
      explain: {
        zh: "资本开支只是「重」还没到极重，但自由现金流已经为负，利息覆盖掉进红灯。一边烧现金，一边利润盖不住利息，两盏红灯，判危险。",
        en: "Capex is only heavy, not extreme, but free cash flow is already negative and interest coverage is red. Burning cash while profit cannot cover interest: two red lights. Danger."
      }
    },
    {
      id: "coupon",
      snapshot: { capex: 12, revenue: 80, ocf: 22, cash: 30, ebit: 3, interest: 3, bondYield: 10.5 },
      answer: "danger",
      explain: {
        zh: "资本开支并不极端，但利息覆盖是红灯，发债利差是困境感。债在变贵、利润几乎盖不住利息——这是「缺钱」而不是「在建设」。两盏红灯，判危险。",
        en: "Capex is not extreme, but interest coverage is red and the credit spread is distress. Debt is getting expensive and profit barely covers interest — this is being short on cash, not building. Two red lights. Danger."
      }
    }
  ];

  var RANKS = [
    { min: 0, max: 1, zh: "看热闹学员", en: "Sideline student" },
    { min: 2, max: 3, zh: "能闻烟味", en: "Smells the smoke" },
    { min: 4, max: 5, zh: "会读红绿灯", en: "Reads the lights" },
    { min: 6, max: 6, zh: "财报法医", en: "Earnings forensic" }
  ];

  function toNum(v) {
    if (typeof v === "number") {
      if (v === Infinity || v === -Infinity) return v;
      return isFinite(v) ? v : null;
    }
    if (typeof v === "string") {
      var s = v.trim();
      if (!s) return null;
      if (s === "Infinity") return Infinity;
      if (s === "-Infinity") return -Infinity;
      var n = Number(s.replace(/,/g, ""));
      if (n === Infinity || n === -Infinity) return n;
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function capexIntensity(capex, revenue) {
    try {
      var c = toNum(capex);
      var r = toNum(revenue);
      if (c == null || r == null) return null;
      if (r === 0) {
        if (c === 0) return 0;
        return c > 0 ? Infinity : -Infinity;
      }
      return c / r;
    } catch (e) {
      return null;
    }
  }

  function intensityBand(ratio) {
    try {
      var x = toNum(ratio);
      if (x == null) return "light";
      if (x >= 0.35) return "extreme";
      if (x >= 0.15) return "heavy";
      return "light";
    } catch (e) {
      return "light";
    }
  }

  function fcf(operatingCashFlow, capex) {
    try {
      var o = toNum(operatingCashFlow);
      var c = toNum(capex);
      if (o == null || c == null) return null;
      return o - c;
    } catch (e) {
      return null;
    }
  }

  function runwayQuarters(cash, quarterlyBurn) {
    try {
      var k = toNum(cash);
      var b = toNum(quarterlyBurn);
      if (k == null || b == null) return null;
      if (b <= 0) return Infinity;
      return k / b;
    } catch (e) {
      return null;
    }
  }

  function interestCoverage(ebit, interest) {
    try {
      var e = toNum(ebit);
      var i = toNum(interest);
      if (e == null || i == null) return null;
      if (i <= 0) return Infinity;
      return e / i;
    } catch (e) {
      return null;
    }
  }

  function coverageLight(x) {
    try {
      var n = toNum(x);
      if (n == null) return "red";
      if (n >= 5) return "green";
      if (n >= 1.5) return "yellow";
      return "red";
    } catch (e) {
      return "red";
    }
  }

  function spread(yieldPct, benchmarkPct) {
    try {
      var y = toNum(yieldPct);
      var b = toNum(benchmarkPct);
      if (y == null || b == null) return null;
      return y - b;
    } catch (e) {
      return null;
    }
  }

  function spreadBand(pp) {
    try {
      var n = toNum(pp);
      if (n == null) return "ig";
      if (n >= 5) return "distress";
      if (n >= 2) return "elevated";
      return "ig";
    } catch (e) {
      return "ig";
    }
  }

  function flags(snapshot) {
    var s = snapshot && typeof snapshot === "object" ? snapshot : {};
    var intensity = intensityBand(capexIntensity(s.capex, s.revenue));
    var cashFlow = fcf(s.ocf, s.capex);
    var coverage = coverageLight(interestCoverage(s.ebit, s.interest));
    var sp = spreadBand(spread(s.bondYield, DEFAULT_BENCH));
    var reds = 0;
    if (intensity === "extreme") reds += 1;
    if (typeof cashFlow === "number" && cashFlow < 0) reds += 1;
    if (coverage === "red") reds += 1;
    if (sp === "distress") reds += 1;
    return {
      intensity: intensity,
      fcf: cashFlow,
      coverage: coverage,
      spread: sp,
      reds: reds
    };
  }

  function verdict(snapshot) {
    try {
      return flags(snapshot).reds >= 2 ? "danger" : "ok";
    } catch (e) {
      return "ok";
    }
  }

  function gradeQuiz(answers) {
    try {
      var list = Array.isArray(answers) ? answers : [];
      var correct = 0;
      var i;
      for (i = 0; i < QUIZ.length; i++) {
        if (list[i] === QUIZ[i].answer) correct += 1;
      }
      return { correct: correct, total: QUIZ.length };
    } catch (e) {
      return { correct: 0, total: QUIZ.length };
    }
  }

  function asCount(n) {
    if (typeof n === "number" && isFinite(n)) {
      return Math.max(0, Math.min(QUIZ.length, Math.round(n)));
    }
    if (typeof n === "string") {
      var s = n.trim();
      if (!s) return null;
      var x = Number(s);
      if (isFinite(x)) return Math.max(0, Math.min(QUIZ.length, Math.round(x)));
    }
    return null;
  }

  function rank(correct) {
    try {
      var n = asCount(correct);
      if (n == null) n = 0;
      var i;
      for (i = 0; i < RANKS.length; i++) {
        if (n >= RANKS[i].min && n <= RANKS[i].max) {
          return { zh: RANKS[i].zh, en: RANKS[i].en };
        }
      }
      return { zh: RANKS[0].zh, en: RANKS[0].en };
    } catch (e) {
      return { zh: "看热闹学员", en: "Sideline student" };
    }
  }

  function shareText(lang, correct) {
    try {
      var en = lang === "en";
      var n = asCount(correct);
      var finished = n != null && arguments.length >= 2 && correct != null && correct !== "";
      var lines;
      if (!finished) {
        if (en) {
          lines = [
            "CAPEX-055 · AI burn class",
            "Come see if you can read an earnings print",
            SHARE_URL
          ];
        } else {
          lines = [
            "CAPEX-055 · AI烧钱课",
            "来测测你会不会读财报",
            SHARE_URL
          ];
        }
      } else {
        var rk = rank(n);
        if (en) {
          lines = [
            "CAPEX-055 · AI burn class",
            rk.en,
            "Correct " + n + " / 6",
            SHARE_URL
          ];
        } else {
          lines = [
            "CAPEX-055 · AI烧钱课",
            rk.zh,
            "答对 " + n + " / 6",
            SHARE_URL
          ];
        }
      }
      return lines.join("\n");
    } catch (e) {
      return lang === "en"
        ? "Come see if you can read an earnings print\n" + SHARE_URL
        : "来测测你会不会读财报\n" + SHARE_URL;
    }
  }

  var API = {
    META: META,
    DISCLAIMER: DISCLAIMER,
    THRESHOLD_NOTE: THRESHOLD_NOTE,
    DEFAULT_BENCH: DEFAULT_BENCH,
    COMPANIES: COMPANIES,
    BONDS: BONDS,
    QUIZ: QUIZ,
    RANKS: RANKS,
    capexIntensity: capexIntensity,
    intensityBand: intensityBand,
    fcf: fcf,
    runwayQuarters: runwayQuarters,
    interestCoverage: interestCoverage,
    coverageLight: coverageLight,
    spread: spread,
    spreadBand: spreadBand,
    flags: flags,
    verdict: verdict,
    gradeQuiz: gradeQuiz,
    rank: rank,
    shareText: shareText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.CapexEngine = API;
})();
