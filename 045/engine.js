/**
 * BURN-045 · AI token burn-rate check (no DOM).
 * Illegal input never throws.
 */
(function () {
  "use strict";

  var DAYS_PER_MONTH = 30;
  var SHARE_URL = "https://build-100.com/045";

  var MODELS = [
    {
      id: "haiku",
      nameZh: "Claude Haiku 5.5",
      nameEn: "Claude Haiku 5.5",
      inPerM: 0.1,
      outPerM: 0.5,
      noteZh: "2026-10-07 上线；比 Haiku 4.5 便宜约 75%；首个支持 effort 档位的 Haiku。",
      noteEn: "Launched 2026-10-07; about 75% cheaper than Haiku 4.5; first Haiku with effort tiers.",
      requiresPrice: false
    },
    {
      id: "sol",
      nameZh: "GPT-6.1 Sol",
      nameEn: "GPT-6.1 Sol",
      inPerM: 2,
      outPerM: 10,
      noteZh: "GPT-6 全家桶报价。GPT-6 带 Intelligent UI（回答里直接嵌图表、按钮、账单分摊小工具）。",
      noteEn: "GPT-6 family-bucket price. GPT-6 ships Intelligent UI (charts, buttons, and bill-split widgets inside the answer).",
      requiresPrice: false
    },
    {
      id: "luna",
      nameZh: "GPT-6 Luna",
      nameEn: "GPT-6 Luna",
      inPerM: 2,
      outPerM: 10,
      noteZh: "全家桶报价（报道未给单独价，沿用 GPT-6 全家桶约 $2 / $10）。",
      noteEn: "Family-bucket price (no separate quote in reports; uses the GPT-6 family ~$2 / $10).",
      requiresPrice: false
    },
    {
      id: "sonnet",
      nameZh: "Claude Sonnet 5.5",
      nameEn: "Claude Sonnet 5.5",
      inPerM: null,
      outPerM: null,
      noteZh: "2026-09-28：快 30%，多数工作便宜 30%；Cowork 任务 10-06 起可跑在云端。报道仅称约便宜 30%，没有绝对价，请按官网手填后才能进对比。",
      noteEn: "2026-09-28: 30% faster, about 30% cheaper on most work; Cowork tasks can run in the cloud from 2026-10-06. Reports only say about 30% cheaper — no absolute price. Enter the official price to include it.",
      requiresPrice: true
    },
    {
      id: "decisions",
      nameZh: "OpenAI Decisions API",
      nameEn: "OpenAI Decisions API",
      inPerM: 0.1,
      outPerM: 0,
      noteZh: "2026-10-06 公开测试；返回 typed verdicts。output 价未公布，按 0 估算，可手改。",
      noteEn: "Public test 2026-10-06; returns typed verdicts. Output price unpublished — estimated as 0, editable.",
      requiresPrice: false
    }
  ];

  var PRESETS = {
    light: {
      id: "light",
      dailyIn: 50000,
      dailyOut: 50000,
      nameZh: "轻度聊天",
      nameEn: "Light chat"
    },
    vibe: {
      id: "vibe",
      dailyIn: 2000000,
      dailyOut: 500000,
      nameZh: "重度 vibe coding",
      nameEn: "Heavy vibe coding"
    },
    agent: {
      id: "agent",
      dailyIn: 5000000,
      dailyOut: 1000000,
      nameZh: "Agent 跑批",
      nameEn: "Agent batch runs"
    }
  };

  function toNum(v) {
    if (v == null || v === "") return null;
    if (typeof v === "boolean") return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.trim().replace(/,/g, "");
      if (s === "") return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function monthCost(input) {
    try {
      if (input == null || typeof input !== "object" || Array.isArray(input)) return null;
      var dailyIn = toNum(input.dailyIn);
      var dailyOut = toNum(input.dailyOut);
      var inPerM = toNum(input.inPerM);
      var outPerM = toNum(input.outPerM);
      if (dailyIn == null || dailyOut == null || inPerM == null || outPerM == null) return null;
      if (dailyIn < 0 || dailyOut < 0 || inPerM < 0 || outPerM < 0) return null;
      return (dailyIn / 1e6 * inPerM + dailyOut / 1e6 * outPerM) * DAYS_PER_MONTH;
    } catch (e) {
      return null;
    }
  }

  function modelById(id) {
    if (id == null) return null;
    var i;
    for (i = 0; i < MODELS.length; i++) {
      if (MODELS[i].id === id) return MODELS[i];
    }
    return null;
  }

  function compare(models, usage) {
    try {
      var dailyIn = usage && typeof usage === "object" ? usage.dailyIn : undefined;
      var dailyOut = usage && typeof usage === "object" ? usage.dailyOut : undefined;
      var list = Array.isArray(models) ? models : [];
      var rows = [];
      var i;
      for (i = 0; i < list.length; i++) {
        var m = list[i];
        if (!m || typeof m !== "object") {
          rows.push({ id: null, cost: null, valid: false, _i: i });
          continue;
        }
        var cost = monthCost({
          dailyIn: dailyIn,
          dailyOut: dailyOut,
          inPerM: m.inPerM,
          outPerM: m.outPerM
        });
        rows.push({
          id: m.id,
          cost: cost,
          valid: cost != null,
          _i: i
        });
      }

      var cheapestId = null;
      var costliestId = null;
      var cheapCost = Infinity;
      var highCost = -Infinity;
      var validCount = 0;
      for (i = 0; i < rows.length; i++) {
        if (!rows[i].valid) continue;
        validCount += 1;
        if (rows[i].cost < cheapCost) {
          cheapCost = rows[i].cost;
          cheapestId = rows[i].id;
        }
        if (rows[i].cost > highCost) {
          highCost = rows[i].cost;
          costliestId = rows[i].id;
        }
      }

      rows.sort(function (a, b) {
        if (a.valid && b.valid) {
          if (a.cost !== b.cost) return a.cost - b.cost;
          return a._i - b._i;
        }
        if (a.valid) return -1;
        if (b.valid) return 1;
        return a._i - b._i;
      });

      for (i = 0; i < rows.length; i++) delete rows[i]._i;

      var ratio = null;
      if (validCount >= 2 && cheapCost > 0 && isFinite(cheapCost) && isFinite(highCost)) {
        ratio = highCost / cheapCost;
      } else if (validCount >= 2 && cheapCost === 0 && highCost === 0) {
        ratio = 1;
      }

      return {
        rows: rows,
        cheapestId: cheapestId,
        costliestId: costliestId,
        ratio: ratio
      };
    } catch (e) {
      return { rows: [], cheapestId: null, costliestId: null, ratio: null };
    }
  }

  function recommend(input) {
    try {
      if (input == null || typeof input !== "object" || Array.isArray(input)) {
        return {
          id: null,
          reasonZh: "先填每日用量，再看该用哪个。",
          reasonEn: "Enter daily usage first, then see which model fits."
        };
      }
      var dailyIn = toNum(input.dailyIn);
      var dailyOut = toNum(input.dailyOut);
      var inTok = dailyIn == null ? 0 : dailyIn;
      var outTok = dailyOut == null ? 0 : dailyOut;
      var presetId = input.presetId;
      var cheapestId = input.cheapestId;

      if (presetId === "decisions") {
        return {
          id: "decisions",
          reasonZh: "结构化判定场景适合 Decisions API：返回 typed verdicts，而不是长文。",
          reasonEn: "For structured verdicts, the Decisions API fits: it returns typed verdicts instead of long prose."
        };
      }

      if (presetId === "vibe" || inTok >= 1e6) {
        return {
          id: "sonnet",
          reasonZh: "代码多或重度 vibe coding，更适合 Sonnet 5.5（快 30%，多数工作便宜 30%）。请手填官网价后才能进对比。",
          reasonEn: "For code-heavy or vibe-coding work, Sonnet 5.5 fits better (30% faster, about 30% cheaper on most work). Enter its official price to include it in the comparison."
        };
      }

      if (inTok + outTok < 200000) {
        return {
          id: "haiku",
          reasonZh: "小用量更适合 Haiku 5.5 或 Luna。",
          reasonEn: "For light usage, Haiku 5.5 or Luna is a better fit."
        };
      }

      var cheap = cheapestId ? modelById(cheapestId) : null;
      if (cheapestId) {
        var nameZh = cheap ? cheap.nameZh : String(cheapestId);
        var nameEn = cheap ? cheap.nameEn : String(cheapestId);
        return {
          id: cheapestId,
          reasonZh: "按当前用量，最便宜的是 " + nameZh + "。",
          reasonEn: "At your current usage, the cheapest is " + nameEn + "."
        };
      }

      return {
        id: null,
        reasonZh: "填好价格后再看推荐。",
        reasonEn: "Fill in prices to see a recommendation."
      };
    } catch (e) {
      return {
        id: null,
        reasonZh: "填好用量后再看推荐。",
        reasonEn: "Enter usage to see a recommendation."
      };
    }
  }

  function formatUsd(n) {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    var abs = Math.abs(n);
    var d = abs !== 0 && abs < 0.01 ? 4 : 2;
    var s = n.toFixed(d);
    var parts = s.split(".");
    var sign = "";
    var whole = parts[0];
    if (whole.charAt(0) === "-") {
      sign = "-";
      whole = whole.slice(1);
    }
    var withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "$" + withCommas + "." + parts[1];
  }

  function rowById(rows, id) {
    if (!Array.isArray(rows)) return null;
    var i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].id === id) return rows[i];
    }
    return null;
  }

  function shareText(result, lang) {
    try {
      var en = lang === "en";
      if (!result || typeof result !== "object") {
        return (en
          ? "Check how much your AI burns in a month. "
          : "查清你的 AI 一个月烧多少钱。 ") + SHARE_URL;
      }
      var cheapestId = result.cheapestId;
      if (!cheapestId) {
        return (en
          ? "Check how much your AI burns in a month. "
          : "查清你的 AI 一个月烧多少钱。 ") + SHARE_URL;
      }
      var model = modelById(cheapestId);
      var name = model ? (en ? model.nameEn : model.nameZh) : String(cheapestId);
      var cheapRow = rowById(result.rows, cheapestId);
      var costNum = cheapRow && cheapRow.valid ? cheapRow.cost : toNum(result.cheapestCost);
      var costStr = costNum != null ? formatUsd(costNum) : "";
      var head = en
        ? "Monthly bill check: cheapest is " + name + (costStr ? " at " + costStr + "/mo." : ".")
        : "月账单自查：最便宜的是 " + name + (costStr ? "，约 " + costStr + "/月。" : "。");
      var extra = "";
      var ratio = result.ratio;
      if (typeof ratio === "number" && isFinite(ratio)) {
        extra = en
          ? " The costliest is " + ratio.toFixed(1) + "× the cheapest."
          : " 最贵是最便宜的 " + ratio.toFixed(1) + " 倍。";
      }
      return head + extra + " " + SHARE_URL;
    } catch (e) {
      return SHARE_URL;
    }
  }

  var api = {
    MODELS: MODELS,
    PRESETS: PRESETS,
    DAYS_PER_MONTH: DAYS_PER_MONTH,
    monthCost: monthCost,
    compare: compare,
    recommend: recommend,
    shareText: shareText,
    formatUsd: formatUsd
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BurnEngine = api;
})();
