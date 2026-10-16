import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AS_OF,
  PAGE_URL,
  HOURS_PER_YEAR,
  MARKET_SNAPSHOT,
  LIMITS,
  THRESHOLDS,
  BASE_BOOK,
  CHAIN,
  SCENARIOS,
  SCENARIO_IDS,
  clamp,
  annualInterest,
  annualComputeRevenue,
  interestCoverage,
  thermometerLevel,
  breakLink,
  applyScenario,
  normalizeInput,
  hourlyRentUsd,
  evaluate,
  formatInt,
  formatPct,
  formatMultiple,
  formatBn,
  buildShareText,
} from "./engine.js";

const here = dirname(fileURLToPath(import.meta.url));

test("engine is DOM-free and package.json is type module", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(/\b(document|window|innerHTML|localStorage|sessionStorage)\b/.test(src), false);
  assert.equal(/\bfetch\s*\(/.test(src), false);
  const pkg = JSON.parse(readFileSync(join(here, "package.json"), "utf8"));
  assert.equal(pkg.type, "module");
  assert.equal(pkg.name, "debt-049");
});

test("market snapshot is locked as of 2026-10-15", () => {
  assert.equal(AS_OF, "2026-10-15");
  assert.equal(MARKET_SNAPSHOT.asOf, "2026-10-15");
  assert.equal(MARKET_SNAPSHOT.coreweaveBondYieldPct, 15);
  assert.equal(MARKET_SNAPSHOT.coreweaveStockDayPct, -15.5);
  assert.equal(MARKET_SNAPSHOT.kospiPct, -7);
  assert.equal(MARKET_SNAPSHOT.nikkeiPct, -5);
  assert.equal(MARKET_SNAPSHOT.soxDownDays, 7);
  assert.equal(MARKET_SNAPSHOT.spxClose, 7744);
  assert.equal(MARKET_SNAPSHOT.ust10yPct, 5.05);
  assert.deepEqual([...MARKET_SNAPSHOT.sources], ["Reuters", "fool.com", "Investrade"]);
  assert.equal(PAGE_URL, "https://build-100.com/049/");
  assert.equal(HOURS_PER_YEAR, 8760);
  assert.equal(BASE_BOOK.financingCostPct, 15);
  assert.equal(BASE_BOOK.debtBn, 20);
  assert.equal(BASE_BOOK.gpuCount, 200000);
  assert.equal(BASE_BOOK.rentPerGpuYearUsd, 20000);
  assert.equal(BASE_BOOK.utilizationPct, 80);
});

test("chain is six links in transmission order", () => {
  assert.deepEqual(CHAIN.map((n) => n.id), [
    "creditor",
    "neocloud",
    "gpu",
    "hyperscaler",
    "app",
    "enduser",
  ]);
  for (const n of CHAIN) {
    assert.ok(n.nameZh && n.nameEn);
    assert.ok(n.owesZh && n.owesEn);
    assert.ok(n.earnsZh && n.earnsEn);
  }
  assert.equal(CHAIN[1].nameZh, "neocloud");
  assert.match(CHAIN[2].subZh, /NVIDIA/);
});

test("clamp and money helpers", () => {
  assert.equal(clamp(12, 0, 80), 12);
  assert.equal(clamp(-1, 0, 80), 0);
  assert.equal(clamp(999, 0, 80), 80);
  assert.equal(clamp("nope", 0, 80), 0);
  assert.equal(clamp(undefined, 0, 80), 0);
  assert.equal(annualInterest(20, 15), 3);
  assert.equal(annualInterest(20, 17), 3.4);
  assert.equal(annualInterest(0, 15), 0);
  assert.equal(annualInterest(10, 0), 0);
  assert.equal(annualInterest(10, -4), 0);
  assert.equal(annualInterest(1000, 15), annualInterest(LIMITS.debtBn.max, 15));
  assert.equal(annualInterest(80, 30), 24);
  assert.equal(annualComputeRevenue(200000, 80, 20000), 3.2);
  assert.equal(annualComputeRevenue(200000, 60, 20000), 2.4);
  assert.equal(annualComputeRevenue(0, 100, 20000), 0);
  assert.equal(annualComputeRevenue(-10, 150, -5), 0);
  assert.equal(annualComputeRevenue(100, 50, 10000), 0.0005);
  assert.equal(hourlyRentUsd(20000), 2.28);
  assert.equal(hourlyRentUsd(0), 0);
  assert.equal(hourlyRentUsd(-1), 0);
});

test("interest coverage and thermometer zones", () => {
  assert.equal(interestCoverage(3.2, 3), 1.0667);
  assert.equal(interestCoverage(0, 3), 0);
  assert.equal(interestCoverage(3.2, 0), Infinity);
  assert.equal(interestCoverage(0, 0), Infinity);
  assert.ok(Number.isNaN(interestCoverage(-1, 1)));
  assert.ok(Number.isNaN(interestCoverage(1, NaN)));
  assert.equal(thermometerLevel(0.999), "break");
  assert.equal(thermometerLevel(0), "break");
  assert.equal(thermometerLevel(1), "warn");
  assert.equal(thermometerLevel(1.5), "warn");
  assert.equal(thermometerLevel(2), "warn");
  assert.equal(thermometerLevel(2.0001), "safe");
  assert.equal(thermometerLevel(Infinity), "safe");
  assert.equal(thermometerLevel(NaN), "break");
  assert.equal(thermometerLevel("1.5"), "warn");
  assert.equal(THRESHOLDS.coverWarnLow, 1);
  assert.equal(THRESHOLDS.coverSafe, 2);
});

test("scenarios: CoreWeave 15%, hike +2pp, utilization 60", () => {
  assert.deepEqual([...SCENARIO_IDS], ["coreweave", "hike", "util60"]);
  const base = applyScenario("coreweave");
  const hike = applyScenario("hike");
  const low = applyScenario("util60");
  assert.equal(base.financingCostPct, 15);
  assert.equal(hike.financingCostPct, base.financingCostPct + 2);
  assert.equal(hike.debtBn, base.debtBn);
  assert.equal(hike.utilizationPct, base.utilizationPct);
  assert.equal(hike.gpuCount, base.gpuCount);
  assert.equal(hike.rentPerGpuYearUsd, base.rentPerGpuYearUsd);
  assert.equal(low.utilizationPct, 60);
  assert.equal(low.financingCostPct, base.financingCostPct);
  assert.equal(low.debtBn, base.debtBn);
  assert.equal(applyScenario("nope"), null);
  assert.match(SCENARIOS.coreweave.zh, /15%/);
  assert.match(SCENARIOS.hike.zh, /2 个/);
  assert.match(SCENARIOS.util60.zh, /60%/);
  assert.match(SCENARIOS.coreweave.en, /15%/);
  assert.match(SCENARIOS.hike.en, /2 percentage/);
  assert.match(SCENARIOS.util60.en, /60%/);

  const mutated = applyScenario("coreweave");
  mutated.debtBn = 1;
  assert.equal(applyScenario("coreweave").debtBn, 20);
  assert.equal(SCENARIOS.coreweave.debtBn, 20);
});

test("CoreWeave book is orange, hike and 60% util snap", () => {
  const now = evaluate(applyScenario("coreweave"));
  assert.equal(now.asOf, "2026-10-15");
  assert.equal(now.illustrative, true);
  assert.equal(now.interestBn, 3);
  assert.equal(now.revenueBn, 3.2);
  assert.equal(now.level, "warn");
  assert.ok(now.coverage > 1 && now.coverage <= 2);
  assert.equal(now.link.linkId, "neocloud");
  assert.match(now.link.zh, /利息先吃掉利润/);
  assert.match(now.link.en, /eats the profit/);
  assert.equal(now.spreadPp, 9.95);
  assert.equal(now.hourlyRentUsd, 2.28);

  const hike = evaluate(applyScenario("hike"));
  assert.equal(hike.interestBn, 3.4);
  assert.equal(hike.revenueBn, 3.2);
  assert.equal(hike.level, "break");
  assert.ok(hike.coverage < 1);
  assert.equal(hike.link.linkId, "neocloud");

  const low = evaluate(applyScenario("util60"));
  assert.equal(low.revenueBn, 2.4);
  assert.equal(low.interestBn, 3);
  assert.equal(low.coverage, 0.8);
  assert.equal(low.level, "break");
  assert.equal(low.link.linkId, "hyperscaler");
  assert.match(low.link.zh, /云大厂租客/);
});

test("breakLink order: safe first, then demand, rent, coupon, creditor, app", () => {
  assert.equal(breakLink(3, { utilizationPct: 10, financingCostPct: 20 }).linkId, "none");
  assert.equal(breakLink(Infinity, { utilizationPct: 10 }).linkId, "none");
  assert.match(breakLink(3, {}).zh, /接得住/);

  assert.equal(breakLink(0.5, { utilizationPct: 49.9, financingCostPct: 15 }).linkId, "enduser");
  assert.equal(breakLink(0.5, { utilizationPct: 50, financingCostPct: 15 }).linkId, "hyperscaler");
  assert.equal(breakLink(0.5, { utilizationPct: 69.9 }).linkId, "hyperscaler");
  assert.equal(breakLink(0.5, { utilizationPct: 70, financingCostPct: 15, rentPerGpuYearUsd: 20000 }).linkId, "neocloud");

  assert.equal(
    breakLink(1.2, { utilizationPct: 80, financingCostPct: 15, rentPerGpuYearUsd: 7999, debtBn: 20 }).linkId,
    "gpu"
  );
  assert.equal(
    breakLink(1.2, { utilizationPct: 80, financingCostPct: 15, rentPerGpuYearUsd: 8000, debtBn: 20 }).linkId,
    "neocloud"
  );
  assert.equal(breakLink(0.4, { utilizationPct: 90, financingCostPct: 15, rentPerGpuYearUsd: 0 }).linkId, "neocloud");

  assert.equal(
    breakLink(1.5, { utilizationPct: 90, financingCostPct: 12, rentPerGpuYearUsd: 20000, debtBn: 10 }).linkId,
    "neocloud"
  );
  assert.equal(
    breakLink(0.9, { utilizationPct: 90, financingCostPct: 8, rentPerGpuYearUsd: 20000, debtBn: 40 }).linkId,
    "creditor"
  );
  assert.equal(
    breakLink(0.9, { utilizationPct: 90, financingCostPct: 8, rentPerGpuYearUsd: 20000, debtBn: 39.9 }).linkId,
    "neocloud"
  );
  assert.equal(
    breakLink(1.5, { utilizationPct: 90, financingCostPct: 8, rentPerGpuYearUsd: 20000, debtBn: 50 }).linkId,
    "app"
  );
  assert.equal(breakLink(0.5, {}).linkId, "neocloud");
  assert.equal(breakLink(1.2, {}).linkId, "app");

  const safe = evaluate({
    debtBn: 10,
    utilizationPct: 90,
    financingCostPct: 5,
    gpuCount: 200000,
    rentPerGpuYearUsd: 20000,
  });
  assert.equal(safe.interestBn, 0.5);
  assert.equal(safe.revenueBn, 3.6);
  assert.equal(safe.level, "safe");
  assert.equal(safe.link.linkId, "none");
  assert.equal(safe.link.nameZh, "无断裂");
  assert.equal(safe.link.nameEn, "No break");
});

test("normalizeInput fills the illustrative book and clamps", () => {
  const n = normalizeInput({});
  assert.equal(n.debtBn, 20);
  assert.equal(n.utilizationPct, 80);
  assert.equal(n.financingCostPct, 15);
  assert.equal(n.gpuCount, 200000);
  assert.equal(n.rentPerGpuYearUsd, 20000);
  const hi = normalizeInput({ debtBn: 500, utilizationPct: 140, financingCostPct: 90, gpuCount: 9e9, rentPerGpuYearUsd: -3 });
  assert.equal(hi.debtBn, 80);
  assert.equal(hi.utilizationPct, 100);
  assert.equal(hi.financingCostPct, 30);
  assert.equal(hi.gpuCount, 1000000);
  assert.equal(hi.rentPerGpuYearUsd, 0);
  const input = { debtBn: 20, utilizationPct: 80, financingCostPct: 15, gpuCount: 200000, rentPerGpuYearUsd: 20000 };
  evaluate(input);
  assert.equal(input.debtBn, 20);
});

test("formatters are locale-stable", () => {
  assert.equal(formatBn(3, "zh"), "3.00 亿美元");
  assert.equal(formatBn(3.2, "en"), "$3.20B");
  assert.equal(formatBn(-1.5, "en"), "-$1.50B");
  assert.equal(formatBn(NaN, "zh"), "0.00 亿美元");
  assert.equal(formatPct(15), "15.0%");
  assert.equal(formatPct(-15.5), "-15.5%");
  assert.equal(formatMultiple(3.2 / 3), "1.07×");
  assert.equal(formatMultiple(0.8), "0.80×");
  assert.equal(formatMultiple(Infinity), "∞");
  assert.equal(formatMultiple(NaN), "—");
  assert.equal(formatInt(200000), "200,000");
  assert.equal(formatInt(-1200), "-1,200");
});

test("buildShareText is bilingual and cites as-of plus not-advice", () => {
  const r = evaluate(applyScenario("coreweave"));
  const zh = buildShareText(r, "zh");
  const en = buildShareText(r, "en");
  assert.match(zh, /DEBT-049/);
  assert.match(zh, /不构成投资建议/);
  assert.match(zh, /2026-10-15/);
  assert.match(zh, /build-100\.com\/049/);
  assert.match(zh, /neocloud/);
  assert.match(zh, /预警/);
  assert.match(en, /not investment advice/i);
  assert.match(en, /first link: Neocloud/);
  assert.match(en, /Warning/);
  assert.match(en, /As of 2026-10-15/);
  assert.equal(buildShareText(null, "zh"), PAGE_URL);
  assert.equal(buildShareText({}, "en"), PAGE_URL);
});

test("index.html matches page-format-spec core checks", () => {
  const html = readFileSync(join(here, "index.html"), "utf8");
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>DEBT-049 · AI 债务链爆雷模拟器<\/title>/);
  assert.match(html, /og:title" content="DEBT-049 · AI 债务链爆雷模拟器"/);
  assert.match(html, /twitter:title" content="DEBT-049 · AI 债务链爆雷模拟器"/);
  assert.match(html, /y='42'/);
  assert.match(html, /font-size='20'/);
  assert.match(html, /%3Crect width='64' height='64' rx='12'/);
  assert.match(html, /%3Ctext x='32' y='42'/);
  assert.match(html, /049%3C\/text%3E/);
  assert.doesNotMatch(html, /progress|%3Crect x=/);
  assert.match(html, /id="langBtn"/);
  assert.match(html, /function applyLang/);
  assert.match(html, /localStorage\.getItem\("lang"\)/);
  assert.match(html, /localStorage\.setItem\("lang"/);
  assert.match(html, /function t\(zh, en\)/);
  assert.match(html, /class="share-row"/);
  assert.match(html, /class="share-btn"/);
  assert.match(html, /class="share-canvas-wrap"/);
  assert.match(html, /main \{ max-width: 880px/);
  assert.match(html, /font-size: clamp\(2rem, 5\.5vw, 3\.4rem\)/);
  assert.match(html, /line-height: 1\.14/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /transition-duration: 0\.01ms !important/);
  assert.match(html, /<script src="\/beacon\.js"><\/script>/);
  assert.match(html, /rel="canonical" href="https:\/\/build-100\.com\/049\/"/);
  assert.match(html, /og:image" content="https:\/\/build-100\.com\/049\/og-049\.png"/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /og:image:height" content="628"/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /--accent: #dc2626;/);
  assert.match(html, /--accent-glow: rgba\(220,38,38,0\.35\);/);
  assert.match(html, /--bg: #060709;/);
  assert.match(html, /data-en="← BUILD-100">← 返回主站/);
  assert.match(html, /DEBT<span>·049<\/span>/);
  assert.match(html, /本页为教育演示，不构成投资建议/);
  assert.match(html, /数据截至 2026-10-15/);
  assert.match(html, /2026-10-15/);
  assert.match(html, /-15\.5%/);
  assert.match(html, /KOSPI/);
  assert.match(html, /7,744/);
  assert.match(html, /5\.05%/);
  assert.match(html, /fool\.com/);
  assert.match(html, /Investrade/);
  assert.match(html, /Reuters/);
  assert.match(html, /费城半导体/);
  assert.match(html, /利息先吃掉利润/);
  assert.match(html, /data-link="creditor"/);
  assert.match(html, /data-link="neocloud"/);
  assert.match(html, /data-link="gpu"/);
  assert.match(html, /data-link="hyperscaler"/);
  assert.match(html, /data-link="app"/);
  assert.match(html, /data-link="enduser"/);
  assert.match(html, /data-scenario="coreweave"/);
  assert.match(html, /data-scenario="hike"/);
  assert.match(html, /data-scenario="util60"/);
  assert.match(html, /<canvas id="shareCanvas" width="1200" height="628"/);
  assert.match(html, /build-100\.com\/049/);
  assert.doesNotMatch(html, /· BUILD-100<\/title>/);
  assert.doesNotMatch(html, /--accent:\s*#(b794f6|5b8caa|c4a35a|5eead4|f5c542)/i);
  const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(m, "inline module script");
  const src = m[1].replace(/import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];/, "void 0;");
  new Function(src);
});
