/**
 * CRASH-051 · crash-eve lesson (no DOM).
 * Lights follow published comparisons. Grey means we do not fill a number.
 * Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/051/";
  var DISCLAIMER = {
    zh: "学习内容，非投资建议；信号灯是与历史的定性对比，不是崩盘预测",
    en: "Educational content, not investment advice. Lights are qualitative comparisons with history, not crash predictions."
  };

  var META = {
    asOf: "2026-10-14",
    window: {
      zh: "2026-10-12 至 2026-10-14 前后",
      en: "around Oct 12–14, 2026"
    }
  };

  var LIGHTS = {
    red: {
      zh: "红",
      en: "Red",
      rel: { zh: "今天更极端", en: "Today more extreme" },
      meaning: {
        zh: "今天更极端：报道写明创历史新高、创纪录，或已超过该次前夜",
        en: "Today is more extreme: the report says a record high, a record, or a level above that eve"
      }
    },
    yellow: {
      zh: "黄",
      en: "Yellow",
      rel: { zh: "相近", en: "Similar" },
      meaning: {
        zh: "偏高或相近。比较窗口不是三次前夜，或只有定性描述",
        en: "Elevated or similar. The window is not the three eves, or the reading is qualitative only"
      }
    },
    green: {
      zh: "绿",
      en: "Green",
      rel: { zh: "今天较低", en: "Today lower" },
      meaning: {
        zh: "今天低于该时期。本页只用于对照 2009–2010 危机后，不是前夜",
        en: "Today is lower than that period. Here it only compares with 2009–2010 after the crisis, not the eve"
      }
    },
    grey: {
      zh: "灰",
      en: "Grey",
      rel: { zh: "不比较", en: "Not compared" },
      meaning: {
        zh: "没有同口径数字，或当时还不存在。不比较",
        en: "No like-for-like figure, or it did not exist yet. Not compared"
      }
    }
  };

  var GREY_TEXT = {
    zh: "无同口径数字，不比较",
    en: "No like-for-like figure. Not compared"
  };

  var NO_ETF = {
    zh: "当时还没有杠杆 ETF（美国首批约 2006 年推出），不比较",
    en: "Leveraged ETFs did not exist yet (the first US ones launched around 2006). Not compared"
  };

  var BELOW_TODAY_HIGH = {
    zh: "低于今天。今天为历史新高",
    en: "Below today. Today is a record high"
  };

  var BELOW_TODAY_EVE = {
    zh: "低于今天。报道称今天已超过该次前夜",
    en: "Below today. Reports say today is already above that eve"
  };

  var SIGNALS = [
    {
      id: "negbeta",
      name: { zh: "负 beta 股票数量", en: "Negative-beta stock count" },
      short: { zh: "负 beta", en: "Neg. beta" },
      today: {
        text: {
          zh: "标普 500 负 beta 股票数量创历史新高",
          en: "The number of negative-beta stocks in the S&P 500 is at a record high"
        },
        precision: "qualitative",
        source: { zh: "财经报道", en: "Financial press" },
        date: "2026-10-14"
      },
      light: "red",
      ref: { zh: "三次前夜都低于今天", en: "All three eves were below today" },
      crises: {
        "1987": { light: "red", text: BELOW_TODAY_HIGH },
        "2000": { light: "red", text: BELOW_TODAY_HIGH },
        "2008": { light: "red", text: BELOW_TODAY_HIGH }
      }
    },
    {
      id: "valuation",
      name: { zh: "估值杠杆与仓位", en: "Valuation, leverage, and positioning" },
      short: { zh: "估值杠杆", en: "Valuation" },
      today: {
        text: {
          zh: "已超过 1987、2000、2008 三次危机前的水平",
          en: "Already above the levels before the 1987, 2000, and 2008 crises"
        },
        precision: "qualitative",
        source: { zh: "财经报道", en: "Financial press" },
        date: "2026-10-14"
      },
      light: "red",
      ref: { zh: "三次前夜都低于今天", en: "All three eves were below today" },
      crises: {
        "1987": { light: "red", text: BELOW_TODAY_EVE },
        "2000": { light: "red", text: BELOW_TODAY_EVE },
        "2008": { light: "red", text: BELOW_TODAY_EVE }
      }
    },
    {
      id: "levetf",
      name: { zh: "杠杆 ETF 发行占比", en: "Leveraged-ETF issuance share" },
      short: { zh: "杠杆 ETF", en: "Lev. ETFs" },
      today: {
        text: { zh: "发行占比创纪录", en: "The issuance share is at a record" },
        precision: "qualitative",
        source: { zh: "财经报道", en: "Financial press" },
        date: "2026-10-14"
      },
      light: "red",
      ref: {
        zh: "1987 与 2000 不比较；2008 已出现，但低于今天",
        en: "1987 and 2000 are not compared; by 2008 it existed, but below today"
      },
      crises: {
        "1987": { light: "grey", text: NO_ETF },
        "2000": { light: "grey", text: NO_ETF },
        "2008": {
          light: "red",
          text: {
            zh: "已出现，但发行占比低于今天。今天创纪录",
            en: "It already existed, but the issuance share was below today. Today is a record"
          }
        }
      }
    },
    {
      id: "cash",
      name: { zh: "散户现金仓位", en: "Retail cash allocation" },
      short: { zh: "现金仓位", en: "Cash" },
      today: {
        text: {
          zh: "AAII 9 月调查现金 13.3%，9 年新低（9 年均值 22.5%）",
          en: "AAII September survey: cash 13.3%, a 9-year low (9-year average 22.5%)"
        },
        precision: "exact",
        source: { zh: "AAII 2026 年 9 月调查", en: "AAII September 2026 survey" },
        date: "2026-09"
      },
      light: "yellow",
      ref: {
        zh: "三次前夜都无同口径数字，不比较",
        en: "No like-for-like figure for any of the three eves. Not compared"
      },
      crises: {
        "1987": { light: "grey", text: GREY_TEXT },
        "2000": { light: "grey", text: GREY_TEXT },
        "2008": { light: "grey", text: GREY_TEXT }
      }
    },
    {
      id: "delinq",
      name: { zh: "家庭逾期债务比例", en: "Household delinquent-debt share" },
      short: { zh: "家庭逾期", en: "Delinquency" },
      today: {
        text: {
          zh: "升至 2010 年以来最高。美国最大批发抵押贷款机构 UWM 股价创历史收盘新低，连续第九个月下跌",
          en: "Rose to the highest since 2010. UWM, the largest US wholesale mortgage lender, closed at a record low and fell for a ninth straight month"
        },
        precision: "qualitative",
        source: { zh: "财经报道", en: "Financial press" },
        date: "2026-10-12"
      },
      light: "yellow",
      ref: {
        zh: "1987 与 2000 不比较；相对 2009–2010，今天较低",
        en: "1987 and 2000 are not compared; versus 2009–2010, today is lower"
      },
      crises: {
        "1987": { light: "grey", text: GREY_TEXT },
        "2000": { light: "grey", text: GREY_TEXT },
        "2008": {
          light: "green",
          text: {
            zh: "危机后的 2009–2010 年高于今天。今天是 2010 年以来最高。2007 前夜无同口径数字",
            en: "2009–2010, after the crisis, was higher than today. Today is the highest since 2010. The 2007 eve has no like-for-like figure"
          }
        }
      }
    },
    {
      id: "concentration",
      name: { zh: "集中度", en: "Concentration" },
      short: { zh: "集中度", en: "Concentration" },
      today: {
        text: {
          zh: "AI 股票贡献了标普 500 绝大部分涨幅。Apple 市值达 5 万亿美元",
          en: "AI stocks accounted for most of the S&P 500's gain. Apple's market value reached $5 trillion"
        },
        precision: "qualitative",
        source: { zh: "财经报道", en: "Financial press" },
        date: "2026-10-12 / 2026-10-14"
      },
      light: "yellow",
      ref: {
        zh: "与 2000 前夜相近；1987 与 2008 不比较",
        en: "Similar to the 2000 eve; 1987 and 2008 are not compared"
      },
      crises: {
        "1987": { light: "grey", text: GREY_TEXT },
        "2000": {
          light: "yellow",
          text: {
            zh: "当年同样高度集中于科技与互联网股，与今天相近",
            en: "That year was also highly concentrated in technology and internet stocks, similar to today"
          }
        },
        "2008": { light: "grey", text: GREY_TEXT }
      }
    }
  ];

  var CRISES = [
    {
      year: "1987",
      name: { zh: "黑色星期一", en: "Black Monday" },
      date: "1987-10-19",
      what: {
        zh: "1987-10-19，道琼斯工业指数单日下跌 22.6%，至今仍是最大单日百分比跌幅。「投资组合保险」等程序化卖出在下跌中自动加码，放大了踩踏。",
        en: "On 1987-10-19 the Dow Jones Industrial Average fell 22.6% in one day, still the largest one-day percentage drop. Programmatic selling such as portfolio insurance automatically added to the decline and amplified the stampede."
      },
      facts: [
        { zh: "道指单日下跌 22.6%", en: "The Dow fell 22.6% in one day" },
        { zh: "至今仍是最大单日百分比跌幅", en: "Still the largest one-day percentage drop" }
      ],
      eveSignals: ["negbeta", "valuation", "levetf"]
    },
    {
      year: "2000",
      name: { zh: "互联网泡沫", en: "Dot-com bubble" },
      date: "2000-03-10",
      what: {
        zh: "纳斯达克在 2000-03-10 见顶，报 5,048.62。到 2002 年 10 月的低点，累计下跌约 78%。大量没有盈利的互联网公司，估值归零。",
        en: "The Nasdaq peaked on 2000-03-10 at 5,048.62. By the October 2002 low it had fallen about 78%. Many internet companies with no profits saw their valuations go to zero."
      },
      facts: [
        { zh: "见顶 5,048.62", en: "Peak at 5,048.62" },
        { zh: "到 2002 年 10 月低点累计下跌约 78%", en: "About 78% down by the October 2002 low" }
      ],
      eveSignals: ["valuation", "concentration", "levetf"]
    },
    {
      year: "2008",
      name: { zh: "金融危机", en: "Global Financial Crisis" },
      date: "2008-09-15",
      what: {
        zh: "次贷违约蔓延，2008-09-15 雷曼兄弟破产。标普 500 从 2007 年 10 月高点到 2009 年 3 月低点，下跌约 57%。",
        en: "Subprime defaults spread, and Lehman Brothers failed on 2008-09-15. The S&P 500 fell about 57% from the October 2007 high to the March 2009 low."
      },
      facts: [
        { zh: "2008-09-15 雷曼兄弟破产", en: "Lehman Brothers failed on 2008-09-15" },
        { zh: "高点到低点下跌约 57%", en: "About 57% from the high to the low" }
      ],
      eveSignals: ["valuation", "delinq", "levetf"]
    }
  ];

  var QUESTIONS = [
    {
      id: "q1",
      q: { zh: "负 beta 是什么意思？", en: "What does a negative beta mean?" },
      options: [
        { zh: "股价为负数", en: "The share price is negative" },
        {
          zh: "股价倾向与大盘反向波动（大盘涨时它倾向跌，反之亦然）",
          en: "The share price tends to move the other way from the market (it tends to fall when the market rises, and the other way around)"
        },
        { zh: "波动是大盘的两倍", en: "It moves twice as much as the market" },
        { zh: "公司在亏损", en: "The company is losing money" }
      ],
      answer: 1,
      explain: {
        zh: "负 beta 说的是股价倾向与大盘反向波动：大盘涨时它倾向跌，大盘跌时它倾向涨。它不是股价为负，不是波动刚好是大盘的两倍，也不是公司在亏损。",
        en: "A negative beta means the price tends to move against the market: it tends to fall when the market rises, and rise when the market falls. It does not mean the price is negative, that the move is twice the market, or that the company is losing money."
      }
    },
    {
      id: "q2",
      q: {
        zh: "哪条读数被报道明确说成「超过 1987、2000、2008 三次危机前的水平」？",
        en: "Which reading did reports explicitly place above the levels before the 1987, 2000, and 2008 crises?"
      },
      options: [
        { zh: "估值杠杆与仓位", en: "Valuation, leverage, and positioning" },
        { zh: "散户现金仓位", en: "Retail cash allocation" },
        { zh: "家庭逾期债务比例", en: "Household delinquent-debt share" },
        { zh: "Apple 市值", en: "Apple's market value" }
      ],
      answer: 0,
      explain: {
        zh: "被写成「已超过 1987、2000、2008 三次危机前的水平」的，是美股估值杠杆与仓位。散户现金、家庭逾期和 Apple 市值是另外的读数，没有被这样比较。",
        en: "The line “already above the levels before the 1987, 2000, and 2008 crises” refers to US equity valuation, leverage, and positioning. Retail cash, household delinquency, and Apple's market value are separate readings and were not compared that way."
      }
    },
    {
      id: "q3",
      q: {
        zh: "为什么 1987 和 2000 前夜的「杠杆 ETF 发行占比」是灰灯？",
        en: "Why is leveraged-ETF issuance share grey on the 1987 and 2000 eves?"
      },
      options: [
        { zh: "当时占比为零，所以是绿灯", en: "The share was zero then, so the light is green" },
        { zh: "数据保密", en: "The data is secret" },
        { zh: "那时还没有杠杆 ETF，无从比较", en: "Leveraged ETFs did not exist yet, so there is nothing to compare" },
        { zh: "当时占比比今天高", en: "The share was higher then than today" }
      ],
      answer: 2,
      explain: {
        zh: "美国首批杠杆 ETF 约在 2006 年才推出。1987 和 2000 的前夜还没有这一指标，所以是灰灯，不比较。灰灯不是绿灯，也不是说当时占比更高，或数据保密。",
        en: "The first US leveraged ETFs launched around 2006. The measure did not exist on the eves of 1987 and 2000, so the light is grey: not compared. Grey is not green, and it does not mean the share was higher then or that the data is secret."
      }
    },
    {
      id: "q4",
      q: {
        zh: "「家庭逾期债务比例升至 2010 年以来最高」说明什么？",
        en: "What does “household delinquent debt rose to the highest since 2010” mean?"
      },
      options: [
        { zh: "创下历史新高", en: "It set an all-time high" },
        { zh: "2010 年的水平比今天高，今天是那之后的最高", en: "The 2010 level was higher than today, and today is the highest since then" },
        { zh: "比 2008 前夜高一倍", en: "It is twice the 2008 eve" },
        { zh: "逾期在下降", en: "Delinquency is falling" }
      ],
      answer: 1,
      explain: {
        zh: "「2010 年以来最高」是说 2010 年的水平比今天高，今天是那之后的最高，不是创历史新高。本页没有「比 2008 前夜高一倍」这个数字，也不是逾期在下降。2008 那一格的绿灯，比的是危机后的 2009–2010，不是 2007 前夜。",
        en: "“Highest since 2010” means the 2010 level was above today, and today is the highest since. It is not an all-time high. This page has no figure for “twice the 2008 eve,” and delinquency is not described as falling. The green light on the 2008 cell compares today with 2009–2010 after the crisis, not with the 2007 eve."
      }
    },
    {
      id: "q5",
      q: {
        zh: "今天 6 盏灯里有 3 盏红灯，意味着什么？",
        en: "Three of today's six lights are red. What does that mean?"
      },
      options: [
        { zh: "下个月必然崩盘", en: "A crash is certain next month" },
        { zh: "应该立刻清仓", en: "You should sell everything now" },
        { zh: "红灯越多涨得越多", en: "More red lights mean prices rise more" },
        {
          zh: "只说明部分指标比历次前夜更极端，不能预测崩盘何时发生",
          en: "It only means some readings are more extreme than past eves. It cannot say when a crash will happen"
        }
      ],
      answer: 3,
      explain: {
        zh: "今天是 3 盏红灯、3 盏黄灯。红灯只说明这些指标比用来对照的前夜更极端，或报道写明了纪录。它不能预测崩盘何时发生，也不是清仓指令。",
        en: "Today is three red lights and three yellow. Red only means those readings are more extreme than the eve they are set against, or that a report states a record. It does not say when a crash will happen, and it is not an instruction to sell."
      }
    }
  ];

  function dashboardRows(year) {
    try {
      var key = year === undefined || year === null ? "" : String(year);
      if (key !== "1987" && key !== "2000" && key !== "2008") return [];
      var rows = [];
      var i;
      for (i = 0; i < SIGNALS.length; i++) {
        var sig = SIGNALS[i];
        var eve = sig.crises[key];
        if (!eve) return [];
        rows.push({
          id: sig.id,
          name: sig.name,
          eve: { light: eve.light, text: eve.text },
          today: {
            light: sig.light,
            text: sig.today.text,
            source: sig.today.source,
            date: sig.today.date
          }
        });
      }
      return rows;
    } catch (e) {
      return [];
    }
  }

  function lightSummary() {
    var out = { red: 0, yellow: 0, green: 0, grey: 0 };
    var i;
    try {
      for (i = 0; i < SIGNALS.length; i++) {
        var k = SIGNALS[i].light;
        if (Object.prototype.hasOwnProperty.call(out, k)) out[k] += 1;
      }
    } catch (e) {
      return { red: 0, yellow: 0, green: 0, grey: 0 };
    }
    return out;
  }

  function scoreQuiz(answers) {
    try {
      var correct = 0;
      var i;
      for (i = 0; i < QUESTIONS.length; i++) {
        var given;
        if (Array.isArray(answers)) given = answers[i];
        else if (answers && typeof answers === "object") given = answers[QUESTIONS[i].id];
        if (typeof given === "number" && given === QUESTIONS[i].answer) correct += 1;
      }
      return { correct: correct, total: 5 };
    } catch (e) {
      return { correct: 0, total: 5 };
    }
  }

  function badgeFor(correct) {
    var n = Number(correct);
    if (!isFinite(n)) n = 0;
    if (n >= 5) {
      return { id: "eve-watcher", name: { zh: "前夜观察员", en: "Eve Watcher" } };
    }
    if (n >= 4) {
      return { id: "apprentice", name: { zh: "信号学徒", en: "Signal Apprentice" } };
    }
    return { id: "review", name: { zh: "再看一遍仪表盘", en: "Review the dashboard" } };
  }

  function shareText(correct, lang) {
    try {
      var en = lang === "en";
      var n = Number(correct);
      if (!isFinite(n)) n = 0;
      n = Math.round(n);
      if (n < 0) n = 0;
      if (n > 5) n = 5;
      var badge = badgeFor(n);
      var sum = lightSummary();
      var lines;
      if (en) {
        lines = [
          "CRASH-051 · What does the eve of a crash look like?",
          "Today: " + sum.red + " red · " + sum.yellow + " yellow",
          "Score " + n + "/5 · " + badge.name.en,
          SHARE_URL,
          DISCLAIMER.en
        ];
      } else {
        lines = [
          "CRASH-051 · 危机前夜长什么样？",
          "今天：" + sum.red + " 红 · " + sum.yellow + " 黄",
          "成绩 " + n + "/5 · " + badge.name.zh,
          SHARE_URL,
          DISCLAIMER.zh
        ];
      }
      return lines.join("\n");
    } catch (e) {
      if (lang === "en") return SHARE_URL + "\n" + DISCLAIMER.en;
      return SHARE_URL + "\n" + DISCLAIMER.zh;
    }
  }

  var API = {
    META: META,
    LIGHTS: LIGHTS,
    SIGNALS: SIGNALS,
    CRISES: CRISES,
    QUESTIONS: QUESTIONS,
    DISCLAIMER: DISCLAIMER,
    dashboardRows: dashboardRows,
    lightSummary: lightSummary,
    scoreQuiz: scoreQuiz,
    badgeFor: badgeFor,
    shareText: shareText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.CrashEngine = API;
})();
