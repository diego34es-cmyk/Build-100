"""LOCK-005 library scanner.

Bounded v1 scan of recurring Polymarket series -> data/library.json.

Usage::

    cd /var/www/build100/005
    PYTHONPATH=. python3 -m research.scan_library --out data/library.json --edition 1

Pipeline:
  1. Discover recurring series by title search template (weather / crypto /
     sports / macro / other).
  2. Exclude crypto markets with lifetime <= 15m (series_filter.should_include).
  3. For each series: sample up to --max-markets resolved markets.
  4. For each market with usable CLOB price history, compute dwell->flip events
     across the price grid.
  5. aggregate.build_curve + aggregate.pick_lock.
  6. Write library.json (edition / as_of / method / series[]) + a summary.

Practical limits (real data, Aug 2026):
  - CLOB only retains a rolling price-history window, so series can only be
    analysed from markets that resolved within roughly the last day or two.
    Older recurring templates (daily weather, monthly CPI, ...) therefore come
    out as "insufficient" with a note, not as fabricated locks.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone

from research import pm_client
from research import series_filter
from research.dwell_flip import dwell_seconds_for_lifetime, first_dwell_end
from research.aggregate import build_curve, pick_lock

log = logging.getLogger("scan_library")

PRICE_GRID = [0.80, 0.85, 0.90, 0.95, 0.97, 0.99]
EDITION_AS_OF_FORMAT = "%Y-%m-%d"

MAX_TOKENS_PER_MARKET = 4

RECENT_DAYS = 400  # discovery window; trades fallback can rebuild closed-market paths
WINDOW_DAYS = 45   # dated extra queries + recency ranking (daily series need >=15 closes)

DISCOVERY_QUERIES = [
    # (category, title_search phrase, max pages, recency days)
    ("crypto", "Bitcoin Up or Down", 8, RECENT_DAYS),
    ("crypto", "ETH Up or Down", 3, RECENT_DAYS),
    ("crypto", "SOL Up or Down", 3, RECENT_DAYS),
    ("macro", "Up or Down on", 3, RECENT_DAYS),   # FX/commodities/spy daily templates
    ("weather", "Will it rain in Central Park", 3, RECENT_DAYS),
    ("weather", "high temperature in", 3, RECENT_DAYS),
    ("weather", "Temperature Increase", 3, RECENT_DAYS),
    ("weather", "Precipitation", 2, RECENT_DAYS),
    ("sports", "UFC", 4, RECENT_DAYS),
    ("sports", "The Hundred", 3, RECENT_DAYS),
    ("sports", "Cricket", 3, RECENT_DAYS),
    ("sports", "MMA fight", 2, RECENT_DAYS),
    ("sports", "NBA", 3, RECENT_DAYS),
    ("sports", "NFL", 3, RECENT_DAYS),
    ("sports", "Tennis", 2, RECENT_DAYS),
    ("macro", "FOMC", 3, RECENT_DAYS),
    ("macro", "Fed Funds", 3, RECENT_DAYS),
    ("macro", "CPI", 3, RECENT_DAYS),
    ("macro", "jobs report", 3, RECENT_DAYS),
    ("macro", "nonfarm", 2, RECENT_DAYS),
]

# Human-facing names for known series (used when a series is discovered).
SERIES_NAMES = {
    "bitcoin-hourly-et": ("比特币 · 小时涨跌", "Bitcoin · hourly up or down"),
    "bitcoin-up-or-down-on-date": ("比特币 · 日涨跌", "Bitcoin · daily up or down"),
    "bitcoin-up-or-down-in-month": ("比特币 · 月度涨跌", "Bitcoin · monthly up or down"),
    "btc-updown-4h": ("比特币 · 4 小时涨跌", "Bitcoin · 4h up or down"),
    "btc-updown-1d": ("比特币 · 日涨跌", "Bitcoin · daily up or down"),
    "btc-updown-1h": ("比特币 · 小时涨跌", "Bitcoin · hourly up or down"),
    "eth-hourly-et": ("以太坊 · 小时涨跌", "Ethereum · hourly up or down"),
    "eth-up-or-down-on-date": ("以太坊 · 日涨跌", "Ethereum · daily up or down"),
    "eth-updown-4h": ("以太坊 · 4 小时涨跌", "Ethereum · 4h up or down"),
    "eth-updown-1h": ("以太坊 · 小时涨跌", "Ethereum · hourly up or down"),
    "sol-up-or-down-on-date": ("Solana · 日涨跌", "Solana · daily up or down"),
    "sol-updown-4h": ("Solana · 4 小时涨跌", "Solana · 4h up or down"),
    "sol-updown-1h": ("Solana · 小时涨跌", "Solana · hourly up or down"),
    "wti-up-or-down-on-date": ("WTI 原油 · 日涨跌", "WTI crude · daily up or down"),
    "ng-up-or-down-on-date": ("天然气 · 日涨跌", "Natural gas · daily up or down"),
    "spy-up-or-down-on-date": ("标普 500 · 日涨跌", "SPY · daily up or down"),
    "xauusd-up-or-down-on-date": ("黄金 · 日涨跌", "Gold · daily up or down"),
    "market-up-or-down-on-date": ("市场 · 每日涨跌", "Market · daily up or down"),
    "ufc-fight": ("UFC · 单场胜负", "UFC · fight winner"),
    "cricket-hundred-match": ("The Hundred · 单场胜负", "The Hundred · match winner"),
    "cricket-international-match": ("板球 · 单场胜负", "Cricket · match winner"),
    "climate-temp-increase-monthly": ("全球气温 · 月度升温区间", "Global Temp · monthly increase band"),
    "weather-hightemp": ("纽约中央公园 · 日最高温", "NY Central Park · daily high temp"),
    "weather-rain": ("纽约中央公园 · 当日降雨", "NY Central Park · rain today"),
    "fed-rate": ("美联储 · 政策利率", "Fed · policy rate"),
    "cpi-inflation": ("美国 · 月度 CPI", "US · monthly CPI"),
    "jobs-report": ("美国 · 非农就业", "US · jobs report"),
}

COIN_RE = re.compile(
    r"(bitcoin|btc|eth|ethereum|sol|solana|doge|dogecoin|xrp|wti|ng|spy|gold|"
    r"xauusd|xagusd|eurusd|usdjpy|usdcny|usdtry|usdnok|usdsek|usdzar|usdbrl)"
)

# Templates we intentionally do not treat as a lock-price series (step /
# single-level price-target markets don't have a meaningful "favorite side").
SKIP_TEMPLATE_RE = re.compile(
    r"(will-bitcoin-(reach|dip)|bitcoin-reach|bitcoin-dip|price-will|"
    r"price-of-(bitcoin|eth|sol)|gmt|probability-of|drafted|nflx|"
    r"will-coin-reach)"
)


def effective_lifetime_sec(record: dict) -> float:
    """True trading lifetime. The API startDate == event creation, so slug
    scales (5m/15m/1h/4h/1d) are authoritative when present."""
    m = re.search(r"-(\d+)([mhd])(?:-\d+)?$", record.get("slug") or "")
    if m:
        unit = {"m": 60, "h": 3600, "d": 86400}
        return int(m.group(1)) * unit[m.group(2)]
    return record["lifetime_sec"] or 0


def template_from_slug(slug: str) -> str:
    """Map a Polymarket slug onto a stable recurring-series template key."""
    s = (slug or "").strip().lower()
    if not s:
        return "unknown"
    coin_m = COIN_RE.search(s)
    coin = coin_m.group(1) if coin_m else ""

    if re.search(r"\d{1,2}(?:am|pm)-et(?:-candle)?$", s):
        return f"{coin or 'market'}-hourly-et"
    if "-on-" in s:
        return f"{coin or 'market'}-up-or-down-on-date"
    if "updown" in s:
        unit = re.search(r"(\d+[mhd])", s)
        if unit:
            return f"{coin or 'market'}-updown-{unit.group(1)}"
        return f"{coin or 'market'}-updown"
    if "up-or-down-in" in s:
        return f"{coin or 'market'}-up-or-down-in-month"
    if s.startswith("ufc") or "-ufc-" in s:
        return "ufc-fight"
    if s.startswith("crichundred"):
        return "cricket-hundred-match"
    if s.startswith("crint") or s.startswith("cricket"):
        return "cricket-international-match"
    if "temperature-increase" in s or "temperature increase" in s:
        return "climate-temp-increase-monthly"
    if "fed" in s or "fomc" in s:
        return "fed-rate"
    if "cpi" in s or "inflation" in s:
        return "cpi-inflation"
    if "jobs" in s or "nonfarm" in s:
        return "jobs-report"
    if "high-temperature" in s:
        return "weather-hightemp"
    if "rain" in s or "precip" in s:
        return "weather-rain"
    return re.sub(r"[\d]+", "#", s).replace("--", "-")[:60]


def category_for_template(template: str, fallback: str) -> str:
    if template.startswith("weather") or template.startswith("climate"):
        return "weather"
    if template.startswith("ufc") or "fight" in template:
        return "sports"
    if template.startswith(("fed", "cpi", "jobs", "nonfarm")):
        return "macro"
    if template.endswith(("-up-or-down-on-date", "-hourly-et", "-updown",
                          "-up-or-down-in-month")) or "-updown-" in template:
        return "crypto" if template.startswith(("bitcoin", "btc", "eth",
                                                "sol", "doge", "xrp",
                                                "ethereum", "solana",
                                                "wbtc")) else "macro"
    return fallback


def series_identity(category: str, template: str) -> dict:
    name_zh, name_en = SERIES_NAMES.get(template, (None, None))
    if not name_zh:
        name_zh = f"{category} · {template.replace('-', ' ')[:40]}"
        name_en = f"{category} · {template.replace('-', ' ')[:40]}"
    return {
        "id": f"{category}-{template}",
        "name_zh": name_zh,
        "name_en": name_en,
        "category": category,
    }


def discover_series(queries, max_pages: int = 3) -> dict:
    """Return {(category, template): [event, ...]} grouped by discovery query."""
    groups: dict = {}
    now = datetime.now(timezone.utc)
    now_naive = now.replace(tzinfo=None)
    start_min = (now_naive - timedelta(days=RECENT_DAYS)
                 ).strftime(EDITION_AS_OF_FORMAT)

    # Extra targeted per-day queries for the last few days: the relevance
    # search floods pages with 5m/15m crypto, hiding 1h/4h/daily events.
    coin_templates = [
        "Bitcoin Up or Down - ", "ETH Up or Down - ", "SOL Up or Down - "]
    extra_queries = []
    for back in range(WINDOW_DAYS):
        day = now_naive - timedelta(days=back)
        label = f"{day.strftime('%B')} {day.day}"
        for tpl in coin_templates:
            extra_queries.append(("crypto", f"{tpl}{label}", 1, WINDOW_DAYS))
        extra_queries.append(
            ("weather", f"Will it rain in Central Park on {label}", 1, WINDOW_DAYS))
        extra_queries.append(
            ("macro", f"Up or Down on {label}", 1, WINDOW_DAYS))

    for category, phrase, pages, recency_days in queries + extra_queries:
        events = []
        seen = set()
        for page in range(pages):
            batch = pm_client.search_events(
                phrase, closed=True, limit=100, order="createdAt",
                ascending=False, offset=page * 100,
                start_date_min=start_min)
            if not batch:
                break
            added = False
            for e in batch:
                if e.get("id") in seen:
                    continue
                seen.add(e.get("id"))
                events.append(e)
                added = True
            if len(batch) < 100 or not added:
                break
            time.sleep(pm_client.REQ_DELAY)
        for ev in events:
            rec = pm_client.market_from_event(ev)
            if rec is None:
                continue
            template = template_from_slug(rec["slug"] or ev.get("slug"))
            if SKIP_TEMPLATE_RE.search(template):
                continue
            key = (category_for_template(template, category), template)
            groups.setdefault(key, []).append(ev)
        log.info("discovered %-8s '%s' -> %d events", category, phrase, len(events))
    return groups


def series_dwell_seconds(template: str, lifetime_sec: float) -> int:
    """Dwell for a series. Polymarket closes assets as hourly/4h/daily cadence
    even when they list days ahead, so the *active* window (not creation span)
    decides which dwell bucket applies."""
    t = template
    if t.endswith("-hourly-et") or "-updown-1h" in t:
        return 120
    if "-updown-4h" in t:
        return 600
    if "-updown-1d" in t or t.endswith("-up-or-down-on-date"):
        return 1800
    if t in ("ufc-fight", "mma-fight"):
        return 600
    if t.startswith("cricket"):
        return 600
    return dwell_seconds_for_lifetime(lifetime_sec or 0)


def filter_market(record: dict) -> bool:
    """Apply series_filter.should_include to a normalised market record."""
    market = {
        "title": record["title"],
        "lifetime_sec": effective_lifetime_sec(record),
        "tags": record.get("tags") or [],
    }
    return series_filter.should_include(market)


def analyze_market(record: dict, dwell_override=None) -> tuple:
    """Compute the highest-grid-price dwell event for a resolved market.

    Returns (best_event|None, dwell_seconds, skipped) where best_event is
    {"price": float, "flip": bool}.
    """
    if record["winner_index"] is None:
        return None, None, "unresolved"
    lifetime = effective_lifetime_sec(record)
    if not lifetime:
        return None, None, "no_lifetime"
    dwell_sec = dwell_override if dwell_override else dwell_seconds_for_lifetime(lifetime)
    best = None
    end_ts = record["end_ts"]
    condition_id = record.get("condition_id") or ""
    for idx, token in enumerate(record["tokens"][:MAX_TOKENS_PER_MARKET]):
        try:
            hist = pm_client.token_price_history(
                condition_id, token, start_ts=record["start_ts"])
        except Exception:  # noqa: BLE001
            continue
        if len(hist) < 3:
            continue
        # Drop post-resolution prints near 1.00 — only pre-close path counts.
        if end_ts:
            hist = [p for p in hist if p["t"] <= end_ts]
            if len(hist) < 2:
                continue
        prices = [(p["t"], float(p["p"])) for p in hist]
        for p in sorted(PRICE_GRID, reverse=True):
            if first_dwell_end(prices, p, dwell_sec) is not None:
                flip = record["winner_index"] != idx
                if best is None or p > best["price"]:
                    best = {"price": p, "flip": flip}
                break
    return best, dwell_sec, None


def build_entry(identity: dict, events: list, collapsed: dict) -> dict:
    """Build one library.json series entry from aggregate results."""
    grid = PRICE_GRID
    curve = build_curve(events, grid)
    lock_price, status = pick_lock(curve)
    row = None
    if lock_price is not None:
        row = next((r for r in curve if r["price"] == lock_price), None)
    entry = dict(identity)
    entry["status"] = status
    entry["n"] = row["n"] if row else (len(events) or collapsed.get("markets", 0))
    entry["dwell_seconds"] = collapsed.get("dwell_seconds")
    entry["lock_price"] = lock_price
    entry["flip_at_lock"] = row["flip"] if row else None
    entry["curve"] = curve if status != "insufficient" else []
    if status == "insufficient":
        if events:
            entry["notes_zh"] = (
                f"已分析 {len(events)} 个真实 dwell 事件，未达 15 个样本下限；"
                f"入窗市场 {collapsed.get('markets', 0)} 个，其中无完整历史 {collapsed.get('history_missing', 0)} 个。")
            entry["notes_en"] = (
                f"{len(events)} real dwell events analysed this edition but below the "
                f"15-sample floor; {collapsed.get('markets', 0)} markets in window, "
                f"{collapsed.get('history_missing', 0)} without recoverable history.")
        else:
            entry["notes_zh"] = ("有效 dwell 事件少于最低门槛，暂不显示锁价或曲线。")
            entry["notes_en"] = ("Too few valid dwell events; no lock or curve shown.")
    else:
        entry["notes_zh"] = ""
        entry["notes_en"] = ""
    entry["_markets_seen"] = collapsed.get("markets", 0)
    entry["_events"] = len(events)
    entry["_history_available"] = collapsed.get("history_available", 0)
    entry["_history_missing"] = collapsed.get("history_missing", 0)
    return entry


def summarize(series: list) -> None:
    from collections import Counter

    by_status = Counter(s["status"] for s in series)
    by_cat = Counter(s["category"] for s in series)
    print("\n=== Scan summary ===")
    print("series by status:", dict(by_status))
    print("series by category:", dict(by_cat))
    for s in series:
        lock = s["lock_price"] if s["lock_price"] is not None else "-"
        flip = s["flip_at_lock"] if s["flip_at_lock"] is not None else "-"
        print(f"  [{s['status']:11}] {s['category']:7} {s['id']:40} "
              f"n={s['n']:4} lock={lock} flip={flip}")
    print("=" * 24)


def write_notes(reason: str) -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "SCAN_NOTES.md")
    notes = (
        "# SCAN_NOTES — Edition 1\n\n"
        f"**Date:** {datetime.now(timezone.utc).strftime(EDITION_AS_OF_FORMAT)}\n\n"
        f"**Notes:** {reason}\n\n"
        "**Price path source:**\n"
        "- Prefer CLOB `prices-history` when present.\n"
        "- Fall back to `data-api.polymarket.com/trades` to rebuild paths for "
        "closed markets (CLOB drops resolved history).\n\n"
        "**Exclusions:** crypto ≤15m by design.\n\n"
        "**Rescan:**\n"
        "```bash\n"
        "cd /var/www/build100/005 && PYTHONPATH=. python3 -m research.scan_library "
        "--out data/library.json --edition N\n"
        "```\n"
    )
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(notes)
    print(f"[scan] wrote {path}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="LOCK-005 library scanner")
    parser.add_argument("--out", default="data/library.json",
                        help="output library.json path")
    parser.add_argument("--edition", type=int, default=1)
    parser.add_argument("--cache-dir", default=None,
                        help="raw response cache dir (default research/cache)")
    parser.add_argument("--max-series", type=int, default=40)
    parser.add_argument("--max-per-category", type=int, default=8)
    parser.add_argument("--min-members", type=int, default=3,
                        help="min markets in a template group to list it")
    parser.add_argument("--max-markets", type=int, default=200,
                        help="cap resolved markets analysed per series")
    parser.add_argument("--max-pages", type=int, default=3,
                        help="search pages per discovery query (100/page)")
    parser.add_argument("--budget", type=int, default=2000,
                        help="max price-history fetches across the whole scan")
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument("--no-history", action="store_true",
                        help="skip CLOB fetches (dry run for series discovery)")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cache_dir = args.cache_dir or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "cache")
    if not args.no_cache:
        pm_client.set_cache_dir(cache_dir)
        print(f"[scan] cache: {cache_dir}")

    t0 = time.time()
    groups = discover_series(DISCOVERY_QUERIES, max_pages=args.max_pages)
    print(f"[scan] discovered {len(groups)} candidate (category, template) groups "
          f"in {time.time() - t0:.0f}s")

    series_out = []
    budget_left = args.budget
    errors = []
    collapsed = {"markets": 0, "dwell_seconds": None,
                 "history_available": 0, "history_missing": 0}

    # Prioritise groups that still have recently-resolved markets (the only
    # ones CLOB still has price history for), then by size; capped per category
    # so the final library has breadth (weather/sports/macro are not drowned).
    candidates = []
    now_ts = int(datetime.now(timezone.utc).timestamp())
    for (category, template), events in groups.items():
        recs = []
        for ev in events:
            rec = pm_client.market_from_event(ev)
            if rec is None or not filter_market(rec):
                continue
            recs.append(rec)
        recs = recs[: args.max_markets]
        if len(recs) < args.min_members:
            continue
        recency = sum(1 for r in recs
                      if r["end_ts"] and (now_ts - r["end_ts"]) < WINDOW_DAYS * 86400)
        candidates.append((recency, -len(recs), category, str(template), recs))

    candidates.sort(reverse=True, key=lambda c: (c[0], c[1]))
    per_category = {}
    for recency, neg_size, category, template, recs in candidates:
        if len(series_out) >= args.max_series:
            break
        if per_category.get(category, 0) >= args.max_per_category:
            continue
        identity = series_identity(category, template)

        if args.no_history:
            series_out.append(build_entry(
                identity, [], {"markets": len(recs)}))
            per_category[category] = per_category.get(category, 0) + 1
            continue

        events_found = []
        collapsed = {"markets": len(recs), "dwell_seconds": None,
                     "history_available": 0, "history_missing": 0}
        dwell_override = max(
            (series_dwell_seconds(template, r["lifetime_sec"] or 0) for r in recs),
            default=dwell_seconds_for_lifetime(0))
        collapsed["dwell_seconds"] = dwell_override
        for rec in recs:
            if budget_left <= 0:
                errors.append("price-history fetch budget exhausted; "
                              "finishing with what we have.")
                break
            best, dwell_sec, skipped = analyze_market(rec, dwell_override)
            budget_left -= min(MAX_TOKENS_PER_MARKET, len(rec["tokens"]))
            if best is not None:
                events_found.append({"price": best["price"], "flip": best["flip"]})
                collapsed["history_available"] += 1
            else:
                collapsed["history_missing"] += 1
        entry = build_entry(identity, events_found, collapsed)
        series_out.append(entry)
        per_category[category] = per_category.get(category, 0) + 1
        log.info("series %-46s n(events)=%-3d markets_seen=%d history_missing=%d",
                 entry["id"], len(events_found), len(recs),
                 collapsed["history_missing"])

    summarize(series_out)

    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    library = {
        "edition": args.edition,
        "as_of": datetime.now(timezone.utc).strftime(EDITION_AS_OF_FORMAT),
        "method": {
            "lock": "dwell",
            "price_grid": PRICE_GRID,
            "dwell": "scaled_by_lifetime",
            "exclude": ["crypto_15m_or_shorter"],
        },
        "series": [],
    }
    for s in series_out:
        clean = {k: v for k, v in s.items() if not k.startswith("_")}
        library["series"].append(clean)

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(library, fh, ensure_ascii=False, indent=2)
    print(f"[scan] wrote {out_path} "
          f"(edition {library['edition']}, {len(library['series'])} series)")

    if errors or collapsed.get("history_missing", 0) > 0:
        write_notes("; ".join(errors) if errors else
                    "CLOB rolling-window left most non-hourly series without "
                    "enough full-lifetime price history.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())