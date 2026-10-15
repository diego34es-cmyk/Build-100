/**
 * HEAT-048 · heating-season bill estimate (no DOM).
 *
 * Heat demand (kWh) =
 *   area(m²) × heat loss (kW/m²·K) × max(indoor − outdoor, 0)
 *   × hours/day × season days ÷ efficiency
 *
 * Default heat loss is 0.005 kW/m²·K (5 W/m²·K). At a 10°C gap that is
 * 50 W/m², a typical home heating load. A literal 50 W/m²·K bills about
 * ten times a European winter, so it is not the default.
 *
 * Illegal input is clamped. Nothing here throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/048";
  var CRE_RISE = 6.6 / 100;
  var CAP_RISE = 4 / 100;

  function money4(n) {
    return Math.round(n * 10000) / 10000;
  }

  function rolled(price, rise) {
    return money4(price / (1 + rise));
  }

  var gasThis = 0.12;
  var elecThis = 0.28;
  var distThis = 0.1;
  var oilThis = 0.11;

  var DEFAULTS = {
    mode: "gas",
    electricKind: "resist",
    area: 80,
    indoor: 20,
    outdoor: 5,
    hours: 10,
    heatLoadKwPerM2K: 0.005,
    heatLoadWPerM2K: 5,
    seasonStart: "2026-11-01",
    seasonEnd: "2027-03-31",
    seasonDays: 151,
    seasonMonths: 5,
    sealFactor: 0.12,
    reflectFactor: 0.06,
    gasRise: CRE_RISE,
    powerRise: CAP_RISE,
    efficiency: {
      gas: 0.9,
      electric: 1,
      electricPump: 2.5,
      district: 1,
      oil: 0.85
    },
    prices: {
      gas: { thisYear: gasThis, lastYear: rolled(gasThis, CRE_RISE), efficiency: 0.9 },
      electric: { thisYear: elecThis, lastYear: rolled(elecThis, CAP_RISE), efficiency: 1, cop: 2.5 },
      district: { thisYear: distThis, lastYear: rolled(distThis, CRE_RISE), efficiency: 1 },
      oil: { thisYear: oilThis, lastYear: rolled(oilThis, CRE_RISE), efficiency: 0.85 }
    }
  };

  DEFAULTS.gasPriceThis = DEFAULTS.prices.gas.thisYear;
  DEFAULTS.gasPriceLast = DEFAULTS.prices.gas.lastYear;
  DEFAULTS.electricPriceThis = DEFAULTS.prices.electric.thisYear;
  DEFAULTS.electricPriceLast = DEFAULTS.prices.electric.lastYear;
  DEFAULTS.districtPriceThis = DEFAULTS.prices.district.thisYear;
  DEFAULTS.districtPriceLast = DEFAULTS.prices.district.lastYear;
  DEFAULTS.oilPriceThis = DEFAULTS.prices.oil.thisYear;
  DEFAULTS.oilPriceLast = DEFAULTS.prices.oil.lastYear;

  var MODES = [
    {
      id: "gas",
      label: { zh: "天然气", en: "Gas" },
      unit: { zh: "€/kWh", en: "€/kWh" },
      efficiency: DEFAULTS.efficiency.gas,
      priceThis: DEFAULTS.prices.gas.thisYear,
      priceLast: DEFAULTS.prices.gas.lastYear,
      blurb: {
        zh: "家用锅炉，效率按 90% 计。",
        en: "A home boiler, at 90% efficiency."
      }
    },
    {
      id: "electric",
      label: { zh: "电", en: "Electric" },
      unit: { zh: "€/kWh", en: "€/kWh" },
      efficiency: DEFAULTS.efficiency.electric,
      cop: DEFAULTS.efficiency.electricPump,
      priceThis: DEFAULTS.prices.electric.thisYear,
      priceLast: DEFAULTS.prices.electric.lastYear,
      blurb: {
        zh: "直热效率按 100%。也可以改成热泵。",
        en: "Resistance heat at 100%. You can switch to a heat pump."
      }
    },
    {
      id: "district",
      label: { zh: "集中供暖", en: "District heat" },
      unit: { zh: "€/kWh", en: "€/kWh" },
      efficiency: DEFAULTS.efficiency.district,
      priceThis: DEFAULTS.prices.district.thisYear,
      priceLast: DEFAULTS.prices.district.lastYear,
      blurb: {
        zh: "按送到屋里的热量计价，效率按 100%。",
        en: "Billed on heat delivered, at 100% efficiency."
      }
    },
    {
      id: "oil",
      label: { zh: "燃油", en: "Heating oil" },
      unit: { zh: "€/kWh", en: "€/kWh" },
      efficiency: DEFAULTS.efficiency.oil,
      priceThis: DEFAULTS.prices.oil.thisYear,
      priceLast: DEFAULTS.prices.oil.lastYear,
      blurb: {
        zh: "燃油锅炉，效率按 85% 计。",
        en: "An oil boiler, at 85% efficiency."
      }
    }
  ];

  function num(v, fallback) {
    if (typeof v === "string") {
      var s = v.trim().replace(/\s/g, "").replace(",", ".");
      if (s === "") return fallback;
      v = Number(s);
    }
    if (typeof v !== "number" || !isFinite(v)) return fallback;
    return v;
  }

  function clamp(v, lo, hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function utcDay(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return null;
    var y = +m[1];
    var mo = +m[2];
    var d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var t = Date.UTC(y, mo - 1, d);
    var dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return t;
  }

  function seasonDays(start, end) {
    try {
      var a = utcDay(start == null ? DEFAULTS.seasonStart : start);
      var b = utcDay(end == null ? DEFAULTS.seasonEnd : end);
      if (a == null || b == null || b < a) return DEFAULTS.seasonDays;
      var days = Math.round((b - a) / 86400000) + 1;
      if (!isFinite(days) || days < 1) return DEFAULTS.seasonDays;
      return days;
    } catch (e) {
      return 151;
    }
  }

  function modeOf(v) {
    var s = String(v == null ? "" : v).toLowerCase().trim();
    if (s === "gas" || s === "electric" || s === "district" || s === "oil") return s;
    return "gas";
  }

  function modeRecord(id) {
    var i;
    for (i = 0; i < MODES.length; i++) {
      if (MODES[i].id === id) return MODES[i];
    }
    return MODES[0];
  }

  function electricKindOf(v) {
    var s = String(v == null ? "" : v).toLowerCase().trim();
    if (s === "pump" || s === "heatpump" || s === "heat-pump" || s === "hp" || s === "cop") return "pump";
    return "resist";
  }

  function efficiencyFor(modeId, kind) {
    if (modeId === "electric" && kind === "pump") return DEFAULTS.efficiency.electricPump;
    return modeRecord(modeId).efficiency;
  }

  function normalize(input) {
    var src = input && typeof input === "object" ? input : {};
    var mode = modeOf(src.mode == null ? DEFAULTS.mode : src.mode);
    var kind = electricKindOf(src.electricKind == null ? DEFAULTS.electricKind : src.electricKind);
    var rec = modeRecord(mode);
    var area = clamp(num(src.area, DEFAULTS.area), 5, 500);
    var indoor = clamp(num(src.indoor, DEFAULTS.indoor), -10, 45);
    var outdoor = clamp(num(src.outdoor, DEFAULTS.outdoor), -30, 35);
    var hours = clamp(num(src.hours, DEFAULTS.hours), 0, 24);
    var loadFallback = DEFAULTS.heatLoadKwPerM2K;
    var load;
    if (src.heatLoad == null && src.heatLoadW != null) load = num(src.heatLoadW, DEFAULTS.heatLoadWPerM2K) / 1000;
    else load = num(src.heatLoad, loadFallback);
    load = clamp(load, 0.001, 0.02);
    var effFallback = efficiencyFor(mode, kind);
    var eff = src.efficiency == null ? effFallback : num(src.efficiency, effFallback);
    eff = clamp(eff, 0.3, 6);
    var priceThis = src.priceThis == null || src.priceThis === ""
      ? rec.priceThis
      : clamp(num(src.priceThis, rec.priceThis), 0, 3);
    var priceLast = src.priceLast == null || src.priceLast === ""
      ? rec.priceLast
      : clamp(num(src.priceLast, rec.priceLast), 0, 3);
    var days = src.days == null ? seasonDays() : clamp(num(src.days, DEFAULTS.seasonDays), 1, 366);
    var seal = clamp(num(src.sealFactor, DEFAULTS.sealFactor), 0, 0.5);
    var reflect = clamp(num(src.reflectFactor, DEFAULTS.reflectFactor), 0, 0.3);
    return {
      mode: mode,
      electricKind: kind,
      area: area,
      indoor: indoor,
      outdoor: outdoor,
      hours: hours,
      heatLoad: load,
      efficiency: eff,
      priceThis: priceThis,
      priceLast: priceLast,
      days: days,
      months: DEFAULTS.seasonMonths,
      sealFactor: seal,
      reflectFactor: reflect
    };
  }

  function heatDemandKwh(input) {
    try {
      var n = normalize(input);
      var gap = n.indoor - n.outdoor;
      if (gap < 0) gap = 0;
      var kwh = n.area * n.heatLoad * gap * n.hours * n.days / n.efficiency;
      if (!isFinite(kwh) || kwh < 0) return 0;
      return kwh;
    } catch (e) {
      return 0;
    }
  }

  function emptyBill() {
    return {
      kwh: 0,
      costThisYear: 0,
      costLastYear: 0,
      delta: 0,
      daily: 0,
      monthly: 0,
      mode: "gas",
      kwhDaily: 0,
      kwhMonthly: 0,
      priceThis: 0,
      priceLast: 0,
      efficiency: 1,
      deltaT: 0,
      rawThis: 0,
      rawLast: 0,
      input: normalize(null)
    };
  }

  function bill(input) {
    try {
      var n = normalize(input);
      var kwh = heatDemandKwh(n);
      var rawThis = kwh * n.priceThis;
      var rawLast = kwh * n.priceLast;
      if (!isFinite(rawThis) || rawThis < 0) rawThis = 0;
      if (!isFinite(rawLast) || rawLast < 0) rawLast = 0;
      var costThisYear = Math.round(rawThis);
      var costLastYear = Math.round(rawLast);
      var gap = n.indoor - n.outdoor;
      if (gap < 0) gap = 0;
      return {
        kwh: kwh,
        costThisYear: costThisYear,
        costLastYear: costLastYear,
        delta: costThisYear - costLastYear,
        daily: n.days > 0 ? rawThis / n.days : 0,
        monthly: n.months > 0 ? rawThis / n.months : 0,
        mode: n.mode,
        kwhDaily: n.days > 0 ? kwh / n.days : 0,
        kwhMonthly: n.months > 0 ? kwh / n.months : 0,
        priceThis: n.priceThis,
        priceLast: n.priceLast,
        efficiency: n.efficiency,
        deltaT: gap,
        rawThis: rawThis,
        rawLast: rawLast,
        input: n
      };
    } catch (e) {
      return emptyBill();
    }
  }

  function overlay(n, extra) {
    var o = {
      mode: n.mode,
      electricKind: n.electricKind,
      area: n.area,
      indoor: n.indoor,
      outdoor: n.outdoor,
      hours: n.hours,
      heatLoad: n.heatLoad,
      efficiency: n.efficiency,
      priceThis: n.priceThis,
      priceLast: n.priceLast,
      days: n.days,
      sealFactor: n.sealFactor,
      reflectFactor: n.reflectFactor
    };
    var k;
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return o;
  }

  function pctLabel(part, whole) {
    if (!(whole > 0) || !(part > 0)) return "0";
    var r = Math.round(part / whole * 1000) / 10;
    if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
    return r.toFixed(1);
  }

  function factorPct(f) {
    return String(Math.round(f * 1000) / 10).replace(/\.0$/, "");
  }

  function emptyLevers() {
    return [
      { id: "degree", label: { zh: "每降低 1°C", en: "Lower the setpoint by 1°C" }, savedEuro: 0, note: { zh: "室温不高于室外，这一项省不下钱。", en: "The room is not warmer than outdoors, so this saves nothing." } },
      { id: "hour", label: { zh: "每天少开 1 小时", en: "One hour less per day" }, savedEuro: 0, note: { zh: "现在没有开暖气，少开 1 小时省不下钱。", en: "Heating is already off, so one hour less saves nothing." } },
      { id: "seal", label: { zh: "门窗密封", en: "Seal doors and windows" }, savedEuro: 0, note: { zh: "把门窗缝补严，按热损失减少来估算。", en: "Sealing draughts is estimated as a cut in heat loss." } },
      { id: "reflect", label: { zh: "暖气片反射板", en: "Radiator reflector panels" }, savedEuro: 0, note: { zh: "靠外墙的暖气片背后加反射板，按热损失减少来估算。", en: "A reflector behind a radiator on an outside wall is estimated as a cut in heat loss." } }
    ];
  }

  function levers(input) {
    try {
      var n = normalize(input);
      var base = bill(n);
      var lower = bill(overlay(n, { indoor: n.indoor - 1 }));
      var shorter = bill(overlay(n, { hours: Math.max(0, n.hours - 1) }));
      var degSave = base.rawThis - lower.rawThis;
      var hourSave = base.rawThis - shorter.rawThis;
      var sealSave = base.rawThis * n.sealFactor;
      var refSave = base.rawThis * n.reflectFactor;
      if (!isFinite(degSave) || degSave < 0) degSave = 0;
      if (!isFinite(hourSave) || hourSave < 0) hourSave = 0;
      if (!isFinite(sealSave) || sealSave < 0) sealSave = 0;
      if (!isFinite(refSave) || refSave < 0) refSave = 0;
      var gap = n.indoor - n.outdoor;
      var degNoteZh;
      var degNoteEn;
      if (!(gap > 0) || !(base.rawThis > 0)) {
        degNoteZh = "室温不高于室外，这一项省不下钱。";
        degNoteEn = "The room is not warmer than outdoors, so this saves nothing.";
      } else {
        var dp = pctLabel(degSave, base.rawThis);
        degNoteZh = "室内设定少 1°C，温差变小，用能按比例下降，大约省下本季账单的 " + dp + "%。";
        degNoteEn = "Setting the room 1°C lower shrinks the gap, so heat use falls in proportion: about " + dp + "% of this season's bill.";
      }
      var hourNoteZh;
      var hourNoteEn;
      if (!(n.hours > 0) || !(base.rawThis > 0)) {
        hourNoteZh = "现在没有开暖气，少开 1 小时省不下钱。";
        hourNoteEn = "Heating is already off, so one hour less saves nothing.";
      } else {
        var hp = pctLabel(hourSave, base.rawThis);
        hourNoteZh = "每天少开 1 小时，大约去掉本季用能的 " + hp + "%。";
        hourNoteEn = "One hour less each day removes about " + hp + "% of this season's energy.";
      }
      var sp = factorPct(n.sealFactor);
      var rp = factorPct(n.reflectFactor);
      return [
        {
          id: "degree",
          label: { zh: "每降低 1°C", en: "Lower the setpoint by 1°C" },
          savedEuro: Math.round(degSave),
          note: { zh: degNoteZh, en: degNoteEn }
        },
        {
          id: "hour",
          label: { zh: "每天少开 1 小时", en: "One hour less per day" },
          savedEuro: Math.round(hourSave),
          note: { zh: hourNoteZh, en: hourNoteEn }
        },
        {
          id: "seal",
          label: { zh: "门窗密封", en: "Seal doors and windows" },
          savedEuro: Math.round(sealSave),
          note: {
            zh: "把门窗缝补严，按热损失减少 " + sp + "% 估算。漏风越厉害，越接近这个数。",
            en: "Sealing draughts is estimated as " + sp + "% less heat loss. The leakier the home, the closer you get."
          }
        },
        {
          id: "reflect",
          label: { zh: "暖气片反射板", en: "Radiator reflector panels" },
          savedEuro: Math.round(refSave),
          note: {
            zh: "靠外墙的暖气片背后加反射板，按热损失减少 " + rp + "% 估算。地暖几乎用不上。",
            en: "A reflector behind a radiator on an outside wall is estimated as " + rp + "% less heat loss. Underfloor heat barely benefits."
          }
        }
      ];
    } catch (e) {
      return emptyLevers();
    }
  }

  function topOf(list) {
    var best = list[0];
    var i;
    for (i = 1; i < list.length; i++) {
      if (list[i].savedEuro > best.savedEuro) best = list[i];
    }
    return best;
  }

  function formatEuro(n) {
    var v = Math.round(Number(n));
    if (!isFinite(v)) v = 0;
    var sign = v < 0 ? "-" : "";
    var body = String(Math.abs(v));
    var grouped = "";
    while (body.length > 3) {
      grouped = "," + body.slice(-3) + grouped;
      body = body.slice(0, -3);
    }
    return sign + "€" + body + grouped;
  }

  function shareText(result, lang) {
    var en = lang === "en";
    try {
      var cost = 0;
      var leverLabel = en ? "Seal doors and windows" : "门窗密封";
      var leverSave = 0;
      if (result && typeof result === "object") {
        if (isFinite(Number(result.costThisYear))) cost = Math.round(Number(result.costThisYear));
        var list = null;
        if (Array.isArray(result.levers) && result.levers.length) list = result.levers;
        else if (result.input) list = levers(result.input);
        if (list && list.length) {
          var best = topOf(list);
          if (isFinite(Number(best.savedEuro))) leverSave = Math.round(Number(best.savedEuro));
          if (leverSave < 0) leverSave = 0;
          if (best.label) {
            leverLabel = en ? (best.label.en || leverLabel) : (best.label.zh || leverLabel);
          }
        }
      }
      var money = formatEuro(cost);
      var save = formatEuro(leverSave);
      if (en) {
        return "Estimated heating bill for the season: " + money + " (Nov 2026–Mar 2027). Biggest saving lever: " + leverLabel + ", about " + save + ". Estimate only, not a precise bill. " + SHARE_URL;
      }
      return "供暖季估算账单 " + money + "（2026-11 至 2027-03）。最大省钱杠杆：" + leverLabel + "，约省 " + save + "。估算值，非精确账单。 " + SHARE_URL;
    } catch (e) {
      if (en) {
        return "Estimated heating bill for the season: €0 (Nov 2026–Mar 2027). Biggest saving lever: Seal doors and windows, about €0. Estimate only, not a precise bill. " + SHARE_URL;
      }
      return "供暖季估算账单 €0（2026-11 至 2027-03）。最大省钱杠杆：门窗密封，约省 €0。估算值，非精确账单。 " + SHARE_URL;
    }
  }

  var api = {
    DEFAULTS: DEFAULTS,
    MODES: MODES,
    seasonDays: seasonDays,
    heatDemandKwh: heatDemandKwh,
    bill: bill,
    levers: levers,
    shareText: shareText,
    formatEuro: formatEuro,
    normalize: normalize
  };

  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.HeatEngine = api;
})();
