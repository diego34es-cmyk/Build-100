# LOCK-005 · 扫尾盘图书馆 — Design

**Date:** 2026-08-17  
**Status:** Approved  
**URL (planned):** https://build-100.com/005/

## One-liner

Polymarket 重复盘的扫尾参考馆：按系列查「站稳某价之后，历史上还会不会翻」。

## Decisions locked

| Decision | Choice |
|----------|--------|
| Visitor job | **A** — browse catalog entries (not live sweep board) |
| Coverage | Scan all recurring series; **exclude crypto ≤15m** |
| Lock rule | **B** — dwell: price holds ≥X for a scaled duration |
| Freshness | **C** — freeze Edition 1 with date; swap JSON to republish |
| Architecture | Static catalog: research → `library.json` → single-page site |

## Product

**Audience:** people who trade or study Polymarket tails; secondary: curious visitors via BUILD-100.

**Primary action:** search / filter a series → read lock price + flip curve + sample size.

**Not this product:** live order routing, wallet, today's trade list, desk UI.

## Data flow

```
Polymarket Gamma/CLOB history
        │
        ▼
005/research/  (Python on this machine)
  · discover recurring series
  · filter out crypto ≤15m
  · for each series: dwell→flip stats
        │
        ▼
005/data/library.json   ← edition meta + series entries
        │
        ▼
005/index.html  (static, bilingual, BUILD-100 format)
```

Rebuild = re-run research → overwrite `library.json` → bump `edition` / `as_of`. No cron in v1.

## Page structure

1. **Hero** — LOCK-005 thesis + Edition badge (`第 1 版 · YYYY-MM-DD`)
2. **How to read** — dwell rule, flip definition, exclusions (crypto ≤15m)
3. **Controls** — search + category chips (weather / crypto / sports / macro / other) + sort (lock ↑ / samples ↓ / name)
4. **Shelf** — cards: series name, category, lock ¢, flip@lock, n, status
5. **Entry panel** — curve 80→99¢, dwell used, n, caveats, thin/insufficient badge
6. **Share** — copy summary / share image (BUILD-100 pattern)
7. **Footer** — three-part BUILD-100 footer + disclaimer

## Entry schema (`library.json`)

```json
{
  "edition": 1,
  "as_of": "2026-08-17",
  "method": {
    "lock": "dwell",
    "price_grid": [0.80, 0.85, 0.90, 0.95, 0.97, 0.99],
    "dwell": "scaled_by_lifetime",
    "exclude": ["crypto_15m_or_shorter"]
  },
  "series": [
    {
      "id": "weather-madrid-tmax",
      "name_zh": "马德里 · 日最高温",
      "name_en": "Madrid · daily high temp",
      "category": "weather",
      "status": "ready",
      "n": 120,
      "dwell_seconds": 1800,
      "lock_price": 0.97,
      "flip_at_lock": 0.0,
      "curve": [
        { "price": 0.80, "flip": 0.12, "n": 90 },
        { "price": 0.95, "flip": 0.02, "n": 70 }
      ],
      "notes_zh": "",
      "notes_en": ""
    }
  ]
}
```

`status`: `ready` | `thin` | `insufficient`  
- `ready`: enough samples for a lock claim  
- `thin`: curve shown, lock marked provisional  
- `insufficient`: listed, no lock number

## Method (v1)

**Series:** recurring templates on Polymarket (same question shape, repeating windows). Crypto markets with duration ≤15 minutes excluded.

**Event (per resolved market, favorite side):**

1. Find first time mid (or last trade) reaches threshold `p`.
2. Require continuous hold at ≥`p` for `dwell` seconds.
3. After dwell completes: if final resolution ≠ that side → **flip**.

**Dwell scaling (default):**

| Market lifetime | Dwell |
|-----------------|-------|
| < 2h | 2 min |
| 2h–24h | 10 min |
| 1d–7d | 30 min |
| > 7d | 2 h |

Tune in research if needed; store the value used per series in JSON.

**Lock price:** lowest `p` on the grid where `flip_at_p == 0` and `n_at_p` meets the ready floor; else highest `p` with flip under a thin threshold, marked `thin`.

**Admission floors (starting points — adjust after first scan):**

| Status | Rule of thumb |
|--------|----------------|
| ready | n≥50 at candidate lock, flip=0 |
| thin | 15≤n<50 or flip∈(0, 2%] |
| insufficient | n<15 or no dwell events |

**Multi-outcome (e.g. weather buckets):** treat the then-favorite bucket as the side; flip = another bucket settles.

## Visual / code name

- **Code:** `LOCK-005`
- **Accent:** amber / gold `#f5c542` (settled coin / locked odds) — distinct from 004 teal
- Follow BUILD-100 page-format-spec (nav, bilingual, share, footer, beacon, OG 1200×628)

## Out of scope (v1)

- Live “today’s locked markets”
- Trading / wallet / CLOB orders
- Crypto ≤15m
- Auto cron refresh
- Claiming zero risk (always disclaimer)

## Disclaimer (must show)

Historical dwell→flip rates are research summaries, not guarantees. Markets change. Not financial advice.

## Publish path

After the site works: follow `@build-100-publish` (SITE.completed→5, manifest decrypt, hero-latest, Signal, OG, Obsidian, deploy). Override classified 005 category from “海外生活” to this product.
