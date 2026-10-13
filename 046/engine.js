/**
 * CPI-046 · CPI night inflation bet (no DOM).
 * Comparisons use tenth-integers so 3.7 - 3.6 does not miss a boundary.
 * Illegal input never throws.
 */
(function () {
  "use strict";

  var RELEASE_UTC_MS = Date.UTC(2026, 9, 14, 12, 30);
  var SHARE_URL = "https://build-100.com/046";
  var CONSENSUS_BAND = [3.6, 3.7];

  var CONSENSUS = {
    headline: CONSENSUS_BAND,
    core: [2.4, 2.5],
    augHeadline: 3.4,
    augCore: 2.4,
    nowcast: { headline: 3.60, core: 2.39 },
    fedRange: [3.75, 4.00],
    fedwatch: { oct: 19, dec: 70.6 }
  };

  var HEADLINE_POOL = [
    { v: 3.0, w: 1 },
    { v: 3.1, w: 1 },
    { v: 3.2, w: 2 },
    { v: 3.3, w: 3 },
    { v: 3.4, w: 5 },
    { v: 3.5, w: 9 },
    { v: 3.6, w: 14 },
    { v: 3.7, w: 12 },
    { v: 3.8, w: 7 },
    { v: 3.9, w: 4 },
    { v: 4.0, w: 2 },
    { v: 4.1, w: 1 },
    { v: 4.2, w: 1 }
  ];

  var CORE_POOL = [
    { v: 2.0, w: 1 },
    { v: 2.1, w: 2 },
    { v: 2.2, w: 4 },
    { v: 2.3, w: 8 },
    { v: 2.4, w: 14 },
    { v: 2.5, w: 12 },
    { v: 2.6, w: 6 },
    { v: 2.7, w: 3 },
    { v: 2.8, w: 1 },
    { v: 2.9, w: 1 }
  ];

  function tenth(x) {
    if (x == null || typeof x === "boolean") return null;
    if (typeof x === "string") {
      var s = x.trim();
      if (s === "") return null;
      x = Number(s);
    }
    if (typeof x !== "number" || !isFinite(x)) return null;
    return Math.round(x * 10);
  }

  function fmt1(x) {
    var t = tenth(x);
    if (t == null) return "—";
    return (t / 10).toFixed(1);
  }

  function titleFor(total) {
    if (total >= 90) return { zh: "CPI 夜之王", en: "King of CPI night" };
    if (total >= 60) return { zh: "老练交易员", en: "Seasoned trader" };
    if (total >= 30) return { zh: "差点意思", en: "Almost" };
    return { zh: "被打爆", en: "Liquidated by the print" };
  }

  function emptyScore() {
    return {
      total: 0,
      acc: 0,
      dir: 0,
      core: 0,
      verdict: "inline",
      tier: "wild",
      title: titleFor(0),
      guess: null,
      side: null,
      coreGuess: null,
      actual: null,
      coreActual: null
    };
  }

  function weightedPick(pool, rng) {
    try {
      if (!Array.isArray(pool) || pool.length === 0) return null;
      var rand = typeof rng === "function" ? rng : Math.random;
      var u = Number(rand());
      if (!isFinite(u) || u < 0) u = 0;
      if (u >= 1) u = 0.999999999999;
      var total = 0;
      var i;
      var w;
      for (i = 0; i < pool.length; i++) {
        w = pool[i] && Number(pool[i].w);
        if (isFinite(w) && w > 0) total += w;
      }
      if (!(total > 0)) return null;
      var target = u * total;
      var acc = 0;
      for (i = 0; i < pool.length; i++) {
        w = pool[i] && Number(pool[i].w);
        if (!(isFinite(w) && w > 0)) continue;
        acc += w;
        if (target < acc) return pool[i].v;
      }
      var last = pool[pool.length - 1];
      return last ? last.v : null;
    } catch (e) {
      return null;
    }
  }

  function classify(actual) {
    try {
      var t = tenth(actual);
      if (t == null) return "inline";
      if (t >= 38) return "hawk";
      if (t <= 35) return "dove";
      return "inline";
    } catch (e) {
      return "inline";
    }
  }

  function accuracyPoints(guess, actual) {
    try {
      var g = tenth(guess);
      var a = tenth(actual);
      if (g == null || a == null) return { points: 0, tier: "wild" };
      var d = Math.abs(g - a);
      if (d <= 1) return { points: 50, tier: "bullseye" };
      if (d <= 2) return { points: 30, tier: "close" };
      if (d <= 4) return { points: 15, tier: "off" };
      return { points: 0, tier: "wild" };
    } catch (e) {
      return { points: 0, tier: "wild" };
    }
  }

  function directionPoints(side, verdict) {
    try {
      if (side !== "long" && side !== "short") return 0;
      if (verdict === "inline") return 20;
      if (side === "long" && verdict === "dove") return 40;
      if (side === "short" && verdict === "hawk") return 40;
      return 0;
    } catch (e) {
      return 0;
    }
  }

  function corePoints(coreGuess, coreActual) {
    try {
      if (coreGuess == null) return 0;
      if (typeof coreGuess === "string" && coreGuess.trim() === "") return 0;
      var g = tenth(coreGuess);
      var a = tenth(coreActual);
      if (g == null || a == null) return 0;
      return Math.abs(g - a) <= 1 ? 10 : 0;
    } catch (e) {
      return 0;
    }
  }

  function scoreRound(input) {
    try {
      var src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
      var accObj = accuracyPoints(src.guess, src.actual);
      var actualOk = tenth(src.actual) != null;
      var verdict = actualOk ? classify(src.actual) : "inline";
      var dir = actualOk ? directionPoints(src.side, verdict) : 0;
      var core = corePoints(src.coreGuess, src.coreActual);
      var total = accObj.points + dir + core;
      if (total > 100) total = 100;
      if (total < 0) total = 0;
      return {
        total: total,
        acc: accObj.points,
        dir: dir,
        core: core,
        verdict: verdict,
        tier: accObj.tier,
        title: titleFor(total),
        guess: src.guess == null ? null : src.guess,
        side: src.side == null ? null : src.side,
        coreGuess: src.coreGuess == null ? null : src.coreGuess,
        actual: src.actual == null ? null : src.actual,
        coreActual: src.coreActual == null ? null : src.coreActual
      };
    } catch (e) {
      return emptyScore();
    }
  }

  function playRound(input, rng) {
    try {
      var src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
      var actual = weightedPick(HEADLINE_POOL, rng);
      var coreActual = weightedPick(CORE_POOL, rng);
      return scoreRound({
        guess: src.guess,
        side: src.side,
        coreGuess: src.coreGuess,
        actual: actual,
        coreActual: coreActual
      });
    } catch (e) {
      return emptyScore();
    }
  }

  function countdown(nowMs) {
    try {
      var now = Number(nowMs);
      if (!isFinite(now)) return { released: false, hours: 0, minutes: 0, totalMs: 0 };
      var diff = RELEASE_UTC_MS - now;
      if (diff <= 0) return { released: true, hours: 0, minutes: 0, totalMs: 0 };
      var totalMinutes = Math.floor(diff / 60000);
      return {
        released: false,
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        totalMs: diff
      };
    } catch (e) {
      return { released: false, hours: 0, minutes: 0, totalMs: 0 };
    }
  }

  function sideWord(side, en) {
    if (side === "long") return en ? "long" : "做多";
    if (side === "short") return en ? "short" : "做空";
    return en ? "no side" : "未选方向";
  }

  function verdictWord(verdict, en) {
    if (verdict === "hawk") return en ? "hawkish" : "偏鹰";
    if (verdict === "dove") return en ? "dovish" : "偏鸽";
    return en ? "in line" : "符合预期";
  }

  function shareText(result, lang) {
    try {
      var en = lang === "en";
      if (!result || typeof result !== "object") {
        return (en ? "Simulated CPI night. " : "模拟 CPI 夜。") + SHARE_URL;
      }
      var guess = fmt1(result.guess);
      var actual = fmt1(result.actual);
      var total = typeof result.total === "number" && isFinite(result.total) ? Math.round(result.total) : 0;
      var title = result.title && typeof result.title === "object"
        ? (en ? result.title.en : result.title.zh)
        : "";
      var side = sideWord(result.side, en);
      var verdict = verdictWord(result.verdict, en);
      if (en) {
        return "Simulated CPI night: I called " + guess + "% " + side +
          ", simulated print " + actual + "% " + verdict +
          ", score " + total + (title ? " · " + title : "") + ". " + SHARE_URL;
      }
      return "模拟 CPI 夜：我押 " + guess + "% " + side +
        "，模拟公布 " + actual + "% " + verdict +
        "，得分 " + total + (title ? " · " + title : "") + "。" + SHARE_URL;
    } catch (e) {
      return lang === "en"
        ? "Simulated CPI night. " + SHARE_URL
        : "模拟 CPI 夜。" + SHARE_URL;
    }
  }

  function inviteText(guess, side, lang) {
    try {
      var en = lang === "en";
      var g = clampGuess(guess);
      var gStr = g.toFixed(1);
      var sideEn = side === "short" ? "short" : side === "long" ? "long" : "";
      var sideZh = side === "short" ? "做空" : side === "long" ? "做多" : "";
      if (en) {
        var bit = sideEn ? sideEn + " S&P 500" : "no side yet";
        return "I'm calling " + gStr + "%, " + bit + ". Simulated CPI night bet: " + SHARE_URL;
      }
      var bitZh = sideZh ? sideZh + " S&P 500" : "还没选做多或做空";
      return "我押 " + gStr + "%，" + bitZh + "。模拟赌局，来押公布：" + SHARE_URL;
    } catch (e) {
      return lang === "en"
        ? "Simulated CPI night bet: " + SHARE_URL
        : "模拟赌局：" + SHARE_URL;
    }
  }

  function clampGuess(x) {
    try {
      var t = tenth(x);
      if (t == null) return 3.6;
      if (t < 30) t = 30;
      if (t > 42) t = 42;
      return Number((t / 10).toFixed(1));
    } catch (e) {
      return 3.6;
    }
  }

  var api = {
    RELEASE_UTC_MS: RELEASE_UTC_MS,
    CONSENSUS: CONSENSUS,
    CONSENSUS_BAND: CONSENSUS_BAND,
    HEADLINE_POOL: HEADLINE_POOL,
    CORE_POOL: CORE_POOL,
    weightedPick: weightedPick,
    classify: classify,
    accuracyPoints: accuracyPoints,
    directionPoints: directionPoints,
    corePoints: corePoints,
    scoreRound: scoreRound,
    playRound: playRound,
    countdown: countdown,
    shareText: shareText,
    inviteText: inviteText,
    clampGuess: clampGuess
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.CpiEngine = api;
})();
