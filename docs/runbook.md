# BUILD-100 运行手册

面向一人维护。生产机（上下文）：`43.167.166.94`，目录 `/var/www/build100`，站点 `https://build-100.com/`。本手册不要求代理登录该机。

## 启动（本地）

```bash
cd /path/to/Build-100
cp -n .env.example .env
npm start
```

默认 `127.0.0.1:4173`。日志为 JSON 行（`LOG_LEVEL=info`）。

健康检查：

```bash
curl -sS http://127.0.0.1:4173/health
```

期望：`{"ok":true,"service":"build-100","completed":13,...}`。

停止：对 `npm start` 进程 Ctrl+C（处理 SIGINT/SIGTERM）。

## 启动（生产，人在服务器上）

nginx 已把 root 指到 `/var/www/build100`。静态文件不需要单独的 node 进程。

生产 `/api/week` 是机上另外部署的服务（源码不在本仓）。本地用 fixture 代替。

`beacon.js` 只存在于生产机，不入库。

## 备份

无数据库。备份 = 静态目录 + git。

```bash
# 在服务器上（示例，dry-run 先看）
rsync -a --dry-run /var/www/build100/ /var/backups/build100-$(date +%F)/
# 确认列表后去掉 --dry-run
```

仓库侧：打标签或保留 PR 分支。不要 force-push。

## 恢复

```bash
rsync -a --dry-run /var/backups/build100-YYYY-MM-DD/ /var/www/build100/
# 确认后去掉 --dry-run
sudo nginx -t && sudo systemctl reload nginx
```

或从 git 检出已知好提交再同步。

## 回滚

1. `git log --oneline` 找到上一好提交。
2. 在工作分支 `git revert <sha>`（不改历史）或服务器检出该树。
3. rsync 到 `/var/www/build100`。
4. `curl -sI https://build-100.com/` 与 `/NNN/` 应为 200。
5. `curl -sS https://build-100.com/014/` 应为 404（除非真的上了 014）。

## 发布一个新站（人工程序）

1. 改 `catalog.json`（`completed++`，加一条）。
2. 改 `index.html` 的 `SITE`、`PROJECTS`、清单行、Signal（最多 3 条）。
3. 同步 `013/catalog.json` 的 id 列表。
4. 更新 `sitemap.xml`、README 表、`og-NNN.png`。
5. `npm run check && npm test`。
6. 开 PR；合并后再 rsync。默认 `--dry-run`。

005 重扫图书馆（只读公开市场，**无下单**）：

```bash
cd 005
# 默认先看帮助 / 发现，不写盘：
PYTHONPATH=. python3 -m research.scan_library --help
PYTHONPATH=. python3 -m research.scan_library --no-history --out /tmp/library.dry.json
# 确认后才写 data/library.json（必须显式 --force-write）
PYTHONPATH=. python3 -m research.scan_library --force-write --out data/library.json --edition 2
```

不要用 `data/library.fixture.json` 覆盖线上图书馆。

## 常见失败

| 现象 | 原因 | 处理 |
|------|------|------|
| clone 后 005–013 404 | 旧 GitHub | 拉本分支；目录必须在仓内 |
| `/004/` 提示没写出来 | 无 API 或 origin 拒绝 | 本地确认 `WEEK_API=mock`；生产查 `/api/week` 与 Origin |
| POST `/api/week` → 403 `forbidden origin` | 与线上行为一致 | 从 `build-100.com` 同源发，或本地关 `WEEK_API_STRICT_ORIGIN` |
| 主站数字与格子对不上 | `SITE.completed` 与 `PROJECTS` 漏改 | 先改 `catalog.json` 再跑 `npm run check` |
| 本地 `beacon.js` 404 | 文件被 gitignore | `npm start` 会提供空实现 |
| 005 扫描把短加密市场算进去 | 过滤器失效 | 跑 `005` 离线 unittest；勿关 `series_filter` |
| 有人要把网格/下周做成实盘 | 红线 | 拒绝。004/005/`lab/paper-grid` 只做纸面 |

## 密钥

本仓无必须密钥。不要把 cookie、SSH 私钥、交易所 key 放进 git。`.env` 已 gitignore。
