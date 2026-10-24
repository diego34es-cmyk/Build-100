/**
 * CBWEEK-058 · Central Bank Super Week (no DOM).
 * Baked bets, countdown, scenarios. Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/058/";
  var AS_OF = "2026-10-24";

  var META = { asOf: AS_OF };

  var DISCLAIMER = {
    zh: "方向性示意，非预测，不构成投资建议",
    en: "Directional illustration only. Not a forecast. Not investment advice."
  };

  var EVENTS = [
    {
      id: "fomc",
      name: { zh: "美联储 FOMC", en: "Federal Reserve FOMC" },
      dateLabel: "10-27–28",
      anchor: "2026-10-28T18:00:00Z",
      precise: true
    },
    {
      id: "ecb",
      name: { zh: "欧洲央行 ECB", en: "European Central Bank ECB" },
      dateLabel: "10-29",
      anchor: "2026-10-29",
      precise: false
    },
    {
      id: "boj",
      name: { zh: "日本央行 BOJ", en: "Bank of Japan BOJ" },
      dateLabel: "10-30",
      anchor: "2026-10-30",
      precise: false
    }
  ];

  var ASSETS = {
    usd: { zh: "美元", en: "USD" },
    jpy: { zh: "日元", en: "JPY" },
    eur: { zh: "欧元", en: "EUR" },
    gold: { zh: "黄金", en: "Gold" },
    stocks: { zh: "美股", en: "US stocks" }
  };

  var ASSET_ORDER = ["usd", "jpy", "eur", "gold", "stocks"];

  var BETS = {
    fomc: {
      sources: [
        { id: "kalshi", hold: "91–92.5%", hike: "7.5–8%", note: "10-23/24" },
        { id: "polymarket", hold: 93.5, hike: 6.5 },
        { id: "cme", hold: 92, hike: 8 }
      ],
      bar: { hold: 92, hike: 8 },
      rate: "3.75%–4.00%",
      dec: { kalshiHike: 68 },
      points: [
        {
          zh: "当前联邦基金利率 3.75%–4.00%（9 月加息，三年来首次加息）。截至 2026-10-24。",
          en: "Federal funds rate 3.75%–4.00% (September hike, first in three years). As of 2026-10-24."
        },
        {
          zh: "12 月 FOMC（12-08/09）：Kalshi 隐含再加息 25bp 概率 68%。截至 2026-10-24。",
          en: "December FOMC (12-08/09): Kalshi implied odds of another 25bp hike, 68%. As of 2026-10-24."
        },
        {
          zh: "9 月 CPI 3.7% 同比（预期 3.6%），核心 2.6%，10-14 公布。截至 2026-10-24。",
          en: "September CPI 3.7% year-over-year (expected 3.6%), core 2.6%, released 10-14. As of 2026-10-24."
        }
      ],
      watch: {
        zh: "市场在看声明会否按兵不动却放鹰，以及 12 月路径怎么写。",
        en: "Markets are watching whether the statement holds but sounds hawkish, and how the December path is written."
      }
    },
    ecb: {
      hike: 3,
      points: [
        {
          zh: "10-29 会议，市场定价加息 25bp 概率约 3%。截至 2026-10-24。",
          en: "Oct 29 meeting: markets price about a 3% chance of a 25bp hike. As of 2026-10-24."
        },
        {
          zh: "与美联储、日本央行同处这一周议息。",
          en: "Meets in the same week as the Fed and the Bank of Japan."
        },
        {
          zh: "降息概率未单列。",
          en: "A cut is not listed separately."
        }
      ],
      watch: {
        zh: "市场在看欧央行会否继续按兵不动，法国国债收益率已处 24 年新高。",
        en: "Markets are watching whether the ECB stays on hold, with French government bond yields at a 24-year high."
      }
    },
    boj: {
      hike: 2,
      dec18Hike: 76,
      points: [
        {
          zh: "10-30 加息概率约 2%。截至 2026-10-24。",
          en: "Oct 30 hike odds about 2%. As of 2026-10-24."
        },
        {
          zh: "12-18 会议加息概率约 76%。截至 2026-10-24。",
          en: "Dec 18 meeting hike odds about 76%. As of 2026-10-24."
        },
        {
          zh: "降息概率未单列。",
          en: "A cut is not listed separately."
        }
      ],
      watch: {
        zh: "市场在看 10 月会否按兵不动，以及 12 月加息是否被坐实。",
        en: "Markets are watching whether October stays on hold, and whether a December hike is treated as locked in."
      }
    }
  };

  var SCENARIOS = [
    {
      id: "A",
      title: { zh: "全部按兵不动但放鹰", en: "All hold, but hawkish" },
      desc: {
        zh: "三家都按兵不动，但美联储声明偏鹰。美元偏强，风险资产承压。",
        en: "All three stay on hold, but the Fed statement sounds hawkish. The dollar firms; risk assets come under pressure."
      },
      moves: { usd: "up", jpy: "down", eur: "down", gold: "down", stocks: "down" },
      why: {
        usd: {
          zh: "按兵不动却放鹰，美元利率路径仍偏紧。",
          en: "A hawkish hold keeps the dollar's rate path tight."
        },
        jpy: {
          zh: "美日利差预期维持，日元承压。",
          en: "The rate gap versus the US stays wide, so the yen stays under pressure."
        },
        eur: {
          zh: "欧央行更可能按兵不动，欧元相对美元偏弱。",
          en: "A likely on-hold ECB leaves the euro soft against a firmer dollar."
        },
        gold: {
          zh: "利率路径偏紧，黄金作为无息资产承压。",
          en: "A tighter rate path weighs on gold as a non-yielding asset."
        },
        stocks: {
          zh: "鹰派措辞收紧金融条件，美股偏跌。",
          en: "Hawkish language tightens financial conditions, so US stocks ease."
        }
      }
    },
    {
      id: "B",
      title: { zh: "Fed 意外加息 25bp", en: "Fed surprise 25bp hike" },
      desc: {
        zh: "美联储意外加息 25bp。方向与情景 A 相同，但冲击更大、定价重写更剧烈。",
        en: "The Fed surprises with a 25bp hike. Same directions as scenario A, but the shock is larger and the repricing is more violent."
      },
      tag: { zh: "冲击更大", en: "Larger shock" },
      moves: { usd: "up", jpy: "down", eur: "down", gold: "down", stocks: "down" },
      why: {
        usd: {
          zh: "意外加息立刻重定价，美元升值比情景 A 更剧烈。",
          en: "A surprise hike reprices at once; the dollar rally is more violent than in A."
        },
        jpy: {
          zh: "意外加息拉大利差，日元跌得更重。",
          en: "A surprise hike widens the rate gap and hits the yen harder."
        },
        eur: {
          zh: "美元突然走强，欧元跟跌更明显。",
          en: "A sudden dollar jump pulls the euro lower more clearly."
        },
        gold: {
          zh: "意外收紧打击无息资产，黄金跌幅大于按兵不动。",
          en: "A surprise tightening hits non-yielding gold harder than a hawkish hold."
        },
        stocks: {
          zh: "政策比定价更紧，美股冲击大于情景 A。",
          en: "Policy is tighter than priced, so US stocks take a larger hit than in A."
        }
      }
    },
    {
      id: "C",
      title: { zh: "BOJ 转鹰（12 月加息坐实）", en: "BOJ turns hawkish (December hike locked in)" },
      desc: {
        zh: "日本央行转鹰，12 月加息被坐实。日元偏强，美元回落，欧元与黄金方向不明，美股偏跌。",
        en: "The Bank of Japan turns hawkish and a December hike is locked in. The yen firms, the dollar eases, euro and gold have no clear direction, US stocks soften."
      },
      moves: { usd: "down", jpy: "up", eur: "flat", gold: "flat", stocks: "down" },
      why: {
        usd: {
          zh: "日本央行转鹰推高日元，美元相对回落。",
          en: "A hawkish BOJ lifts the yen and takes some shine off the dollar."
        },
        jpy: {
          zh: "12 月加息被坐实，日元偏涨。",
          en: "Locking in a December hike supports the yen."
        },
        eur: {
          zh: "主要冲击在美元与日元，欧元没有清晰单向。",
          en: "The main impulse is in the dollar-yen pair; the euro has no clear one-way push."
        },
        gold: {
          zh: "对黄金没有清晰单向推动。",
          en: "There is no clear one-way push for gold."
        },
        stocks: {
          zh: "全球条件边际收紧，美股偏跌。",
          en: "Global conditions tighten at the margin, so US stocks ease."
        }
      }
    }
  ];

  var PREP = [
    {
      id: "leverage",
      zh: "检查杠杆：决议前后波动可能放大，先看清自己的杠杆。",
      en: "Check your leverage. Moves around a decision can stretch. Know your exposure first."
    },
    {
      id: "night",
      zh: "决议夜别重仓：声明落地前，避免把仓位堆在单一方向。",
      en: "Do not sit heavy on decision night. Avoid loading one direction before the statement."
    },
    {
      id: "december",
      zh: "记好 12 月押注：Fed 12 月加息 68%（Kalshi），BOJ 12-18 加息 76%。截至 2026-10-24。本周不是终点。",
      en: "Mark the December bets: Fed December hike 68% (Kalshi), BOJ hike on 12-18 at 76%. As of 2026-10-24. This week is not the end."
    }
  ];

  function asMs(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.trim();
      if (!s) return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function countdown(nowMs, targetMs) {
    try {
      var now = asMs(nowMs);
      var target = asMs(targetMs);
      if (now == null || target == null) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
      var diff = target - now;
      if (!(diff > 0)) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
      var days = Math.floor(diff / 86400000);
      diff -= days * 86400000;
      var hours = Math.floor(diff / 3600000);
      diff -= hours * 3600000;
      var minutes = Math.floor(diff / 60000);
      diff -= minutes * 60000;
      var seconds = Math.floor(diff / 1000);
      return { days: days, hours: hours, minutes: minutes, seconds: seconds, past: false };
    } catch (e) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
    }
  }

  function parseStamp(isoUtc) {
    if (isoUtc == null) return null;
    var raw = String(isoUtc).trim();
    if (!raw) return null;
    var d = new Date(raw);
    if (isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      d = new Date(raw + "T00:00:00Z");
    }
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function fmtLocal(isoUtc, timeZone, lang) {
    try {
      var d = parseStamp(isoUtc);
      if (!d) return "";
      var locale = lang === "en" ? "en-US" : "zh-CN";
      var opts = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short"
      };
      var tz = typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "";
      if (tz) opts.timeZone = tz;
      try {
        if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
          return new Intl.DateTimeFormat(locale, opts).format(d);
        }
      } catch (e) {
        try {
          if (opts.timeZone) delete opts.timeZone;
          if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
            return new Intl.DateTimeFormat(locale, opts).format(d);
          }
        } catch (e2) {}
      }
      try {
        return d.toLocaleString(locale, tz ? { timeZone: tz } : undefined);
      } catch (e3) {
        return d.toLocaleString();
      }
    } catch (e) {
      try {
        var fallback = parseStamp(isoUtc);
        return fallback ? fallback.toLocaleString() : "";
      } catch (e2) {
        return "";
      }
    }
  }

  function arrow(move) {
    if (move === "up") return "\u2191";
    if (move === "down") return "\u2193";
    return "\u2192";
  }

  function moveLabel(move) {
    if (move === "up") return { zh: "偏涨", en: "Up" };
    if (move === "down") return { zh: "偏跌", en: "Down" };
    return { zh: "持平/不明", en: "Flat/unclear" };
  }

  function findScenario(id) {
    var i;
    for (i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    }
    return null;
  }

  function shareText(lang, scenarioId) {
    try {
      var en = lang === "en";
      var lines = [];
      lines.push(
        en
          ? "Central Bank Super Week: what markets are betting on the Fed, ECB & BOJ"
          : "央行超级周：Fed / ECB / BOJ 一页看清市场押注"
      );
      var sc = findScenario(scenarioId);
      if (sc) {
        lines.push(en ? "Scenario " + sc.id + ": " + sc.title.en : "情景 " + sc.id + "：" + sc.title.zh);
      }
      lines.push(en ? "As of 2026-10-24" : "截至 2026-10-24");
      lines.push(SHARE_URL);
      return lines.join("\n");
    } catch (e) {
      return SHARE_URL;
    }
  }

  var API = {
    META: META,
    EVENTS: EVENTS,
    BETS: BETS,
    SCENARIOS: SCENARIOS,
    ASSETS: ASSETS,
    ASSET_ORDER: ASSET_ORDER,
    DISCLAIMER: DISCLAIMER,
    PREP: PREP,
    countdown: countdown,
    fmtLocal: fmtLocal,
    arrow: arrow,
    moveLabel: moveLabel,
    shareText: shareText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.CbEngine = API;
})();
