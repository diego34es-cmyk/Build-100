# BUILD-100 — The 100 Websites Project

**一个人 + AI，公开做 100 个网站。** 代码全开源，工作流、成本、翻车、复盘全记录。

**One person + AI, building 100 websites in public.** All code open-sourced — workflow, cost, failures, and debriefs included.

- 主页 / Home: **[build-100.com](https://build-100.com)**
- 追更 / Follow: **[@Jcheng557 on X](https://x.com/Jcheng557)**

## 进度 / Progress: 001 / 100

| # | 站点 | 一句话 | LIVE | SOURCE |
|---|------|--------|------|--------|
| 001 | **COMBO-001** | AI 订阅最优搭配器——30 秒算出预算内最优组合，以及真正满足需求还差多少 | [build-100.com/001](https://build-100.com/001/) | [`/001`](./001) |

## 结构 / Structure

- 每个站一个编号目录（`001/`、`002/`…），纯静态，无构建步骤
- `index.html` 是主站
- 各站的实现规范与决策记录随复盘发布在 X

## 技术底线 / Ground rules

- HTML + Vanilla JS，能不上框架就不上
- 数据文件独立可替换（如 `001/data/models.json`）
- 引擎逻辑纯函数 + `node --test` 测试（如 `001/engine.test.js`，`cd 001 && npm test`）

---

*Est. 2026 · No deadline. Done when it's done.*
