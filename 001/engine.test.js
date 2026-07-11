import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildNeeds, enumerateCombos, scoreCombo, recommend, pickFreebies,
  groupReq, computeGroupCapacity, isFullySatisfied, CAP_KEYS,
} from "./engine.js";
import { readFileSync } from "node:fs";

// 加载真实数据（地基产品表）
const DATA = JSON.parse(readFileSync(new URL("./data/models.json", import.meta.url), "utf8"));
const PRODUCTS = DATA.products;
const PAID = PRODUCTS.filter((p) => p.price > 0);

// ---- 典型需求：推理/编码为主、强度 3 ----
const TYPICAL_ANSWERS = {
  budget: 60,
  intensity: 3,
  scenarios: { reasoning: 8, search: 2, coding: 8, daily: 2 },
  special: { vision: 5, video: 0, audio: 0, ocr: 0 },
};

describe("buildNeeds", () => {
  test("场景滑块 0-10 原值透传为 caps，special 同样透传（滑块方案为作者定稿）", () => {
    const needs = buildNeeds(TYPICAL_ANSWERS);
    assert.equal(needs.budget, 60);
    assert.equal(needs.intensity, 3);
    assert.equal(needs.caps.reasoning, 8);
    assert.equal(needs.caps.coding, 8);
    assert.equal(needs.caps.search, 2);
    assert.equal(needs.caps.daily, 2);
    assert.equal(needs.caps.vision, 5);
    assert.equal(needs.caps.video, 0);
    assert.equal(needs.caps.imageGen, 0, "imageGen v1 不出滑块，默认 0");
  });

  test("预算非法值显式抛错，不静默修正（§4.7-7）", () => {
    for (const bad of [-5, 350, "abc", null, undefined, NaN, 301]) {
      assert.throws(() => buildNeeds({ ...TYPICAL_ANSWERS, budget: bad }), /budget/i);
    }
    assert.doesNotThrow(() => buildNeeds({ ...TYPICAL_ANSWERS, budget: 0 }));
    assert.doesNotThrow(() => buildNeeds({ ...TYPICAL_ANSWERS, budget: 300 }));
  });

  test("intensity 越界抛错", () => {
    for (const bad of [0, 5, 1.5, "x"]) {
      assert.throws(() => buildNeeds({ ...TYPICAL_ANSWERS, intensity: bad }), /intensity/i);
    }
  });
});

describe("enumerateCombos", () => {
  test("生成 1–3 个产品的组合", () => {
    const combos = enumerateCombos(PAID);
    const sizes = combos.map((c) => c.items.length);
    assert(Math.min(...sizes) >= 1 && Math.max(...sizes) <= 3);
    const n = PAID.length;
    const upperBound = n + (n * (n - 1)) / 2 + (n * (n - 1) * (n - 2)) / 6;
    assert(combos.length <= upperBound);
    assert(combos.length >= n);
  });

  test("同一 conflictGroup 不得共存于一个组合（§4.7-5）", () => {
    const combos = enumerateCombos(PAID);
    for (const c of combos) {
      const groups = c.items.map((p) => p.conflictGroup);
      assert.equal(new Set(groups).size, groups.length, `冲突组共存: ${groups.join(",")}`);
    }
  });

  test("每个组合带 price（整数）和分组容量 capCoding/capGeneral", () => {
    const combos = enumerateCombos(PAID);
    for (const c of combos) {
      assert.equal(c.price, c.items.reduce((s, p) => s + p.price, 0));
      assert.equal(Number.isInteger(c.price), true);
      assert(Number.isInteger(c.capCoding) && Number.isInteger(c.capGeneral));
    }
  });
});

describe("r2-2 分组容量模型", () => {
  test("groupReq：滑块档位决定组内容量要求", () => {
    assert.equal(groupReq(3, 0), 0, "无需求 → 0");
    assert.equal(groupReq(3, 10), 3, "重度依赖 → 全强度");
    assert.equal(groupReq(3, 5), 2, "中度 → 强度-1");
    assert.equal(groupReq(3, 2), 1, "轻度 → 1");
    assert.equal(groupReq(1, 5), 1, "下限 1");
  });

  test("同组 ≥2 个付费产品容量 +1（双订阅分流）", () => {
    const claudePro = PRODUCTS.find((p) => p.id === "claude-pro");        // coding 10, capacity 2
    const opencodeGo = PRODUCTS.find((p) => p.id === "opencode-go");      // coding 9, capacity 2
    const servesCoding = (p) => (p.caps.coding ?? 0) >= 8;
    assert.equal(computeGroupCapacity([claudePro], servesCoding), 2, "单订阅 = 自身容量");
    assert.equal(computeGroupCapacity([claudePro, opencodeGo], servesCoding), 3, "双付费编码订阅 +1");
  });

  test("coding-tool 不贡献 general 容量（Cursor Ultra 撑不起聊天负载）", () => {
    const cursorUltra = PRODUCTS.find((p) => p.id === "cursor-ultra");    // capacity 4
    const servesGeneral = (p) => p.category !== "coding-tool";
    assert.equal(computeGroupCapacity([cursorUltra], servesGeneral), 0);
  });

  test("编码 10 级 + 强度 3：单个 $20 聊天订阅不算完全满足，双编码订阅算", () => {
    const needs = buildNeeds({ budget: 40, intensity: 3, scenarios: { reasoning: 2, search: 0, coding: 10, daily: 2 }, special: {} });
    const claudePro = PRODUCTS.find((p) => p.id === "claude-pro");
    const opencodeGo = PRODUCTS.find((p) => p.id === "opencode-go");
    const single = enumerateCombos([claudePro])[0];
    assert.equal(isFullySatisfied(single, needs), false, "coding req=3 > Claude Pro 容量 2");
    const stacked = enumerateCombos([claudePro, opencodeGo]).find((c) => c.items.length === 2);
    assert.equal(isFullySatisfied(stacked, needs), true, "叠加后 coding 容量 3 达标");
  });
});

describe("scoreCombo", () => {
  test("完全满足的组合 coverage=1，capacityFit=1，score=1", () => {
    const needs = buildNeeds({ ...TYPICAL_ANSWERS, intensity: 2 });
    const claudePro = PRODUCTS.find((p) => p.id === "claude-pro");
    const combo = enumerateCombos([claudePro])[0];
    const r = scoreCombo(combo, needs);
    assert.equal(r.coverage, 1);
    assert.equal(r.capacityFit, 1);
    assert.equal(r.score, 1);
  });

  test("coverage 只算 need>0 的能力（need=0 不影响分母）", () => {
    const needs = { budget: 100, intensity: 2, caps: { reasoning: 8, search: 0, coding: 8, daily: 0, vision: 5, imageGen: 0, video: 0, audio: 0, ocr: 0 } };
    const claudePro = PRODUCTS.find((p) => p.id === "claude-pro");
    const combo = enumerateCombos([claudePro])[0];
    assert.equal(scoreCombo(combo, needs).coverage, 1);
  });

  test("capacityFit 阶梯：差 1 档 0.6，差 2 档 0.3，差 3 档 0", () => {
    // 只有 general 需求（daily=8 → req = intensity），用不同容量的单品验证阶梯
    const mkNeeds = (intensity) => buildNeeds({ budget: 60, intensity, scenarios: { reasoning: 0, search: 0, coding: 0, daily: 8 }, special: {} });
    const cap1 = PRODUCTS.find((p) => p.id === "perplexity-free");   // general capacity 1
    const combo = enumerateCombos([cap1])[0];
    assert.equal(scoreCombo(combo, mkNeeds(1)).capacityFit, 1);
    assert.equal(scoreCombo(combo, mkNeeds(2)).capacityFit, 0.6);
    assert.equal(scoreCombo(combo, mkNeeds(3)).capacityFit, 0.3);
    assert.equal(scoreCombo(combo, mkNeeds(4)).capacityFit, 0);
  });
});

describe("recommend — §4.7 不变量", () => {
  test("① primary.price 恒在 [budget-10, budget+10]，fallback 须标明", () => {
    for (const budget of [10, 20, 30, 40, 60, 100, 200, 300]) {
      const res = recommend({ ...TYPICAL_ANSWERS, budget }, PRODUCTS);
      if (res.fallback === "none" || res.fallback === "under-budget") {
        assert(
          res.primary.price >= budget - 10 && res.primary.price <= budget + 10,
          `budget ${budget}: primary ${res.primary.price} 不在 [${budget - 10},${budget + 10}]`
        );
      }
    }
  });

  test("② satisfy 组合恒满足所有 need>0 能力 + 每个需求组容量达标", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    if (res.satisfy) {
      const needs = buildNeeds(TYPICAL_ANSWERS);
      const caps = res.satisfy.combo.caps;
      for (const k of CAP_KEYS) {
        if (needs.caps[k] > 0) assert(caps[k] >= needs.caps[k], `能力 ${k} 未满足`);
      }
      assert(isFullySatisfied(res.satisfy.combo, needs));
    }
  });

  test("③ satisfy.delta === satisfy.price - budget", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    if (res.satisfy) assert.equal(res.satisfy.delta, res.satisfy.price - TYPICAL_ANSWERS.budget);
  });

  test("④ intensity=4 重编码时，satisfy 的编码组容量必须 ≥4", () => {
    const res = recommend({ ...TYPICAL_ANSWERS, intensity: 4 }, PRODUCTS);
    if (res.satisfy) assert(res.satisfy.combo.capCoding >= 4, "satisfy 编码容量必须≥4");
  });

  test("⑤ 同 conflictGroup 不得出现在任意结果组合中", () => {
    for (const budget of [20, 60, 100, 200]) {
      const res = recommend({ ...TYPICAL_ANSWERS, budget }, PRODUCTS);
      for (const slot of [res.primary, res.satisfy, res.alternate]) {
        if (!slot) continue;
        const groups = slot.combo.items.map((p) => p.conflictGroup);
        assert.equal(new Set(groups).size, groups.length);
      }
    }
  });

  test("⑥ 预算 $0 → fallback='free-only'，primary 全部 price=0", () => {
    const res = recommend({ ...TYPICAL_ANSWERS, budget: 0 }, PRODUCTS);
    assert.equal(res.fallback, "free-only");
    for (const p of res.primary.combo.items) assert.equal(p.price, 0);
  });

  test("⑦ 非法预算抛错，不静默（recommend 层）", () => {
    for (const bad of [-5, 350, "abc"]) {
      assert.throws(() => recommend({ ...TYPICAL_ANSWERS, budget: bad }, PRODUCTS), /budget/i);
    }
  });

  test("⑧ 所有金额输出为整数", () => {
    for (const budget of [0, 7, 20, 33, 60, 100, 200, 300]) {
      const res = recommend({ ...TYPICAL_ANSWERS, budget }, PRODUCTS);
      assert(Number.isInteger(res.primary.price));
      if (res.satisfy) {
        assert(Number.isInteger(res.satisfy.price));
        assert(Number.isInteger(res.satisfy.delta));
      }
      if (res.alternate) assert(Number.isInteger(res.alternate.price));
    }
  });
});

describe("recommend — r2 新行为", () => {
  test("r2-1 组合（primary/satisfy/alternate）不含免费产品", () => {
    for (const budget of [20, 60, 100, 200]) {
      const res = recommend({ ...TYPICAL_ANSWERS, budget }, PRODUCTS);
      for (const slot of [res.primary, res.satisfy, res.alternate]) {
        if (!slot) continue;
        for (const p of slot.combo.items) assert(p.price > 0, `付费组合混入免费产品 ${p.id}`);
      }
    }
  });

  test("r2-1 freebies：只含免费产品，与主方案不同 conflictGroup，≤3 个", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    assert(Array.isArray(res.freebies) && res.freebies.length <= 3);
    const usedGroups = new Set(res.primary.combo.items.map((p) => p.conflictGroup));
    for (const f of res.freebies) {
      assert.equal(f.price, 0);
      assert(!usedGroups.has(f.conflictGroup), `freebie ${f.id} 与主方案冲突`);
    }
  });

  test("r3 回归：LV.4 顶格用户不能被 \$40 的中档组合糊弄成'已经够用'", () => {
    // 作者实测抓到的荒谬案例：预算40 + 每天4次顶格还不够用 + 推理7/搜索6/编码7/日常6/看图5
    // 旧行为：ChatGPT Go + Kimi Allegretto ≈ \$37 → merged=true（"已经够用"）
    const res = recommend(
      { budget: 40, intensity: 4, scenarios: { reasoning: 7, search: 6, coding: 7, daily: 6 }, special: { vision: 5, video: 0, audio: 0, ocr: 0 } },
      PRODUCTS
    );
    assert.equal(res.merged, false, "LV.4 重度需求绝不可能被 \$50 以内组合完全满足");
    assert(res.satisfy, "必须给出真正的满足方案");
    assert(res.satisfy.price >= 100, `满足 LV.4 的方案不可能低于 \$100，实际: \$${res.satisfy.price}`);
    assert(res.satisfy.delta > 0, "必须明确告知需要加钱");
  });

  test("r3 叠容量到 4（顶格）要求两个 ≥3 级订阅；3+2 只能到 3", () => {
    const servesGeneral = (p) => p.category !== "coding-tool";
    const max5x = PRODUCTS.find((p) => p.id === "claude-max-5x");        // capacity 3
    const andante = PRODUCTS.find((p) => p.id === "kimi-andante");       // capacity 2
    const pro100 = PRODUCTS.find((p) => p.id === "chatgpt-pro-100");     // capacity 3
    assert.equal(computeGroupCapacity([max5x, andante], servesGeneral), 3, "3+2 不能凑顶格");
    assert.equal(computeGroupCapacity([max5x, pro100], servesGeneral), 4, "3+3 = 两个 5x 级 ≈ 顶格");
  });

  test("r2-2 编码 10 级 + 强度 3 + 低预算 → satisfy 用双编码订阅叠容量（如 Claude Pro + OpenCode Go）", () => {
    const res = recommend(
      { budget: 30, intensity: 3, scenarios: { reasoning: 2, search: 0, coding: 10, daily: 2 }, special: {} },
      PRODUCTS
    );
    const target = res.merged ? res.primary : res.satisfy;
    assert(target, "必须给出满足方案");
    const codingServers = target.combo.items.filter((p) => (p.caps.coding ?? 0) >= 8 && p.price > 0);
    assert(codingServers.length >= 2, `期望 ≥2 个付费编码订阅叠加，实际: ${target.combo.items.map((p) => p.name).join(" + ")}`);
    assert(target.combo.capCoding >= 3, "编码组容量须 ≥3");
  });
});

describe("recommend — §4.5 边界情况", () => {
  test("边界1: 勉强方案已完全满足 → merged=true，satisfy=null", () => {
    const res = recommend(
      { budget: 20, intensity: 1, scenarios: { reasoning: 2, search: 2, coding: 8, daily: 2 }, special: { vision: 0, video: 0, audio: 0, ocr: 0 } },
      PRODUCTS
    );
    assert.equal(res.merged, true);
    assert.equal(res.satisfy, null);
  });

  test("边界3: delta≤0（预算给多了）→ satisfy 存在且 delta≤0", () => {
    const res = recommend(
      { budget: 300, intensity: 1, scenarios: { reasoning: 2, search: 2, coding: 8, daily: 2 }, special: { vision: 0, video: 0, audio: 0, ocr: 0 } },
      PRODUCTS
    );
    if (res.satisfy) assert(res.satisfy.delta <= 0, `期望 delta<=0，得到 ${res.satisfy.delta}`);
  });

  test("边界4: 预算 $0 → primary 全免费，satisfy 照常给出", () => {
    const res = recommend({ ...TYPICAL_ANSWERS, budget: 0 }, PRODUCTS);
    assert.equal(res.fallback, "free-only");
    if (res.satisfy) assert(res.satisfy.delta > 0, "预算0 时满足方案 delta 应>0");
  });

  test("边界2: audio=10 但无产品能给（市面最高 9）→ fallback='unsatisfiable'，satisfy=null", () => {
    assert(PRODUCTS.every((p) => p.caps.audio < 10), "数据前提变化：已有产品 audio=10，请换一个无解维度");
    const res = recommend(
      { budget: 200, intensity: 2, scenarios: { reasoning: 8, search: 2, coding: 2, daily: 2 }, special: { vision: 0, video: 0, audio: 10, ocr: 0 } },
      PRODUCTS
    );
    assert.equal(res.fallback, "unsatisfiable");
    assert.equal(res.satisfy, null);
  });
});

describe("recommend — 附加完整性", () => {
  test("primary 带 reasons（模板生成，含 codingStacked 标记）", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    assert(typeof res.primary.reasons === "object");
    assert(typeof res.primary.reasons.codingStacked === "boolean");
  });

  test("alternate 是勉强方案的次优解（≠ primary）", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    if (res.alternate) {
      assert.notDeepEqual(
        res.alternate.combo.items.map((p) => p.id).sort(),
        res.primary.combo.items.map((p) => p.id).sort()
      );
    }
  });
});
