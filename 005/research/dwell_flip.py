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