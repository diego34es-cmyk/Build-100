// engine.js — COMBO-001 推荐引擎（纯函数，无 DOM 依赖）
// 规范依据：combo-001-实施规范.md §4
// 全部纯函数：输入（用户答案 + products）→ 输出（推荐结果对象），可被 node --test 直接测试。

export const CAP_KEYS = ["reasoning", "search", "coding", "daily", "vision", "imageGen", "video", "audio", "ocr"];

// ────────────────────────────────────────────────────────────
// §4.1 buildNeeds —— 把用户 4 项输入转成统一 needs 对象
// answers: { budget, intensity, scenarios: string[], special: {vision,video,audio,ocr} }
// ────────────────────────────────────────────────────────────
export function buildNeeds(answers) {
  const { budget, intensity, scenarios = {}, special = {} } = answers;

  // §4.7-7：非法输入显式报错，不静默修正或截断
  if (budget === null || budget === undefined || budget === "" || Number.isNaN(Number(budget)) || !Number.isFinite(Number(budget))) {
    throw new Error("budget must be a finite number");
  }
  const b = Number(budget);
  if (!Number.isInteger(b) || b < 0 || b > 300) {
    throw new Error("budget must be an integer in [0, 300]");
  }

  const it = Number(intensity);
  if (!Number.isInteger(it) || it < 1 || it > 4) {
    throw new Error("intensity must be an integer in [1, 4]");
  }

  // §3.3 场景 & §3.4 特殊能力：均为 0–10 滑块，值直接作为能力需求（0 = 不需要）
  // （原"选中=8/未选=2"的多选映射已改为滑块，由用户直接给出 0–10）
  const caps = {
    reasoning: clamp0_10(scenarios.reasoning),
    search: clamp0_10(scenarios.search),
    coding: clamp0_10(scenarios.coding),
    daily: clamp0_10(scenarios.daily),
    vision: clamp0_10(special.vision),
    video: clamp0_10(special.video),
    audio: clamp0_10(special.audio),
    ocr: clamp0_10(special.ocr),
    imageGen: 0, // v1 不出滑块，恒 0
  };

  return { budget: b, intensity: it, caps };
}

function clamp0_10(v) {
  if (v === null || v === undefined || v === "" || Number.isNaN(Number(v))) return 0;
  return Math.max(0, Math.min(10, Math.round(Number(v))));
}

// ────────────────────────────────────────────────────────────
// §4.2 enumerateCombos —— 暴力枚举 1–3 个产品的组合
// §4.5 约束：同一 conflictGroup 不得共存
// ────────────────────────────────────────────────────────────
export function enumerateCombos(products) {
  const combos = [];
  const n = products.length;
  // 1-元组
  for (let i = 0; i < n; i++) pushCombo(combos, [products[i]]);
  // 2-元组
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (conflicts(products[i], products[j])) continue;
      pushCombo(combos, [products[i], products[j]]);
    }
  // 3-元组
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (conflicts(products[i], products[j])) continue;
      for (let k = j + 1; k < n; k++) {
        if (conflicts(products[i], products[k]) || conflicts(products[j], products[k])) continue;
        pushCombo(combos, [products[i], products[j], products[k]]);
      }
    }
  return combos;
}

function conflicts(a, b) {
  return a.conflictGroup === b.conflictGroup && !!a.conflictGroup;
}

// §4.3 组合能力/容量/价格
function pushCombo(out, items) {
  const caps = {};
  for (const k of CAP_KEYS) caps[k] = Math.max(...items.map((p) => p.caps[k] ?? 0)); // 能力取最强者
  const price = items.reduce((s, p) => s + p.price, 0); // §2 整数运算
  // §4.3 容量：取最大；≥2 个付费聊天类则 +1，上限 4
  const chatPaid = items.filter((p) => p.category === "chat" && p.price > 0);
  let capacity = Math.max(...items.map((p) => p.capacity));
  if (chatPaid.length >= 2) capacity = Math.min(4, capacity + 1);
  out.push({ items, price, capacity, caps });
}

// ────────────────────────────────────────────────────────────
// §4.4 scoreCombo —— 打分
// ────────────────────────────────────────────────────────────
export function scoreCombo(combo, needs) {
  // 能力覆盖率：只算 need>0 的能力，加权（权重即需求值）
  let covered = 0;
  let wanted = 0;
  for (const k of CAP_KEYS) {
    if (needs.caps[k] > 0) {
      wanted += needs.caps[k];
      covered += Math.min(combo.caps[k], needs.caps[k]);
    }
  }
  const coverage = wanted > 0 ? covered / wanted : 1;

  // 容量匹配分档
  const diff = needs.intensity - combo.capacity;
  const capacityFit = diff <= 0 ? 1 : [0, 0.6, 0.3, 0][diff] ?? 0;

  const score = coverage * 0.65 + capacityFit * 0.35;
  return { coverage: round4(coverage), capacityFit: round4(capacityFit), score: round4(score) };
}

const round4 = (x) => Math.round(x * 10000) / 10000;

// ────────────────────────────────────────────────────────────
// §4.5 两段式输出 + §4.6 recommend 主入口
// ────────────────────────────────────────────────────────────
export function recommend(answers, products) {
  const needs = buildNeeds(answers); // 也会校验 budget（§4.7-7）
  const all = enumerateCombos(products).map((c) => ({ ...c, ...scoreCombo(c, needs) }));

  // ===== 第一段 · 勉强方案（预算 ±10 内最优）=====
  let primary = null;
  let fallback = "none";
  // 候选池：用于选备选方案。budget=0 时只有免费组合当候选。
  let pool;
  // §4.7-⑥：预算 $0 是硬边界 —— 只出免费组合并标 free-only（即便 price=0 落在 ±10 区间也不走 within 分支）
  if (needs.budget === 0) {
    pool = all.filter((c) => c.items.every((p) => p.price === 0)).sort(byScoreThenPrice);
    primary = pool[0];
    fallback = "free-only";
  } else {
    const within = all.filter((c) => Math.abs(c.price - needs.budget) <= 10);
    if (within.length) {
      pool = within;
      primary = pickBest(within);
    } else {
      // 无任何组合落在 ±10：取 price ≤ budget+10 中最优
      const under = all.filter((c) => c.price <= needs.budget + 10).sort(byScoreThenPrice);
      if (under.length) {
        pool = under;
        primary = under[0];
        fallback = "under-budget";
      } else {
        // 连 budget+10 都没有（极端）：全免费组合
        pool = all.filter((c) => c.items.every((p) => p.price === 0)).sort(byScoreThenPrice);
        primary = pool[0];
        fallback = "free-only";
      }
    }
  }

  primary.reasons = buildReasons(primary, needs);

  // 备选：同候选池内、去掉 primary 后的次优解
  let alternate = null;
  const poolRest = pool.filter((c) => !sameSet(c.items, primary.items)).sort(byScoreThenPrice);
  if (poolRest.length) alternate = { combo: toComboView(poolRest[0]), price: poolRest[0].price, score: poolRest[0].score };

  // ===== 第二段 · 满足方案（完全满足中最便宜）=====
  const fullySatisfy = all.filter((c) => isFullySatisfied(c, needs)).sort(byPriceThenScore);
  const primarySatisfied = isFullySatisfied(primary, needs);

  let satisfy = null;
  let merged = false;

  if (primarySatisfied) {
    // 边界情况 1：勉强方案本身已完全满足 → 两段合并
    merged = true;
  } else if (fullySatisfy.length) {
    const s = fullySatisfy[0];
    satisfy = { combo: toComboView(s), price: s.price, delta: s.price - needs.budget };
  } else {
    // 边界情况 2：不存在任何完全满足的组合
    fallback = "unsatisfiable";
  }

  return {
    primary: { combo: toComboView(primary), price: primary.price, score: primary.score, reasons: primary.reasons },
    satisfy,
    merged,
    fallback,
    alternate,
  };
}

// 工具：排序与选择
const byScoreThenPrice = (a, b) => b.score - a.score || a.price - b.price;
const byPriceThenScore = (a, b) => a.price - b.price || b.score - a.score;

function pickBest(list) {
  return [...list].sort(byScoreThenPrice)[0];
}

// §4.5 "完全满足"定义：所有 need>0 能力 ≥ 需求值，且容量 ≥ intensity
function isFullySatisfied(combo, needs) {
  for (const k of CAP_KEYS) {
    if (needs.caps[k] > 0 && combo.caps[k] < needs.caps[k]) return false;
  }
  return combo.capacity >= needs.intensity;
}

// 组合产品集合相等性
function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = a.map((p) => p.id).sort();
  const sb = b.map((p) => p.id).sort();
  return sa.every((id, i) => id === sb[i]);
}

// 剥离打分中间字段，返回干净的对外 combo 视图（保留 caps/capacity 供 UI 与断言用）
function toComboView(c) {
  return { items: c.items, price: c.price, capacity: c.capacity, caps: c.caps };
}

// ────────────────────────────────────────────────────────────
// §4.5 附加输出 · "为什么这个组合最优"（模板生成，不调 LLM）
// 返回结构化对象，UI 层按 lang 渲染成 2-3 句
// ────────────────────────────────────────────────────────────
export function buildReasons(combo, needs) {
  const met = [];
  const gap = [];
  for (const k of CAP_KEYS) {
    if (needs.caps[k] > 0) {
      (combo.caps[k] >= needs.caps[k] ? met : gap).push(k);
    }
  }
  const capacityOk = combo.capacity >= needs.intensity;
  const coveragePct = Math.round((met.length / Math.max(1, met.length + gap.length)) * 100);
  return { met, gap, capacityOk, coveragePct, intensity: needs.intensity, capacity: combo.capacity };
}
