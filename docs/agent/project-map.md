# 项目地图

扫描时间：2026-09-08。路径均相对仓库根。

## 这是什么

BUILD-100：一个人用现成 AI 公开做 100 个静态小站。主域 `build-100.com`，路径 `/NNN/`，nginx 指到 `/var/www/build100`。技术底线：HTML + Vanilla JS，能不上框架就不上。

## 仓库（GitHub `main` @ b309da8）

| 路径 | 角色 | 测试 |
|------|------|------|
| `index.html` | 主站（计数 004/100，2026.07） | 无 |
| `001/` | COMBO-001 AI 订阅搭配器 + `engine.js` + `data/models.json` + `share.js` | `npm test` 32 pass |
| `002/` | RETIRE-002 退休计算器（算法嵌在 `index.html`） | 无 |
| `003/` | PROMPT-003 提示词结构器 + `engine.js` | `npm test` 10 pass |
| `004/` | WEEK-004 预测市场「下周」；`POST /api/week` | 无（依赖线上 API） |
| `package.json` | 根依赖仅 `playwright-core`，无 scripts | 未使用 |
| `README.md` | 仍写「进度 001/100」 | — |
| `.gitignore` | `node_modules`、`beacon.js`、`sessions.jsonl`、`.cursor/` 等 | — |

无：`.github/`、`CHANGELOG`、`docs/`、`AGENTS.md`、`.env.example`、lockfile 用途（根 lock 只锁 playwright-core）。

## 线上（公开 HTTP，2026-09-08）

已上线 001–013。GitHub 缺 005–013 源码与主站 013 进度。

| # | 代号 | 一句话 | 线上可取文件 |
|---|------|--------|----------------|
| 001 | COMBO-001 | AI 订阅最优搭配 | 与仓库体积一致 |
| 002 | RETIRE-002 | 只算存钱的退休年龄 | 单页 |
| 003 | PROMPT-003 | 大白话 → 可粘贴提示词 | 有 engine |
| 004 | WEEK-004 | 赔率≥阈值写成下周 | 调 `/api/week` |
| 005 | LOCK-005 | 扫尾盘图书馆 | 单页 + README + og |
| 006 | LIFE-006 | 生活麻烦工具箱 | engine + test + data |
| 007 | PPP-007 | 欧洲 vs 国内购买力 | engine + test + data |
| 008 | REGRET-008 | 订阅后悔计算器 | engine + test |
| 009 | INTUIT-009 | 金融直觉馆 | engine + test |
| 010 | DECIDE-010 | 决策一页纸 | engine + test |
| 011 | PAPER-011 | 办事清单（zh/es） | engine + test + data |
| 012 | PLAY-012 | 3 分钟金融小游戏 | engine + test |
| 013 | INDEX-013 | 分类总目录 | engine + test |

## 入口

- 人：打开 `index.html` 或 `https://build-100.com/`。
- 测试：`cd 001 && npm test`；`cd 003 && npm test`（Node 内置 runner）。
- 部署（注释写在主站 HTML）：rsync/scp 到东京机 `/var/www/build100`，nginx root 已指向该目录。
- 可选 API：线上 `POST /api/week`（源码不在本仓）；`POST /collect`（beacon，不入库）。

## 语言

主站与多数作品：中文默认 + `data-en` 切换。011 为 zh/es。代码标识英文。

## 红线（仓库内可见）

- 004 只读公开赔率叙事，页面写明「不构成投资建议」。
- 不入库密钥、cookie、私钥、`sessions.jsonl`。
- 不 force-push、不改 git 历史。
