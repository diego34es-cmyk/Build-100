/** DEBT-049 — AI debt-chain stress test. Pure functions. No browser globals.
 * Market prints are as of 2026-10-15. The GPU book is an illustrative neocloud,
 * not a CoreWeave filing.
 */

export const AS_OF = "2026-10-15";
export const PAGE_URL = "https://build-100.com/049/";
export const HOURS_PER_YEAR = 8760;

export const MARKET_SNAPSHOT = Object.freeze({
  asOf: AS_OF,
  coreweaveBondYieldPct: 15,
  coreweaveStockDayPct: -15.5,
  kospiPct: -7,
  nikkeiPct: -5,
  soxDownDays: 7,
  spxClose: 7744,
  ust10yPct: 5.05,
  sources: Object.freeze(["Reuters", "fool.com", "Investrade"]),
});

/** Slider limits. Calculation helpers clamp into this box. */
export const LIMITS = Object.freeze({
  debtBn: Object.freeze({ min: 0, max: 80 }),
  utilizationPct: Object.freeze({ min: 0, max: 100 }),
  financingCostPct: Object.freeze({ min: 0, max: 30 }),
  gpuCount: Object.freeze({ min: 0, max: 1000000 }),
  rentPerGpuYearUsd: Object.freeze({ min: 0, max: 80000 }),
});

/** Ordered checks inside breakLink. Coverage > coverSafe never breaks. */
export const THRESHOLDS = Object.freeze({
  coverWarnLow: 1,
  coverSafe: 2,
  utilEnd: 50,
  utilTenant: 70,
  rentFloorUsd: 8000,
  junkCostPct: 12,
  creditorDebtBn: 40,
});

const BOOK = Object.freeze({
  debtBn: 20,
  utilizationPct: 80,
  financingCostPct: MARKET_SNAPSHOT.coreweaveBondYieldPct,
  gpuCount: 200000,
  rentPerGpuYearUsd: 20000,
});

/** Illustrative book opened by the page. Coupon matches the 2026-10-15 yield. */
export const BASE_BOOK = BOOK;

export const CHAIN = Object.freeze([
  Object.freeze({
    id: "creditor",
    nameZh: "债权人",
    nameEn: "Creditors",
    subZh: "债券 / 银行",
    subEn: "Bonds / banks",
    owesZh: "neocloud 欠债权人本金和票息。",
    owesEn: "The neocloud owes creditors principal and the coupon.",
    earnsZh: "债权人赚票息（市场约 15%），不拥有 GPU。",
    earnsEn: "Creditors earn the coupon (about 15% in the market). They do not own the GPUs.",
  }),
  Object.freeze({
    id: "neocloud",
    nameZh: "neocloud",
    nameEn: "Neocloud",
    subZh: "CoreWeave 类",
    subEn: "CoreWeave-class",
    owesZh: "向债权人付息，并向 GPU 供应商付设备款。",
    owesEn: "Pays the coupon to creditors and pays GPU vendors for the boxes.",
    earnsZh: "向云大厂租客收算力租金；利息先从这笔租金里扣。",
    earnsEn: "Collects GPU rent from hyperscaler tenants. Interest comes out of that rent first.",
  }),
  Object.freeze({
    id: "gpu",
    nameZh: "GPU 供应商",
    nameEn: "GPU vendors",
    subZh: "NVIDIA 类",
    subEn: "NVIDIA-class",
    owesZh: "neocloud 欠它货款或预付款，它不背这张债。",
    owesEn: "The neocloud owes them for hardware. They do not carry this debt.",
    earnsZh: "赚硬件毛利，不赚债息；订单取决于下游还借不借得到钱。",
    earnsEn: "They earn hardware margin, not bond interest. Orders depend on the buyer still getting financing.",
  }),
  Object.freeze({
    id: "hyperscaler",
    nameZh: "云大厂租客",
    nameEn: "Hyperscaler tenants",
    subZh: "算力承租",
    subEn: "Compute lessees",
    owesZh: "按合约向 neocloud 付 GPU 租金。",
    owesEn: "They pay the neocloud GPU rent under contract.",
    earnsZh: "把算力转售给 AI 应用，赚云毛利，不吃 neocloud 的债息。",
    earnsEn: "They resell compute to AI apps and earn cloud margin. They do not pay the neocloud coupon.",
  }),
  Object.freeze({
    id: "app",
    nameZh: "AI 应用",
    nameEn: "AI apps",
    subZh: "模型与产品",
    subEn: "Models and products",
    owesZh: "向云大厂付推理和训练账单。",
    owesEn: "They pay hyperscalers for inference and training.",
    earnsZh: "向终端收订阅；多数应用仍在烧钱，赚不到债息。",
    earnsEn: "They charge end users for subscriptions. Most apps still burn cash and earn no coupon.",
  }),
  Object.freeze({
    id: "enduser",
    nameZh: "终端收入",
    nameEn: "End revenue",
    subZh: "订阅与 API",
    subEn: "Subscriptions and API",
    owesZh: "用户付订阅或 API 费用，不背上游的债。",
    owesEn: "Users pay for subscriptions or API calls. They do not owe the upstream debt.",
    earnsZh: "全链唯一从外部进来的现金；它不支付债息，但得盖住上游的利息。",
    earnsEn: "The only cash that enters the chain from outside. It does not pay the coupon, but it has to cover it.",
  }),
]);

const BREAK_COPY = Object.freeze({
  neocloud: Object.freeze({
    zh: "neocloud 利息先吃掉利润 → 债主抽贷 → GPU 订单砍单。",
    en: "Neocloud interest eats the profit first → creditors pull financing → GPU orders get cut.",
  }),
  hyperscaler: Object.freeze({
    zh: "云大厂租客先缩租约。利用率掉到 70% 以下，租金支票先变薄，neocloud 接着付不出利息。",
    en: "Hyperscaler tenants cut leases first. Utilization drops below 70%, the rent check thins, and the neocloud then misses the coupon.",
  }),
  enduser: Object.freeze({
    zh: "终端收入先不够。利用率掉到 50% 以下，订阅和 API 盖不住这条链，压力从链尾倒灌。",
    en: "End-user revenue falls short first. Utilization drops below 50%, subscriptions and API fees cannot carry the chain, and pressure runs back up.",
  }),
  gpu: Object.freeze({
    zh: "GPU 供应商的订单先松。租金单价掉破示意线，卖卡的毛利还在，但下游不再加单。",
    en: "GPU-vendor orders loosen first. Rent falls through the illustrative floor — card margins remain, but the buyer stops adding orders.",
  }),
  creditor: Object.freeze({
    zh: "债权人先停新钱。债务堆得太大、覆盖又低于 1×，再融资窗口比运营先关上。",
    en: "Creditors stop new money first. The stack is large and coverage is under 1×, so refinancing shuts before operations do.",
  }),
  app: Object.freeze({
    zh: "AI 应用的账单先缩。票息还不算垃圾债，但覆盖只有 1–2×，产品侧预算先被砍。",
    en: "AI-app bills shrink first. The coupon is not junk-priced, but coverage is only 1–2×, so product budgets get cut.",
  }),
  none: Object.freeze({
    zh: "六环还接得住。利息覆盖高于 2×，没有环节正在断裂。",
    en: "All six links still hold. Coverage is above 2×, so no link is snapping.",
  }),
});

export const SCENARIOS = Object.freeze({
  coreweave: Object.freeze({
    id: "coreweave",
    debtBn: BOOK.debtBn,
    utilizationPct: BOOK.utilizationPct,
    financingCostPct: BOOK.financingCostPct,
    gpuCount: BOOK.gpuCount,
    rentPerGpuYearUsd: BOOK.rentPerGpuYearUsd,
    zh: "债息停在约 15%（垃圾债定价）。按这套示意账，利息覆盖刚过 1×，橙色预警。",
    en: "Coupon stuck near 15% (junk pricing). On this illustrative book, coverage sits just over 1× — orange warning.",
  }),
  hike: Object.freeze({
    id: "hike",
    debtBn: BOOK.debtBn,
    utilizationPct: BOOK.utilizationPct,
    financingCostPct: BOOK.financingCostPct + 2,
    gpuCount: BOOK.gpuCount,
    rentPerGpuYearUsd: BOOK.rentPerGpuYearUsd,
    zh: "融资成本在现状上再加 2 个百分点。同样的债、同样的出租率，年利息超过算力收入，温度计转红。",
    en: "Financing cost is 2 percentage points above the base case. Same debt, same utilization — annual interest exceeds compute revenue and the thermometer turns red.",
  }),
  util60: Object.freeze({
    id: "util60",
    debtBn: BOOK.debtBn,
    utilizationPct: 60,
    financingCostPct: BOOK.financingCostPct,
    gpuCount: BOOK.gpuCount,
    rentPerGpuYearUsd: BOOK.rentPerGpuYearUsd,
    zh: "GPU 利用率滑到 60%。租金先塌，云大厂租客这一环比票息更早松动。",
    en: "GPU utilization slides to 60%. Rent collapses first, so the hyperscaler-tenant link loosens before the coupon.",
  }),
});

export const SCENARIO_IDS = Object.freeze(["coreweave", "hike", "util60"]);

export function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

export function roundTo(n, digits) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Number(x.toFixed(digits));
}

export function annualInterest(debtBn, financingCostPct) {
  const d = clamp(debtBn, LIMITS.debtBn.min, LIMITS.debtBn.max);
  const r = clamp(financingCostPct, LIMITS.financingCostPct.min, LIMITS.financingCostPct.max);
  return roundTo((d * r) / 100, 4);
}

/** Annual compute revenue in USD billions.
 * rentPerGpuUsd = annual rent per GPU at 100% utilization (USD/GPU-year).
 * revenueBn = gpuCount × utilizationPct × rentPerGpuUsd / 100 / 1e9.
 */
export function annualComputeRevenue(gpuCount, utilizationPct, rentPerGpuUsd) {
  const g = clamp(gpuCount, LIMITS.gpuCount.min, LIMITS.gpuCount.max);
  const u = clamp(utilizationPct, LIMITS.utilizationPct.min, LIMITS.utilizationPct.max);
  const rent = clamp(rentPerGpuUsd, LIMITS.rentPerGpuYearUsd.min, LIMITS.rentPerGpuYearUsd.max);
  const usd = (g * u * rent) / 100;
  return roundTo(usd / 1e9, 4);
}

export function interestCoverage(revenue, interest) {
  const r = Number(revenue);
  const i = Number(interest);
  if (!Number.isFinite(r) || !Number.isFinite(i)) return NaN;
  if (i <= 0) return r >= 0 ? Infinity : NaN;
  if (r < 0) return NaN;
  return roundTo(r / i, 4);
}

export function thermometerLevel(coverage) {
  const x = typeof coverage === "number" ? coverage : Number(coverage);
  if (x === Infinity) return "safe";
  if (!Number.isFinite(x)) return "break";
  if (x < THRESHOLDS.coverWarnLow) return "break";
  if (x <= THRESHOLDS.coverSafe) return "warn";
  return "safe";
}

function chainNode(id) {
  return CHAIN.find((n) => n.id === id) || null;
}

function packLink(linkId) {
  const copy = BREAK_COPY[linkId] || BREAK_COPY.neocloud;
  const node = chainNode(linkId);
  return {
    linkId,
    zh: copy.zh,
    en: copy.en,
    nameZh: node ? node.nameZh : linkId === "none" ? "无断裂" : linkId,
    nameEn: node ? node.nameEn : linkId === "none" ? "No break" : linkId,
  };
}

/**
 * First link to snap. Safe coverage returns none before any other rule.
 * Then, in order: util < 50 enduser; util < 70 hyperscaler;
 * rent below the floor → gpu; financing cost at junk levels → neocloud;
 * a very large stack with coverage under 1× → creditor; other thin covers → app.
 */
export function breakLink(coverage, chainState = {}) {
  const level = thermometerLevel(coverage);
  if (level === "safe") return packLink("none");

  const state = chainState || {};
  const util = Number(state.utilizationPct);
  const cost = Number(state.financingCostPct);
  const rent = Number(state.rentPerGpuYearUsd);
  const debt = Number(state.debtBn);

  if (Number.isFinite(util) && util < THRESHOLDS.utilEnd) return packLink("enduser");
  if (Number.isFinite(util) && util < THRESHOLDS.utilTenant) return packLink("hyperscaler");
  if (Number.isFinite(rent) && rent > 0 && rent < THRESHOLDS.rentFloorUsd) return packLink("gpu");
  if (Number.isFinite(cost) && cost >= THRESHOLDS.junkCostPct) return packLink("neocloud");
  if (level === "break" && Number.isFinite(debt) && debt >= THRESHOLDS.creditorDebtBn) {
    return packLink("creditor");
  }
  if (level === "warn") return packLink("app");
  return packLink("neocloud");
}

export function applyScenario(id) {
  const s = SCENARIOS[id];
  if (!s) return null;
  return {
    id: s.id,
    debtBn: s.debtBn,
    utilizationPct: s.utilizationPct,
    financingCostPct: s.financingCostPct,
    gpuCount: s.gpuCount,
    rentPerGpuYearUsd: s.rentPerGpuYearUsd,
  };
}

export function normalizeInput(input = {}) {
  const src = input || {};
  return {
    debtBn: clamp(src.debtBn ?? BOOK.debtBn, LIMITS.debtBn.min, LIMITS.debtBn.max),
    utilizationPct: clamp(
      src.utilizationPct ?? BOOK.utilizationPct,
      LIMITS.utilizationPct.min,
      LIMITS.utilizationPct.max
    ),
    financingCostPct: clamp(
      src.financingCostPct ?? BOOK.financingCostPct,
      LIMITS.financingCostPct.min,
      LIMITS.financingCostPct.max
    ),
    gpuCount: clamp(src.gpuCount ?? BOOK.gpuCount, LIMITS.gpuCount.min, LIMITS.gpuCount.max),
    rentPerGpuYearUsd: clamp(
      src.rentPerGpuYearUsd ?? BOOK.rentPerGpuYearUsd,
      LIMITS.rentPerGpuYearUsd.min,
      LIMITS.rentPerGpuYearUsd.max
    ),
  };
}

export function hourlyRentUsd(rentPerGpuYearUsd) {
  const rent = Number(rentPerGpuYearUsd);
  if (!Number.isFinite(rent) || rent <= 0) return 0;
  return roundTo(rent / HOURS_PER_YEAR, 2);
}

export function evaluate(input = {}) {
  const p = normalizeInput(input);
  const interestBn = annualInterest(p.debtBn, p.financingCostPct);
  const revenueBn = annualComputeRevenue(p.gpuCount, p.utilizationPct, p.rentPerGpuYearUsd);
  const coverage = interestCoverage(revenueBn, interestBn);
  const level = thermometerLevel(coverage);
  const link = breakLink(coverage, p);
  return {
    asOf: AS_OF,
    illustrative: true,
    input: p,
    interestBn,
    revenueBn,
    coverage,
    level,
    link,
    spreadPp: roundTo(p.financingCostPct - MARKET_SNAPSHOT.ust10yPct, 2),
    hourlyRentUsd: hourlyRentUsd(p.rentPerGpuYearUsd),
  };
}

export function formatInt(n) {
  const x = Math.round(Number(n));
  const v = Number.isFinite(x) ? x : 0;
  const sign = v < 0 ? "-" : "";
  return sign + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatPct(n, digits = 1) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits) + "%";
}

export function formatMultiple(n) {
  if (n === Infinity) return "∞";
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2) + "×";
}

export function formatBnNumber(n) {
  const x = Number(n);
  const v = Number.isFinite(x) ? x : 0;
  return (v < 0 ? "-" : "") + Math.abs(v).toFixed(2);
}

export function formatBn(n, lang = "zh") {
  const num = formatBnNumber(n);
  if (lang === "en") {
    const neg = num.startsWith("-");
    return (neg ? "-$" : "$") + (neg ? num.slice(1) : num) + "B";
  }
  return num + " 亿美元";
}

const LEVEL_ZH = Object.freeze({ break: "断裂", warn: "预警", safe: "安全" });
const LEVEL_EN = Object.freeze({ break: "Break", warn: "Warning", safe: "Safe" });

export function buildShareText(result, lang = "zh") {
  if (!result || !result.link || !result.input) return PAGE_URL;
  const p = result.input;
  if (lang === "en") {
    return [
      "DEBT-049 · AI debt-chain stress test",
      `Debt ${formatBn(p.debtBn, "en")} · GPU util ${formatPct(p.utilizationPct)} · financing ${formatPct(p.financingCostPct)}`,
      `Interest ${formatBn(result.interestBn, "en")} · compute revenue ${formatBn(result.revenueBn, "en")} · coverage ${formatMultiple(result.coverage)}`,
      `Thermometer: ${LEVEL_EN[result.level] || result.level} · first link: ${result.link.nameEn}`,
      `As of ${AS_OF}. Educational demo, not investment advice.`,
      PAGE_URL,
    ].join("\n");
  }
  return [
    "DEBT-049 · AI 债务链爆雷模拟器",
    `债务 ${formatBn(p.debtBn, "zh")} · GPU 利用率 ${formatPct(p.utilizationPct)} · 融资成本 ${formatPct(p.financingCostPct)}`,
    `年利息 ${formatBn(result.interestBn, "zh")} · 算力收入 ${formatBn(result.revenueBn, "zh")} · 覆盖 ${formatMultiple(result.coverage)}`,
    `温度计：${LEVEL_ZH[result.level] || result.level} · 最先断：${result.link.nameZh}`,
    `数据截至 ${AS_OF}。本页为教育演示，不构成投资建议。`,
    PAGE_URL,
  ].join("\n");
}
