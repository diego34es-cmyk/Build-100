import re

CRYPTO_TITLE_RE = re.compile(r"\b(bitcoin|btc|ethereum|eth|solana|sol|dogecoin|doge|xrp|up\s+or\s+down)\b", re.IGNORECASE)

SHORT_LIFETIME_SEC = 900


def is_crypto_short(title: str, lifetime_sec: float) -> bool:
    """True when a market looks like a crypto up/down market that lives <= 15m."""
    if lifetime_sec > SHORT_LIFETIME_SEC:
        return False
    return bool(CRYPTO_TITLE_RE.search(title or ""))


def should_include(market: dict) -> bool:
    """Recurring-series candidate rule: keep everything except crypto <= 15m."""
    title = market.get("title", "") or ""
    lifetime_sec = market.get("lifetime_sec", 0) or 0
    tags = [t.lower() for t in (market.get("tags") or [])]
    crypto_tag = "crypto" in tags
    if crypto_tag and lifetime_sec <= SHORT_LIFETIME_SEC:
        return False
    if is_crypto_short(title, lifetime_sec):
        return False
    return True