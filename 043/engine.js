/**
 * EARN-043 · earnings expected move (no DOM).
 *
 * IV move:   move$ = S × (IV%/100) × √(days/365)
 *            pct   = IV% × √(days/365)          // percent, 5.54 means ±5.54%
 * Straddle:  move$ = call + put
 *            pct   = (call+put) / S × 100       // same percent unit
 * Black-Scholes: r = 0, q = 0, European. days ≤ 0 or IV ≤ 0 → intrinsic.
 * Illegal numbers return null. Nothing here throws or returns NaN.
 */
(function () {
  "use strict";

  var DATA = {
    asOf: "2026-10-10",
    ticker: "JPM",
    earningsAt: "2026-10-13T06:45:00-04:00",
    eps: 5.93,
    revenueB: 51.19,
    close: 332.83,
    closeDate: "2026-10-05",
    kbwFromAugHighPct: -13,
    spxQ3EpsYoY: 29.5,
    defaultIv: 40,
    defaultDays: 7,
    defaultCall: 7.35,
    defaultPut: 7.35,
    defaultIvAfter: 20,
    defaultMovePct: 1.5,
    historyKey: "earn043-history",
    calendar: [
      { date: "10-13", names: ["JPM", "GS", "C", "WFC"] },
      { date: "10-14", names: ["MS", "BAC"] }
    ],
    sampleHistory: [
      { date: "2025-10-14", impliedPct: 4.8, actualPct: 3.2 },
      { date: "2026-01-13", impliedPct: 5.1, actualPct: -6.4 },
      { date: "2026-04-14", impliedPct: 4.2, actualPct: 1.1 },
      { date: "2026-07-14", impliedPct: 5.6, actualPct: 7.8 }
    ]
  };

  function isNum(x) {
    return typeof x === "number" && isFinite(x);
  }

  function validate(kind, value) {
    if (typeof kind !== "string") return null;
    if (!isNum(value)) return null;
    if (kind === "spot") return value > 0 ? value : null;
    if (kind === "iv") return value >= 0 ? value : null;
    if (kind === "days") return value >= 0 ? value : null;
    if (kind === "premium") return value >= 0 ? value : null;
    if (kind === "movePct") return value > -100 ? value : null;
    if (kind === "actual") return value;
    return null;
  }

  function expectedMoveIV(S, ivPct, days) {
    S = validate("spot", S);
    ivPct = validate("iv", ivPct);
    days = validate("days", days);
    if (S == null || ivPct == null || days == null) return null;
    var root = Math.sqrt(days / 365);
    var pct = ivPct * root;
    var move = S * (ivPct / 100) * root;
    if (!isFinite(pct) || !isFinite(move)) return null;
    return { move: move, pct: pct, low: S - move, high: S + move };
  }

  function expectedMoveStraddle(S, call, put) {
    S = validate("spot", S);
    call = validate("premium", call);
    put = validate("premium", put);
    if (S == null || call == null || put == null) return null;
    var move = call + put;
    var pct = (move / S) * 100;
    if (!isFinite(move) || !isFinite(pct)) return null;
    return { move: move, pct: pct, low: S - move, high: S + move };
  }

  // Abramowitz & Stegun 7.1.26 erf, then Φ(x) = 0.5 (1 + erf(x/√2)).
  function normCdf(x) {
    if (!isNum(x)) return null;
    var a1 = 0.254829592;
    var a2 = -0.284496736;
    var a3 = 1.421413741;
    var a4 = -1.453152027;
    var a5 = 1.061405429;
    var p = 0.3275911;
    var sign = x < 0 ? -1 : 1;
    var z = Math.abs(x) / Math.SQRT2;
    var t = 1 / (1 + p * z);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    var cdf = 0.5 * (1 + sign * y);
    if (cdf < 0) return 0;
    if (cdf > 1) return 1;
    if (!isFinite(cdf)) return null;
    return cdf;
  }

  function optionType(type) {
    if (typeof type !== "string") return null;
    var s = type.toLowerCase();
    if (s === "call" || s === "c") return "call";
    if (s === "put" || s === "p") return "put";
    return null;
  }

  function intrinsic(kind, S, K) {
    return kind === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }

  function bsPrice(type, S, K, ivPct, days) {
    var kind = optionType(type);
    if (!kind) return null;
    S = validate("spot", S);
    K = validate("spot", K);
    if (S == null || K == null) return null;
    if (!isNum(ivPct) || !isNum(days)) return null;
    var floor = intrinsic(kind, S, K);
    if (days <= 0 || ivPct <= 0) return floor;
    var sigma = ivPct / 100;
    var T = days / 365;
    var vol = sigma * Math.sqrt(T);
    if (!(vol > 1e-12) || !isFinite(vol)) return floor;
    var d1 = (Math.log(S / K) + 0.5 * sigma * sigma * T) / vol;
    var d2 = d1 - vol;
    if (!isFinite(d1) || !isFinite(d2)) return null;
    var nd1 = normCdf(kind === "call" ? d1 : -d1);
    var nd2 = normCdf(kind === "call" ? d2 : -d2);
    if (nd1 == null || nd2 == null) return null;
    var price = kind === "call" ? (S * nd1 - K * nd2) : (K * nd2 - S * nd1);
    if (!isFinite(price)) return null;
    if (price < 0) return price > -1e-6 ? 0 : null;
    return price;
  }

  function straddlePrice(S, K, ivPct, days) {
    var c = bsPrice("call", S, K, ivPct, days);
    var p = bsPrice("put", S, K, ivPct, days);
    if (c == null || p == null) return null;
    var sum = c + p;
    if (!isFinite(sum)) return null;
    return sum;
  }

  function spotAt(S, movePct) {
    var m = validate("movePct", movePct);
    if (m == null) return null;
    var spot = S * (1 + m / 100);
    return validate("spot", spot);
  }

  function solveCallBreakeven(S, premium, ivAfter, daysAfter) {
    function price(m) {
      var spot = spotAt(S, m);
      if (spot == null) return null;
      return bsPrice("call", spot, S, ivAfter, daysAfter);
    }
    if (!isNum(premium) || premium < 0) return null;
    if (premium <= 1e-8) return 0;
    var p0 = price(0);
    if (p0 == null) return null;
    var tol = Math.max(1e-4, Math.abs(premium) * 1e-5);
    if (Math.abs(p0 - premium) <= tol) return 0;

    var lo;
    var hi;
    var guard;
    if (p0 < premium) {
      lo = 0;
      hi = 10;
      guard = 0;
      while (guard < 20) {
        var ph = price(hi);
        if (ph == null) return null;
        if (ph >= premium) break;
        hi *= 2;
        if (hi > 20000) return null;
        guard += 1;
      }
    } else {
      hi = 0;
      lo = -50;
      guard = 0;
      while (guard < 24) {
        var pl = price(lo);
        if (pl == null) return null;
        if (pl <= premium) break;
        var next = lo - (100 + lo) * 0.5;
        if (next < -99.9) next = -99.9;
        if (!(next < lo)) return null;
        lo = next;
        guard += 1;
      }
      var plo = price(lo);
      if (plo == null) return null;
      if (plo > premium) return lo;
    }

    var i;
    for (i = 0; i < 64; i++) {
      var mid = (lo + hi) / 2;
      var pm = price(mid);
      if (pm == null) return null;
      if (pm >= premium) hi = mid;
      else lo = mid;
    }
    var out = (lo + hi) / 2;
    return isFinite(out) ? out : null;
  }

  function solveStraddleBreakeven(S, premium, ivAfter, daysAfter) {
    function price(m) {
      var spot = spotAt(S, m);
      if (spot == null) return null;
      return straddlePrice(spot, S, ivAfter, daysAfter);
    }
    if (!isNum(premium) || premium < 0) return null;
    if (premium <= 1e-8) return 0;
    var p0 = price(0);
    if (p0 == null) return null;
    if (p0 >= premium) return 0;
    var lo = 0;
    var hi = 10;
    var guard = 0;
    while (guard < 20) {
      var ph = price(hi);
      if (ph == null) return null;
      if (ph >= premium) break;
      hi *= 2;
      if (hi > 20000) return null;
      guard += 1;
    }
    var i;
    for (i = 0; i < 64; i++) {
      var mid = (lo + hi) / 2;
      var pm = price(mid);
      if (pm == null) return null;
      if (pm >= premium) hi = mid;
      else lo = mid;
    }
    var out = (lo + hi) / 2;
    return isFinite(out) ? out : null;
  }

  function pnlPct(before, pnl) {
    if (!isNum(before) || !isNum(pnl)) return null;
    if (before > 0) {
      var pct = (pnl / before) * 100;
      return isFinite(pct) ? pct : null;
    }
    if (pnl === 0) return 0;
    return null;
  }

  function ivCrush(opts) {
    if (!opts || typeof opts !== "object") return null;
    var S = validate("spot", opts.S);
    var ivBefore = validate("iv", opts.ivBefore);
    var ivAfter = validate("iv", opts.ivAfter);
    var daysBefore = opts.daysBefore;
    var daysAfter = opts.daysAfter;
    var movePct = opts.movePct;
    if (S == null || ivBefore == null || ivAfter == null) return null;
    if (!isNum(daysBefore) || !isNum(daysAfter) || !isNum(movePct)) return null;
    var S2 = spotAt(S, movePct);
    if (S2 == null) return null;

    var callBefore = bsPrice("call", S, S, ivBefore, daysBefore);
    var callAfter = bsPrice("call", S2, S, ivAfter, daysAfter);
    var strBefore = straddlePrice(S, S, ivBefore, daysBefore);
    var strAfter = straddlePrice(S2, S, ivAfter, daysAfter);
    if (callBefore == null || callAfter == null || strBefore == null || strAfter == null) return null;

    var callPnl = callAfter - callBefore;
    var strPnl = strAfter - strBefore;
    if (!isFinite(callPnl) || !isFinite(strPnl)) return null;
    var callPnlPct = pnlPct(callBefore, callPnl);
    var strPnlPct = pnlPct(strBefore, strPnl);
    var breakevenCallPct = solveCallBreakeven(S, callBefore, ivAfter, daysAfter);
    var breakevenStrPct = solveStraddleBreakeven(S, strBefore, ivAfter, daysAfter);
    if (breakevenCallPct == null || breakevenStrPct == null) return null;
    if (!isFinite(breakevenCallPct) || !isFinite(breakevenStrPct)) return null;

    return {
      callBefore: callBefore,
      callAfter: callAfter,
      callPnl: callPnl,
      callPnlPct: callPnlPct,
      strBefore: strBefore,
      strAfter: strAfter,
      strPnl: strPnl,
      strPnlPct: strPnlPct,
      breakevenCallPct: breakevenCallPct,
      breakevenStrPct: breakevenStrPct
    };
  }

  function classifyRow(impliedPct, actualPct) {
    if (!isNum(impliedPct) || !isNum(actualPct)) return null;
    if (Math.abs(actualPct) > impliedPct) return "over";
    return "under";
  }

  function rowPair(row) {
    if (Array.isArray(row)) {
      if (row.length >= 3) return { implied: row[1], actual: row[2] };
      return { implied: row[0], actual: row[1] };
    }
    if (row && typeof row === "object") {
      var implied = ("impliedPct" in row) ? row.impliedPct : row.implied;
      var actual = ("actualPct" in row) ? row.actualPct : row.actual;
      return { implied: implied, actual: actual };
    }
    return null;
  }

  function summarizeHistory(rows) {
    if (!Array.isArray(rows)) return null;
    var over = 0;
    var under = 0;
    var blank = 0;
    var i;
    for (i = 0; i < rows.length; i++) {
      var pair = rowPair(rows[i]);
      var tag = pair ? classifyRow(pair.implied, pair.actual) : null;
      if (tag === "over") over += 1;
      else if (tag === "under") under += 1;
      else blank += 1;
    }
    return {
      count: rows.length,
      over: over,
      under: under,
      blank: blank,
      rated: over + under
    };
  }

  function fmtUSD(x) {
    if (!isNum(x)) return "—";
    var neg = x < 0;
    var abs = Math.abs(x).toFixed(2);
    if (abs === "0.00") neg = false;
    var parts = abs.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + "$" + parts[0] + "." + parts[1];
  }

  function fmtPct(x, opts) {
    if (typeof opts === "number") opts = { digits: opts };
    opts = opts || {};
    if (!isNum(x)) return "—";
    var digits = (typeof opts.digits === "number" && opts.digits >= 0) ? opts.digits : 2;
    var neg = x < 0;
    var body = Math.abs(x).toFixed(digits);
    if (Number(body) === 0) return body + "%";
    var prefix = "";
    if (neg) prefix = "-";
    else if (opts.sign) prefix = "+";
    return prefix + body + "%";
  }

  var api = {
    DATA: DATA,
    expectedMoveIV: expectedMoveIV,
    expectedMoveStraddle: expectedMoveStraddle,
    normCdf: normCdf,
    bsPrice: bsPrice,
    straddlePrice: straddlePrice,
    ivCrush: ivCrush,
    classifyRow: classifyRow,
    summarizeHistory: summarizeHistory,
    validate: validate,
    fmtUSD: fmtUSD,
    fmtPct: fmtPct
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.EarnEngine = api;
})();
