# 验证证据

规则：DONE 必须有命令、退出码、输出摘要、路径。工作目录 `/workspace`，日期 2026-09-08。

## P0 发现

| 项 | 命令 | 退出码 | 摘要 |
|----|------|--------|------|
| git log | `git log -30 --oneline` | 0 | 7 commits，当时 HEAD `b309da8` |
| 001 测试（发现时） | `cd 001 && npm test` | 0 | 32 pass |
| 003 测试（发现时） | `cd 003 && npm test` | 0 | 10 pass |
| 线上 001–013 | `curl -w http_code https://build-100.com/NNN/` | 0 / HTTP 200 | 014 → 404 |
| 密钥字面量 | rg api_key/secret/private key | 0 | 无真实密钥 |

## P1 工业化

| 项 | 命令 | 退出码 | 摘要 |
|----|------|--------|------|
| catalog + 语法 | `npm run check` | 0 | `catalog ok: 13/100 sites, 13 dirs`；`syntax ok: 39 files` |
| 全量测试 | `npm test` | 0 | `all test jobs passed: 18` |
| 空 lock | `npm install --package-lock-only` | 0 | `audited 1 package`，0 依赖 |
| HTTP 冒烟（含在 npm test） | `node scripts/http-smoke.mjs` | 0 | `http-smoke ok { port: 4174, health: 13, weekFacts: 2 }` |

路径：`scripts/serve.mjs`、`scripts/check-catalog.mjs`、`catalog.json`、`.github/workflows/ci.yml`、`docs/runbook.md`、`CHANGELOG.md`、`.env.example`。

## P2

| 项 | 命令 | 退出码 | 摘要 |
|----|------|--------|------|
| 全量 CI | `npm run ci` | 0 | check + 18 test jobs |
| GitHub Actions | `ci / test` @ `d1b79ac` | SUCCESS | https://github.com/diego34es-cmyk/Build-100/actions/runs/34257084044 |
| 005 扫描拒绝写盘 | `cd 005 && PYTHONPATH=. python3 -m research.scan_library --out data/library.json` | 2 | `refuse: ... needs --force-write` |

## P3 / P4

文档：`docs/agent/portfolio.md`、`needs-model.md`、`new-projects.md`。  
#1 MVP 测试：`cd lab/paper-grid && npm test`（含在 `npm test`）。

## 未在本环境验证

- 浏览器里逐页点完 001–013 的视觉/移动端（无强制 GUI；http-smoke 只验 200/404/fixture）。
- 东京机 rsync / nginx reload（红线：不改生产）。
- 生产 `POST /api/week` 成功路径（空 POST → 403 `forbidden origin`，未用真实源发请求）。
