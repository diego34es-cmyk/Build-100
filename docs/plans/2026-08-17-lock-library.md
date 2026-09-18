# LOCK-005 Sweep Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship `build-100.com/005/` — a bilingual static library of Polymarket recurring-series dwell→flip lock prices (Edition 1), excluding crypto ≤15m.

**Architecture:** Python research on this machine scans Polymarket history → writes `005/data/library.json` → vanilla `005/index.html` renders searchable catalog. No API/cron in v1. Republish = swap JSON + bump edition.

**Tech Stack:** Python 3 (research + tests), vanilla HTML/CSS/JS (site), node `--test` optional for pure JS helpers, Polymarket Gamma/CLOB public APIs.

**Design:** `docs/plans/2026-08-17-lock-library-design.md`  
**Format:** `.cursor/skills/build-100-publish/references/page-format-spec.md`  
**Visual ref:** `004/index.html` (structure); accent `#f5c542` not teal.

---

### Task 1: Scaffold 005 directories + package stub

**Files:**
- Create: `005/README.md`
- Create: `005/research/requirements.txt`
- Create: `005/data/.gitkeep`
- Create: `005/research/__init__.py`

**Step 1: Create directories and README**

```bash
mkdir -p /var/www/build100/005/{data,research,tests}
```

`005/README.md`:

```markdown
# LOCK-005 · 扫尾盘图书馆

Static catalog of Polymarket recurring-series lock prices (dwell → flip).

- Site: `index.html` + `data/library.json`
- Research: `research/` (run on this machine, freeze Edition N)
- Exclude: crypto markets ≤15 minutes
```

`005/research/requirements.txt`:

```
requests>=2.31
```

**Step 2: Verify tree**

```bash
ls -la /var/www/build100/005/research /var/www/build100/005/data
```

Expected: both directories exist.

**Step 3: Commit note**

No git in `/var/www/build100` today — skip commits until a repo exists. Mark progress in chat only.

---

### Task 2: Dwell → flip pure functions (TDD)

**Files:**
- Create: `005/research/dwell_flip.py`
- Create: `005/tests/test_dwell_flip.py`

**Step 1: Write failing tests**

```python
# 005/tests/test_dwell_flip.py
import unittest
from research.dwell_flip import dwell_seconds_for_lifetime, first_dwell_end, flipped_after_dwell

class TestDwell(unittest.TestCase):
    def test_dwell_scale(self):
        self.assertEqual(dwell_seconds_for_lifetime(3600), 120)       # <2h → 2m
        self.assertEqual(dwell_seconds_for_lifetime(10 * 3600), 600)  # <1d → 10m
        self.assertEqual(dwell_seconds_for_lifetime(3 * 86400), 1800) # <7d → 30m
        self.assertEqual(dwell_seconds_for_lifetime(30 * 86400), 7200)

    def test_first_dwell_end(self):
        # prices: (ts_seconds, mid)
        series = [(0, 0.5), (100, 0.95), (200, 0.96), (800, 0.97)]
        # dwell 600s at >=0.95 → ends at 100+600=700
        self.assertEqual(first_dwell_end(series, 0.95, 600), 700)

    def test_flip_yes(self):
        self.assertTrue(flipped_after_dwell(side="Yes", resolved="No"))
        self.assertFalse(flipped_after_dwell(side="Yes", resolved="Yes"))

if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run — expect FAIL**

```bash
cd /var/www/build100/005 && PYTHONPATH=. python3 -m unittest tests.test_dwell_flip -v
```

Expected: ImportError or FAIL.

**Step 3: Implement `dwell_flip.py`**

```python
# 005/research/dwell_flip.py
def dwell_seconds_for_lifetime(lifetime_sec: float) -> int:
    if lifetime_sec < 2 * 3600:
        return 120
    if lifetime_sec < 86400:
        return 600
    if lifetime_sec < 7 * 86400:
        return 1800
    return 7200

def first_dwell_end(prices, threshold: float, dwell_sec: int):
    """prices: iterable of (ts, mid). Return ts when dwell completes, else None."""
    start = None
    for ts, mid in prices:
        if mid >= threshold:
            if start is None:
                start = ts
            if ts - start >= dwell_sec:
                return start + dwell_sec
        else:
            start = None
    return None

def flipped_after_dwell(side: str, resolved: str) -> bool:
    return side.strip().lower() != resolved.strip().lower()
```

**Step 4: Run — expect PASS**

```bash
cd /var/www/build100/005 && PYTHONPATH=. python3 -m unittest tests.test_dwell_flip -v
```

---

### Task 3: Series discovery + crypto ≤15m filter (TDD)

**Files:**
- Create: `005/research/series_filter.py`
- Create: `005/tests/test_series_filter.py`

**Step 1: Failing tests**

```python
# 005/tests/test_series_filter.py
import unittest
from research.series_filter import is_crypto_short, should_include

class TestFilter(unittest.TestCase):
    def test_exclude_15m(self):
        self.assertTrue(is_crypto_short("Bitcoin Up or Down - 15 minutes", 15 * 60))
        self.assertTrue(is_crypto_short("ETH 5m", 5 * 60))

    def test_keep_hourly_crypto(self):
        self.assertFalse(is_crypto_short("Bitcoin Up or Down - 1 hour", 3600))

    def test_keep_weather(self):
        self.assertTrue(should_include({
            "title": "Highest temperature in Madrid on August 17?",
            "lifetime_sec": 86400,
            "tags": ["weather"],
        }))

    def test_drop_short_crypto(self):
        self.assertFalse(should_include({
            "title": "Bitcoin Up or Down - 15 minutes",
            "lifetime_sec": 15 * 60,
            "tags": ["crypto"],
        }))
```

**Step 2: Run FAIL → implement → PASS**

Implement heuristics: duration ≤900s AND (tag crypto OR title matches BTC/ETH/SOL/up or down) → exclude. Weather/sports/macro always candidates if recurring.

---

### Task 4: Curve + lock price aggregation (TDD)

**Files:**
- Create: `005/research/aggregate.py`
- Create: `005/tests/test_aggregate.py`

**Step 1: Tests for**

- `build_curve(events, grid)` → list of `{price, flip, n}`
- `pick_lock(curve)` → `(lock_price|None, status)` with floors from design (`ready` n≥50 flip=0; `thin` 15–49 or flip≤2%; else `insufficient`)

**Step 2: Implement minimal → PASS**

---

### Task 5: Polymarket fetch helpers

**Files:**
- Create: `005/research/pm_client.py`
- Create: `005/research/scan_library.py`

**Step 1: `pm_client.py`**

- `gamma_get(path, params)` against `https://gamma-api.polymarket.com`
- `list_markets(limit, offset)` / search closed markets
- `fetch_price_history(token_id)` via CLOB `https://clob.polymarket.com/prices-history` (or documented equivalent)
- Respect rate limits (sleep / retry)

**Step 2: Dry-run one weather series + one crypto hourly**

```bash
cd /var/www/build100/005 && PYTHONPATH=. python3 -c "from research.pm_client import smoke; smoke()"
```

Expected: prints ≥1 market titles, no crash.

**Step 3: `scan_library.py` CLI**

```bash
python3 -m research.scan_library --out data/library.json --edition 1
```

Pipeline:
1. Discover recurring series (group by normalized title template)
2. Filter crypto ≤15m
3. For each series, sample resolved markets (cap per series e.g. 200)
4. Compute dwell/flip curve
5. Write `library.json` with `edition`, `as_of`, `method`, `series[]`

**Step 4: Run scan (long)** — may take many minutes; checkpoint partial JSON if needed.

**Step 5: Validate JSON**

```bash
python3 -c "import json; d=json.load(open('005/data/library.json')); print(d['edition'], len(d['series']))"
```

Expected: edition 1, series count > 0.

---

### Task 6: Seed fixture for UI if scan is slow

**Files:**
- Create: `005/data/library.fixture.json` (small hand-built sample)
- Optionally copy to `library.json` until full scan finishes

Include 4–6 fake-but-realistic entries across weather/crypto/sports/macro with `ready`/`thin`/`insufficient` so UI can be built in parallel.

---

### Task 7: Static page shell (format-spec compliant)

**Files:**
- Create: `005/index.html` (start from `004/index.html` structure, strip week API)

**Checklist from page-format-spec:**
- [ ] title `LOCK-005 · …`
- [ ] favicon NNN=005 only
- [ ] nav back + brand + langBtn
- [ ] data-en on all visible copy
- [ ] applyLang + localStorage `lang`
- [ ] share-row / share-btn
- [ ] footer three-part
- [ ] main max-width 880px
- [ ] prefers-reduced-motion
- [ ] beacon.js before `</body>`
- [ ] og meta + placeholder og path

**Accent:** `--neon: #f5c542` (or `--lock`).

**Step 1: Build hero + how-to-read + empty shelf**  
**Step 2: Open in browser / curl 200**

---

### Task 8: Render library from JSON

**Files:**
- Modify: `005/index.html` (JS)
- Create: `005/library.js` (optional extract)

**Behavior:**
1. `fetch('data/library.json')`
2. Render edition badge from `as_of` / `edition`
3. Filter by search + category chips
4. Sort: lock asc / n desc / name
5. Cards + click → entry panel with curve bars
6. `t()` for all dynamic strings
7. Insufficient: show badge, no fake lock

**Step 1: Manual test with fixture**  
**Step 2: Switch to real `library.json` when scan done**

---

### Task 9: Share copy + canvas card

**Files:**
- Modify: `005/index.html`

Copy template (zh/en): series name, lock ¢, flip@lock, n, edition date.  
Share image: dark card, amber accent, LOCK-005 mark — mirror 001/004 share patterns.

---

### Task 10: OG image 1200×628

**Files:**
- Create: `005/og-005.png`

Use headless Chrome clip per build-100-publish OG red line (viewport 1200×688, clip y=60 height 628).  
Update og:image meta.

---

### Task 11: Format self-check + research README

**Files:**
- Modify: `005/README.md` — how to rescan
- Run through page-format-spec checklist

Rescan command documented:

```bash
cd /var/www/build100/005 && PYTHONPATH=. python3 -m research.scan_library --out data/library.json --edition 2
```

---

### Task 12: Publish to main site (separate gate)

Only after user says publish. Follow `@build-100-publish`:

- SITE.completed 4→5, PROJECTS append LOCK-005
- Static counter / statLine / grid aria
- Manifest 005 decrypt (override Living Abroad → LOCK library copy)
- hero-latest / Signal / btn-x
- Main OG screenshot
- Obsidian BUILD-100 notes
- rsync deploy + curl verify

**Do not start Task 12 until the library page is verified locally.**

---

## Parallelization notes

- Tasks 2–4 (pure logic) before / beside Task 5 (network)
- Tasks 7–9 (UI) can use Task 6 fixture while Task 5 scan runs
- Task 12 is user-gated

## Risks

| Risk | Mitigation |
|------|------------|
| Price history sparse | Mark `insufficient`; don't invent lock |
| Rate limits | Sleep, resume, cache raw JSON under `005/research/cache/` |
| Series clustering noisy | Prefer explicit recurring tags + title templates; manual overrides file later |
| No git repo | Keep files on disk; commit when remote exists |

---

## Execution handoff

Plan saved to `docs/plans/2026-08-17-lock-library.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** — fresh subagent per task, review between tasks  
2. **Parallel Session (separate)** — new session runs executing-plans with checkpoints  

Which approach?
