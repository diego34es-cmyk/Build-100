"""Polymarket data client for LOCK-005.

Thin, rate-limit friendly wrapper around two public APIs:

- Gamma API   (https://gamma-api.polymarket.com)  -> markets / events / discovery
- CLOB API    (https://clob.polymarket.com)       -> token price history

Notes on observed behaviour (Aug 2026):

- ``/events`` accepts a real ``title_search`` param (case-insensitive substring
  over event/market titles). The plain ``search`` param is NOT reliable.
- ``clob.polymarket.com/prices-history`` only exposes a *rolling window* of
  price history per token (roughly the last day-ish for thin markets, up to a
  couple of days for liquid ones). Older resolved markets frequently return
  ``null`` history or ``{"history": []}``. Callers must handle that gracefully
  and treat events without a usable full-lifetime series as "insufficient".
- Raw JSON responses are cached under ``research/cache/`` (optional, enabled by
  default) so rescans do not hammer the API.

Use from the rescanner::

    from research.pm_client import gamma_get, clob_price_history, smoke
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
import urllib.parse
from typing import Any, Callable, Iterable, Optional

import requests

log = logging.getLogger("pm_client")

GAMMA_BASE = "https://gamma-api.polymarket.com"
CLOB_BASE = "https://clob.polymarket.com"
DATA_API_BASE = "https://data-api.polymarket.com"
CLOB_PRICES_HISTORY = f"{CLOB_BASE}/prices-history"
DATA_TRADES = f"{DATA_API_BASE}/trades"

UA = "build100-lock005/0.1 (+https://build-100.com/005)"

DEFAULT_PAGE_SIZE = 100
REQ_DELAY = 0.35
MAX_RETRIES = 3
BACKOFF = 1.6
TIMEOUT = 40

_CACHE_DIR: Optional[str] = None


def set_cache_dir(path: Optional[str]) -> None:
    """Enable/disable the response cache. Pass None to disable."""
    global _CACHE_DIR
    _CACHE_DIR = path
    if path:
        os.makedirs(path, exist_ok=True)


def _cache_key(kind: str, payload: str) -> str:
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]
    return os.path.join(_CACHE_DIR, f"{kind}-{digest}.json") if _CACHE_DIR else ""


def _read_cache(path: str) -> Optional[Any]:
    if not path or not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:  # noqa: BLE001 - corrupted cache should never crash a scan
        return None


def _write_cache(path: str, data: Any) -> None:
    if not path:
        return
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False)
    except Exception:  # noqa: BLE001
        pass


def _get(url: str, params: Optional[dict] = None, cache: bool = False,
         cache_key: str = "") -> Any:
    """GET with retry/backoff. Returns parsed JSON or None on hard failure."""
    cache_path = _cache_key("get", cache_key or url) if cache else ""
    if cache_path:
        hit = _read_cache(cache_path)
        if hit is not None:
            return hit

    last_err: Optional[Exception] = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                url,
                params=params,
                headers={"User-Agent": UA},
                timeout=TIMEOUT,
            )
            if resp.status_code == 429:
                log.info("rate-limited (%d); backing off", resp.status_code)
                raise _Retryable(resp.status_code)
            if resp.status_code >= 500:
                log.info("server error %d; backing off", resp.status_code)
                raise _Retryable(resp.status_code)
            if resp.status_code >= 400:
                log.warning("HTTP %d for %s %s", resp.status_code, url, params)
                if resp.status_code == 404:
                    return None
                raise _Retryable(resp.status_code)
            data = resp.json()
            if cache_path:
                _write_cache(cache_path, data)
            return data
        except requests.exceptions.RequestException as exc:
            last_err = exc
            log.info("request error: %s", exc)
        except _Retryable as exc:
            last_err = exc
        except ValueError as exc:
            log.warning("bad JSON from %s: %s", url, exc)
            last_err = exc
        time.sleep((BACKOFF ** attempt) * 1.0)
    log.warning("giving up on %s: %s", url, last_err)
    return None


class _Retryable(Exception):
    pass


def gamma_get(path: str, params: Optional[dict] = None) -> Any:
    """GET a Gamma API path (e.g. '/events') with optional query params."""
    params = params or {}
    cache_key = path + json.dumps(params, sort_keys=True, separators=(",", ":"))
    url = GAMMA_BASE + (path if path.startswith("/") else "/" + path)
    return _get(url, params, cache=True, cache_key=cache_key)


def gamma_paginate(path: str, params: Optional[dict] = None,
                   max_pages: int = 8, page_size: int = DEFAULT_PAGE_SIZE,
                   stop_empty: bool = True) -> list:
    """Page through a Gamma list endpoint. Skips duplicate IDs across pages.

    Returns a flat list of items.
    """
    params = dict(params or {})
    params.setdefault("limit", page_size)
    seen_ids = set()
    out: list = []
    for page in range(max_pages):
        params["offset"] = page * page_size
        batch = gamma_get(path, params)
        if not batch:
            break
        added = 0
        for item in batch:
            item_id = item.get("id")
            if item_id is None or item_id not in seen_ids:
                seen_ids.add(item_id)
                out.append(item)
                added += 1
        if stop_empty and (added == 0 or len(batch) < page_size):
            break
        time.sleep(REQ_DELAY)
    return out


def clob_price_history(token_id: str, start_ts: Optional[int] = None) -> list:
    """Fetch the (rolling-window) price history for one outcome token.

    Returns a list of {"t": unix_seconds, "p": mid_price} sorted ascending,
    or [] when the API returns nothing usable.
    """
    token_id = str(token_id)
    params: dict = {"market": token_id, "interval": "max", "fidelity": 10}
    cache_key = token_id
    if start_ts:
        params["startTs"] = int(start_ts)
        cache_key += f"@{start_ts}"
    cache_path = _cache_key("clob", cache_key) if _CACHE_DIR else ""
    hit = _read_cache(cache_path)
    if hit is not None:
        return hit
    data = _get(CLOB_PRICES_HISTORY, params)
    if data is None or not isinstance(data, dict):
        return []
    history = data.get("history") or []
    history = [r for r in history if isinstance(r, dict) and r.get("t") and r.get("p") is not None]
    history.sort(key=lambda r: r["t"])
    if cache_path:
        _write_cache(cache_path, history)
    return history


def trades_price_history(condition_id: str, token_id: str,
                         max_pages: int = 30) -> list:
    """Rebuild a token's trade price path from data-api (works on closed markets).

    CLOB ``prices-history`` drops resolved markets; the public trades feed keeps
    fills. Returns [{"t": unix_seconds, "p": price}, ...] sorted ascending.
    """
    condition_id = str(condition_id or "")
    token_id = str(token_id or "")
    if not condition_id or not token_id:
        return []
    cache_path = _cache_key("trades", f"{condition_id}:{token_id}") if _CACHE_DIR else ""
    hit = _read_cache(cache_path)
    if hit is not None:
        return hit

    rows: list = []
    for page in range(max_pages):
        batch = _get(
            DATA_TRADES,
            {"market": condition_id, "limit": 100, "offset": page * 100},
            cache=False,
        )
        if not batch or not isinstance(batch, list):
            break
        rows.extend(batch)
        if len(batch) < 100:
            break
        time.sleep(REQ_DELAY)

    history = []
    for tr in rows:
        if str(tr.get("asset") or "") != token_id:
            continue
        ts = tr.get("timestamp")
        price = tr.get("price")
        if ts is None or price is None:
            continue
        try:
            history.append({"t": int(ts), "p": float(price)})
        except (TypeError, ValueError):
            continue
    history.sort(key=lambda r: r["t"])
    if cache_path:
        _write_cache(cache_path, history)
    return history


def token_price_history(condition_id: Optional[str], token_id: str,
                        start_ts: Optional[int] = None) -> list:
    """Prefer CLOB candles; fall back to data-api trades for closed markets.

    CLOB keeps a short rolling window. If that window does not cover the
    market start (or has fewer than 3 points), rebuild from public trades.
    """
    hist = clob_price_history(token_id, start_ts=start_ts)
    need_trades = len(hist) < 3
    if start_ts and hist and hist[0]["t"] > int(start_ts) + 3600:
        need_trades = True
    if need_trades and condition_id:
        trades = trades_price_history(condition_id, token_id)
        if len(trades) > len(hist):
            return trades
    return hist


# --------------------------------------------------------------------------
# market/event parsing helpers
# --------------------------------------------------------------------------

def _parse_str_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except ValueError:
            return []
    return []


def market_from_event(event: dict) -> Optional[dict]:
    """Normalise the first (favorite) market of an event into a scan record.

    Returns None when the market has no CLOB tokens (no price history possible).
    """
    markets = event.get("markets") or []
    if not markets:
        return None
    m = markets[0]
    tokens = _parse_str_list(m.get("clobTokenIds") or [])
    if not tokens:
        return None
    outcomes = _parse_str_list(m.get("outcomes") or ["Yes", "No"])
    prices = _parse_str_list(m.get("outcomePrices") or [])
    winner_index = None
    for i, p in enumerate(prices):
        try:
            if float(p) >= 0.99:
                winner_index = i
                break
        except (TypeError, ValueError):
            continue
    record = {
        "event_id": str(event.get("id")),
        "condition_id": m.get("conditionId") or "",
        "title": m.get("question") or (event.get("title") or ""),
        "slug": m.get("slug") or (event.get("slug") or ""),
        "category": m.get("category") or (event.get("category") or ""),
        "tags": [t.get("label") if isinstance(t, dict) else str(t)
                 for t in (event.get("tags") or [])],
        "tokens": tokens,
        "outcomes": outcomes,
        "winner_index": winner_index,
        "start_ts": _epoch(m.get("startDate") or m.get("createdAt")),
        "end_ts": _epoch(m.get("endDate")),
        "end_iso": m.get("endDate") or "",
        "lifetime_sec": _lifetime(m.get("startDate") or m.get("createdAt"),
                                   m.get("endDate")),
        "volume": _num(m.get("volumeNum") or m.get("volume")),
    }
    return record


def _epoch(iso: Any) -> Optional[int]:
    if not iso:
        return None
    from datetime import datetime

    text = str(iso).replace("Z", "+00:00").replace(" ", "T")
    try:
        dt = datetime.fromisoformat(text)
        return int(dt.timestamp())
    except ValueError:
        return None


def _lifetime(start_iso: Any, end_iso: Any) -> Optional[float]:
    s = _epoch(start_iso)
    e = _epoch(end_iso)
    if s is None or e is None:
        return None
    return max(0.0, e - s)


def _num(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


# --------------------------------------------------------------------------
# discovery
# --------------------------------------------------------------------------

def search_events(title: str, closed: bool = True, limit: int = DEFAULT_PAGE_SIZE,
                  order: str = "createdAt", ascending: bool = False,
                  offset: int = 0,
                  start_date_min: Optional[str] = None,
                  end_date_min: Optional[str] = None,
                  end_date_max: Optional[str] = None) -> list:
    """Paginated, case-insensitive title search over Gamma events."""
    params: dict = {"title_search": title, "limit": limit, "offset": offset}
    if closed is not None:
        params["closed"] = "true" if closed else "false"
    if order:
        params["order"] = order
        params["ascending"] = "false" if ascending else "true"
    if start_date_min:
        params["start_date_min"] = start_date_min
    if end_date_min:
        params["end_date_min"] = end_date_min
    if end_date_max:
        params["end_date_max"] = end_date_max
    return gamma_get("/events", params) or []


# --------------------------------------------------------------------------
# smoke test
# --------------------------------------------------------------------------

def smoke() -> None:
    """Print a handful of recent market titles to confirm connectivity."""
    try:
        events = search_events("Bitcoin Up or Down", limit=5)
        print(f"[smoke] gamma-api OK: {len(events)} events")
        for e in events[:5]:
            title = (e.get("title") or "?")[:70]
            vol = e.get("volume") or 0
            print(f"  - {title}  (vol={vol:,.0f})")
        tokens: list = []
        for e in events:
            for m in e.get("markets") or []:
                for t in _parse_str_list(m.get("clobTokenIds") or []):
                    tokens.append(t)
        if tokens:
            hist = clob_price_history(tokens[0])
            print(f"[smoke] clob price-history OK: {len(hist)} points "
                  f"(token {tokens[0][:10]}…)")
            if hist:
                print(f"  first p={hist[0]['p']:.3f} @ {hist[0]['t']}")
                print(f"  last  p={hist[-1]['p']:.3f} @ {hist[-1]['t']}")
        else:
            print("[smoke] no CLOB tokens found to probe price history")
    except Exception as exc:  # noqa: BLE001
        print(f"[smoke] FAILED: {exc}")
        raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    set_cache_dir(os.path.join(os.path.dirname(__file__), "cache"))
    smoke()