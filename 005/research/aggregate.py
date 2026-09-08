READY_MIN_N = 50
THIN_MIN_N = 15
THIN_MAX_FLIP = 0.02


def build_curve(events, grid):
    """events: list of {"price": float, "flip": bool}. Returns [{price, flip, n}] for each grid price.

    For a given grid price p, an event is counted if its price >= p (the
    threshold was reached). flip rate = flipped / n. n==0 rows get flip=None.
    """
    rows = []
    for p in grid:
        reached = [e for e in events if e["price"] >= p]
        n = len(reached)
        if n == 0:
            rows.append({"price": p, "flip": None, "n": 0})
        else:
            flips = sum(1 for e in reached if e["flip"])
            rows.append({"price": p, "flip": flips / n, "n": n})
    return rows


def pick_lock(curve):
    """Return (lock_price|None, status) per admission floors.

    ready: lowest grid price with n>=50 and flip==0
    thin:  prefer lowest price with flip==0 and 15<=n<50;
           else lowest with n>=15 and 0<flip<=2%
    else  insufficient
    """
    for row in curve:
        if row["n"] >= READY_MIN_N and row["flip"] == 0:
            return row["price"], "ready"

    for row in curve:
        if row["flip"] == 0 and THIN_MIN_N <= row["n"] < READY_MIN_N:
            return row["price"], "thin"

    for row in curve:
        if row["n"] == 0 or row["flip"] is None:
            continue
        if row["n"] >= THIN_MIN_N and 0 < row["flip"] <= THIN_MAX_FLIP:
            return row["price"], "thin"

    return None, "insufficient"