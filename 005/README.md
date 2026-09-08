# LOCK-005 · 扫尾盘图书馆

Static catalog of Polymarket recurring-series lock prices (dwell → flip).

- Site: `index.html` + `data/library.json`
- Research: `research/` (run on this machine, freeze Edition N)
- Exclude: crypto markets ≤15 minutes
- Price paths: CLOB `prices-history` when present, else `data-api` trades rebuild

Design: `docs/plans/2026-08-17-lock-library-design.md`  
Plan: `docs/plans/2026-08-17-lock-library.md`

## Rescan (new edition)

只读公开市场数据，不下单。默认先 dry-run：

```bash
cd 005
PYTHONPATH=. python3 -m research.scan_library --help
PYTHONPATH=. python3 -m research.scan_library --no-history --out /tmp/library.dry.json
# 确认后再写 data/library.json（需要 requests，见 requirements.txt）
PYTHONPATH=. python3 -m research.scan_library --force-write --out data/library.json --edition 2
```

生产机路径若仍是 `/var/www/build100/005`，把 `cd` 换成该目录即可。

Fixture（只给 UI 演示）：`data/library.fixture.json` — 不要用它覆盖线上图书馆。

离线测试（无网络）：`cd 005 && python3 -m unittest research.test_offline -v`。
