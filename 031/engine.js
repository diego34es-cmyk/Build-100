/** TOKEN-031 — tokenized US stock 24/7 comparison. Pure functions, no DOM. */

export const AS_OF = "2026-09";
export const PAGE_URL = "https://build-100.com/031/";

export const DEFAULT_ASSUMPTIONS = Object.freeze({
  asOf: "2026-09",
  trad: Object.freeze({
    commissionUsdPerTrade: 0,
    // Blended Section 31 / FINRA-style fee on notional (sells only → ~half). Illustrative.
    regulatoryFeeBps: 0.14,
    minFeeUsdPerTrade: 0.01,
    sessionStartMin: 15 * 60 + 30,
    sessionEndMin: 22 * 60,
    hoursPerSession: 6.5,
    tradingDaysPerYear: 252,
    settlementLagDays: 1,
  }),
  tok: Object.freeze({
    spreadBpsRoundTrip: 8,
    gasUsdPerTrade: 0.15,
    includeGas: true,
    hoursPerDay: 24,
    daysPerYear: 365,
    settlementLagDays: 0,
  }),
  missed: Object.freeze({
    never: 0,
    rare: 1,
    sometimes: 3,
    often: 8,
  }),
  market: Object.freeze({
    dex30dUsdBn: 20.9,
    rhChain30dUsdBn: 9.7,
    uniswapShare: 0.6,
    rhChainLive: "2026-07-01",
  }),
  limits: Object.freeze({
    minTrades: 0,
    maxTrades: 500,
    minSize: 0,
    maxSize: 1000000,
  }),
});

export const SESSION_IDS = Object.freeze([
  "madrid_day",
  "us_session",
  "late_night",
  "weekend",
]);

export const FREQUENCY_IDS = Object.freeze([
  "never",
  "rare",
  "sometimes",
  "often",
]);

export const SESSIONS = Object.freeze({
  madrid_day: Object.freeze({
    id: "madrid_day",
    startMin: 9 * 60,
    endMin: 18 * 60,
    weekend: false,
    // 09:00–15:30 closed / 09:00–18:00 = 6.5/9
    tradClosedShare: 6.5 / 9,
  }),
  us_session: Object.freeze({
    id: "us_session",
    startMin: 15 * 60 + 30,
    endMin: 22 * 60,
    weekend: false,
    tradClosedShare: 0,
  }),
  late_night: Object.freeze({
    id: "late_night",
    startMin: 22 * 60,
    endMin: 9 * 60,
    weekend: false,
    tradClosedShare: 1,
  }),
  weekend: Object.freeze({
    id: "weekend",
    startMin: 0,
    endMin: 24 * 60,
    weekend: true,
    tradClosedShare: 1,
  }),
});

export const TIMELINE = Object.freeze([
  Object.freeze({
    date: "2026-07-01",
    id: "rh-chain",
    zh: "Robinhood Chain 上线",
    en: "Robinhood Chain goes live",
    detailZh: "过去 30 天代币化股票交易量 $9.7B（截至 2026-09）。",
    detailEn: "Past 30d tokenized-stock volume $9.7B (as of 2026-09).",
    sourceZh: "公开市场仪表盘，截至 2026-09",
    sourceEn: "Public venue dashboards, as of 2026-09",
  }),
  Object.freeze({
    date: "2026-09-17",
    id: "sec",
    zh: "SEC Innovation Exemption",
    en: "SEC Innovation Exemption",
    detailZh: "代币化美股 5 年期豁免；持有人保留与真实股票同等权利，被解读为迈向 24/7 交易的一步。",
    detailEn: "Five-year exemption for tokenized US stocks; holders keep equivalent rights — read as a step toward 24/7 trading.",
    sourceZh: "SEC.gov / Innovation Exemption，2026-09-17",
    sourceEn: "SEC.gov / Innovation Exemption, 2026-09-17",
  }),
  Object.freeze({
    date: "2026-09-22",
    id: "nyse",
    zh: "NYSE Group × Blockchain.com",
    en: "NYSE Group × Blockchain.com",
    detailZh: "探索为全球加密用户提供 24/7 代币化美股与 ETF 交易。",
    detailEn: "Exploring 24/7 tokenized US stocks and ETFs for global crypto users.",
    sourceZh: "NYSE Group 公告，2026-09-22",
    sourceEn: "NYSE Group announcement, 2026-09-22",
  }),
]);

export const MARKET_SNAPSHOT = Object.freeze({
  asOf: "2026-09",
  dex30dUsdBn: 20.9,
  rhChain30dUsdBn: 9.7,
  uniswapShare: 0.6,
  noteZh: "全网 DEX 过去 30 天代币化股票 $20.9B（Uniswap V4/V3 约占六成）",
  noteEn: "Global DEX tokenized-stock volume $20.9B past 30d (Uniswap V4/V3 ~60%)",
});

const MINUTES_DAY = 24 * 60;

export function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

export function formatUsd(n, digits = 2) {
  const x = Number(n);
  const v = Number.isFinite(x) ? x : 0;
  const abs = Math.abs(v);
  const fixed = abs.toFixed(digits);
  const [i, d] = fixed.split(".");
  const withCommas = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = digits > 0 ? "." + d : "";
  return (v < 0 ? "−$" : "$") + withCommas + frac;
}

export function parseSessions(raw) {
  const set = new Set();
  const arr = Array.isArray(raw) ? raw : [];
  for (const id of arr) {
    if (SESSION_IDS.includes(id)) set.add(id);
  }
  return SESSION_IDS.filter((id) => set.has(id));
}

export function parseFrequency(raw) {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "yes") return "sometimes";
  if (s === "no") return "never";
  if (FREQUENCY_IDS.includes(s)) return s;
  return "never";
}

export function normalizeInput(input = {}) {
  const a = DEFAULT_ASSUMPTIONS;
  const includeGas = input.includeGas === undefined ? true : Boolean(input.includeGas);
  return {
    tradesPerMonth: clamp(input.tradesPerMonth, a.limits.minTrades, a.limits.maxTrades),
    avgSizeUsd: clamp(input.avgSizeUsd, a.limits.minSize, a.limits.maxSize),
    sessions: parseSessions(input.sessions),
    frequency: parseFrequency(input.frequency),
    includeGas,
  };
}

export function mergeAssumptions(overrides = {}) {
  const base = DEFAULT_ASSUMPTIONS;
  return {
    asOf: overrides.asOf || base.asOf,
    trad: { ...base.trad, ...(overrides.trad || {}) },
    tok: { ...base.tok, ...(overrides.tok || {}) },
    missed: { ...base.missed, ...(overrides.missed || {}) },
    market: { ...base.market, ...(overrides.market || {}) },
    limits: { ...base.limits, ...(overrides.limits || {}) },
  };
}

export function isTradOpen(madridMin, isWeekend, assumptions = DEFAULT_ASSUMPTIONS) {
  if (isWeekend) return false;
  const m = ((Number(madridMin) % MINUTES_DAY) + MINUTES_DAY) % MINUTES_DAY;
  return m >= assumptions.trad.sessionStartMin && m < assumptions.trad.sessionEndMin;
}

export function traditionalFeePerTrade(sizeUsd, assumptions = DEFAULT_ASSUMPTIONS) {
  const size = Math.max(0, Number(sizeUsd) || 0);
  const t = assumptions.trad;
  const fee = size * (t.regulatoryFeeBps / 10000);
  return round2(Math.max(t.minFeeUsdPerTrade, fee) + t.commissionUsdPerTrade);
}

export function tokenizedFeePerTrade(sizeUsd, assumptions = DEFAULT_ASSUMPTIONS, includeGas = true) {
  const size = Math.max(0, Number(sizeUsd) || 0);
  const k = assumptions.tok;
  const spread = size * (k.spreadBpsRoundTrip / 10000);
  const gas = includeGas ? k.gasUsdPerTrade : 0;
  return round2(spread + gas);
}

export function monthlyFees(input, assumptions = DEFAULT_ASSUMPTIONS) {
  const n = normalizeInput(input);
  const tradPer = n.tradesPerMonth <= 0 ? 0 : traditionalFeePerTrade(n.avgSizeUsd, assumptions);
  const tokPer = n.tradesPerMonth <= 0 ? 0 : tokenizedFeePerTrade(n.avgSizeUsd, assumptions, n.includeGas);
  const tradMonthly = round2(n.tradesPerMonth * tradPer);
  const tokMonthly = round2(n.tradesPerMonth * tokPer);
  const deltaMonthly = round2(tokMonthly - tradMonthly);
  let cheaper = "tie";
  if (tokMonthly < tradMonthly) cheaper = "tok";
  else if (tokMonthly > tradMonthly) cheaper = "trad";
  return {
    tradPerTrade: tradPer,
    tokPerTrade: tokPer,
    tradMonthly,
    tokMonthly,
    tradAnnual: round2(tradMonthly * 12),
    tokAnnual: round2(tokMonthly * 12),
    deltaMonthly,
    deltaAnnual: round2(deltaMonthly * 12),
    cheaper,
    tradCommission: assumptions.trad.commissionUsdPerTrade,
    tradRegBps: assumptions.trad.regulatoryFeeBps,
    tokSpreadBps: assumptions.tok.spreadBpsRoundTrip,
    tokGas: n.includeGas ? assumptions.tok.gasUsdPerTrade : 0,
    tokSpreadPerTrade: round2(n.avgSizeUsd * (assumptions.tok.spreadBpsRoundTrip / 10000)),
  };
}

export function hoursCompare(assumptions = DEFAULT_ASSUMPTIONS) {
  const t = assumptions.trad;
  const k = assumptions.tok;
  const tradHoursPerWeek = t.hoursPerSession * 5;
  const tokHoursPerWeek = k.hoursPerDay * 7;
  const tradHoursPerYear = t.hoursPerSession * t.tradingDaysPerYear;
  const tokHoursPerYear = k.hoursPerDay * k.daysPerYear;
  return {
    tradHoursPerWeek,
    tokHoursPerWeek,
    tradHoursPerYear,
    tokHoursPerYear,
    extraHoursPerYear: tokHoursPerYear - tradHoursPerYear,
    coverageRatio: round2(tokHoursPerYear / tradHoursPerYear),
    tradSessionMadrid: "15:30–22:00",
    tradClosedHoursPerWeek: tokHoursPerWeek - tradHoursPerWeek,
  };
}

export function dayTimeline(assumptions = DEFAULT_ASSUMPTIONS) {
  const start = assumptions.trad.sessionStartMin;
  const end = assumptions.trad.sessionEndMin;
  return {
    hours: 24,
    usOpenHour: start / 60,
    usCloseHour: end / 60,
    usOpenPct: (start / MINUTES_DAY) * 100,
    usWidthPct: ((end - start) / MINUTES_DAY) * 100,
    madridDayStartPct: (9 * 60 / MINUTES_DAY) * 100,
    madridDayWidthPct: (9 * 60 / MINUTES_DAY) * 100,
  };
}

export function sessionBands(sessionId) {
  if (sessionId === "late_night") {
    return [
      { startPct: (22 * 60 / MINUTES_DAY) * 100, widthPct: (2 * 60 / MINUTES_DAY) * 100 },
      { startPct: 0, widthPct: (9 * 60 / MINUTES_DAY) * 100 },
    ];
  }
  if (sessionId === "weekend") {
    return [{ startPct: 0, widthPct: 100, weekend: true }];
  }
  const s = SESSIONS[sessionId];
  if (!s) return [];
  return [
    {
      startPct: (s.startMin / MINUTES_DAY) * 100,
      widthPct: ((s.endMin - s.startMin) / MINUTES_DAY) * 100,
    },
  ];
}

export function preferredCoverage(sessions) {
  const ids = parseSessions(sessions);
  if (!ids.length) {
    return { sessions: [], closedShare: 0, tradOpenShare: 1 };
  }
  const closedShare = ids.reduce((sum, id) => sum + SESSIONS[id].tradClosedShare, 0) / ids.length;
  return {
    sessions: ids,
    closedShare: round2(closedShare),
    tradOpenShare: round2(1 - closedShare),
  };
}

export function missedWindows(input, assumptions = DEFAULT_ASSUMPTIONS) {
  const n = normalizeInput(input);
  const perMonth = assumptions.missed[n.frequency] ?? 0;
  const perYear = perMonth * 12;
  const cov = preferredCoverage(n.sessions);
  const habitOutsidePerMonth = round1(n.tradesPerMonth * cov.closedShare * 0.5);
  return {
    frequency: n.frequency,
    missedPerMonth: perMonth,
    missedPerYear: perYear,
    missedNotionalPerYear: round2(perYear * n.avgSizeUsd),
    closedShare: cov.closedShare,
    tradOpenShare: cov.tradOpenShare,
    habitOutsidePerMonth,
    estimate: true,
  };
}

export function settlementCompare(input, assumptions = DEFAULT_ASSUMPTIONS) {
  const n = normalizeInput(input);
  const tradLag = assumptions.trad.settlementLagDays;
  const tokLag = assumptions.tok.settlementLagDays;
  const tradesYear = n.tradesPerMonth * 12;
  return {
    tradLabel: "T+1",
    tokLabel: "instant",
    tradLagDays: tradLag,
    tokLagDays: tokLag,
    tradWaitingDaysPerYear: tradesYear * tradLag,
    tokWaitingDaysPerYear: tradesYear * tokLag,
    tradNotionalDaysUsd: round2(n.avgSizeUsd * tradesYear * tradLag),
  };
}

export function compareAll(input, assumptions = DEFAULT_ASSUMPTIONS) {
  const n = normalizeInput(input);
  return {
    asOf: assumptions.asOf,
    input: n,
    fees: monthlyFees(n, assumptions),
    hours: hoursCompare(assumptions),
    settlement: settlementCompare(n, assumptions),
    missed: missedWindows(n, assumptions),
    timeline: dayTimeline(assumptions),
    preferred: preferredCoverage(n.sessions),
  };
}

export function buildShareText(result, lang = "zh") {
  const r = result;
  if (!r || !r.fees) return PAGE_URL;
  if (lang === "en") {
    return [
      "TOKEN-031 · Tokenized US stocks 24/7",
      `Fees / mo: broker ${formatUsd(r.fees.tradMonthly)} vs tokenized ${formatUsd(r.fees.tokMonthly)}`,
      `Hours / week: ${r.hours.tradHoursPerWeek}h cash vs ${r.hours.tokHoursPerWeek}h tokenized`,
      "Settlement: T+1 vs instant",
      `Missed windows / yr (est.): ${r.missed.missedPerYear}`,
      `As of ${r.asOf}. Not investment advice.`,
      PAGE_URL,
    ].join("\n");
  }
  return [
    "TOKEN-031 · 代币化美股 24/7 对比",
    `月度费用：券商 ${formatUsd(r.fees.tradMonthly)} vs 代币化 ${formatUsd(r.fees.tokMonthly)}`,
    `每周可交易：现金盘 ${r.hours.tradHoursPerWeek}h vs 代币化 ${r.hours.tokHoursPerWeek}h`,
    "结算：T+1 vs 链上即时",
    `一年错失窗口（估算）：${r.missed.missedPerYear}`,
    `截至 ${r.asOf}。不构成投资建议。`,
    PAGE_URL,
  ].join("\n");
}
