# BUILD-100 — The 100 Websites Project

**一个人 + AI，公开做 100 个网站。** 代码开源；工作流、成本、翻车记在 X。

**One person + AI, 100 websites in public.**

- 主页：<https://build-100.com/>
- 仓库：<https://github.com/diego34es-cmyk/Build-100>
- 关注：[@Jcheng557](https://x.com/Jcheng557)

## 进度 / Progress: 013 / 100

| # | 站点 | 一句话 | LIVE | SOURCE |
|---|------|--------|------|--------|
| 001 | COMBO-001 | AI 订阅最优搭配 | [001](https://build-100.com/001/) | [`/001`](./001) |
| 002 | RETIRE-002 | 只算存钱的退休年龄 | [002](https://build-100.com/002/) | [`/002`](./002) |
| 003 | PROMPT-003 | 大白话 → 可粘贴提示词 | [003](https://build-100.com/003/) | [`/003`](./003) |
| 004 | WEEK-004 | 赔率门槛写成「下周」 | [004](https://build-100.com/004/) | [`/004`](./004) |
| 005 | LOCK-005 | 扫尾盘图书馆 | [005](https://build-100.com/005/) | [`/005`](./005) |
| 006 | LIFE-006 | 生活麻烦工具箱 | [006](https://build-100.com/006/) | [`/006`](./006) |
| 007 | PPP-007 | 欧洲 vs 国内购买力 | [007](https://build-100.com/007/) | [`/007`](./007) |
| 008 | REGRET-008 | 订阅后悔计算器 | [008](https://build-100.com/008/) | [`/008`](./008) |
| 009 | INTUIT-009 | 金融直觉馆 | [009](https://build-100.com/009/) | [`/009`](./009) |
| 010 | DECIDE-010 | 决策一页纸 | [010](https://build-100.com/010/) | [`/010`](./010) |
| 011 | PAPER-011 | 办事清单（zh/es） | [011](https://build-100.com/011/) | [`/011`](./011) |
| 012 | PLAY-012 | 3 分钟金融小游戏 | [012](https://build-100.com/012/) | [`/012`](./012) |
| 013 | INDEX-013 | 分类总目录 | [013](https://build-100.com/013/) | [`/013`](./013) |

清单的机器源是根目录 [`catalog.json`](./catalog.json)。改进度先改它，再对 `index.html` 的 `SITE` / `PROJECTS`。

## 安装 / 运行 / 测试

需要 **Node.js ≥ 20**。无 npm 依赖；`npm ci` 不是必须（本仓 lockfile 为空依赖）。

```bash
git clone https://github.com/diego34es-cmyk/Build-100.git
cd Build-100
cp .env.example .env   # 可选
npm start              # http://127.0.0.1:4173/
npm test               # 全部作品引擎 + 005 离线研究测试 + HTTP 冒烟
npm run check          # catalog 漂移 + node --check
```

浏览器打开 `/`、`/001/` … `/013/`。`/health` 返回 JSON。`/004/` 的「下周」在本地走 fixture（`WEEK_API=mock`），**不打真实预测市场**。

`WEEK_API=off npm start` 时 `/api/week` 返回 503，页面应显示可恢复错误。

## 部署

生产：东京机 nginx root → `/var/www/build100`，URL 一律 `https://build-100.com/NNN/`。

本仓库 **不自动发布**。同步是人在服务器上做的 rsync/scp。步骤、回滚、常见失败见 [docs/runbook.md](./docs/runbook.md)。

线上可能暂时新于 GitHub；以本仓 + `catalog.json` 为协作源，用公开 HTTP 对照，不要 force-push。

## 结构

- 每个站一个三位目录，静态 HTML + 可选 `engine.js`。
- `scripts/serve.mjs`：本地静态服务、分级日志、health、004 fixture API。
- `lab/`：未上线实验（纸面网格 MVP、西语住房骨架、品牌戳骨架）。
- `docs/agent/`：本次工业化过程记录。
- `beacon.js` / `sessions.jsonl` **不入库**（线上私有统计）。

## 技术底线

- 能不上框架就不上。
- 引擎纯函数 + `node --test`。
- 金融相关页面只做纸面/叙事，不下真实单。
- Agent 脚本默认可幂等、可 dry-run。

## 文档

- 变更：[CHANGELOG.md](./CHANGELOG.md)
- 运维：[docs/runbook.md](./docs/runbook.md)
- 代理约定：[AGENTS.md](./AGENTS.md)

*Est. 2026 · No deadline. Done when it's done.*
