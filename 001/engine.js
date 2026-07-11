// engine.js — COMBO-001 推荐引擎（纯函数，无 DOM 依赖）
// 规范依据：combo-001-实施规范.md §4 + r2 修订（2026-07-11 作者拍板）：
//   r2-1 组合只由付费产品构成；免费产品作为"附赠层"单独推荐（freebies）
//   r2-2 容量按维度分组判定（coding / general），同组多个付费订阅可叠加容量
//        —— 编码 10 级的重度用户，答案可以是 Claude Pro + OpenCode Go 双订阅
// 全部纯函数：输入（用户答案 + products）→ 输出（推荐结果对象），可被 node --test 直接测试。

export const CAP_KEYS = ["reasoning", "search", "coding", "daily", "vision", "imageGen", "video", "audio", "ocr"];
const GENERAL_KEYS = CAP_KEYS.filter((k) => k !== "coding");

// ────────────────────────────────────────────────────────────
// §4.1 buildNeeds —— 把用户 4 项输入转成统一 needs 对象
// answers: { budget, intensity, scenarios: {reasoning,search,coding,daily}, special: {vision,video,audio,ocr} }
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

  // §3.3/3.4 滑块 0–10 原值透传（0 = 不需要），滑块方案为作者定稿
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
// r2-2 维度分组容量模型
// coding 组：caps.coding ≥ 8 的产品都能扛编码负载（含带 Claude Code/Codex 的聊天订阅）
// general 组：聊天/搜索/社交类产品（coding-tool 扛不了日常聊天）
// ────────────────────────────────────────────────────────────
const servesCoding = (p) => (p.caps.coding ?? 0) >= 8;
const servesGeneral = (p) => p.category !== "coding-tool";

// 组内需求档位 → 该组要求的容量档位（滑块高低本身就是该维度的强度信号）
export function groupReq(intensity, needMax) {
  if (needMax <= 0) return 0;            // 不需要该组
  if (needMax >= 7) return intensity;    // 重度依赖：全强度要求
  if (needMax >= 4) return Math.max(1, intensity - 1);
  return 1;                              // 轻度：有就行
}

// 组容量：组内最强产品容量；≥2 个付费产品可分流 +1，上限 4
export function computeGroupCapacity(items, serves) {
  const serving = items.filter(serves);
  if (!serving.length) return 0;
  let cap = Math.max(...serving.map((p) => p.capacity));
  if (serving.filter((p) => p.price > 0).length >= 2) cap = Math.min(4, cap + 1);
  return cap;
}

function groupNeeds(needs) {
  const codingNeed = needs.caps.coding;
  const generalNeed = Math.max(...GENERAL_KEYS.map((k) => needs.caps[k]));
  return {
    coding: { needMax: codingNeed, weight: codingNeed, req: groupReq(needs.intensity, codingNeed) },
    general: {
      needMax: generalNeed,
      weight: GENERAL_KEYS.reduce((s, k) => s + needs.caps[k], 0),
      req: groupReq(needs.intensity, generalNeed),
    },
  };
}

const FIT_LADDER = [1, 0.6, 0.3, 0]; // 差 0/1/2/3 档

function groupFit(capacity, req) {
  if (req <= 0) return null; // 该组无需求，不参与
  const diff = req - capacity;
  return diff <= 0 ? 1 : FIT_LADDER[diff] ?? 0;
}

// ────────────────────────────────────────────────────────────
// §4.2 enumerateCombos —— 暴力枚举 1–3 个产品的组合
// 传入什么就枚举什么（recommend 内部只传付费产品，r2-1）
// ────────────────────────────────────────────────────────────
export function enumerateCombos(products) {
  const combos = [];
  const n = products.length;
  for (let i = 0; i < n; i++) pushCombo(combos, [products[i]]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (conflicts(products[i], products[j])) continue;
      pushCombo(combos, [products[i], products[j]]);
    }
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

// §4.3 组合能力/价格；容量改为分组模型（r2-2），此处存两组容量
function pushCombo(out, items) {
  const caps = {};
  for (const k of CAP_KEYS) caps[k] = Math.max(...items.map((p) => p.caps[k] ?? 0)); // 能力取最强者
  const price = items.reduce((s, p) => s + p.price, 0); // §2 整数运算
  const capCoding = computeGroupCapacity(items, servesCoding);
  const capGeneral = computeGroupCapacity(items, servesGeneral);
  out.push({ items, price, caps, capCoding, capGeneral });
}

// ────────────────────────────────────────────────────────────
// §4.4 scoreCombo —— 打分（容量项 = 各需求组 fit 的需求加权平均）
// ────────────────────────────────────────────────────────────
export function scoreCombo(combo, needs) {
  let covered = 0;
  let wanted = 0;
  for (const k of CAP_KEYS) {
    if (needs.caps[k] > 0) {
      wanted += needs.caps[k];
      covered += Math.min(combo.caps[k], needs.caps[k]);
    }
  }
  const coverage = wanted > 0 ? covered / wanted : 1;

  const g = groupNeeds(needs);
  const fits = [];
  const fCoding = groupFit(combo.capCoding ?? 0, g.coding.req);
  if (fCoding !== null) fits.push({ fit: fCoding, w: g.coding.weight });
  const fGeneral = groupFit(combo.capGeneral ?? 0, g.general.req);
  if (fGeneral !== null) fits.push({ fit: fGeneral, w: g.general.weight });
  const wSum = fits.reduce((s, f) => s + f.w, 0);
  const capacityFit = fits.length && wSum > 0 ? fits.reduce((s, f) => s + f.fit * f.w, 0) / wSum : 1;

  const score = coverage * 0.65 + capacityFit * 0.35;
  return { coverage: round4(coverage), capacityFit: round4(capacityFit), score: round4(score) };
}

const round4 = (x) => Math.round(x * 10000) / 10000;

// §4.5 "完全满足"：所有 need>0 能力 ≥ 需求值，且每个有需求的组容量 ≥ 该组要求
export function isFullySatisfied(combo, needs) {
  for (const k of CAP_KEYS) {
    if (needs.caps[k] > 0 && combo.caps[k] < needs.caps[k]) return false;
  }
  const g = groupNeeds(needs);
  if (g.coding.req > 0 && (combo.capCoding ?? 0) < g.coding.req) return false;
  if (g.general.req > 0 && (combo.capGeneral ?? 0) < g.general.req) return false;
  return true;
}

// ────────────────────────────────────────────────────────────
// r2-1 附赠层：与组合不冲突、能补需求的免费产品（最多 3 个）
// ────────────────────────────────────────────────────────────
export function pickFreebies(needs, comboItems, products) {
  const usedGroups = new Set(comboItems.map((p) => p.conflictGroup).filter(Boolean));
  const scored = products
    .filter((p) => p.price === 0 && !usedGroups.has(p.conflictGroup))
    .map((p) => {
      let rel = 0;
      for (const k of CAP_KEYS) {
        if (needs.caps[k] > 0) rel += Math.min(p.caps[k] ?? 0, needs.caps[k]);
      }
      return { p, rel };
    })
    .filter((x) => x.rel > 0)
    .sort((a, b) => b.rel - a.rel);
  // 附赠层内部也不重复同 conflictGroup
  const out = [];
  const seen = new Set();
  for (const { p } of scored) {
    if (seen.has(p.conflictGroup)) continue;
    seen.add(p.conflictGroup);
    out.push(p);
    if (out.length >= 3) break;
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// §4.5 两段式输出 + §4.6 recommend 主入口
// ────────────────────────────────────────────────────────────
export function recommend(answers, products) {
  const needs = buildNeeds(answers); // 也会校验 budget（§4.7-7）
  const paid = products.filter((p) => p.price > 0); // r2-1：组合只由付费产品构成
  const all = enumerateCombos(paid).map((c) => ({ ...c, ...scoreCombo(c, needs) }));

  // ===== 第一段 · 勉强方案（预算 ±10 内最优）=====
  let primary = null;
  let fallback = "none";
  let pool;
  if (needs.budget === 0) {
    // §4.7-⑥：预算 $0 → 免费产品堆一个伪组合（附赠层逻辑复用）
    const frees = pickFreebies(needs, [], products);
    const items = frees.length ? frees : products.filter((p) => p.price === 0).slice(0, 1);
    const tmp = [];
    pushCombo(tmp, items);
    primary = { ...tmp[0], ...scoreCombo(tmp[0], needs) };
    pool = [primary];
    fallback = "free-only";
  } else {
    const within = all.filter((c) => Math.abs(c.price - needs.budget) <= 10);
    if (within.length) {
      pool = within;
      primary = pickBest(within);
    } else {
      const under = all.filter((c) => c.price <= needs.budget + 10).sort(byScoreThenPrice);
      if (under.length) {
        pool = under;
        primary = under[0];
        fallback = "under-budget";
      } else {
        const frees = pickFreebies(needs, [], products);
        const tmp = [];
        pushCombo(tmp, frees.length ? frees : products.filter((p) => p.price === 0).slice(0, 1));
        primary = { ...tmp[0], ...scoreCombo(tmp[0], needs) };
        pool = [primary];
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
    merged = true;
  } else if (fullySatisfy.length) {
    const s = fullySatisfy[0];
    satisfy = { combo: toComboView(s), price: s.price, delta: s.price - needs.budget };
  } else {
    fallback = "unsatisfiable";
  }

  // r2-1 附赠层：基于主方案挑不冲突的免费产品（免费伪组合模式下不再重复推）
  const freebies = fallback === "free-only" ? [] : pickFreebies(needs, primary.items, products);

  return {
    primary: { combo: toComboView(primary), price: primary.price, score: primary.score, reasons: primary.reasons },
    satisfy,
    merged,
    fallback,
    alternate,
    freebies,
  };
}

// 工具：排序与选择
const byScoreThenPrice = (a, b) => b.score - a.score || a.price - b.price;
const byPriceThenScore = (a, b) => a.price - b.price || b.score - a.score;

function pickBest(list) {
  return [...list].sort(byScoreThenPrice)[0];
}

// 组合产品集合相等性
function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = a.map((p) => p.id).sort();
  const sb = b.map((p) => p.id).sort();
  return sa.every((id, i) => id === sb[i]);
}

// 对外 combo 视图（保留 caps 与分组容量供 UI/断言用）
function toComboView(c) {
  return { items: c.items, price: c.price, caps: c.caps, capCoding: c.capCoding, capGeneral: c.capGeneral };
}

// ────────────────────────────────────────────────────────────
// §4.5 附加输出 · "为什么这个组合最优"（模板生成，不调 LLM）
// ────────────────────────────────────────────────────────────
export function buildReasons(combo, needs) {
  const met = [];
  const gap = [];
  for (const k of CAP_KEYS) {
    if (needs.caps[k] > 0) {
      (combo.caps[k] >= needs.caps[k] ? met : gap).push(k);
    }
  }
  const g = groupNeeds(needs);
  const capacityOk =
    (g.coding.req <= 0 || (combo.capCoding ?? 0) >= g.coding.req) &&
    (g.general.req <= 0 || (combo.capGeneral ?? 0) >= g.general.req);
  // 编码组是否靠双订阅叠加达标（给 UI 讲故事用）
  const codingStacked = g.coding.req > 0 && combo.items.filter((p) => servesCoding(p) && p.price > 0).length >= 2;
  const coveragePct = Math.round((met.length / Math.max(1, met.length + gap.length)) * 100);
  return { met, gap, capacityOk, codingStacked, coveragePct, intensity: needs.intensity };
}
