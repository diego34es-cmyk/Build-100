/**
 * DEAL-056 · Price X-ray (no DOM).
 * Real drop vs tag inflation, subsidy stack, timing, quiz. Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/056/";

  var META = { asOf: "2026-10-23" };

  var DISCLAIMER = {
    zh: "价格规则以各平台实时页面为准，不构成消费建议。",
    en: "Live platform pages win. This is not shopping advice."
  };

  var THRESHOLD_NOTE = {
    zh: "经验口径，非硬规则",
    en: "Rules of thumb, not hard rules"
  };

  var SUBSIDY = {
    appliance: { rate: 0.15, cap: 1500 },
    digital: { rate: 0.15, cap: 500 },
    none: null
  };

  var ORDER = ["direct", "coupon", "plus", "redpacket", "tradein", "subsidy"];

  var ORDER_LABELS = {
    direct: { zh: "商品直降", en: "Direct cut" },
    coupon: { zh: "店铺券/品类券", en: "Store and category coupons" },
    plus: { zh: "PLUS 95 折", en: "PLUS 5% off" },
    redpacket: { zh: "超级红包", en: "Super red packet" },
    tradein: { zh: "以旧换新", en: "Trade-in" },
    subsidy: { zh: "国补 15%", en: "Subsidy 15%" }
  };

  var VERDICTS = {
    deal: {
      zh: "真香",
      en: "Real deal",
      line: {
        zh: "相对日常价，这是真降。可以认真看。",
        en: "Against the usual price, this is a real cut. Worth a serious look."
      }
    },
    wait: {
      zh: "再等等",
      en: "Wait",
      line: {
        zh: "有一点降，但不多。再比一比，不必急。",
        en: "A small cut, not a big one. Keep comparing. No need to rush."
      }
    },
    trap: {
      zh: "套路价",
      en: "Inflated tag",
      line: {
        zh: "相对日常价几乎没降。别被划线价带跑。",
        en: "Almost no cut versus the usual price. Don't let the tag lead you."
      }
    }
  };

  var SUSPICION = {
    none: { zh: "无明显嫌疑", en: "No clear inflation" },
    medium: { zh: "中等嫌疑", en: "Medium suspicion" },
    high: { zh: "高嫌疑", en: "High suspicion" }
  };

  var CATEGORY_ADVICE = {
    phone: {
      zh: "别死等 11-11。双11后手机价格有反弹风险。",
      en: "Don't hold out only for Nov 11. Phone prices carry a bounce-back risk after Double 11."
    },
    appliance: {
      zh: "国补额度有限，有补贴就尽早。",
      en: "The subsidy quota is limited. If you qualify, buy sooner."
    },
    daily: {
      zh: "等 11-11 一次囤。",
      en: "Wait for Nov 11 and stock up once."
    }
  };

  var TIMELINE_SRC = [
    { id: "open", date: "10-20", label: { zh: "开门红", en: "Opening wave" } },
    { id: "wave2", date: "10-31–11-03", label: { zh: "第二波", en: "Second wave" } },
    { id: "rotate", date: "11-04–11-09", label: { zh: "品类轮动", en: "Category rotation" } },
    { id: "final", date: "11-11", label: { zh: "终极", en: "Finale" } },
    { id: "encore", date: "11-12–11-13", label: { zh: "返场", en: "Encore" } },
    { id: "bf", date: "11-27", label: { zh: "黑五", en: "Black Friday" } }
  ];

  var CHECKLIST = [
    {
      id: "protect",
      zh: "大件 30 天价保往往要手动开，或在下单时勾选。",
      en: "On big items, 30-day price protection often has to be turned on by hand, or ticked at checkout."
    },
    {
      id: "refund",
      zh: "国补全额退款会消耗当年名额。",
      en: "A full refund on a subsidized order can use up this year's subsidy slot."
    },
    {
      id: "deposit",
      zh: "预售定金弃购不退。",
      en: "If you walk away from a presale, the deposit is not refunded."
    },
    {
      id: "compare",
      zh: "至少三家比到手价，把全部优惠折算进去再比。",
      en: "Compare the price you actually pay at three shops, after every discount."
    },
    {
      id: "mark",
      zh: "国补要认准标识，并确认收货地址在覆盖区。",
      en: "For a subsidy, check the official mark and confirm the delivery address is covered."
    }
  ];

  var QUIZ = [
    {
      id: "base",
      q: {
        zh: "国补按哪个金额核算？",
        en: "Which amount is a subsidy calculated on?"
      },
      options: [
        { zh: "划线价", en: "The strikethrough price" },
        { zh: "前面全部抵扣后的实付金额", en: "What you pay after every earlier discount" },
        { zh: "日常价", en: "The usual price" }
      ],
      answer: 1,
      explain: {
        zh: "国补按前面全部抵扣后的实付金额核算。按原价先算，会把能省的钱高估。",
        en: "A subsidy is calculated on what you actually pay after earlier discounts. Estimating it on the original price overstates the savings."
      }
    },
    {
      id: "rebound",
      q: {
        zh: "双11之后，手机价格可能怎么走？",
        en: "After Double 11, which way might phone prices move?"
      },
      options: [
        { zh: "还会一直降", en: "They keep falling" },
        { zh: "有反弹风险", en: "They carry a bounce-back risk" },
        { zh: "一定不变", en: "They are certain to stay flat" }
      ],
      answer: 1,
      explain: {
        zh: "据公开报道，存储芯片合约均价涨超 200%。消息称，手机 11 月底或 12 月初涨价 300 元起，512G 与 1TB 涨 500 元起。双11后有反弹风险。",
        en: "According to public reports, memory-chip contract prices are up more than 200%. Reports say phones may rise by 300 yuan or more in late November or early December, and 512G / 1TB by 500 yuan or more. There is a bounce-back risk after Double 11."
      }
    },
    {
      id: "deposit",
      q: {
        zh: "预售定金，弃购能退吗？",
        en: "If you abandon a presale, is the deposit refunded?"
      },
      options: [
        { zh: "能全额退", en: "Yes, in full" },
        { zh: "不退", en: "No" },
        { zh: "只退一半", en: "Only half" }
      ],
      answer: 1,
      explain: {
        zh: "预售定金弃购不退。下定前先想清楚。",
        en: "A presale deposit is not refunded if you walk away. Decide before you put it down."
      }
    }
  ];

  function toNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.trim().replace(/,/g, "").replace(/[￥¥元]/g, "");
      if (!s) return null;
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)) return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function positive(v) {
    var n = toNum(v);
    if (n == null || n <= 0) return null;
    return n;
  }

  function money(v) {
    var n = toNum(v);
    if (n == null || n <= 0) return 0;
    return n;
  }

  function near(a, b) {
    return Math.abs(a - b) <= 1e-9;
  }

  function ge(a, b) {
    return a > b || near(a, b);
  }

  function endMD(dateStr) {
    var bits = String(dateStr).split("–");
    return bits[bits.length - 1];
  }

  function isPast(dateStr, asOf) {
    var end = endMD(dateStr);
    var today = String(asOf).slice(5);
    return end < today;
  }

  var TIMELINE = TIMELINE_SRC.map(function (node) {
    return {
      id: node.id,
      date: node.date,
      label: { zh: node.label.zh, en: node.label.en },
      past: isPast(node.date, META.asOf)
    };
  });

  function checkDiscount(listPrice, usualPrice, salePrice) {
    try {
      var list = positive(listPrice);
      var usual = positive(usualPrice);
      var sale = positive(salePrice);
      if (list == null || usual == null || sale == null) return null;
      var realDrop = (usual - sale) / usual;
      var listInflation = (list - usual) / usual;
      var claimedDrop = (list - sale) / list;
      if (!isFinite(realDrop) || !isFinite(listInflation) || !isFinite(claimedDrop)) return null;
      var suspicion = "none";
      if (ge(listInflation, 0.3)) suspicion = "high";
      else if (ge(listInflation, 0.1)) suspicion = "medium";
      var verdict = "trap";
      if (ge(realDrop, 0.15)) verdict = "deal";
      else if (ge(realDrop, 0.05)) verdict = "wait";
      return {
        realDrop: realDrop,
        listInflation: listInflation,
        claimedDrop: claimedDrop,
        suspicion: suspicion,
        verdict: verdict
      };
    } catch (e) {
      return null;
    }
  }

  function subsidyAmount(base, category) {
    try {
      var b = toNum(base);
      if (b == null || b <= 0) return 0;
      var rule = SUBSIDY[category];
      if (!rule || !rule.rate) return 0;
      var amt = b * rule.rate;
      if (!isFinite(amt) || amt <= 0) return 0;
      if (amt > rule.cap) return rule.cap;
      return amt;
    } catch (e) {
      return 0;
    }
  }

  function isPlus(v) {
    return v === true || v === 1;
  }

  function pushStep(steps, key, before, after) {
    var a = after;
    if (typeof a !== "number" || !isFinite(a) || a < 0) a = 0;
    var saved = before - a;
    if (typeof saved !== "number" || !isFinite(saved) || saved < 0) saved = 0;
    steps.push({ key: key, before: before, after: a, saved: saved });
    return a;
  }

  function stack(price, opts) {
    try {
      var o = opts && typeof opts === "object" ? opts : {};
      var start = toNum(price);
      if (start == null || start < 0) start = 0;
      var current = start;
      var steps = [];
      current = pushStep(steps, "direct", current, current - money(o.direct));
      current = pushStep(steps, "coupon", current, current - money(o.coupon));
      if (isPlus(o.plus)) current = pushStep(steps, "plus", current, current * 0.95);
      else current = pushStep(steps, "plus", current, current);
      current = pushStep(steps, "redpacket", current, current - money(o.redpacket));
      current = pushStep(steps, "tradein", current, current - money(o.tradein));
      var sub = subsidyAmount(current, o.category);
      current = pushStep(steps, "subsidy", current, current - sub);
      var totalSaved = start - current;
      if (!isFinite(totalSaved) || totalSaved < 0) totalSaved = 0;
      return { final: current, steps: steps, totalSaved: totalSaved };
    } catch (e) {
      return {
        final: 0,
        steps: ORDER.map(function (key) {
          return { key: key, before: 0, after: 0, saved: 0 };
        }),
        totalSaved: 0
      };
    }
  }

  function naiveSubsidyGap(price, opts) {
    try {
      var o = opts && typeof opts === "object" ? opts : {};
      var p = toNum(price);
      if (p == null || p < 0) p = 0;
      var naive = subsidyAmount(p, o.category);
      var result = stack(p, o);
      var correct = 0;
      var i;
      for (i = 0; i < result.steps.length; i++) {
        if (result.steps[i].key === "subsidy") correct = result.steps[i].saved;
      }
      var gap = naive - correct;
      if (!isFinite(gap) || gap < 0) return 0;
      return gap;
    } catch (e) {
      return 0;
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

  function asScore(n) {
    if (typeof n === "number" && isFinite(n)) return n;
    if (typeof n === "string" && n.trim() && isFinite(Number(n.trim()))) return Number(n.trim());
    return null;
  }

  function badge(correct) {
    try {
      var n = asScore(correct);
      if (n == null || n < 1) return { zh: "还在雾里", en: "Still in the fog" };
      if (n < 3) return { zh: "看得出门道", en: "Sees the trick" };
      return { zh: "价格猎人", en: "Price hunter" };
    } catch (e) {
      return { zh: "还在雾里", en: "Still in the fog" };
    }
  }

  function shareText(lang, verdict) {
    try {
      var en = lang === "en";
      var head = en ? "DEAL-056 · Price X-ray" : "DEAL-056 · 价格照妖镜";
      var line;
      if (verdict === "deal" || verdict === "wait" || verdict === "trap") {
        line = en ? "Verdict: " + VERDICTS[verdict].en : "判定：" + VERDICTS[verdict].zh;
      } else {
        line = en
          ? "Spot fake Double 11 and Black Friday discounts in 3 steps"
          : "3 步看穿双11和黑五的真假折扣";
      }
      return [head, line, SHARE_URL].join("\n");
    } catch (e) {
      return SHARE_URL;
    }
  }

  var API = {
    META: META,
    DISCLAIMER: DISCLAIMER,
    THRESHOLD_NOTE: THRESHOLD_NOTE,
    SUBSIDY: SUBSIDY,
    ORDER: ORDER,
    ORDER_LABELS: ORDER_LABELS,
    VERDICTS: VERDICTS,
    SUSPICION: SUSPICION,
    CATEGORY_ADVICE: CATEGORY_ADVICE,
    TIMELINE: TIMELINE,
    CHECKLIST: CHECKLIST,
    QUIZ: QUIZ,
    checkDiscount: checkDiscount,
    subsidyAmount: subsidyAmount,
    stack: stack,
    naiveSubsidyGap: naiveSubsidyGap,
    gradeQuiz: gradeQuiz,
    badge: badge,
    shareText: shareText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.DealEngine = API;
})();
