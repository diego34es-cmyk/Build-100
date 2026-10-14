/**
 * FLOW-047 · ETF flow lesson (no DOM).
 * Dollar figures stay inside the published week: BTC -6.79, ETH -5.42.
 * XRP and SOL have no published dollar amount. Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/047";
  var BADGE = { zh: "出师", en: "Cleared" };

  var FLOWS = [
    {
      id: "BTC",
      netUsdBn: -6.79,
      direction: "out",
      label: { zh: "比特币现货 ETF", en: "Bitcoin spot ETF" }
    },
    {
      id: "ETH",
      netUsdBn: -5.42,
      direction: "out",
      label: { zh: "以太坊 ETF", en: "Ethereum ETF" }
    },
    {
      id: "XRP",
      netUsdBn: null,
      direction: "in",
      label: { zh: "XRP", en: "XRP" }
    },
    {
      id: "SOL",
      netUsdBn: null,
      direction: "out",
      label: { zh: "SOL", en: "SOL" }
    }
  ];

  var QUESTIONS = [
    {
      id: "flow",
      q: {
        zh: "资金流里的净流出（outflow），指的是什么？",
        en: "In fund flows, what does a net outflow mean?"
      },
      choices: [
        {
          id: "flow-out",
          text: {
            zh: "钱净额离开 ETF（赎回多于申购）",
            en: "Money leaving the ETF on net (redemptions exceed creations)"
          }
        },
        {
          id: "flow-in",
          text: {
            zh: "钱净额进入 ETF（申购多于赎回）",
            en: "Money entering the ETF on net (creations exceed redemptions)"
          }
        },
        {
          id: "flow-up",
          text: {
            zh: "标的当天收涨",
            en: "The underlying asset closed up that day"
          }
        },
        {
          id: "flow-flat",
          text: {
            zh: "价格守住，所以资金方向可以忽略",
            en: "Price held, so the direction of money can be ignored"
          }
        }
      ],
      answer: "flow-out",
      explain: {
        zh: "流入是净申购，钱进来；流出是净赎回，钱出去。它说的是资金方向，不是当天涨跌。申购创造份额，赎回注销份额。",
        en: "Inflow is net creation: money in. Outflow is net redemption: money out. It is the direction of money, not the day's price move. Creation mints shares; redemption cancels them."
      }
    },
    {
      id: "btc",
      q: {
        zh: "2026 年 10 月第二周，美国比特币现货 ETF 的单周资金流是？",
        en: "In the second week of October 2026, what was the one-week flow for US bitcoin spot ETFs?"
      },
      choices: [
        {
          id: "btc-week",
          text: {
            zh: "净流出 6.79 亿美元，而且是 6 月以来最大",
            en: "A net outflow of $679 million, the largest since June"
          }
        },
        {
          id: "btc-eth",
          text: {
            zh: "十连流出 5.42 亿美元",
            en: "Ten straight outflows, $542 million"
          }
        },
        {
          id: "btc-xrp",
          text: {
            zh: "四组里唯一的净流入",
            en: "The only net inflow among the four"
          }
        },
        {
          id: "btc-mix",
          text: {
            zh: "价格守在 8.3 万美元，所以这一周记成净流入",
            en: "Price held at $83,000, so the week counts as a net inflow"
          }
        }
      ],
      answer: "btc-week",
      explain: {
        zh: "美国比特币现货 ETF 单周净流出 6.79 亿美元，是 6 月以来最大。十连流出 5.42 亿美元说的是以太坊 ETF。唯一净流入的是 XRP。价格守在 8.3 万美元，本身不是流入。",
        en: "US bitcoin spot ETFs had a weekly net outflow of $679 million, the largest since June. Ten straight outflows of $542 million is the ether ETF. The only net inflow is XRP. Price holding at $83,000 is not itself an inflow."
      }
    },
    {
      id: "eth",
      q: {
        zh: "同一则事实里，以太坊 ETF 对应的是哪一句？",
        en: "In that same story, which line is the ether ETF?"
      },
      choices: [
        {
          id: "eth-streak",
          text: {
            zh: "十连流出 5.42 亿美元",
            en: "Ten straight outflows, $542 million"
          }
        },
        {
          id: "eth-btc",
          text: {
            zh: "单周净流出 6.79 亿美元，6 月以来最大",
            en: "A weekly net outflow of $679 million, the largest since June"
          }
        },
        {
          id: "eth-xrp",
          text: {
            zh: "四组里唯一净流入",
            en: "The only net inflow among the four"
          }
        },
        {
          id: "eth-px",
          text: {
            zh: "价格守在 8.3 万美元",
            en: "Price held at $83,000"
          }
        }
      ],
      answer: "eth-streak",
      explain: {
        zh: "以太坊 ETF 是十连流出 5.42 亿美元。6.79 亿美元是比特币现货 ETF 的单周净流出。8.3 万美元说的是比特币价格。",
        en: "The ether ETF had ten straight outflows, $542 million. $679 million is the weekly net outflow of the US bitcoin spot ETF. $83,000 is where bitcoin's price held."
      }
    },
    {
      id: "diverge",
      q: {
        zh: "比特币价格当时怎样？把它和大额流出放在一起，该怎么读？",
        en: "What did bitcoin's price do, and how do you read that next to a large outflow?"
      },
      choices: [
        {
          id: "div-hold",
          text: {
            zh: "守在 8.3 万美元没崩，说明有人在接",
            en: "It held at $83,000 and did not break, so someone was taking the other side"
          }
        },
        {
          id: "div-nobuy",
          text: {
            zh: "流出代表没人买，价格不可能守住",
            en: "An outflow means there was no buyer, so the price could not hold"
          }
        },
        {
          id: "div-lock",
          text: {
            zh: "流向和价格必须同向，否则这组数据不作数",
            en: "Flow and price must move the same way, or the figures do not count"
          }
        },
        {
          id: "div-only",
          text: {
            zh: "只有净流入，价格才守得住",
            en: "Price can hold only when there is a net inflow"
          }
        }
      ],
      answer: "div-hold",
      explain: {
        zh: "比特币价格守在 8.3 万美元没崩。大额流出的同时价格守住，表示卖出的对面有人在接。流向和价格可以背离。",
        en: "Bitcoin held at $83,000 and did not break. A large outflow while price holds means someone was taking the other side of the selling. Flow and price can diverge."
      }
    },
    {
      id: "xrp",
      q: {
        zh: "BTC、ETH、XRP、SOL 这四组里，唯一净流入的反例是？",
        en: "Among BTC, ETH, XRP, and SOL, which is the only net-inflow counterexample?"
      },
      choices: [
        { id: "xrp-xrp", text: { zh: "XRP", en: "XRP" } },
        { id: "xrp-btc", text: { zh: "BTC", en: "BTC" } },
        { id: "xrp-eth", text: { zh: "ETH", en: "ETH" } },
        { id: "xrp-sol", text: { zh: "SOL", en: "SOL" } }
      ],
      answer: "xrp-xrp",
      explain: {
        zh: "XRP 是这四组里唯一净流入的反例。没有公开的具体亿美元数字，柱高只是示意。比特币现货 ETF 与以太坊 ETF 是流出；SOL 没有公开金额，柱子只作示意。",
        en: "XRP is the only net inflow among the four, the counterexample. No specific dollar amount is given for it here, so the bar height is illustrative. The bitcoin spot ETF and the ether ETF are the outflow lines. SOL has no published dollar amount here; its bar is illustrative."
      }
    }
  ];

  function answerMap(answers) {
    var map = {};
    if (!answers || typeof answers !== "object") return map;
    var i;
    if (Array.isArray(answers)) {
      for (i = 0; i < answers.length; i++) {
        var item = answers[i];
        if (item && typeof item === "object") {
          var qid = item.id != null ? item.id : item.qid;
          var cid = item.choice != null ? item.choice : item.answer;
          if (qid != null) map[String(qid)] = cid;
        } else if (i < QUESTIONS.length) {
          map[QUESTIONS[i].id] = item;
        }
      }
      return map;
    }
    var keys = Object.keys(answers);
    for (i = 0; i < keys.length; i++) map[keys[i]] = answers[keys[i]];
    return map;
  }

  function scoreQuiz(answers) {
    try {
      var map = answerMap(answers);
      var correct = 0;
      var i;
      for (i = 0; i < QUESTIONS.length; i++) {
        if (map[QUESTIONS[i].id] === QUESTIONS[i].answer) correct += 1;
      }
      var passed = correct >= 4;
      return {
        correct: correct,
        total: QUESTIONS.length,
        passed: passed,
        badge: passed ? { zh: BADGE.zh, en: BADGE.en } : null
      };
    } catch (e) {
      return { correct: 0, total: 5, passed: false, badge: null };
    }
  }

  function shareText(result, lang) {
    try {
      var en = lang === "en";
      var correct = 0;
      var total = QUESTIONS.length;
      var passed = false;
      if (result && typeof result === "object") {
        var c = Number(result.correct);
        var tot = Number(result.total);
        if (isFinite(c)) correct = Math.max(0, Math.round(c));
        if (isFinite(tot) && tot > 0) total = Math.round(tot);
        if (typeof result.passed === "boolean") passed = result.passed;
        else passed = correct >= 4;
      }
      if (en) {
        return "Score " + correct + "/" + total + ". " +
          (passed ? "You cleared the lesson." : "You have not cleared the lesson.") +
          " " + SHARE_URL;
      }
      return "得分 " + correct + "/" + total + "，" +
        (passed ? "已出师。" : "未出师。") +
        " " + SHARE_URL;
    } catch (e) {
      return lang === "en"
        ? "Score 0/5. You have not cleared the lesson. " + SHARE_URL
        : "得分 0/5，未出师。 " + SHARE_URL;
    }
  }

  function resolveMax(flows, maxAbs) {
    var max = Number(maxAbs);
    if (isFinite(max) && max > 0) return max;
    max = 0;
    var list = Array.isArray(flows) ? flows : [];
    var i;
    for (i = 0; i < list.length; i++) {
      var n = list[i] && list[i].netUsdBn;
      if (typeof n === "number" && isFinite(n)) {
        var abs = Math.abs(n);
        if (abs > max) max = abs;
      }
    }
    return max > 0 ? max : 1;
  }

  function directionOf(flow) {
    return flow && flow.direction === "in" ? "in" : "out";
  }

  /**
   * Map each flow to a signed bar height.
   * A numeric netUsdBn keeps its own sign. A null amount uses maxAbs * 0.25,
   * positive for inflow and negative for outflow.
   */
  function barHeights(flows, maxAbs) {
    try {
      var list = Array.isArray(flows) ? flows : [];
      var max = resolveMax(list, maxAbs);
      var illus = max * 0.25;
      var out = [];
      var i;
      for (i = 0; i < list.length; i++) {
        var flow = list[i] || {};
        var dir = directionOf(flow);
        var h;
        var n = flow.netUsdBn;
        if (typeof n === "number" && isFinite(n)) h = n;
        else h = dir === "in" ? illus : -illus;
        out.push({
          id: flow.id != null ? flow.id : "",
          h: h,
          direction: dir
        });
      }
      return out;
    } catch (e) {
      return [];
    }
  }

  var api = {
    FLOWS: FLOWS,
    QUESTIONS: QUESTIONS,
    scoreQuiz: scoreQuiz,
    shareText: shareText,
    barHeights: barHeights
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.FlowEngine = api;
})();
