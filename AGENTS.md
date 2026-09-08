# AGENTS

人读文档用中文。标识符与 commit 用英文。不要 force-push，不要改历史，不要提交密钥或 `beacon.js`。

金融相关只做纸面。脚本默认 dry-run。

## 已核验命令

以 `verification.md` 最新一次退出码为准；改命令后必须重跑再改本文件。

```bash
npm start
npm test
npm run check
npm run ci
```

单站：

```bash
cd 001 && npm test
cd 002 && npm test
cd 003 && npm test
cd 004 && npm test
cd 005 && npm test && python3 -m unittest research.test_offline -v
cd 006 && npm test
```

005 扫描：先 `--help`，再 `--no-history`。无 `--force-write` 写 `library.json` 会以退出码 2 拒绝（已核验）。

本地服务：`http://127.0.0.1:4173/` ，健康检查 `/health`。

发布前改 `catalog.json` 与 `index.html` 的 `SITE`，然后 `npm run check`。
