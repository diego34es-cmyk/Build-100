# 新项目评分

评分：痛点契合（0–5）+ 已有证据（0–5）+ 一人可维护（0–5）+ 红线安全（0–5）。满分 20。不做无关 SaaS。

| # | 项目 | 分 | 为何 |
|---|------|----|------|
| 1 | **PAPER GRID** 纸面网格表 | 18 | N1×多项目；实现小；无下单。**本 PR 已做 MVP**：`lab/paper-grid` |
| 2 | **ES-HOUSING** 住房阶段清单 | 16 | N2：011+006+007；规格+骨架：`lab/es-housing` |
| 3 | **BRAND-STAMP** 编号戳 | 15 | N5 重复劳动；骨架：`lab/brand-stamp` |
| 4 | 发布核对 bot（catalog↔线上 HTTP） | 14 | N4；`scripts/check-catalog.mjs` 已覆盖本地。线上 diff 可以后加，需人授权才打生产。 |
| 5 | 浏览器小游戏 #2（西语行政主题） | 12 | 012 已占金融游戏；行政主题可做，但弱于清单。 |

未进表：ESP32 家居云、券商、邮件营销、多租户。见 needs-model「不需要」。

## #1 MVP（已实现）

路径：`lab/paper-grid/`（不污染 `001/`–`013/`）。

- 引擎 + 测试 + 静态页 + README + RUNBOOK。
- `liveOrders` 恒 false；校验失败不给表。
- 进根 `npm test` 与 CI。

## #2 规格

见 `lab/es-housing/README.md`。引擎现返回 `not_implemented`。

## #3 规格

见 `lab/brand-stamp/README.md`。默认 dry-run，`--write` 仍未实现写盘。
