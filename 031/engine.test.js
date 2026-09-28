import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AS_OF,
  PAGE_URL,
  DEFAULT_ASSUMPTIONS,
  SESSION_IDS,
  FREQUENCY_IDS,
  SESSIONS,
  TIMELINE,
  MARKET_SNAPSHOT,
  clamp,
  round2,
  formatUsd,
  parseSessions,
  parseFrequency,
  normalizeInput,
  mergeAssumptions,
  isTradOpen,
  traditionalFeePerTrade,
  tokenizedFeePerTrade,
  monthlyFees,
  hoursCompare,
  dayTimeline,
  sessionBands,
  preferredCoverage,
  missedWindows,
  settlementCompare,
  compareAll,
  buildShareText,
} from "./engine.js";

const here = dirname(fileURLToPath(import.meta.url));

test("engine is DOM-free and package.json is type module", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(/\b(document|window|innerHTML|localStorage|sessionStorage)\b/.test(src), false);
  assert.equal(/\bfetch\s*\(/.test(src), false);
  const pkg = JSON.parse(readFileSync(join(here, "package.json"), "utf8"));
  assert.equal(pkg.type, "module");
});

test("static snapshot dates and volumes are locked as of 2026-09", () => {
  assert.equal(AS_OF, "2026-09");
  assert.equal(DEFAULT_ASSUMPTIONS.asOf, "2026-09");
  assert.equal(MARKET_SNAPSHOT.dex30dUsdBn, 20.9);
  assert.equal(MARKET_SNAPSHOT.rhChain30dUsdBn, 9.7);
  assert.equal(MARKET_SNAPSHOT.uniswapShare, 0.6);
  assert.equal(MARKET_SNAPSHOT.asOf, "2026-09");
  const dates = TIMELINE.map((e) => e.date);
  assert.deepEqual(dates, ["2026-07-01", "2026-09-17", "2026-09-22"]);
  assert.equal(TIMELINE.find((e) => e.id === "sec").date, "2026-09-17");
  assert.equal(TIMELINE.find((e) => e.id === "nyse").date, "2026-09-22");
  assert.equal(PAGE_URL, "https://build-100.com/031/");
});

test("clamp and parse helpers", () => {
  assert.equal(clamp(12, 0, 500), 12);
  assert.equal(clamp(-1, 0, 500), 0);
  assert.equal(clamp(9999, 0, 500), 500);
  assert.equal(clamp("nope", 0, 500), 0);
  assert.equal(clamp(undefined, 0, 500), 0);
  assert.deepEqual(parseSessions(["weekend", "bogus", "us_session", "us_session"]), [
    "us_session",
    "weekend",
  ]);
  assert.deepEqual(parseSessions(null), []);
  assert.equal(parseFrequency("yes"), "sometimes");
  assert.equal(parseFrequency("no"), "never");
  assert.equal(parseFrequency("OFTEN"), "often");
  assert.equal(parseFrequency("maybe"), "never");
  assert.deepEqual(SESSION_IDS, ["madrid_day", "us_session", "late_night", "weekend"]);
  assert.deepEqual([...FREQUENCY_IDS], ["never", "rare", "sometimes", "often"]);
});

test("Madrid cash session is 15:30–22:00 weekdays, closed weekends", () => {
  assert.equal(isTradOpen(15 * 60 + 30, false), true);
  assert.equal(isTradOpen(15 * 60 + 29, false), false);
  assert.equal(isTradOpen(16 * 60, false), true);
  assert.equal(isTradOpen(21 * 60 + 59, false), true);
  assert.equal(isTradOpen(22 * 60, false), false);
  assert.equal(isTradOpen(10 * 60, false), false);
  assert.equal(isTradOpen(16 * 60, true), false);
  assert.equal(DEFAULT_ASSUMPTIONS.trad.hoursPerSession, 6.5);
});

test("traditional fee is $0 commission + blended regulatory, with a floor", () => {
  assert.equal(traditionalFeePerTrade(0), 0.01);
  assert.equal(traditionalFeePerTrade(10000), 0.14);
  assert.equal(traditionalFeePerTrade(5000), 0.07);
  assert.equal(traditionalFeePerTrade(100), 0.01);
});

test("tokenized fee is spread bps + optional gas", () => {
  assert.equal(tokenizedFeePerTrade(10000, DEFAULT_ASSUMPTIONS, true), 8.15);
  assert.equal(tokenizedFeePerTrade(10000, DEFAULT_ASSUMPTIONS, false), 8);
  assert.equal(tokenizedFeePerTrade(0, DEFAULT_ASSUMPTIONS, true), 0.15);
  assert.equal(tokenizedFeePerTrade(0, DEFAULT_ASSUMPTIONS, false), 0);
  assert.equal(tokenizedFeePerTrade(2500, DEFAULT_ASSUMPTIONS, true), 2.15);
});

test("monthly fee comparison for a typical Madrid IBKR-style habit", () => {
  const r = monthlyFees({ tradesPerMonth: 10, avgSizeUsd: 5000, includeGas: true });
  assert.equal(r.tradPerTrade, 0.07);
  assert.equal(r.tokPerTrade, 4.15);
  assert.equal(r.tradMonthly, 0.7);
  assert.equal(r.tokMonthly, 41.5);
  assert.equal(r.tradAnnual, 8.4);
  assert.equal(r.tokAnnual, 498);
  assert.equal(r.deltaMonthly, 40.8);
  assert.equal(r.cheaper, "trad");
  assert.equal(r.tokSpreadBps, 8);
  assert.equal(r.tokGas, 0.15);
});

test("zero trades yields zero monthly fees", () => {
  const r = monthlyFees({ tradesPerMonth: 0, avgSizeUsd: 5000 });
  assert.equal(r.tradMonthly, 0);
  assert.equal(r.tokMonthly, 0);
  assert.equal(r.cheaper, "tie");
});

test("trades and size are clamped", () => {
  const n = normalizeInput({ tradesPerMonth: 9999, avgSizeUsd: -50, sessions: ["late_night"] });
  assert.equal(n.tradesPerMonth, 500);
  assert.equal(n.avgSizeUsd, 0);
  assert.deepEqual(n.sessions, ["late_night"]);
  assert.equal(n.includeGas, true);
});

test("includeGas false drops gas from tokenized side", () => {
  const r = monthlyFees({ tradesPerMonth: 8, avgSizeUsd: 2500, includeGas: false });
  assert.equal(r.tokGas, 0);
  assert.equal(r.tokPerTrade, 2);
  assert.equal(r.tokMonthly, 16);
});

test("hours: 32.5h cash week vs 168h tokenized, 252×6.5 vs 365×24", () => {
  const h = hoursCompare();
  assert.equal(h.tradHoursPerWeek, 32.5);
  assert.equal(h.tokHoursPerWeek, 168);
  assert.equal(h.tradHoursPerYear, 1638);
  assert.equal(h.tokHoursPerYear, 8760);
  assert.equal(h.extraHoursPerYear, 7122);
  assert.equal(h.coverageRatio, round2(8760 / 1638));
  assert.equal(h.tradSessionMadrid, "15:30–22:00");
});

test("24h Madrid timeline places the cash session at 15.5–22", () => {
  const d = dayTimeline();
  assert.equal(d.usOpenHour, 15.5);
  assert.equal(d.usCloseHour, 22);
  assert.ok(Math.abs(d.usOpenPct - (930 / 1440) * 100) < 1e-9);
  assert.ok(Math.abs(d.usWidthPct - (6.5 / 24) * 100) < 1e-9);
});

test("late_night wraps midnight into two bands", () => {
  const bands = sessionBands("late_night");
  assert.equal(bands.length, 2);
  assert.equal(bands[0].startPct, (22 * 60 / 1440) * 100);
  assert.equal(bands[1].startPct, 0);
  assert.equal(sessionBands("us_session").length, 1);
  assert.equal(sessionBands("weekend")[0].weekend, true);
  assert.deepEqual(sessionBands("nope"), []);
});

test("preferred coverage: madrid day is mostly closed; US session is open", () => {
  const day = preferredCoverage(["madrid_day"]);
  assert.equal(day.closedShare, round2(6.5 / 9));
  const us = preferredCoverage(["us_session"]);
  assert.equal(us.closedShare, 0);
  assert.equal(us.tradOpenShare, 1);
  const mix = preferredCoverage(["late_night", "weekend"]);
  assert.equal(mix.closedShare, 1);
  assert.equal(SESSIONS.madrid_day.tradClosedShare, 6.5 / 9);
});

test("missed windows follow frequency; never stays zero even with night chips", () => {
  const never = missedWindows({
    frequency: "never",
    sessions: ["late_night", "weekend"],
    tradesPerMonth: 8,
    avgSizeUsd: 2500,
  });
  assert.equal(never.missedPerMonth, 0);
  assert.equal(never.missedPerYear, 0);
  assert.equal(never.estimate, true);

  const often = missedWindows({
    frequency: "often",
    sessions: ["us_session"],
    tradesPerMonth: 8,
    avgSizeUsd: 2500,
  });
  assert.equal(often.missedPerMonth, 8);
  assert.equal(often.missedPerYear, 96);
  assert.equal(often.missedNotionalPerYear, 240000);

  const some = missedWindows({ frequency: "yes", avgSizeUsd: 1000 });
  assert.equal(some.frequency, "sometimes");
  assert.equal(some.missedPerYear, 36);
  assert.equal(some.missedNotionalPerYear, 36000);
});

test("settlement is T+1 vs instant", () => {
  const s = settlementCompare({ tradesPerMonth: 8, avgSizeUsd: 2500 });
  assert.equal(s.tradLabel, "T+1");
  assert.equal(s.tokLabel, "instant");
  assert.equal(s.tradLagDays, 1);
  assert.equal(s.tokLagDays, 0);
  assert.equal(s.tradWaitingDaysPerYear, 96);
  assert.equal(s.tokWaitingDaysPerYear, 0);
  assert.equal(s.tradNotionalDaysUsd, 240000);
});

test("mergeAssumptions can retune spread without mutating defaults", () => {
  const merged = mergeAssumptions({ tok: { spreadBpsRoundTrip: 4, gasUsdPerTrade: 0 } });
  assert.equal(merged.tok.spreadBpsRoundTrip, 4);
  assert.equal(merged.tok.gasUsdPerTrade, 0);
  assert.equal(DEFAULT_ASSUMPTIONS.tok.spreadBpsRoundTrip, 8);
  const fees = monthlyFees({ tradesPerMonth: 1, avgSizeUsd: 10000, includeGas: true }, merged);
  assert.equal(fees.tokPerTrade, 4);
});

test("compareAll wires fees, hours, settlement and missed", () => {
  const r = compareAll({
    tradesPerMonth: 8,
    avgSizeUsd: 2500,
    sessions: ["madrid_day", "us_session"],
    frequency: "sometimes",
    includeGas: true,
  });
  assert.equal(r.asOf, "2026-09");
  assert.equal(r.fees.cheaper, "trad");
  assert.equal(r.hours.tokHoursPerWeek, 168);
  assert.equal(r.settlement.tradLabel, "T+1");
  assert.equal(r.missed.missedPerYear, 36);
  assert.equal(r.timeline.usOpenHour, 15.5);
  assert.ok(r.preferred.closedShare > 0);
  assert.equal(r.input.tradesPerMonth, 8);
});

test("formatUsd is locale-stable", () => {
  assert.equal(formatUsd(41.5), "$41.50");
  assert.equal(formatUsd(240000, 0), "$240,000");
  assert.equal(formatUsd(-8.4), "−$8.40");
  assert.equal(formatUsd(NaN), "$0.00");
});

test("index.html matches page-format-spec core checks", () => {
  const html = readFileSync(join(here, "index.html"), "utf8");
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>TOKEN-031 · 代币化美股 24\/7 对比<\/title>/);
  assert.match(html, /og:title" content="TOKEN-031 · 代币化美股 24\/7 对比"/);
  assert.match(html, /y='42'/);
  assert.match(html, /font-size='20'/);
  assert.match(html, /%3Crect width='64' height='64' rx='12'/);
  assert.match(html, /%3Ctext x='32' y='42'/);
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
  assert.match(html, /<script src="\/beacon\.js"><\/script>/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /og:image:height" content="628"/);
  assert.match(html, /--accent: #10b981;/);
  assert.match(html, /--accent-glow: rgba\(16,185,129,0\.35\);/);
  assert.match(html, /data-en="← BUILD-100">← 返回主站/);
  assert.match(html, /TOKEN<span>·031<\/span>/);
  assert.match(html, /本工具仅为信息对比，不构成投资建议/);
  assert.match(html, /2026-09-17/);
  assert.match(html, /2026-09-22/);
  assert.match(html, /\$20\.9B/);
  assert.doesNotMatch(html, /· BUILD-100<\/title>/);
  assert.match(html, /<canvas id="shareCanvas" width="1200" height="628"/);
  const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(m, "inline module script");
  const src = m[1].replace(/import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];/, "void 0;");
  new Function(src);
});

test("buildShareText is bilingual and cites as-of + not-advice", () => {
  const r = compareAll({
    tradesPerMonth: 8,
    avgSizeUsd: 2500,
    frequency: "sometimes",
  });
  const zh = buildShareText(r, "zh");
  const en = buildShareText(r, "en");
  assert.match(zh, /TOKEN-031/);
  assert.match(zh, /不构成投资建议/);
  assert.match(zh, /2026-09/);
  assert.match(zh, /build-100\.com\/031/);
  assert.match(en, /Not investment advice/);
  assert.match(en, /Missed windows/);
  assert.equal(buildShareText(null, "zh"), PAGE_URL);
});
