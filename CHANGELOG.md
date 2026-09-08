# Changelog

本文件记人能感知的变化。日期按仓库工作日。

## Unreleased

### 工业化

- 把线上已公开的 005–013（含 005 图书馆数据与离线 research、013 catalog）收回本仓库。
- 主站进度与 `catalog.json` 对齐为 013/100。
- 根脚本：`npm start` / `npm test` / `npm run check`；GitHub Actions CI。
- 抽出 RETIRE-002 计算；WEEK-004 增加本地 fixture API（默认 mock，不下单）。
- 文档：README（安装/运行/测试/部署）、`docs/runbook.md`、`.env.example`、`robots.txt`、`sitemap.xml`、`/health`。
- 删除未使用的根依赖 `playwright-core`。
- `lab/paper-grid` 纸面网格 MVP；`lab/es-housing`、`lab/brand-stamp` 规格骨架。

### 注意

- 线上 `beacon.js` / `/collect` / 生产 `/api/week` 源码仍不在本仓。
- 013 的 `catalog.json` 里部分站点 `live: false` 是页面初始态；主站 Signal 记 006–013 已上线。二者并存，由 013 运行时探测纠正。

## 2026-07-25

- 002–004 进入 GitHub；主站计数 004。

## 2026-07-11

- 主站 + COMBO-001 初版。
