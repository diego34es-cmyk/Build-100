# 独立审查（P2）

立场：当自己没写过这些代码。对象 = 本分支相对 `main` @ `b309da8` + 从线上收回的 005–013。

## Critical

无。未发现可导致密钥泄漏、未授权写生产、或真实下单的路径。`beacon.js` / `sessions.jsonl` 仍在 gitignore。本地 `/api/week` 只吐 fixture。

## High

| 项 | 原状 | 处理 |
|----|------|------|
| 005 扫描默认写 `data/library.json` 且打网 | 工业门要求 agent 默认 dry-run | **已修**：`research.guard` + `--force-write`；无该旗则退出码 2。证据：`python3 -m unittest research.test_offline` 含 `GuardTests` |
| 仓内缺已上线源码 | clone 不到 005–013 | **已修**：公开 HTTP 镜像进仓，测试 18/18 绿 |

残留 High：**生产 `/api/week` 与 `/collect` 源码仍不在仓。** 无法在 PR 里审计 origin 检查与模型调用。不反编译线上。本地 mock 覆盖校验与空态。记为已知缺口，不是本 PR 能闭的 Critical。

## Medium

- **002 公式双份**：`002/engine.js` 与 `index.html` IIFE 可能漂移。未改页面以免改交互。
- **主站「In Dev」vs Signal「已上线」**：006–013 清单行仍是解密动画 + In Dev，Signal 写 9/3 一批上线。这是线上原样，013 `live:false` 被测试锁住。
- **004 阈值语义**：滑块是 60，展示用 `threshold * 100`。本地 parser 兼容两种；生产 API 未验证。
- **无 ESLint/Prettier**：用 `node --check` 代替。纯 JS，不上 TS（N/A）。
- **研究脚本依赖 `requests`**：未进根 npm；CI 离线测试不装它。真扫描才需要 `005/requirements.txt`。

## Low

- 根 `playwright-core` 已删；无浏览器级视觉回归。
- `robots.txt` / `sitemap.xml` 线上仍可能 404，直到人 rsync。
- `lab/es-housing` / `brand-stamp` 是骨架，`not_implemented` 是故意的。
- 主站 OG 仍可能指向较旧编号图（线上如此）。

## 通过条件

Critical+High 已修或记为仓外已知缺口。`npm run check` exit 0；`npm test` 18 jobs exit 0。然后进入 P3。
