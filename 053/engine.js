/**
 * GRADE-053 · earnings report card (no DOM).
 * Surprise, letter grades, after-hours reading. Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/053/";
  var DISCLAIMER = {
    zh: "仅供学习参考，不构成投资建议",
    en: "For education only, not investment advice."
  };

  var META = { asOf: "2026-10-20" };

  var EARN_CALL = Date.UTC(2026, 9, 20, 20, 30, 0);

  var ZERO_CD = { done: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };

  var POINTS = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  var FROM_POINTS = { 5: "S", 4: "A", 3: "B", 2: "C", 1: "D" };

  var COMPANIES = [
    {
      id: "spcx",
      name: "SPCX",
      title: { zh: "SPCX", en: "SPCX" },
      quarter: "Q3",
      expEps: 0.14,
      expRevB: 128.9,
      revYoY: 65,
      lastEps: -0.09,
      preset: true
    },
    {
      id: "nflx",
      name: "NFLX",
      title: { zh: "Netflix（NFLX）", en: "Netflix (NFLX)" },
      quarter: "Q3",
      expEps: null,
      expRevB: null,
      revYoY: null,
      lastEps: null,
      preset: false
    },
    {
      id: "custom",
      name: "Custom",
      title: { zh: "自定义", en: "Custom" },
      quarter: null,
      expEps: null,
      expRevB: null,
      revYoY: null,
      lastEps: null,
      preset: false
    }
  ];

  var THRESHOLDS = [
    { grade: "S", min: 10, points: 5, range: { zh: "≥ +10%", en: "≥ +10%" } },
    { grade: "A", min: 3, points: 4, range: { zh: "≥ +3%", en: "≥ +3%" } },
    { grade: "B", min: 0, points: 3, range: { zh: "≥ 0%（小幅 beat / 持平）", en: "≥ 0% (small beat / in line)" } },
    { grade: "C", min: -5, points: 2, range: { zh: "≥ −5%", en: "≥ −5%" } },
    { grade: "D", min: null, points: 1, range: { zh: "< −5%", en: "< −5%" } }
  ];

  var HISTORY = [
    { quarter: "Q2 2026", expEps: -0.06, actEps: -0.09, result: "miss", surprisePct: null, isIllustrative: true },
    { quarter: "Q1 2026", expEps: 0.10, actEps: 0.13, result: "beat", surprisePct: null, isIllustrative: true },
    { quarter: "Q4 2025", expEps: 0.10, actEps: 0.08, result: "miss", surprisePct: null, isIllustrative: true },
    { quarter: "Q3 2025", expEps: 0.04, actEps: 0.05, result: "beat", surprisePct: null, isIllustrative: true }
  ];
  HISTORY.isIllustrative = true;

  var CHECKLIST = [
    {
      id: "guidance",
      text: {
        zh: "Guidance 指引：上调、下调，还是维持？",
        en: "Guidance: raised, cut, or held?"
      }
    },
    {
      id: "keywords",
      text: {
        zh: "电话会关键词：需求、利润率、资本开支、下季指引",
        en: "Call keywords: demand, margins, capex, next-quarter guide"
      }
    },
    {
      id: "volume",
      text: {
        zh: "盘后成交量是否放大",
        en: "Did after-hours volume expand?"
      }
    },
    {
      id: "valuation",
      text: {
        zh: "估值位置：财报前涨了多少，是否已 price in",
        en: "Valuation: how much did it run into the print, and is it already priced in?"
      }
    },
    {
      id: "sameway",
      text: {
        zh: "营收与 EPS 是否同向",
        en: "Did revenue and EPS move the same way?"
      }
    },
    {
      id: "tone",
      text: {
        zh: "管理层对下季的措辞有没有变",
        en: "Did management's tone on next quarter change?"
      }
    }
  ];

  function parseNum(str) {
    try {
      if (typeof str === "number") return isFinite(str) ? str : null;
      if (str == null) return null;
      var s = String(str).trim();
      if (!s) return null;
      s = s.replace(/[\u2212\u2013\u2014\uFE63\uFF0D]/g, "-");
      s = s.replace(/\s+/g, "");
      s = s.replace(/,/g, ".");
      s = s.replace(/[%$]/g, "");
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    } catch (e) {
      return null;
    }
  }

  function surprisePct(actual, expected) {
    try {
      var a = parseNum(actual);
      var e = parseNum(expected);
      if (a == null || e == null) return null;
      if (e === 0) return null;
      return (a - e) / Math.abs(e) * 100;
    } catch (e) {
      return null;
    }
  }

  function gradeFor(pct) {
    try {
      var p = parseNum(pct);
      if (p == null) return null;
      if (p >= 10) return "S";
      if (p >= 3) return "A";
      if (p >= 0) return "B";
      if (p >= -5) return "C";
      return "D";
    } catch (e) {
      return null;
    }
  }

  function isGrade(g) {
    return g === "S" || g === "A" || g === "B" || g === "C" || g === "D";
  }

  function roundHalfUp(n) {
    return Math.floor(n + 0.5);
  }

  function combine(epsGrade, revGrade) {
    try {
      var e = isGrade(epsGrade) ? epsGrade : null;
      var r = isGrade(revGrade) ? revGrade : null;
      if (e && r) {
        var avg = (POINTS[e] + POINTS[r]) / 2;
        return FROM_POINTS[roundHalfUp(avg)] || null;
      }
      return e || r || null;
    } catch (e) {
      return null;
    }
  }

  function isBeat(g) {
    return isGrade(g) && POINTS[g] >= 3;
  }

  function isMiss(g) {
    return isGrade(g) && POINTS[g] <= 2;
  }

  function isStrong(g) {
    return g === "S" || g === "A";
  }

  function verdict(epsGrade, revGrade) {
    try {
      var e = isGrade(epsGrade) ? epsGrade : null;
      var r = isGrade(revGrade) ? revGrade : null;
      if (!e && !r) {
        return {
          zh: "填入实际数字后会出现解读。",
          en: "A reading appears after you enter the actuals."
        };
      }
      if (e && !r) {
        return {
          zh: (isBeat(e) ? "EPS beat。" : "EPS miss。") + "营收未填，综合按 EPS。",
          en: (isBeat(e) ? "EPS beat. " : "EPS miss. ") + "Revenue is blank, so the overall grade follows EPS."
        };
      }
      if (!e && r) {
        return {
          zh: (isBeat(r) ? "营收 beat。" : "营收 miss。") + "EPS 未填，综合按营收。",
          en: (isBeat(r) ? "Revenue beat. " : "Revenue miss. ") + "EPS is blank, so the overall grade follows revenue."
        };
      }
      if (isBeat(e) && isBeat(r)) {
        if (isStrong(e) && isStrong(r)) {
          return {
            zh: "双 beat。数字好不等于会涨：看 guidance。",
            en: "Beat on both. Good numbers do not mean the stock will rise: watch guidance."
          };
        }
        return {
          zh: "双 beat：EPS 和营收都达到或超过预期。下一步看电话会和指引。",
          en: "Beat on both: EPS and revenue met or topped the print. Next, watch the call and guidance."
        };
      }
      if (isMiss(e) && isBeat(r)) {
        return {
          zh: "营收 beat 但 EPS miss：可能是毛利率或费用问题，看电话会解释。",
          en: "Revenue beat, EPS miss: could be gross margin or costs. Listen for the explanation on the call."
        };
      }
      if (isBeat(e) && isMiss(r)) {
        return {
          zh: "EPS beat 但营收 miss：靠省钱或回购撑利润，增长存疑。",
          en: "EPS beat, revenue miss: profits may rest on cost cuts or buybacks. Growth is in question."
        };
      }
      return {
        zh: "双 miss：EPS 和营收都低于预期。盯指引，等电话会确认。",
        en: "Miss on both: EPS and revenue came in below the print. Watch guidance and wait for the call."
      };
    } catch (err) {
      return { zh: "填入实际数字后会出现解读。", en: "A reading appears after you enter the actuals." };
    }
  }

  function reaction(overall, afterHoursPct) {
    try {
      var g = isGrade(overall) ? overall : null;
      var ah = parseNum(afterHoursPct);
      if (!g || ah == null) return { kind: null, text: { zh: "", en: "" } };
      if (isBeat(g) && ah < 0) {
        return {
          kind: "good-drop",
          text: {
            zh: "好财报跌：预期可能已 price in，或 guidance 偏弱。",
            en: "Good print, stock down: it may already be priced in, or guidance is weak."
          }
        };
      }
      if (isMiss(g) && ah > 0) {
        return {
          kind: "bad-pop",
          text: {
            zh: "坏财报涨：利空出尽、指引好于预期，或空头回补。等电话会确认。",
            en: "Bad print, stock up: the miss may be out, guidance may be better, or shorts covering. Wait for the call."
          }
        };
      }
      return {
        kind: "aligned",
        text: {
          zh: "市场认可这份成绩。",
          en: "The market is buying this report card."
        }
      };
    } catch (e) {
      return { kind: null, text: { zh: "", en: "" } };
    }
  }

  function emptyReport() {
    return {
      eps: { pct: null, grade: null },
      rev: { pct: null, grade: null },
      overall: null,
      verdict: verdict(null, null),
      reaction: { kind: null, text: { zh: "", en: "" } }
    };
  }

  function report(input) {
    try {
      var src = input && typeof input === "object" ? input : {};
      var expEps = parseNum(src.expEps);
      var expRevB = parseNum(src.expRevB);
      var actEps = parseNum(src.actEps);
      var actRevB = parseNum(src.actRevB);
      var ahPct = parseNum(src.ahPct);
      var epsPct = surprisePct(actEps, expEps);
      var revPct = surprisePct(actRevB, expRevB);
      var epsGrade = gradeFor(epsPct);
      var revGrade = gradeFor(revPct);
      var overall = combine(epsGrade, revGrade);
      return {
        eps: { pct: epsPct, grade: epsGrade },
        rev: { pct: revPct, grade: revGrade },
        overall: overall,
        verdict: verdict(epsGrade, revGrade),
        reaction: reaction(overall, ahPct)
      };
    } catch (e) {
      return emptyReport();
    }
  }

  function asMs(v) {
    if (v == null || typeof v === "boolean" || typeof v === "object") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function countdown(targetMs, nowMs) {
    try {
      var target = asMs(targetMs);
      var now = asMs(nowMs);
      if (target == null || now == null) return ZERO_CD;
      var totalMs = target - now;
      if (!(totalMs > 0)) return ZERO_CD;
      var totalSec = Math.floor(totalMs / 1000);
      return {
        done: false,
        days: Math.floor(totalSec / 86400),
        hours: Math.floor((totalSec % 86400) / 3600),
        minutes: Math.floor((totalSec % 3600) / 60),
        seconds: totalSec % 60,
        totalMs: totalMs
      };
    } catch (e) {
      return ZERO_CD;
    }
  }

  function knownIds() {
    var map = {};
    var i;
    for (i = 0; i < CHECKLIST.length; i++) map[CHECKLIST[i].id] = true;
    return map;
  }

  function asIdList(checkedIds) {
    if (Array.isArray(checkedIds)) return checkedIds;
    if (checkedIds && typeof checkedIds === "object") {
      return Object.keys(checkedIds).filter(function (k) { return checkedIds[k]; });
    }
    return [];
  }

  function checklistProgress(checkedIds) {
    try {
      var known = knownIds();
      var seen = {};
      var done = 0;
      var list = asIdList(checkedIds);
      var i;
      for (i = 0; i < list.length; i++) {
        var id = String(list[i]);
        if (!known[id] || seen[id]) continue;
        seen[id] = true;
        done += 1;
      }
      return { done: done, total: CHECKLIST.length };
    } catch (e) {
      return { done: 0, total: CHECKLIST.length };
    }
  }

  function fmtSignedPct(pct) {
    var n = parseNum(pct);
    if (n == null) return "—";
    var abs = Math.abs(n);
    var body = abs.toFixed(1);
    if (n > 0) return "+" + body + "%";
    if (n < 0) return "-" + body + "%";
    return "0.0%";
  }

  function shareText(lang, rep, companyName) {
    try {
      var en = lang === "en";
      var name = companyName == null ? "" : String(companyName).trim();
      if (!name) name = en ? "tonight's earnings" : "今晚财报";
      var graded = rep && isGrade(rep.overall);
      var lines;
      if (!graded) {
        if (en) {
          lines = [
            "GRADE-053 · Earnings report card",
            "Come grade tonight's earnings",
            SHARE_URL,
            "Data as of " + META.asOf,
            DISCLAIMER.en
          ];
        } else {
          lines = [
            "GRADE-053 · 财报成绩单",
            "来给今晚财报判分",
            SHARE_URL,
            "数据日期 " + META.asOf,
            DISCLAIMER.zh
          ];
        }
      } else {
        var epsBit = "EPS " + fmtSignedPct(rep.eps && rep.eps.pct);
        if (rep.eps && rep.eps.grade) epsBit += " · " + rep.eps.grade;
        var revBit = (en ? "Revenue " : "营收 ") + fmtSignedPct(rep.rev && rep.rev.pct);
        if (rep.rev && rep.rev.grade) revBit += " · " + rep.rev.grade;
        if (en) {
          lines = [
            "GRADE-053 · Earnings report card",
            name + " · overall " + rep.overall,
            epsBit + " · " + revBit,
            SHARE_URL,
            "Data as of " + META.asOf,
            DISCLAIMER.en
          ];
        } else {
          lines = [
            "GRADE-053 · 财报成绩单",
            name + " · 综合 " + rep.overall,
            epsBit + " · " + revBit,
            SHARE_URL,
            "数据日期 " + META.asOf,
            DISCLAIMER.zh
          ];
        }
      }
      return lines.join("\n");
    } catch (e) {
      return lang === "en" ? SHARE_URL + "\n" + DISCLAIMER.en : SHARE_URL + "\n" + DISCLAIMER.zh;
    }
  }

  (function fillHistoryPct() {
    var i;
    for (i = 0; i < HISTORY.length; i++) {
      HISTORY[i].surprisePct = surprisePct(HISTORY[i].actEps, HISTORY[i].expEps);
    }
  })();

  var API = {
    META: META,
    EARN_CALL: EARN_CALL,
    COMPANIES: COMPANIES,
    THRESHOLDS: THRESHOLDS,
    HISTORY: HISTORY,
    CHECKLIST: CHECKLIST,
    DISCLAIMER: DISCLAIMER,
    countdown: countdown,
    parseNum: parseNum,
    surprisePct: surprisePct,
    gradeFor: gradeFor,
    combine: combine,
    verdict: verdict,
    reaction: reaction,
    report: report,
    checklistProgress: checklistProgress,
    shareText: shareText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.GradeEngine = API;
})();
