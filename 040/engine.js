/**
 * CHIP-040 · memory crunch pass-through (no DOM).
 * Component cost = price × share × clamp(userGB / baseGB, 0.5, 3).
 * 2026 bump = cost × contractRate × PASS.
 * 2027 cumulative multiple = (1 + 2026 rate) × (1 + HBM × SPILL) − 1.
 * formatPct takes percentage points (14.4 → "14.4%").
 */
(function () {
  "use strict";

  var RATES = {
    DRAM: 2.7,
    SSD: 2.35,
    PASS: 0.35,
    SPILL: 0.3,
    HBM_LO: 0.7,
    HBM_HI: 1.4
  };

  var DEVICES = [
    { id: "phone", zh: "手机", en: "Phone", priceCNY: 4999, priceUSD: 699, memGB: 12, storGB: 256, memShare: 0.1, storShare: 0.06 },
    { id: "laptop", zh: "笔记本", en: "Laptop", priceCNY: 6999, priceUSD: 989, memGB: 16, storGB: 512, memShare: 0.08, storShare: 0.05 },
    { id: "desktop", zh: "台式 DIY", en: "DIY desktop", priceCNY: 8000, priceUSD: 1129, memGB: 32, storGB: 1024, memShare: 0.1, storShare: 0.06 },
    { id: "gpu", zh: "显卡", en: "Graphics card", priceCNY: 4999, priceUSD: 699, memGB: 12, storGB: 0, memShare: 0.25, storShare: 0 },
    { id: "ssd", zh: "SSD", en: "SSD", priceCNY: 499, priceUSD: 69, memGB: 0, storGB: 1024, memShare: 0, storShare: 0.5 },
    { id: "console", zh: "游戏主机", en: "Game console", priceCNY: 3999, priceUSD: 569, memGB: 16, storGB: 1024, memShare: 0.15, storShare: 0.06 }
  ];

  var MEM_GB = [8, 12, 16, 24, 32, 64];
  var STOR_GB = [128, 256, 512, 1024, 2048, 4096];

  function getDevice(id) {
    var i;
    for (i = 0; i < DEVICES.length; i++) {
      if (DEVICES[i].id === id) return DEVICES[i];
    }
    return null;
  }

  function defaultPrice(deviceId, currency) {
    var d = getDevice(deviceId);
    if (!d) return 0;
    var cur = String(currency || "CNY").toUpperCase();
    if (cur === "USD") return d.priceUSD;
    return d.priceCNY;
  }

  function validatePrice(input) {
    if (input == null) return { ok: false, error: "empty" };
    if (typeof input === "number") {
      if (!isFinite(input)) return { ok: false, error: "nan" };
      if (input <= 0 || input > 1000000) return { ok: false, error: "range" };
      return { ok: true, value: input };
    }
    var s = String(input).trim();
    if (s === "") return { ok: false, error: "empty" };
    s = s.replace(/[¥￥$€£]/g, "");
    s = s.replace(/CNY|USD|RMB/gi, "");
    s = s.replace(/,/g, "");
    s = s.replace(/\s/g, "");
    if (s === "" || s === "+" || s === "-") return { ok: false, error: "nan" };
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) return { ok: false, error: "nan" };
    var n = Number(s);
    if (!isFinite(n)) return { ok: false, error: "nan" };
    if (n <= 0 || n > 1000000) return { ok: false, error: "range" };
    return { ok: true, value: n };
  }

  function clamp(x, lo, hi) {
    if (typeof x !== "number" || !isFinite(x)) return lo;
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
  }

  function capRatio(userGB, baseGB, share) {
    if (!(share > 0) || !(baseGB > 0)) return 0;
    var u = typeof userGB === "number" && isFinite(userGB) ? userGB : baseGB;
    if (u < 0) u = 0;
    return clamp(u / baseGB, 0.5, 3);
  }

  function resolveDevice(device) {
    if (!device) return getDevice("phone");
    if (typeof device === "string") return getDevice(device) || getDevice("phone");
    if (device.id) return getDevice(device.id) || device;
    return device;
  }

  function estimate(opts) {
    opts = opts || {};
    var d = resolveDevice(opts.device);
    var price = Number(opts.price);
    if (!isFinite(price) || price < 0) price = 0;
    var memGB = opts.memGB;
    var storGB = opts.storGB;
    if (memGB == null) memGB = d.memGB;
    if (storGB == null) storGB = d.storGB;

    var memRatio = capRatio(memGB, d.memGB, d.memShare);
    var storRatio = capRatio(storGB, d.storGB, d.storShare);
    var memCost = price * d.memShare * memRatio;
    var storCost = price * d.storShare * storRatio;

    var rateMem26 = RATES.DRAM * RATES.PASS;
    var rateStor26 = RATES.SSD * RATES.PASS;
    var mem26 = memCost * rateMem26;
    var stor26 = storCost * rateStor26;
    var total26 = mem26 + stor26;
    var pct26 = price > 0 ? total26 / price : 0;

    var spillLo = RATES.HBM_LO * RATES.SPILL;
    var spillHi = RATES.HBM_HI * RATES.SPILL;
    var rateMem27lo = (1 + rateMem26) * (1 + spillLo) - 1;
    var rateMem27hi = (1 + rateMem26) * (1 + spillHi) - 1;
    var rateStor27lo = (1 + rateStor26) * (1 + spillLo) - 1;
    var rateStor27hi = (1 + rateStor26) * (1 + spillHi) - 1;

    var mem27lo = memCost * rateMem27lo;
    var mem27hi = memCost * rateMem27hi;
    var stor27lo = storCost * rateStor27lo;
    var stor27hi = storCost * rateStor27hi;
    var total27lo = mem27lo + stor27lo;
    var total27hi = mem27hi + stor27hi;
    var pct27lo = price > 0 ? total27lo / price : 0;
    var pct27hi = price > 0 ? total27hi / price : 0;

    return {
      memCost: memCost,
      storCost: storCost,
      memRatio: memRatio,
      storRatio: storRatio,
      mem26: mem26,
      stor26: stor26,
      total26: total26,
      pct26: pct26,
      mem27lo: mem27lo,
      mem27hi: mem27hi,
      stor27lo: stor27lo,
      stor27hi: stor27hi,
      total27lo: total27lo,
      total27hi: total27hi,
      pct27lo: pct27lo,
      pct27hi: pct27hi
    };
  }

  function decide(opts) {
    opts = opts || {};
    var pct = Number(opts.pct26);
    var urgent = !!opts.urgent;
    if (isFinite(pct) && pct < 0.03) {
      return {
        kind: "minor",
        headlineZh: "影响不大，按需买",
        headlineEn: "Small impact — buy when you need it",
        reasonZh: "按当前规格，存储涨价传导不到 3%。不必为这个因素提前或推迟购买。",
        reasonEn: "Pass-through on this spec is under 3%. Do not rush or delay for this reason alone."
      };
    }
    if (urgent) {
      return {
        kind: "buy",
        headlineZh: "现在买，越等越贵",
        headlineEn: "Buy now — waiting costs more",
        reasonZh: "刚需就别等。2027 年 HBM 外溢还会把消费级内存再推高一截，越晚买越贵。",
        reasonEn: "If you need it now, buy. 2027 HBM spillover is expected to push consumer memory even higher."
      };
    }
    return {
      kind: "wait",
      headlineZh: "可以等，但别指望大降价",
      headlineEn: "You can wait, but do not expect a crash",
      reasonZh: "等什么：2027 下半年 HBM 产能爬坡。别指望大降价；可关注旧款清库存和大促。",
      reasonEn: "What to wait for: HBM capacity ramps in H2 2027. Do not expect a big drop; watch old-stock clearance and sales."
    };
  }

  function addCommas(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatMoney(x, currency) {
    if (typeof x !== "number" || !isFinite(x)) return "—";
    var n = Math.round(x);
    var sign = n < 0 ? "-" : "";
    var s = addCommas(String(Math.abs(n)));
    var cur = String(currency || "CNY").toUpperCase();
    if (cur === "USD") return sign + "$" + s;
    return sign + "¥" + s;
  }

  function formatPct(x, opts) {
    opts = opts || {};
    if (x === Infinity || x === -Infinity) return "—";
    if (typeof x !== "number" || !isFinite(x)) return "—";
    var abs = Math.abs(x);
    var rounded = Math.round(abs * 10) / 10;
    var s = rounded.toFixed(1);
    if (s.slice(-2) === ".0") s = s.slice(0, -2);
    var prefix = "";
    if (x < 0) prefix = "-";
    else if (opts.sign && x >= 0) prefix = "+";
    return prefix + s + "%";
  }

  var api = {
    DEVICES: DEVICES,
    RATES: RATES,
    MEM_GB: MEM_GB,
    STOR_GB: STOR_GB,
    getDevice: getDevice,
    defaultPrice: defaultPrice,
    validatePrice: validatePrice,
    estimate: estimate,
    decide: decide,
    formatMoney: formatMoney,
    formatPct: formatPct,
    clamp: clamp
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ChipEngine = api;
})();
