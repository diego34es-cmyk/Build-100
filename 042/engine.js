/**
 * SENT-042 · sentiment thermometer (no DOM).
 * Tier: cash <= 13.3 or stock >= 71.8 → full;
 * else cash >= 22.5 → ample; else neutral.
 * Cash option: buyingPower = cash / (1 − drop), drop clamped to 0–0.9.
 * Figures are the AAII September 2026 survey readings cited in the brief.
 */
(function () {
  "use strict";

  var DATA = {
    stock: 71.8,
    cash: 13.3,
    cashAvg: 22.5,
    bearish: 53.3,
    funds: 38.35,
    direct: 33.44,
    date: "2026-10-08",
    bearWeek: "2026-09-19"
  };

  var QUIZ = [
    {
      q: {
        zh: "散户现金降到 9 年新低 13.3%，更合理的解读是？",
        en: "Retail cash fell to a 9-year low of 13.3%. Which reading is the sound one?"
      },
      options: [
        {
          zh: "市场一定下跌，应该立刻全部卖出。",
          en: "The market is certain to fall, so sell everything now."
        },
        {
          zh: "潜在新增买盘变少。这是需要警惕的温度读数，不是精确的卖出信号。",
          en: "Potential new buying has thinned. It is a temperature reading to respect, not a precise sell signal."
        },
        {
          zh: "现金少说明人人看多，应该加杠杆追涨。",
          en: "Low cash means everyone is bullish, so add leverage and chase."
        },
        {
          zh: "只是存款利息太低，仓位可以忽略。",
          en: "It only means deposit rates are low, so ignore the allocation."
        }
      ],
      correct: 1,
      explain: {
        zh: "反向指标量的是拥挤。现金见底说明还能进场的新增资金变少，但它给不出精确的卖出时点。",
        en: "A contrarian indicator measures crowding. Cash at a low means less fresh money can still come in. It does not name a sell date."
      }
    },
    {
      q: {
        zh: "看跌情绪 53.3%，股票仓位却是 71.8%。哪个更反映真实行为？",
        en: "Bearish sentiment is 53.3%, but stock allocation is 71.8%. Which one tracks real behavior?"
      },
      options: [
        {
          zh: "看跌情绪调查，因为人会把恐惧说出来。",
          en: "The bearish survey, because people say their fear out loud."
        },
        {
          zh: "资产配置。钱放在哪里，比嘴上怎么说更接近真实行为。",
          en: "Asset allocation. Where the money sits is closer to real behavior than what people say."
        },
        {
          zh: "两者一样准，不用区分。",
          en: "They are equally accurate. No need to tell them apart."
        },
        {
          zh: "社交媒体上的帖子。",
          en: "Posts on social media."
        }
      ],
      correct: 1,
      explain: {
        zh: "情绪调查问「你怎么看」，资产配置记「钱在哪」。两者背离时，看仓位。",
        en: "The sentiment survey asks what you think. Allocation records where the money is. When they diverge, read the allocation."
      }
    },
    {
      q: {
        zh: "现金最大的价值是什么？",
        en: "What is the main value of cash?"
      },
      options: [
        {
          zh: "账户里的存款利息。",
          en: "The interest it earns in the account."
        },
        {
          zh: "下跌时的购买力，也就是还能出手的选择权。",
          en: "Buying power in a decline — the option to still act."
        },
        {
          zh: "让仓位看起来保守的装饰。",
          en: "A decoration that makes the portfolio look cautious."
        },
        {
          zh: "对冲通胀的最佳工具。",
          en: "The best hedge against inflation."
        }
      ],
      correct: 1,
      explain: {
        zh: "现金的价值不在利息，在市场下跌时你还能按折扣价买入。那是选择权，不是预测。",
        en: "The value of cash is not the interest. It is being able to buy at a discount when markets fall. That is an option, not a forecast."
      }
    }
  ];

  function round1(n) {
    if (typeof n !== "number" || !isFinite(n)) return 0;
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round((Math.abs(n) + Number.EPSILON) * 10) / 10;
  }

  function clampPct(x, def) {
    var n = x;
    if (typeof n !== "number" || !isFinite(n)) n = def;
    if (typeof n !== "number" || !isFinite(n)) return 0;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return round1(n);
  }

  function normalize(stock, cash, changed) {
    var s = clampPct(stock, 0);
    var c = clampPct(cash, 0);
    if (s + c > 100) {
      if (changed === "cash") s = round1(100 - c);
      else c = round1(100 - s);
    }
    if (s < 0) s = 0;
    if (c < 0) c = 0;
    if (s > 100) s = 100;
    if (c > 100) c = 100;
    if (s + c > 100) {
      if (changed === "cash") s = round1(Math.max(0, 100 - c));
      else c = round1(Math.max(0, 100 - s));
    }
    var other = round1(100 - s - c);
    if (!(other >= 0) || !isFinite(other)) other = 0;
    return { stock: s, cash: c, other: other };
  }

  function tier(stock, cash) {
    var s = (typeof stock === "number" && isFinite(stock)) ? stock : 0;
    var c = (typeof cash === "number" && isFinite(cash)) ? cash : 0;
    if (c <= DATA.cash || s >= DATA.stock) return "full";
    if (c >= DATA.cashAvg) return "ample";
    return "neutral";
  }

  function barPos(value, min, max) {
    if (typeof value !== "number" || !isFinite(value)) return 0;
    if (typeof min !== "number" || !isFinite(min)) return 0;
    if (typeof max !== "number" || !isFinite(max)) return 0;
    if (min === max) return 0;
    var p = ((value - min) / (max - min)) * 100;
    if (!isFinite(p)) return 0;
    if (p < 0) return 0;
    if (p > 100) return 100;
    return p;
  }

  function compare(cash) {
    var c = (typeof cash === "number" && isFinite(cash)) ? cash : 0;
    return {
      vsAaii: round1(c - DATA.cash),
      vsAvg: round1(c - DATA.cashAvg)
    };
  }

  function cashOption(opts) {
    opts = opts || {};
    var total = 100000;
    if (typeof opts.total === "number" && isFinite(opts.total)) total = opts.total;
    if (!(total >= 0)) total = 0;
    var cashPct = opts.cashPct;
    if (typeof cashPct !== "number" || !isFinite(cashPct)) cashPct = 0;
    if (cashPct < 0) cashPct = 0;
    if (cashPct > 100) cashPct = 100;
    var drop = opts.drop;
    if (typeof drop !== "number" || !isFinite(drop)) drop = 0;
    if (drop < 0) drop = 0;
    if (drop > 0.9) drop = 0.9;
    var denom = 1 - drop;
    if (!(denom > 0)) denom = 0.1;
    var cash = total * cashPct / 100;
    var buyingPower = cash / denom;
    var aaiiCash = total * (DATA.cash / 100);
    var aaiiBuyingPower = aaiiCash / denom;
    if (!isFinite(cash)) cash = 0;
    if (!isFinite(buyingPower)) buyingPower = cash;
    if (!isFinite(aaiiCash)) aaiiCash = 0;
    if (!isFinite(aaiiBuyingPower)) aaiiBuyingPower = aaiiCash;
    if (buyingPower < cash) buyingPower = cash;
    if (aaiiBuyingPower < aaiiCash) aaiiBuyingPower = aaiiCash;
    return {
      cash: cash,
      buyingPower: buyingPower,
      aaiiCash: aaiiCash,
      aaiiBuyingPower: aaiiBuyingPower
    };
  }

  function grade(answers) {
    var correct = 0;
    var list = Array.isArray(answers) ? answers : [];
    var i;
    for (i = 0; i < QUIZ.length; i++) {
      var a = list[i];
      if (typeof a === "number" && isFinite(a) && a === QUIZ[i].correct) correct += 1;
    }
    return { correct: correct, total: 3 };
  }

  function fmtPct(x, opts) {
    opts = opts || {};
    if (typeof x !== "number" || !isFinite(x)) return "—";
    var neg = x < 0;
    var rounded = round1(Math.abs(x));
    var s = rounded.toFixed(1);
    if (s.slice(-2) === ".0") s = s.slice(0, -2);
    var prefix = "";
    if (neg && rounded !== 0) prefix = "-";
    else if (opts.sign) prefix = "+";
    return prefix + s + "%";
  }

  function fmtUSD(x) {
    if (typeof x !== "number" || !isFinite(x)) return "—";
    var n = Math.round(x);
    var sign = n < 0 ? "-" : "";
    var body = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "$" + body;
  }

  var api = {
    DATA: DATA,
    QUIZ: QUIZ,
    clampPct: clampPct,
    normalize: normalize,
    tier: tier,
    barPos: barPos,
    compare: compare,
    cashOption: cashOption,
    grade: grade,
    fmtPct: fmtPct,
    fmtUSD: fmtUSD
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.SentEngine = api;
})();
