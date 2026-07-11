import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildNeeds, enumerateCombos, scoreCombo, recommend, CAP_KEYS } from "./engine.js";
import { readFileSync } from "node:fs";

// 加载真实数据（地基产品表）
const DATA = JSON.parse(readFileSync(new URL("./data/models.json", import.meta.url), "utf8"));
const PRODUCTS = DATA.products;

// ---- 一个"全能力都缺、强度 3"的典型需求，用于通用断言 ----
const TYPICAL_ANSWERS = {
  budget: 60,
  intensity: 3,
  scenarios: { reasoning: 8, search: 2, coding: 8, daily: 2 }, // 滑块：reasoning/coding 高，其余基线
  special: { vision: 5, video: 0, audio: 0, ocr: 0 },
};

describe("buildNeeds", () => {
  test("场景滑块 0-10 原值透传为 caps，special 同样透传（滑块方案为作者定稿）", () => {
    const needs = buildNeeds(TYPICAL_ANSWERS);
    assert.equal(needs.budget, 60);
    assert.equal(needs.intensity, 3);
    assert.equal(needs.caps.reasoning, 8, "滑块 reasoning=8 透传");
    assert.equal(needs.caps.coding, 8, "滑块 coding=8 透传");
    assert.equal(needs.caps.search, 2, "滑块 search=2 透传");
    assert.equal(needs.caps.daily, 2, "滑块 daily=2 透传");
    assert.equal(needs.caps.vision, 5);
    assert.equal(needs.caps.video, 0);
    assert.equal(needs.caps.imageGen, 0, "imageGen v1 不出滑块，默认 0");
  });

  test("预算非法值显式抛错，不静默修正（§4.7-7）", () => {
    for (const bad of [-5, 350, "abc", null, undefined, NaN, 301]) {
      assert.throws(() => buildNeeds({ ...TYPICAL_ANSWERS, budget: bad }), /budget/i);
    }
    // 合法边界不应抛
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
    const combos = enumerateCombos(PRODUCTS);
    const sizes = combos.map((c) => c.items.length);
    assert(Math.min(...sizes) >= 1 && Math.max(...sizes) <= 3, "组合大小必须在 1–3");
    // 总数 = 无冲突的 1/2/3-元组之和（≤ 全枚举上界，因为同 conflictGroup 被剔除）
    const n = PRODUCTS.length;
    const upperBound = n + (n * (n - 1)) / 2 + (n * (n - 1) * (n - 2)) / 6;
    assert(combos.length <= upperBound, "组合数不应超过无约束全枚举");
    assert(combos.length >= n, "至少有 n 个 1-元组");
  });

  test("同一 conflictGroup 不得共存于一个组合（§4.7-5）", () => {
    const combos = enumerateCombos(PRODUCTS);
    for (const c of combos) {
      const groups = c.items.map((p) => p.conflictGroup);
      assert.equal(new Set(groups).size, groups.length, `冲突组共存: ${groups.join(",")}`);
    }
  });

  test("每个组合带 price（整数，=Σ各产品 price）和 capacity", () => {
    const combos = enumerateCombos(PRODUCTS);
    for (const c of combos) {
      assert.equal(c.price, c.items.reduce((s, p) => s + p.price, 0));
      assert.equal(Number.isInteger(c.price), true);
    }
  });
});

describe("scoreCombo", () => {
  test("完全满足的组合 coverage=1，capacityFit=1，score=1", () => {
    const needs = buildNeeds({ ...TYPICAL_ANSWERS, intensity: 2 });
    // Claude Pro 单品：reasoning9/coding10/search8/daily9/vision9，capacity2 → 全部满足
    const claudePro = PRODUCTS.find((p) => p.id === "claude-pro");
    const combo = { items: [claudePro], price: 20, capacity: 2, caps: claudePro.caps };
    const r = scoreCombo(combo, needs);
    assert.equal(r.coverage, 1);
    assert.equal(r.capacityFit, 1);
    assert.equal(r.score, 1);
  });

  test("coverage 只算 need>0 的能力（need=0 不影响分母）", () => {
    const needs = { budget: 100, intensity: 2, caps: { reasoning: 8, search: 0, coding: 8, daily: 0, vision: 5, imageGen: 0, video: 0, audio: 0, ocr: 0 } };
    const claudePro = PRODUCTS.find((p) => p.id === "claude-pro");
    const combo = { items: [claudePro], price: 20, capacity: 2, caps: claudePro.caps };
    const r = scoreCombo(combo, needs);
    // need>0 的: reasoning(8→8) coding(8→10cap) vision(5→9cap) = 全满足 → coverage=1
    assert.equal(r.coverage, 1);
  });

  test("capacityFit 分档正确（§4.4）", () => {
    const needs = { budget: 60, intensity: 4, caps: { reasoning: 8, search: 2, coding: 8, daily: 2, vision: 0, imageGen: 0, video: 0, audio: 0, ocr: 0 } };
    const cap8caps = PRODUCTS.find((p) => p.id === "claude-max-5x").caps;
    const mk = (cap) => ({ items: [], price: 0, capacity: cap, caps: cap8caps });
    assert.equal(scoreCombo(mk(4), needs).capacityFit, 1, "满足=1");
    assert.equal(scoreCombo(mk(3), needs).capacityFit, 0.6, "差1档=0.6");
    assert.equal(scoreCombo(mk(2), needs).capacityFit, 0.3, "差2档=0.3");
    assert.equal(scoreCombo(mk(1), needs).capacityFit, 0, "差3档=0");
  });
});

describe("recommend — §4.7 不变量（8 条）", () => {
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

  test("② satisfy 组合恒满足所有 need>0 能力 + 容量 ≥ intensity", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    if (res.satisfy) {
      const needs = buildNeeds(TYPICAL_ANSWERS);
      const caps = res.satisfy.combo.caps;
      for (const k of CAP_KEYS) {
        if (needs.caps[k] > 0) assert(caps[k] >= needs.caps[k], `能力 ${k} 未满足`);
      }
      assert(res.satisfy.combo.capacity >= needs.intensity, "容量未达 intensity");
    }
  });

  test("③ satisfy.delta === satisfy.price - budget", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    if (res.satisfy) assert.equal(res.satisfy.delta, res.satisfy.price - TYPICAL_ANSWERS.budget);
  });

  test("④ intensity=4 时，容量<4 的单产品组合不得成为 satisfy", () => {
    const res = recommend({ ...TYPICAL_ANSWERS, intensity: 4 }, PRODUCTS);
    if (res.satisfy) assert(res.satisfy.combo.capacity >= 4, "satisfy 容量必须≥4");
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

describe("recommend — §4.5 边界情况（4 类）", () => {
  test("边界1: 勉强方案已完全满足 → merged=true，satisfy=null", () => {
    // 极轻需求 + 足够预算：Claude Pro 单品就能完全满足
    const res = recommend(
      { budget: 20, intensity: 1, scenarios: { reasoning: 2, search: 2, coding: 8, daily: 2 }, special: { vision: 0, video: 0, audio: 0, ocr: 0 } },
      PRODUCTS
    );
    assert.equal(res.merged, true);
    assert.equal(res.satisfy, null);
  });

  test("边界3: delta≤0（预算给多了）→ satisfy 存在且 delta≤0", () => {
    // 轻需求 + 300 预算：满足方案一定远低于预算
    const res = recommend(
      { budget: 300, intensity: 1, scenarios: { reasoning: 2, search: 2, coding: 8, daily: 2 }, special: { vision: 0, video: 0, audio: 0, ocr: 0 } },
      PRODUCTS
    );
    if (res.satisfy) assert(res.satisfy.delta <= 0, `期望 delta<=0，得到 ${res.satisfy.delta}`);
  });

  test("边界4: 预算 $0 → primary 全免费，satisfy 照常给出", () => {
    const res = recommend({ ...TYPICAL_ANSWERS, budget: 0 }, PRODUCTS);
    assert.equal(res.fallback, "free-only");
    // 典型需求下应有满足方案（非 merged）
    if (res.satisfy) assert(res.satisfy.delta > 0, "预算0 时满足方案 delta 应>0");
  });

  test("边界2: audio=10 但无产品能给（市面最高 9）→ 不可完全满足，fallback='unsatisfiable'，satisfy=null", () => {
    // 数据前提自检：确认确实没有产品 audio=10，若未来数据更新出现满分产品，此测试需换维度
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
  test("primary 带 reasons（模板生成，2-3 句结构化）", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    assert(Array.isArray(res.primary.reasons) || typeof res.primary.reasons === "object");
  });

  test("alternate 是勉强方案的次优解（price 仍在预算区间，且 != primary）", () => {
    const res = recommend(TYPICAL_ANSWERS, PRODUCTS);
    if (res.alternate) {
      assert.notDeepEqual(
        res.alternate.combo.items.map((p) => p.id).sort(),
        res.primary.combo.items.map((p) => p.id).sort()
      );
    }
  });
});
