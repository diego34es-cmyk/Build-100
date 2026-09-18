# LOCK-005 · 扫尾盘图书馆

Static catalog of Polymarket recurring-series lock prices (dwell → flip).

- Site: `index.html` + `data/library.json`
- Research: `research/` (run on this machine, freeze Edition N)
- Exclude: crypto markets ≤15 minutes
- Price paths: CLOB `prices-history` when present, else `data-api` trades rebuild

Design: `docs/plans/2026-08-17-lock-library-design.md`  
Plan: `docs/plans/2026-08-17-lock-library.md`

## Rescan (new edition)

```bash
cd /var/www/build100/005
PYTHONPATH=. python3 -m research.scan_library --out data/library.json --edition 2
```

Fixture (UI-only demo): `data/library.fixture.json` — do not overwrite the live catalog with it.
