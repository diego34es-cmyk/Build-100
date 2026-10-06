/**
 * RECOVER-039 · break-even math (no DOM).
 * Loss L in [0, 1]; required gain = L / (1 - L).
 * formatPct takes percentage points (100 → "100%").
 */
(function () {
  "use strict";

  var PRESETS = [
    {
      id: "gold",
      loss: 0.26,
      zh: "黄金 -26%",
      en: "Gold -26%",
      noteZh: "国际金价 1 月 $5,595 高点回调约 26% 至 ~$4,135",
      noteEn: "Gold pulled back ~26% from the January high of $5,595 to ~$4,135"
    },
    {
      id: "half",
      loss: 0.5,
      zh: "腰斩 -50%",
      en: "Cut in half -50%",
      noteZh: "跌一半，要翻倍才回本",
      noteEn: "Down by half; you need to double to get even"
    },
    {
      id: "deep",
      loss: 0.8,
      zh: "深套 -80%",
      en: "Deep hole -80%",
      noteZh: "只剩两成，要涨 4 倍才回本",
      noteEn: "Only 20% left; you need a 4× rally to get even"
    },
    {
      id: "small",
      loss: 0.1,
      zh: "小亏 -10%",
      en: "Small loss -10%",
      noteZh: "看起来不多，回本也要 +11.1%",
      noteEn: "Looks small, but you still need +11.1% to get even"
    }
  ];

  var TABLE_LOSSES = [0.10, 0.20, 0.25, 1 / 3, 0.50, 0.75, 0.80, 0.90];

  function parseLoose(input) {
    if (typeof input === "number") {
      if (!isFinite(input)) return { nan: true };
      return { value: input };
    }
    if (input == null) return { empty: true };
    var s = String(input).trim();
    if (s === "") return { empty: true };
    s = s.replace(/[−–—]/g, "-").replace(/%/g, "").replace(/,/g, "").trim();
    if (s === "" || s === "+" || s === "-") return { nan: true };
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) return { nan: true };
    var n = Number(s);
    if (!isFinite(n)) return { nan: true };
    return { value: n };
  }

  function normalizeLossPct(input) {
    var p = parseLoose(input);
    if (p.empty) return { ok: false, error: "empty" };
    if (p.nan) return { ok: false, error: "nan" };
    var mag = Math.abs(p.value);
    if (mag > 100) return { ok: false, error: "range" };
    return { ok: true, loss: mag / 100 };
  }

  function normalizeGainPct(input) {
    var p = parseLoose(input);
    if (p.empty) return { ok: false, error: "empty" };
    if (p.nan) return { ok: false, error: "nan" };
    if (p.value < 0) return { ok: false, error: "range" };
    return { ok: true, gain: p.value / 100 };
  }

  function lossFromPrices(buy, current) {
    var b = parseLoose(buy);
    var c = parseLoose(current);
    if (b.empty || c.empty) return { ok: false, error: "empty" };
    if (b.nan || c.nan) return { ok: false, error: "nan" };
    if (b.value <= 0 || c.value < 0) return { ok: false, error: "range" };
    var gain = c.value / b.value - 1;
    if (c.value >= b.value) return { ok: true, loss: 0, gain: gain };
    return { ok: true, loss: 1 - c.value / b.value, gain: gain };
  }

  function requiredGain(loss) {
    if (typeof loss !== "number" || !isFinite(loss)) return NaN;
    if (loss < 0 || loss > 1) return NaN;
    if (loss === 1) return Infinity;
    return loss / (1 - loss);
  }

  function maxDrawdown(gain) {
    if (typeof gain !== "number" || !isFinite(gain) || gain < 0) return NaN;
    return gain / (1 + gain);
  }

  function addCommas(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatPct(x, opts) {
    opts = opts || {};
    if (x === Infinity || x === -Infinity) return "∞";
    if (typeof x !== "number" || !isFinite(x)) return "";
    var abs = Math.abs(x);
    var rounded = Math.round(abs * 10) / 10;
    var s = rounded.toFixed(1);
    if (s.slice(-2) === ".0") s = s.slice(0, -2);
    if (rounded > 10000) {
      var parts = s.split(".");
      parts[0] = addCommas(parts[0]);
      s = parts.join(".");
    }
    var prefix = "";
    if (x < 0) prefix = "-";
    else if (opts.sign && x >= 0) prefix = "+";
    return prefix + s + "%";
  }

  function table() {
    return TABLE_LOSSES.map(function (loss) {
      var gain = requiredGain(loss);
      return {
        loss: loss,
        gain: gain,
        lossPct: loss * 100,
        gainPct: isFinite(gain) ? gain * 100 : gain
      };
    });
  }

  function curvePoints(maxLoss, n) {
    if (typeof maxLoss !== "number" || !isFinite(maxLoss)) maxLoss = 0.9;
    if (maxLoss < 0) maxLoss = 0;
    if (maxLoss > 1) maxLoss = 1;
    if (typeof n !== "number" || !isFinite(n) || n < 2) n = 91;
    n = Math.floor(n);
    var pts = [];
    var i;
    for (i = 0; i < n; i++) {
      var loss = i === n - 1 ? maxLoss : (maxLoss * i) / (n - 1);
      pts.push({ loss: loss, gain: requiredGain(loss) });
    }
    return pts;
  }

  var api = {
    normalizeLossPct: normalizeLossPct,
    normalizeGainPct: normalizeGainPct,
    lossFromPrices: lossFromPrices,
    requiredGain: requiredGain,
    maxDrawdown: maxDrawdown,
    formatPct: formatPct,
    PRESETS: PRESETS,
    table: table,
    curvePoints: curvePoints,
    TABLE_LOSSES: TABLE_LOSSES
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.RecoverEngine = api;
})();
