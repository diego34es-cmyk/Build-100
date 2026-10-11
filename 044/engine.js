/**
 * WMARK-044 · textGrain watermark self-check (no DOM).
 * Illegal input never throws.
 */
(function () {
  "use strict";

  var DATA = {
    announceDate: "2026-10-05",
    aiActDate: "2026-08-02",
    name: "textGrain"
  };

  var FACTS = [
    {
      id: "identity",
      zh: "OpenAI 表示水印不识别用户身份。",
      en: "OpenAI says the watermark does not identify the user."
    },
    {
      id: "detect",
      zh: "只有授权机构能检测内容是否为 AI 生成。",
      en: "Only authorized institutions can detect whether the text is AI-generated."
    },
    {
      id: "rewrite",
      zh: "改写或润色会削弱水印检测。",
      en: "Rewriting or polishing weakens watermark detection."
    },
    {
      id: "api",
      zh: "API 端默认关闭，需手动开启 opt-in。",
      en: "On the API the watermark is off by default and needs a manual opt-in."
    }
  ];

  var REGIONS = ["eu", "non_eu"];
  var PRODUCTS = ["chatgpt", "codex", "api"];
  var OPTIN = ["on", "off", "unsure"];

  var QUIZ = [
    {
      id: "q1-default",
      zh: "API 的 textGrain 水印默认是？",
      en: "By default, the API textGrain watermark is?",
      question: {
        zh: "API 的 textGrain 水印默认是？",
        en: "By default, the API textGrain watermark is?"
      },
      options: [
        { zh: "关闭（需 opt-in）", en: "Off (opt-in required)" },
        { zh: "开启", en: "On" },
        { zh: "只在欧盟开启", en: "On only in the EU" }
      ],
      correct: 0,
      answer: 0,
      explainZh: "全球 API 用户从 2026-10-05 起可自行 opt-in，默认关闭。",
      explainEn: "From 2026-10-05, global API users may opt in themselves. It is off by default.",
      explain: {
        zh: "全球 API 用户从 2026-10-05 起可自行 opt-in，默认关闭。",
        en: "From 2026-10-05, global API users may opt in themselves. It is off by default."
      }
    },
    {
      id: "q2-who",
      zh: "谁能检测文字是否为 AI 生成？",
      en: "Who can detect whether the text is AI-generated?",
      question: {
        zh: "谁能检测文字是否为 AI 生成？",
        en: "Who can detect whether the text is AI-generated?"
      },
      options: [
        { zh: "任何人粘贴到网站就能查", en: "Anyone can paste it into a website and check" },
        { zh: "只有授权机构", en: "Only authorized institutions" },
        { zh: "只有 OpenAI 员工", en: "Only OpenAI employees" }
      ],
      correct: 1,
      answer: 1,
      explainZh: "只有授权机构能检测内容是否为 AI 生成。",
      explainEn: "Only authorized institutions can detect whether the content is AI-generated.",
      explain: {
        zh: "只有授权机构能检测内容是否为 AI 生成。",
        en: "Only authorized institutions can detect whether the content is AI-generated."
      }
    },
    {
      id: "q3-rewrite",
      zh: "把 AI 文字改写或润色后，水印检测会？",
      en: "After AI text is rewritten or polished, watermark detection will?",
      question: {
        zh: "把 AI 文字改写或润色后，水印检测会？",
        en: "After AI text is rewritten or polished, watermark detection will?"
      },
      options: [
        { zh: "完全不受影响", en: "Be completely unaffected" },
        { zh: "变得更容易检测", en: "Become easier to detect" },
        { zh: "被削弱", en: "Be weakened" }
      ],
      correct: 2,
      answer: 2,
      explainZh: "改写或润色会削弱水印检测。",
      explainEn: "Rewriting or polishing weakens watermark detection.",
      explain: {
        zh: "改写或润色会削弱水印检测。",
        en: "Rewriting or polishing weakens watermark detection."
      }
    }
  ];

  function has(list, value) {
    return typeof value === "string" && list.indexOf(value) !== -1;
  }

  function needsOptIn(product) {
    return product === "api";
  }

  function incomplete(missing) {
    return { status: "incomplete", missing: missing.slice() };
  }

  function assess(input) {
    if (input == null || typeof input !== "object" || Array.isArray(input)) {
      return incomplete(["region", "product"]);
    }
    var region = input.region;
    var product = input.product;
    var optIn = input.optIn;
    var missing = [];
    if (!has(REGIONS, region)) missing.push("region");
    if (!has(PRODUCTS, product)) missing.push("product");
    if (product === "api" && !has(OPTIN, optIn)) missing.push("optIn");
    if (missing.length) return incomplete(missing);

    if (product === "api") {
      if (optIn === "on") {
        return { status: "will", reason: "api_on", facts: ["api", "identity"] };
      }
      if (optIn === "off") {
        return { status: "wont", reason: "api_off", facts: ["api"] };
      }
      return { status: "depends", reason: "api_unsure", facts: ["api"] };
    }
    if (region === "eu") {
      return { status: "will", reason: "eu_consumer", facts: ["identity", "detect", "rewrite"] };
    }
    return { status: "wont", reason: "non_eu_consumer", facts: ["identity"] };
  }

  function isInt(n) {
    return typeof n === "number" && isFinite(n) && Math.floor(n) === n;
  }

  function quizCorrectIndex(q) {
    if (!q) return -1;
    if (isInt(q.correct)) return q.correct;
    if (isInt(q.answer)) return q.answer;
    return -1;
  }

  function checkAnswer(qIndex, choice) {
    if (!isInt(qIndex) || qIndex < 0 || qIndex >= QUIZ.length) return null;
    var q = QUIZ[qIndex];
    if (!q || !Array.isArray(q.options)) return null;
    if (!isInt(choice) || choice < 0 || choice >= q.options.length) return null;
    return choice === quizCorrectIndex(q);
  }

  function gradeQuiz(answers) {
    var results = [null, null, null];
    var score = 0;
    if (!Array.isArray(answers)) {
      return { score: 0, total: 3, results: results };
    }
    var i;
    for (i = 0; i < 3; i++) {
      if (i >= answers.length) {
        results[i] = null;
        continue;
      }
      var raw = answers[i];
      if (raw == null || raw === "") {
        results[i] = null;
        continue;
      }
      var ok = checkAnswer(i, raw);
      results[i] = ok;
      if (ok === true) score += 1;
    }
    return { score: score, total: 3, results: results };
  }

  function shareText(result, lang) {
    var en = lang === "en";
    var url = "https://build-100.com/044/";
    var status = result && typeof result === "object" ? result.status : "";
    var reason = result && typeof result === "object" ? result.reason : "";
    var head;
    var line;
    if (status === "will") {
      head = en ? "Self-check: your AI text will be watermarked." : "自查结论：会被加水印。";
      if (reason === "api_on") {
        line = en
          ? "You turned on the textGrain opt-in, so the output will carry a watermark."
          : "你主动开启了 textGrain opt-in，输出会带水印。";
      } else {
        line = en
          ? "In the coming weeks, eligible ChatGPT / Codex text in the EU will carry the invisible statistical watermark textGrain."
          : "未来几周内，欧盟区符合条件的 ChatGPT / Codex 文本将带上隐形统计水印 textGrain。";
      }
    } else if (status === "wont") {
      head = en ? "Self-check: your AI text will not be watermarked." : "自查结论：不会被加水印。";
      if (reason === "api_off") {
        line = en
          ? "The API watermark is off by default. Leave it off and it is not added."
          : "API 默认关闭，不开就不加。";
      } else {
        line = en
          ? "Under the 2026-10-05 announcement, the ChatGPT / Codex text watermark targets the EU; policy may change."
          : "按 2026-10-05 公告，ChatGPT / Codex 文本水印针对的是欧盟区；政策可能调整。";
      }
    } else if (status === "depends") {
      head = en ? "Self-check: it depends on your settings." : "自查结论：取决于你的设置。";
      line = en
        ? "The API watermark is off by default. Check whether you opted in."
        : "API 默认关闭，去你的设置里确认是否 opt-in。";
    } else {
      head = en ? "Finish the 30-second watermark check first." : "先做完 30 秒自查再分享结论。";
      line = en
        ? "Choose where you use it and which product."
        : "选你在哪里用、用什么产品。";
    }
    return head + " " + line + " " + url;
  }

  var api = {
    FACTS: FACTS,
    DATA: DATA,
    REGIONS: REGIONS,
    PRODUCTS: PRODUCTS,
    OPTIN: OPTIN,
    QUIZ: QUIZ,
    needsOptIn: needsOptIn,
    assess: assess,
    gradeQuiz: gradeQuiz,
    checkAnswer: checkAnswer,
    shareText: shareText
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.WmarkEngine = api;
})();
