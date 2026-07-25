// engine.js — PROMPT-003 提示词扩写器（纯函数，无 DOM 依赖）
// 把用户大白话扩成一段可直接粘贴进 AI 的自然语言提示词（通常比原文更长、更具体）
// 结构原则仍参考 Claude / OpenAI / Gemini：角色、任务、受众、约束、输出形态 —— 但以连贯段落呈现，不用槽位模板。

export const SLOT_KEYS = ["persona", "goal", "context", "constraints", "output"];

const ACTION_RE =
  /(?:帮我|请|麻烦|想要|想让|需要)?\s*(写|撰写|起草|生成|创建|做|制作|想|分析|总结|摘要|翻译|改写|润色|优化|检查|审查|解释|说明|列出|规划|设计|计算|比较|提炼|整理|改|修)/i;

const AUDIENCE_RE =
  /(?:给|面向|针对|写给)\s*([^\s，,。.!！?？、；;的]{1,12})/;

const TONE_MAP = [
  { re: /正式|公文|商务|专业|严谨|(?:formal|professional)\s*tone/i, labelZh: "正式、专业", labelEn: "formal and professional" },
  { re: /口语|轻松|随意|幽默|俏皮|(?:friendly|casual|light)\s*tone/i, labelZh: "轻松、口语化", labelEn: "friendly and conversational" },
  { re: /温和|友善|亲切|礼貌/i, labelZh: "温和、礼貌", labelEn: "warm and polite" },
  { re: /简洁|干练|直接/i, labelZh: "简洁、直接", labelEn: "concise and direct" },
  { re: /学术|论文|严谨论证/i, labelZh: "学术、论证清晰", labelEn: "academic and clearly reasoned" },
];

const FORMAT_MAP = [
  { re: /\bJSON\b|json/i, labelZh: "JSON", labelEn: "JSON" },
  { re: /Markdown\s*表|用表格|做成表|as\s+a\s+table/i, labelZh: "Markdown 表格", labelEn: "a Markdown table" },
  { re: /分点列表|条目列表|列成(?:要点|条目|清单)|输出(?:为|成)?\s*(?:分点)?列表|Markdown\s*列表|bullet\s*lists?|as\s+(?:a\s+)?(?:bullet\s*)?list/i, labelZh: "Markdown 分点列表", labelEn: "a Markdown bullet list" },
  { re: /整理成行动项|行动项列表|action\s*items?/i, labelZh: "行动项分点列表", labelEn: "an action-item bullet list" },
  { re: /邮件正文|写成邮件|一封[^，,]{0,8}邮件|(?:write\s+)?(?:an?\s+)?email\b/i, labelZh: "可直接发送的邮件正文", labelEn: "an email body ready to send" },
  { re: /可运行代码|输出代码|as\s+code\b/i, labelZh: "可运行代码", labelEn: "runnable code" },
  { re: /大纲|提纲|outline/i, labelZh: "结构化大纲", labelEn: "a structured outline" },
  { re: /推文|tweet|小红书|朋友圈/i, labelZh: "短文案", labelEn: "short social copy" },
];

const LENGTH_RE =
  /(?:不超过|最多|少于|控制在|约|大概|under|at\s*most|no\s*more\s*than|less\s*than|up\s*to)?\s*(\d{2,5})\s*(?:字|词|words?|字符|characters?)/i;

const ROLE_RE =
  /(?:你是|扮演|作为|角色[是为]?|You are)\s*([^\s，,。.!！?？]{2,40})/i;

const BAN_RE =
  /(?:不要|别|禁止|避免|不准|don't|do not)\s*([^，,。.!！?？；;]{1,40})/gi;

const GREETING_RE = /^(你好|您好|hi+|hello|hey|在吗|嗨)[.!！?？。\s]*$/i;

/**
 * @param {string} rawText
 * @param {object} [overrides]
 */
export function buildPrompt(rawText, overrides = {}) {
  const raw = String(rawText ?? "").trim();
  const o = normalizeOverrides(overrides);

  if (!raw && !hasAnyOverride(o)) {
    return {
      slots: emptySlots(),
      prompt: "",
      markdown: "",
      xml: "",
      filled: { persona: false, goal: false, context: false, constraints: false, output: false },
      tips: [],
      empty: true,
      thin: false,
    };
  }

  const en = isEnglishDominant(raw);
  const parsed = parseRaw(raw, en);
  const slots = mergeSlots(parsed, o, raw, en);
  const prompt = expandProse({ raw, parsed, slots, o, en });

  const filled = {
    persona: Boolean(slots.persona),
    goal: Boolean(slots.goal),
    context: Boolean(slots.context),
    constraints: slots.constraints.length > 0,
    output: Boolean(slots.output),
  };

  return {
    slots,
    prompt,
    markdown: prompt, // 兼容旧字段：UI / 测试统一用自然语言段
    xml: prompt,
    filled,
    tips: [],
    empty: false,
    thin: parsed.thin,
  };
}

function emptySlots() {
  return { persona: "", goal: "", context: "", constraints: [], output: "" };
}

function normalizeOverrides(o) {
  return {
    persona: trimStr(o.persona),
    audience: trimStr(o.audience),
    tone: trimStr(o.tone),
    length: trimStr(o.length),
    format: trimStr(o.format),
    bans: trimStr(o.bans),
    goal: trimStr(o.goal),
    context: trimStr(o.context),
    output: trimStr(o.output),
  };
}

function trimStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function hasAnyOverride(o) {
  return Object.values(o).some((v) => v && String(v).length > 0);
}

function isEnglishDominant(text) {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return letters > cjk * 1.2;
}

function parseRaw(raw, en) {
  const personaRaw = matchFirst(raw, ROLE_RE);
  const persona = personaRaw
    ? en
      ? personaRaw.replace(/^an?\s+/i, "")
      : personaRaw.replace(/^(一名|一个|位)/, "")
    : "";

  let audience = cleanAudience(matchFirst(raw, AUDIENCE_RE));
  const toneHit = TONE_MAP.find((t) => t.re.test(raw));
  const tone = toneHit ? (en ? toneHit.labelEn : toneHit.labelZh) : "";
  const formatHit = FORMAT_MAP.find((f) => f.re.test(raw));
  const format = formatHit ? (en ? formatHit.labelEn : formatHit.labelZh) : "";

  const lengthMatch = raw.match(LENGTH_RE);
  const length = lengthMatch
    ? en
      ? `no more than ${lengthMatch[1]} ${/字|字符/.test(lengthMatch[0]) ? "characters" : "words"}`
      : `不超过 ${lengthMatch[1]} ${/words?/i.test(lengthMatch[0]) ? "词" : "字"}`
    : "";

  const bans = [];
  let m;
  const banRe = new RegExp(BAN_RE.source, "gi");
  while ((m = banRe.exec(raw)) !== null) {
    const item = m[1].trim().replace(/[。.!！]+$/, "");
    if (item && !bans.includes(item)) bans.push(item);
  }

  const action = raw.match(ACTION_RE);
  let goal = raw.replace(/^(?:帮我|请|麻烦|想要|想让|需要)\s*/u, "");
  goal = stripKnownMeta(goal, { tone, length, format, bans, persona, audience });
  goal = leadWithVerb(goal, action?.[1]);
  goal = tidyGoal(goal);

  const kind = detectKind(raw, goal);
  const thin = isThinInput(raw, goal);

  return { persona, audience, tone, format, length, bans, goal, kind, thin };
}

function detectKind(raw, goal) {
  const t = `${raw} ${goal}`;
  if (/审查|检查|review|code\s*review|安全风险|可维护/i.test(t) && /代码|code|react|组件|函数|login|表单/i.test(t)) {
    return "code_review";
  }
  if (/邮件|email|请假/i.test(t)) return "email";
  if (/总结|摘要|summarize|纪要/i.test(t)) return "summary";
  if (/计划|行程|一日游|plan|itinerary/i.test(t)) return "plan";
  if (/周报|日报|report/i.test(t)) return "report";
  if (/行动项|action\s*item/i.test(t)) return "action_items";
  return "generic";
}

function cleanAudience(audience) {
  if (!audience) return "";
  return audience
    .replace(/(?:看|读|用|浏览|阅读)$/u, "")
    .replace(/^(?:给|面向|针对|写给)/, "")
    .trim();
}

function matchFirst(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

function stripKnownMeta(goal, meta = {}) {
  let g = goal;
  g = g.replace(ROLE_RE, "");
  g = g.replace(
    /(?:语气|风格)[是为]?[：:]?\s*(正式|公文|商务|专业|严谨|口语|轻松|随意|幽默|温和|友善|简洁|学术)[的地]?/g,
    ""
  );
  g = g.replace(/[，,]\s*(正式|公文|商务|专业|口语|轻松|随意|幽默)(?:语气|风格)?(?=[，,。]|$)/g, "");
  g = g.replace(/\bin\s+a\s+(friendly|formal|casual|professional|light)\s+tone\b/gi, "");
  g = g.replace(/\b(friendly|formal|casual|professional)\s+tone\b/gi, "");
  g = g.replace(LENGTH_RE, "");
  g = g.replace(/\bunder\s*,?/gi, "");
  g = g.replace(
    /(?:用|以|输出(?:为|成)?|写成|as)\s*(?:一份?)?(?:JSON|表格|分点列表|列表|邮件|大纲|Markdown\s*列表|bullet\s*lists?)/gi,
    ""
  );
  g = g.replace(/[，,]\s*as\s+JSON(?:\s+with\s+[^，,。.!！?？]+)?/gi, "");
  g = g.replace(/[，,]\s*with\s+subject\s+and\s+body/gi, "");
  if (meta.audience) {
    const esc = meta.audience.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    g = g.replace(new RegExp(`(?:给|面向|针对|写给)\\s*${esc}(?:的|看|读|用)?`, "g"), "");
  } else {
    g = g.replace(/(?:给|面向|针对|写给)\s*[^\s，,。.!！?？、；;的]{1,12}(?:的(?!请假)|看|读|用)?/g, "");
  }
  g = g.replace(/(?:不要|别|禁止|避免|不准|don't|do not)\s*[^，,。.!！?？；;]{1,40}/gi, "");
  g = g.replace(/^(?:帮我|请|麻烦|想要|想让)/, "");
  g = g.replace(/[，,]\s*(?:帮我|请|麻烦)\s*/g, "，");
  return tidyGoal(g);
}

function tidyGoal(goal) {
  return goal
    .replace(/\s{2,}/g, " ")
    .replace(/[，,]{2,}/g, "，")
    .replace(/\s*,\s*,/g, ",")
    .replace(/[，,]\s*(?=[，,。.!！?？]|$)/g, "")
    .replace(/^[，,。.\s]+|[，,。.\s]+$/g, "")
    .replace(/\s+under\s*$/i, "")
    .trim();
}

function leadWithVerb(goal, verb) {
  if (!goal) return verb ? mapVerb(verb) : "";
  if (/^想/.test(goal) && /计划|方案|行程/.test(goal)) return goal.replace(/^想/, "设计");
  if (
    /^(写|撰写|起草|生成|创建|做|制作|想|分析|总结|摘要|翻译|改写|润色|优化|检查|审查|解释|说明|列出|规划|设计|计算|比较|提炼|整理|改|修|Write|Create|Generate|Analyze|Summarize|Translate|Draft|Review)/i.test(
      goal
    )
  ) {
    return goal;
  }
  if (/^把/.test(goal) && verb && goal.includes(verb)) return goal;
  if (verb) {
    const v = mapVerb(verb);
    if (goal.includes(v) || goal.includes(verb)) return goal;
    return `${v}${goal}`.replace(/^(写写)/, "写");
  }
  return goal;
}

function mapVerb(verb) {
  if (verb === "想") return "设计";
  return verb;
}

function isThinInput(raw, goal) {
  if (GREETING_RE.test(raw)) return true;
  const g = (goal || raw || "").trim();
  if (g.length <= 4) return true;
  if (/^(写|做|生成|分析|总结)[\u4e00-\u9fff]{0,3}$/.test(g)) return true;
  return false;
}

function mergeSlots(parsed, o, raw, en) {
  const persona = o.persona || (parsed.persona ? (en ? `You are ${parsed.persona}` : `你是${parsed.persona}`) : "");
  let goal = o.goal || parsed.goal || raw;
  goal = tidyGoal(goal);

  const audience = cleanAudience(o.audience || parsed.audience);
  const context = audience
    ? en
      ? `Audience: ${audience}`
      : `受众：${audience}`
    : "";

  const constraints = [];
  const tone = o.tone || parsed.tone;
  if (tone) constraints.push(en ? `Tone: ${tone}` : `语气：${tone}`);
  const length = o.length || parsed.length;
  if (length) constraints.push(en ? `Length: ${length}` : `长度：${length}`);

  const bans = [];
  if (o.bans) {
    o.bans
      .split(/[，,、;；]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((b) => bans.push(b));
  }
  parsed.bans.forEach((b) => {
    if (!bans.includes(b)) bans.push(b);
  });
  bans.forEach((b) => constraints.push(en ? `Don't: ${b}` : `不要：${b}`));

  const format = o.format || parsed.format;
  const output = o.output || (format ? (en ? `Output as ${format}` : `输出：${format}`) : "");

  return { persona, goal, context, constraints, output, audience, tone, length, bans, format };
}

// ───────── 扩写成可粘贴的自然语言提示词 ─────────

function expandProse({ raw, parsed, slots, o, en }) {
  if (parsed.thin || GREETING_RE.test(raw)) {
    return en
      ? "Please help me with a task, but I haven't given enough detail yet. Ask me 2–3 short clarifying questions first (what the deliverable is, who it's for, any must-include points or length limits), then write a clear, ready-to-use result based on my answers."
      : "请帮我完成一件事，但我还没说清楚。请先用 2–3 个简短问题问清关键信息（要交付什么、给谁看、有没有必含要点或篇幅限制），等我回答后，再直接给出一份可立即使用的成品。";
  }

  const kind = parsed.kind;
  if (en) return expandEn({ raw, parsed, slots, o, kind });
  return expandZh({ raw, parsed, slots, o, kind });
}

function expandZh({ raw, parsed, slots, o, kind }) {
  const parts = [];
  const role = (o.persona || parsed.persona || "").replace(/^你是/, "");
  const audience = slots.audience || parsed.audience;
  const tone = o.tone || parsed.tone;
  const length = o.length || parsed.length;
  const format = o.format || parsed.format;
  const bans = slots.bans || parsed.bans || [];
  const goal = slots.goal || parsed.goal;

  if (kind === "code_review") {
    parts.push(
      role
        ? `你是一名${role}，请以代码审查的标准来工作。`
        : "你是一名资深工程师，请以严格但建设性的代码审查标准来工作。"
    );
    parts.push(
      "我将提供需要审查的代码（若消息里还没有贴出完整代码，请先提醒我粘贴后再开始）。请聚焦我描述的范围，不要扩散到无关模块。"
    );
    if (/安全|xss|csrf|注入/i.test(raw)) {
      parts.push(
        "安全方面请重点检查：输入校验与转义、敏感信息是否明文存储或泄露、认证/授权漏洞、危险的 HTML/URL 处理、不安全的第三方依赖用法等。"
      );
    } else {
      parts.push(
        "请同时覆盖正确性、边界条件、安全风险，以及可读性与可维护性（命名、职责拆分、重复逻辑、错误处理、测试缺口）。"
      );
    }
    if (/可维护|maintain/i.test(raw)) {
      parts.push("可维护性请具体到：组件/函数职责是否清晰、状态是否难追踪、是否有过长函数或魔法值、后续改动会不会容易踩坑。");
    }
    if (/严重|排序|rank|severity/i.test(raw)) {
      parts.push("请按严重程度从高到低排序；每一条写清：问题是什么、可能出现在哪里、为什么重要、建议怎么改（尽量给出可落地的改法）。");
    } else {
      parts.push("每条意见请写清：问题、位置或触发条件、影响、建议改法。");
    }
  } else if (kind === "email") {
    parts.push(role ? `你是${role}。` : "请帮我起草一封邮件。");
    parts.push(`任务：${goal || "撰写邮件"}。`);
    if (audience) parts.push(`收件人是「${audience}」，措辞和信息密度要符合对方身份。`);
    parts.push("正文要完整可用：含称呼、事由、必要细节、结尾礼貌收束；不要只给提纲。");
  } else if (kind === "summary" || kind === "action_items") {
    parts.push(role ? `你是${role}。` : "请帮我整理信息。");
    parts.push(`任务：${goal || "总结要点"}。`);
    if (audience) parts.push(`读者是「${audience}」，请用对方能看懂的话，少用行话。`);
    if (kind === "action_items") {
      parts.push("请提取可执行的行动项：每条包含谁做、做什么、截止或优先级（若原文没有就标「待确认」）。");
    } else {
      parts.push("请先给一段极短总览，再列关键要点；区分事实与推断，拿不准的地方明确标出。");
    }
  } else if (kind === "plan") {
    parts.push(role ? `你是${role}。` : "请帮我做一份可执行计划。");
    parts.push(`需求：${goal || raw}。`);
    parts.push("请给出分时段或分步骤的安排，包含交通/用餐/休息等现实约束，并标出可选备选方案。");
  } else if (kind === "report") {
    parts.push(role ? `你是${role}。` : "请帮我写一份工作汇报。");
    parts.push(`任务：${goal || "写周报"}。`);
    parts.push(
      "若我还没提供本周具体事项，请先问我：完成了什么、卡在哪里、下周计划、需要谁支持；收到材料后再写成完整汇报。"
    );
    parts.push("结构建议：本周进展 → 问题与风险 → 下周计划 → 需要的支持。");
  } else {
    parts.push(role ? `你是一名${role}。` : "");
    parts.push(`请帮我完成这件事：${goal || raw}。`);
    parts.push("先确认任务目标，再直接给出可使用的成品；步骤要清楚，必要时补上我没写但做这件事通常需要的要点。");
  }

  if (audience && kind !== "email" && kind !== "summary" && kind !== "action_items") {
    parts.push(`请按「${audience}」这个对象来调整措辞与详细程度。`);
  }
  if (tone) parts.push(`整体语气保持${tone}。`);
  if (length) parts.push(`篇幅${length}。`);
  if (format) parts.push(`最终请以「${format}」的形式交付。`);
  else if (kind === "code_review") parts.push("最终请用 Markdown 分点列表交付，方便我逐条处理。");

  bans.forEach((b) => {
    parts.push(`请注意：不要${b}。`);
  });

  if (kind === "code_review") {
    parts.push("审查意见要具体、可执行，避免空泛夸奖或空泛批评。");
  } else if (!parsed.thin) {
    parts.push("直接给出可用结果；除非关键信息缺失，否则不要先连环追问。");
  }

  return joinZh(parts);
}

function expandEn({ raw, parsed, slots, o, kind }) {
  const parts = [];
  const role = (o.persona || parsed.persona || "").replace(/^You are\s+/i, "");
  const audience = slots.audience || parsed.audience;
  const tone = o.tone || parsed.tone;
  const length = o.length || parsed.length;
  const format = o.format || parsed.format;
  const bans = slots.bans || parsed.bans || [];
  const goal = slots.goal || parsed.goal;

  if (kind === "code_review") {
    parts.push(
      role
        ? `You are a ${role}. Work like a strict but constructive code reviewer.`
        : "You are a senior engineer. Work like a strict but constructive code reviewer."
    );
    parts.push(
      "I will provide the code to review (if it is not pasted yet, ask me to paste it before reviewing). Stay within the scope I described; do not wander into unrelated modules."
    );
    parts.push(
      "Cover correctness, edge cases, security risks, and maintainability (naming, separation of concerns, duplication, error handling, missing tests)."
    );
    if (/severity|rank|严重/i.test(raw)) {
      parts.push(
        "Rank findings from highest to lowest severity. For each item include: what is wrong, where it likely shows up, why it matters, and a concrete fix."
      );
    } else {
      parts.push("For each finding include: issue, location or trigger, impact, and a concrete fix.");
    }
  } else if (kind === "email") {
    parts.push(role ? `You are ${role}.` : "Please draft an email for me.");
    parts.push(`Task: ${goal || "write an email"}.`);
    if (audience) parts.push(`The recipient is "${audience}"; match tone and detail to that person.`);
    parts.push("Deliver a complete sendable body with greeting, reason, necessary details, and a polite close—not just an outline.");
  } else {
    parts.push(role ? `You are a ${role}.` : "");
    parts.push(`Please help me with this: ${goal || raw}.`);
    parts.push("Make the result ready to use. Add any usually-needed details I omitted, as long as they stay faithful to my intent.");
  }

  if (audience && kind !== "email") parts.push(`Tune wording for this audience: ${audience}.`);
  if (tone) parts.push(`Keep the tone ${tone}.`);
  if (length) parts.push(`Keep it ${length}.`);
  if (format) parts.push(`Deliver the result as ${format}.`);
  else if (kind === "code_review") parts.push("Deliver the result as a Markdown bullet list.");

  bans.forEach((b) => parts.push(`Do not ${b}.`));
  if (!parsed.thin) parts.push("Give a usable result directly unless critical information is missing.");

  return joinEn(parts);
}

function joinZh(parts) {
  return parts
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join("")
    .replace(/。+/g, "。")
    .replace(/([！？])。/g, "$1")
    .trim();
}

function joinEn(parts) {
  return parts
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .map((p) => (/[.!?]$/.test(p) ? p : p + "."))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
