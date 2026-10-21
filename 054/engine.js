/**
 * ADREAD-054 · ad mind-reader (no DOM).
 * 10 rounds of "guess the ad". Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/054/";

  var META = { asOf: "2026-10-21" };

  var DISCLAIMER = {
    zh: "所有聊天片段与广告均为虚构示例；教育演示，非 OpenAI 官方说明。",
    en: "All chat snippets and ads are fictional examples. Educational demo, not an official OpenAI explainer."
  };

  var MECHANISMS = {
    "current-chat": {
      title: { zh: "当前对话信号", en: "Current-chat signal" },
      fact: {
        zh: "当前对话的内容会影响广告选择。广告出现在 Free / Go 用户（非未成年账户）的回答下方，标 Sponsored。",
        en: "The current conversation can shape which ad is chosen. Ads appear under replies for Free and Go users (not accounts identified as under 18), marked Sponsored."
      }
    },
    "history-memory": {
      title: { zh: "历史 / 记忆信号", en: "History / memory signal" },
      fact: {
        zh: "开启个性化后，历史聊天和记忆信号也可能被用来选广告。广告商看不到你是谁，也看不到聊天内容。",
        en: "With personalization on, past chats and memory signals may also be used to choose ads. Advertisers do not see who you are, and they do not see the chat."
      }
    },
    "personalize-off": {
      title: { zh: "关个性化仍有广告", en: "Ads remain after personalization is off" },
      fact: {
        zh: "关掉「个性化广告」不等于没有广告：当前对话信号照样会用。",
        en: "Turning off Personalize ads is not the same as having no ads: the current conversation is still used."
      }
    },
    "temp-chat": {
      title: { zh: "临时聊天无广告", en: "No ads in Temporary Chats" },
      fact: {
        zh: "Temporary Chats（临时聊天）不展示广告。",
        en: "Temporary Chats do not show ads."
      }
    },
    "plus-plan": {
      title: { zh: "Plus 等付费档无广告", en: "No ads on Plus and paid plans" },
      fact: {
        zh: "广告只出现在 Free / Go 计划；Plus / Pro / Business / Enterprise / Edu 无广告。",
        en: "Ads appear only on Free / Go. Plus / Pro / Business / Enterprise / Edu have no ads."
      }
    },
    "health-block": {
      title: { zh: "健康话题无广告", en: "No ads beside health topics" },
      fact: {
        zh: "健康话题旁不展示广告。",
        en: "Ads are not shown beside health topics."
      }
    },
    "mental-block": {
      title: { zh: "心理健康话题无广告", en: "No ads beside mental-health topics" },
      fact: {
        zh: "心理健康话题旁不展示广告。",
        en: "Ads are not shown beside mental-health topics."
      }
    },
    "list-match": {
      title: { zh: "客户名单匹配", en: "Customer list matching" },
      fact: {
        zh: "广告商可上传邮箱或手机号（或哈希后）做受众匹配。用于定向投放的名单需至少匹配到 25,000 名用户（不足只能用于排除）。广告商看不到具体是谁，也看不到聊天内容；匹配在 OpenAI 侧内部完成。",
        en: "Advertisers can upload emails or phone numbers (or hashes) for audience matching. Targeting with a list requires at least 25,000 matched users; smaller lists can only be used to exclude people. Advertisers do not see who matched, and they do not see the chat; matching happens internally on OpenAI's side."
      }
    },
    "eea-personalize": {
      title: { zh: "EEA / 瑞士无个性化", en: "No personalization in the EEA / Switzerland" },
      fact: {
        zh: "个性化广告在欧洲经济区 / 瑞士暂不提供。当前对话仍可能影响广告选择。",
        en: "Personalized ads are not currently offered in the EEA or Switzerland. The current conversation can still shape ads."
      }
    }
  };

  function opt(id, zh, en, sponsor) {
    return {
      id: id,
      label: { zh: zh, en: en },
      sponsor: sponsor == null ? null : sponsor
    };
  }

  var NONE = {
    zh: "这里不会出广告",
    en: "No ad here"
  };

  var ROUNDS = [
    {
      id: "aurora",
      chat: {
        zh: "帮我排一条下周末去冰岛看极光的路线，预算中等，想少走回头路。",
        en: "Plan a weekend trip to Iceland for the northern lights. Mid-range budget, fewer backtracks."
      },
      context: { zh: "Free 计划 · 非未成年账户", en: "Free plan · not an under-18 account" },
      options: [
        opt("aurora-trek", "AuroraTrek 冰岛极光三日套餐", "AuroraTrek 3-day Iceland lights package", "AuroraTrek"),
        opt("aurora-card", "NimbusCard 旅行联名卡", "NimbusCard travel co-brand card", "NimbusCard"),
        opt("aurora-diet", "SlimVial 代餐粉一周装", "SlimVial one-week meal-replacement", "SlimVial"),
        opt("aurora-none", NONE.zh, NONE.en, null)
      ],
      answer: "aurora-trek",
      mechanism: "current-chat",
      reveal: {
        zh: "当前对话里的旅行意图会被用来选广告。",
        en: "The travel intent in this conversation is used to choose the ad."
      },
      why: {
        zh: "广告出现在 Free / Go 用户（非未成年账户）的回答下方，并标 Sponsored。你正在聊冰岛极光，系统就可能配上旅行套餐。广告商看不到这段聊天内容。",
        en: "Ads sit under replies for Free and Go users (not accounts identified as under 18), marked Sponsored. This chat is about Iceland lights, so a trip package can be selected. Advertisers do not see the chat content."
      }
    },
    {
      id: "python",
      chat: {
        zh: "我在写给团队用的 Python 脚本，想把表格导出成 PDF，有没有稳妥的库？",
        en: "I'm writing a Python script for the team to export tables to PDF. Any solid library?"
      },
      context: { zh: "Go 计划 · 非未成年账户", en: "Go plan · not an under-18 account" },
      options: [
        opt("python-pdf", "PaperForge PDF 导出工具", "PaperForge PDF export tool", "PaperForge"),
        opt("python-pet", "Pawsly 宠物订阅粮", "Pawsly pet-food subscription", "Pawsly"),
        opt("python-shoe", "VoltStep 篮球鞋新品", "VoltStep new basketball shoes", "VoltStep"),
        opt("python-none", NONE.zh, NONE.en, null)
      ],
      answer: "python-pdf",
      mechanism: "current-chat",
      reveal: {
        zh: "当前正在写的 PDF 导出需求，足以改变回答下方的广告。",
        en: "The PDF-export task in this chat is enough to change the ad under the reply."
      },
      why: {
        zh: "Go 计划和 Free 一样会出广告。这题没有历史记忆，也没有客户名单，靠的就是当前 prompt。404 Media 在 2026-10-15 的实测也表明，广告商可按 prompt 内容定向。",
        en: "The Go plan shows ads the same way Free does. This round has no memory and no customer list — only the current prompt. 404 Media's 2026-10-15 test showed advertisers can target by prompt content."
      }
    },
    {
      id: "memory",
      chat: {
        zh: "这周末天气不错，给我几个轻松的出门主意就行，别太费劲。",
        en: "Nice weekend weather. Give me a few easy out-and-about ideas, nothing strenuous."
      },
      context: { zh: "Free 计划 · 已开个性化 · 记忆里常聊跑步", en: "Free plan · personalization on · memory often mentions running" },
      options: [
        opt("memory-shoe", "PaceForge 跑鞋新品", "PaceForge new running shoes", "PaceForge"),
        opt("memory-fund", "YieldNest 理财入门课", "YieldNest beginner investing class", "YieldNest"),
        opt("memory-coffee", "BrewHalo 便携咖啡机", "BrewHalo portable coffee maker", "BrewHalo"),
        opt("memory-none", NONE.zh, NONE.en, null)
      ],
      answer: "memory-shoe",
      mechanism: "history-memory",
      reveal: {
        zh: "开启个性化后，历史聊天和记忆信号也可能被用来选广告。",
        en: "With personalization on, past chats and memory signals may also be used to choose ads."
      },
      why: {
        zh: "当前这句只是在问轻松出门，并没有点名跑步。个性化打开时，系统还可能用到你过去聊过的跑步相关信号。广告商仍然看不到你是谁，也看不到聊天内容。",
        en: "This prompt only asks for an easy outing; it never names running. With personalization on, the system may still use running signals from past chats and memory. Advertisers still do not see who you are, and they do not see the chat."
      }
    },
    {
      id: "off",
      chat: {
        zh: "推荐几款适合小户型的空气炸锅，最好好清洗。",
        en: "Recommend a few air fryers for a small apartment. Easy to clean, please."
      },
      context: { zh: "Free 计划 · 已关个性化", en: "Free plan · personalization off" },
      options: [
        opt("off-fryer", "CrispBox 迷你空气炸锅", "CrispBox mini air fryer", "CrispBox"),
        opt("off-ski", "AlpineKit 滑雪板", "AlpineKit skis", "AlpineKit"),
        opt("off-pad", "NovaPad 游戏手柄", "NovaPad game controller", "NovaPad"),
        opt("off-none", NONE.zh, NONE.en, null)
      ],
      answer: "off-fryer",
      mechanism: "personalize-off",
      reveal: {
        zh: "关掉「个性化广告」不等于没有广告，当前对话信号照样会用。",
        en: "Turning off Personalize ads is not the same as no ads — the current conversation is still used."
      },
      why: {
        zh: "已关个性化后，历史和记忆不会再被用来选广告，但「空气炸锅」这句当前对话仍会影响投放。广告仍出现在回答下方并标 Sponsored。Temporary Chats 才是不展示广告的对话模式。",
        en: "With personalization off, past chats and memory are not used, but this air-fryer prompt still shapes the ad. The Sponsored slot under the reply remains. Temporary Chats are the mode that does not show ads."
      }
    },
    {
      id: "temp",
      chat: {
        zh: "帮我改一封求职信，岗位是产品经理，语气专业一点。",
        en: "Edit this cover letter for a product-manager role. Keep the tone professional."
      },
      context: { zh: "临时聊天", en: "Temporary Chat" },
      options: [
        opt("temp-resume", "ResumeLift 简历润色", "ResumeLift resume polish", "ResumeLift"),
        opt("temp-job", "HireNest 招聘平台", "HireNest job board", "HireNest"),
        opt("temp-class", "Skillory 产品课", "Skillory product course", "Skillory"),
        opt("temp-none", NONE.zh, NONE.en, null)
      ],
      answer: "temp-none",
      mechanism: "temp-chat",
      reveal: {
        zh: "Temporary Chats（临时聊天）不展示广告。",
        en: "Temporary Chats do not show ads."
      },
      why: {
        zh: "临时聊天没有 Sponsored 广告位，即便这封求职信很像招聘广告的钩子。这和关个性化不是同一件事：关个性化之后，当前对话仍可能出广告。",
        en: "A Temporary Chat has no Sponsored slot, even when a cover letter looks like a recruiting hook. This is not the same as turning off personalization, which still allows ads from the current conversation."
      }
    },
    {
      id: "plus",
      chat: {
        zh: "帮我比较几款头戴式降噪耳机，主打通勤。",
        en: "Compare a few over-ear noise-cancelling headphones for commuting."
      },
      context: { zh: "Plus 计划", en: "Plus plan" },
      options: [
        opt("plus-cans", "SoundCove 降噪耳机", "SoundCove noise-cancelling headphones", "SoundCove"),
        opt("plus-stream", "WaveMint 音乐会员", "WaveMint music membership", "WaveMint"),
        opt("plus-jar", "EchoJar 蓝牙音箱", "EchoJar Bluetooth speaker", "EchoJar"),
        opt("plus-none", NONE.zh, NONE.en, null)
      ],
      answer: "plus-none",
      mechanism: "plus-plan",
      reveal: {
        zh: "广告只出现在 Free / Go；Plus / Pro / Business / Enterprise / Edu 无广告。",
        en: "Ads appear only on Free / Go; Plus / Pro / Business / Enterprise / Edu have no ads."
      },
      why: {
        zh: "即便这段话很适合推耳机，Plus 计划也不会在回答下方出 Sponsored。这是计划差异，不是话题屏蔽。Pro、Business、Enterprise、Edu 同样无广告。",
        en: "Even though this prompt fits headphone ads, Plus does not show Sponsored under the reply. That is a plan rule, not a topic block. Pro, Business, Enterprise, and Edu also have no ads."
      }
    },
    {
      id: "health",
      chat: {
        zh: "我膝盖疼了两周，上下楼会加重，要不要去看骨科？",
        en: "My knee has hurt for two weeks, worse on stairs. Should I see an orthopedist?"
      },
      context: { zh: "Free 计划", en: "Free plan" },
      options: [
        opt("health-gel", "JointEase 关节膏", "JointEase joint cream", "JointEase"),
        opt("health-clinic", "BrightOrtho 私立骨科", "BrightOrtho private orthopedics", "BrightOrtho"),
        opt("health-brace", "FlexBand 运动护膝", "FlexBand sports knee brace", "FlexBand"),
        opt("health-none", NONE.zh, NONE.en, null)
      ],
      answer: "health-none",
      mechanism: "health-block",
      reveal: {
        zh: "健康话题旁不展示广告。",
        en: "Ads are not shown beside health topics."
      },
      why: {
        zh: "即便你是 Free 用户（非未成年账户），健康相关回答下方也不会出 Sponsored。这是话题屏蔽，不是因为关了个性化，也不是付费档。",
        en: "Even for a Free user (not an account identified as under 18), a health reply does not get a Sponsored slot. This is a topic block, not a personalization setting and not a paid-plan rule."
      }
    },
    {
      id: "mental",
      chat: {
        zh: "最近焦虑得晚上睡不着，有没有可以自己试试的放松方法？",
        en: "I've been so anxious I can't sleep. Any relaxation methods I can try on my own?"
      },
      context: { zh: "Free 计划", en: "Free plan" },
      options: [
        opt("mental-app", "CalmHarbor 冥想会员", "CalmHarbor meditation membership", "CalmHarbor"),
        opt("mental-gummy", "NightVial 助眠软糖", "NightVial sleep gummies", "NightVial"),
        opt("mental-coach", "MindLane 咨询预约", "MindLane counseling booking", "MindLane"),
        opt("mental-none", NONE.zh, NONE.en, null)
      ],
      answer: "mental-none",
      mechanism: "mental-block",
      reveal: {
        zh: "心理健康话题旁不展示广告。",
        en: "Ads are not shown beside mental-health topics."
      },
      why: {
        zh: "心理健康话题旁不展示广告，和健康、政治话题是同一类规则。即便你是 Free / Go 用户（非未成年账户），这题也不会出现 Sponsored。",
        en: "Mental-health topics do not show ads, the same class of rule as health and politics. Even for Free and Go users (not accounts identified as under 18), this reply gets no Sponsored slot."
      }
    },
    {
      id: "list",
      chat: {
        zh: "帮我把这封给房东的催修邮件写得客气一点，别开火。",
        en: "Rewrite this repair-nudge email to my landlord so it stays polite."
      },
      context: { zh: "Free 计划 · 在广告商的定向名单里", en: "Free plan · on an advertiser's targeting list" },
      options: [
        opt("list-bank", "CloudBank 新客信用卡", "CloudBank new-customer credit card", "CloudBank"),
        opt("list-move", "ShiftKit 搬家服务", "ShiftKit moving service", "ShiftKit"),
        opt("list-sofa", "NestLoom 沙发", "NestLoom sofa", "NestLoom"),
        opt("list-none", NONE.zh, NONE.en, null)
      ],
      answer: "list-bank",
      mechanism: "list-match",
      reveal: {
        zh: "广告商可上传邮箱或手机号（或哈希后）做受众匹配；用于定向投放的名单需至少匹配到 25,000 名用户（不足只能用于排除）。他们看不到你是谁，也看不到聊天内容。",
        en: "Advertisers can upload emails or phone numbers (or hashes) for audience matching. Targeting with a list requires at least 25,000 matched users; smaller lists can only be used to exclude people. They do not see who you are, and they do not see the chat."
      },
      why: {
        zh: "匹配在 OpenAI 侧内部完成。这份名单至少匹配到了 25,000 名用户，才能用来定向投放；广告商只拿到汇总数据，看不到具体是谁看到了广告。催修邮件本身不是选中信用卡的原因。",
        en: "Matching is done internally on OpenAI's side. This list matched at least 25,000 users, which is what lets it be used for targeting; the advertiser only gets aggregate reporting, not who saw the ad. The landlord email is not why the card was chosen."
      }
    },
    {
      id: "eea",
      chat: {
        zh: "今晚想在家烤巴斯克蛋糕，配方尽量简单，烤箱不好控温。",
        en: "I want to bake a Basque cheesecake tonight. Keep the recipe simple — the oven runs hot and cold."
      },
      context: { zh: "瑞士 · Free 计划 · 记忆里常聊相机", en: "Switzerland · Free plan · memory often mentions cameras" },
      options: [
        opt("eea-lens", "LensCraft 相机镜头", "LensCraft camera lens", "LensCraft"),
        opt("eea-bake", "BakeHalo 烤箱温控配件", "BakeHalo oven-temperature kit", "BakeHalo"),
        opt("eea-ski", "RidgePeak 滑雪板", "RidgePeak skis", "RidgePeak"),
        opt("eea-none", NONE.zh, NONE.en, null)
      ],
      answer: "eea-bake",
      mechanism: "eea-personalize",
      reveal: {
        zh: "个性化广告在欧洲经济区 / 瑞士暂不提供；当前对话仍可能影响广告。",
        en: "Personalized ads are not currently offered in the EEA or Switzerland; the current conversation can still shape ads."
      },
      why: {
        zh: "在瑞士或欧洲经济区，历史聊天和记忆不会被当成个性化信号来用，所以不会因为「常聊相机」推镜头。这不等于没有广告：你正在聊烘焙，仍可能看到和当前对话相关、标了 Sponsored 的广告。",
        en: "In Switzerland or the EEA, past chats and memory are not used as personalization signals, so a camera habit does not pick the lens ad. That is not the same as no ads: this baking prompt can still surface a Sponsored ad tied to the current chat."
      }
    }
  ];

  var ACTIONS = [
    {
      id: "personalize",
      text: {
        zh: "设置 → Ad Controls → 关闭 Personalize ads",
        en: "Settings → Ad Controls → turn off Personalize ads"
      }
    },
    {
      id: "memory",
      text: {
        zh: "设置 → Ad Controls → 关闭 Past chats and memory",
        en: "Settings → Ad Controls → turn off Past chats and memory"
      }
    },
    {
      id: "delete",
      text: {
        zh: "设置 → Ad Controls → Delete ads data",
        en: "Settings → Ad Controls → Delete ads data"
      }
    },
    {
      id: "temp",
      text: {
        zh: "敏感话题改用 Temporary Chats（临时聊天不展示广告）",
        en: "Use Temporary Chats for sensitive topics (temporary chats show no ads)"
      }
    },
    {
      id: "paid",
      text: {
        zh: "Plus / Pro / Business / Enterprise / Edu 计划无广告",
        en: "Plus / Pro / Business / Enterprise / Edu plans have no ads"
      }
    },
    {
      id: "adsfree",
      text: {
        zh: "Free 用户可选择「Ads-Free」：没有广告，但使用额度更低",
        en: "Free users can choose \"Ads-Free\": no ads, but lower usage limits"
      }
    },
    {
      id: "expect",
      text: {
        zh: "记住：关个性化 ≠ 关广告，当前对话信号照样会用",
        en: "Remember: turning off personalization is not turning off ads; the current chat is still used"
      }
    }
  ];

  var RANKS = [
    { min: 0, max: 3, zh: "全频可读", en: "Wide open" },
    { min: 4, max: 6, zh: "半透明档案", en: "Half-open file" },
    { min: 7, max: 8, zh: "扰码学员", en: "Signal jammer" },
    { min: 9, max: 10, zh: "监控盲区", en: "Monitor dead zone" }
  ];

  function clone(obj) {
    if (obj == null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      var arr = [];
      var i;
      for (i = 0; i < obj.length; i++) arr.push(obj[i]);
      return arr;
    }
    var out = {};
    Object.keys(obj).forEach(function (k) { out[k] = obj[k]; });
    return out;
  }

  function emptyState(order) {
    return {
      index: 0,
      order: order.slice(),
      picks: {},
      correctCount: 0
    };
  }

  function defaultOrder() {
    var order = [];
    var i;
    for (i = 0; i < ROUNDS.length; i++) order.push(i);
    return order;
  }

  function indexOfRound(v) {
    if (typeof v === "number" && isFinite(v) && v >= 0 && v < ROUNDS.length && v === Math.floor(v)) {
      return v;
    }
    if (typeof v === "string") {
      var i;
      for (i = 0; i < ROUNDS.length; i++) {
        if (ROUNDS[i].id === v) return i;
      }
    }
    return -1;
  }

  function normalizeOrder(seedOrder) {
    var fallback = defaultOrder();
    if (!Array.isArray(seedOrder) || seedOrder.length !== ROUNDS.length) return fallback;
    var used = {};
    var out = [];
    var i;
    for (i = 0; i < seedOrder.length; i++) {
      var idx = indexOfRound(seedOrder[i]);
      if (idx < 0 || used[idx]) return fallback;
      used[idx] = true;
      out.push(idx);
    }
    return out;
  }

  function cloneState(state) {
    return {
      index: state.index,
      order: clone(state.order),
      picks: clone(state.picks),
      correctCount: state.correctCount
    };
  }

  function newState(seedOrder) {
    try {
      return emptyState(normalizeOrder(seedOrder));
    } catch (e) {
      return emptyState(defaultOrder());
    }
  }

  function createGame(seedOrder) {
    return newState(seedOrder);
  }

  function roundAt(state) {
    if (!state || typeof state !== "object" || !Array.isArray(state.order)) return null;
    var idx = state.index;
    if (typeof idx !== "number" || idx < 0 || idx >= state.order.length) return null;
    var ridx = state.order[idx];
    if (typeof ridx !== "number" || ridx < 0 || ridx >= ROUNDS.length) return null;
    return ROUNDS[ridx] || null;
  }

  function currentRound(state) {
    try {
      return roundAt(state);
    } catch (e) {
      return null;
    }
  }

  function findRound(round) {
    if (!round) return null;
    if (typeof round === "object" && round.id) {
      var i;
      for (i = 0; i < ROUNDS.length; i++) {
        if (ROUNDS[i].id === round.id) return ROUNDS[i];
      }
      return round.options && round.answer != null ? round : null;
    }
    var idx = indexOfRound(round);
    return idx >= 0 ? ROUNDS[idx] : null;
  }

  function optionExists(round, optionId) {
    if (!round || !Array.isArray(round.options)) return false;
    var i;
    for (i = 0; i < round.options.length; i++) {
      if (round.options[i].id === optionId) return true;
    }
    return false;
  }

  function scoreAnswer(round, optionId) {
    try {
      var r = findRound(round);
      if (!r) return { correct: false, answer: null };
      var id = optionId == null ? "" : String(optionId);
      return { correct: id === r.answer, answer: r.answer };
    } catch (e) {
      return { correct: false, answer: null };
    }
  }

  function isDone(state) {
    try {
      if (!state || typeof state !== "object") return true;
      var order = Array.isArray(state.order) ? state.order : [];
      if (order.length === 0) return true;
      var picks = state.picks && typeof state.picks === "object" ? state.picks : {};
      var i;
      for (i = 0; i < order.length; i++) {
        var r = ROUNDS[order[i]];
        if (!r || picks[r.id] == null) return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  function answer(state, optionId) {
    try {
      if (!state || typeof state !== "object") return newState();
      var next = cloneState(state);
      if (!Array.isArray(next.order)) next.order = defaultOrder();
      if (!next.picks || typeof next.picks !== "object") next.picks = {};
      if (typeof next.correctCount !== "number" || !isFinite(next.correctCount)) next.correctCount = 0;
      var round = roundAt(next);
      if (!round) return next;
      if (Object.prototype.hasOwnProperty.call(next.picks, round.id)) return next;
      var id = optionId == null ? "" : String(optionId);
      if (!optionExists(round, id)) {
        /* still record an unknown pick as a miss, so the round cannot be replayed */
        next.picks[round.id] = id;
        return next;
      }
      next.picks[round.id] = id;
      if (id === round.answer) next.correctCount += 1;
      return next;
    } catch (e) {
      try {
        return state && typeof state === "object" ? cloneState(state) : newState();
      } catch (err) {
        return newState();
      }
    }
  }

  function next(state) {
    try {
      if (!state || typeof state !== "object") return newState();
      var s = cloneState(state);
      if (!Array.isArray(s.order)) s.order = defaultOrder();
      if (!s.picks || typeof s.picks !== "object") s.picks = {};
      var round = roundAt(s);
      if (!round) return s;
      if (s.picks[round.id] == null) return s;
      if (s.index >= s.order.length - 1) return s;
      s.index += 1;
      return s;
    } catch (e) {
      try {
        return state && typeof state === "object" ? cloneState(state) : newState();
      } catch (err) {
        return newState();
      }
    }
  }

  function asCount(n) {
    if (typeof n === "number" && isFinite(n)) {
      return Math.max(0, Math.min(10, Math.round(n)));
    }
    if (typeof n === "string") {
      var s = n.trim();
      if (!s) return null;
      var x = Number(s);
      if (isFinite(x)) return Math.max(0, Math.min(10, Math.round(x)));
    }
    return null;
  }

  function radar(correctCount) {
    try {
      var n = asCount(correctCount);
      if (n == null) n = 0;
      return 100 - n * 10;
    } catch (e) {
      return 100;
    }
  }

  function rank(correctCount) {
    try {
      var n = asCount(correctCount);
      if (n == null) n = 0;
      var i;
      for (i = 0; i < RANKS.length; i++) {
        if (n >= RANKS[i].min && n <= RANKS[i].max) {
          return { zh: RANKS[i].zh, en: RANKS[i].en };
        }
      }
      return { zh: RANKS[0].zh, en: RANKS[0].en };
    } catch (e) {
      return { zh: "全频可读", en: "Wide open" };
    }
  }

  function shareText(lang, correctCount) {
    try {
      var en = lang === "en";
      var n = asCount(correctCount);
      var finished = n != null && arguments.length >= 2 && correctCount != null && correctCount !== "";
      var lines;
      if (!finished) {
        if (en) {
          lines = [
            "ADREAD-054 · Ad mind-reader",
            "See how much advertisers can read you",
            SHARE_URL
          ];
        } else {
          lines = [
            "ADREAD-054 · 广告读心术",
            "来测测广告商能读你多少",
            SHARE_URL
          ];
        }
      } else {
        var r = radar(n);
        var rk = rank(n);
        if (en) {
          lines = [
            "ADREAD-054 · Ad mind-reader",
            "Advertiser radar " + r + " · " + rk.en,
            "Correct " + n + " / 10",
            SHARE_URL
          ];
        } else {
          lines = [
            "ADREAD-054 · 广告读心术",
            "广告商雷达值 " + r + " · " + rk.zh,
            "答对 " + n + " / 10",
            SHARE_URL
          ];
        }
      }
      return lines.join("\n");
    } catch (e) {
      return lang === "en"
        ? "See how much advertisers can read you\n" + SHARE_URL
        : "来测测广告商能读你多少\n" + SHARE_URL;
    }
  }

  function actionProgress(checkedIds) {
    try {
      var known = {};
      var i;
      for (i = 0; i < ACTIONS.length; i++) known[ACTIONS[i].id] = true;
      var list;
      if (Array.isArray(checkedIds)) list = checkedIds;
      else if (checkedIds && typeof checkedIds === "object") {
        list = Object.keys(checkedIds).filter(function (k) { return checkedIds[k]; });
      } else list = [];
      var seen = {};
      var done = 0;
      for (i = 0; i < list.length; i++) {
        var id = String(list[i]);
        if (!known[id] || seen[id]) continue;
        seen[id] = true;
        done += 1;
      }
      return { done: done, total: ACTIONS.length };
    } catch (e) {
      return { done: 0, total: ACTIONS.length };
    }
  }

  var API = {
    META: META,
    ROUNDS: ROUNDS,
    MECHANISMS: MECHANISMS,
    ACTIONS: ACTIONS,
    DISCLAIMER: DISCLAIMER,
    RANKS: RANKS,
    scoreAnswer: scoreAnswer,
    createGame: createGame,
    newState: newState,
    answer: answer,
    next: next,
    isDone: isDone,
    currentRound: currentRound,
    radar: radar,
    rank: rank,
    shareText: shareText,
    actionProgress: actionProgress
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.AdreadEngine = API;
})();
