import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PAGE_URL,
  BRAND,
  TITLE,
  INITIAL_CASH,
  INITIAL_SHARES,
  INITIAL_PRICE,
  FEE_RATE,
  BUY_FRACTION,
  SELL_FRACTION,
  CRASH_MIN,
  CRASH_MAX,
  MIN_TURNS,
  MAX_TURNS,
  ACTIONS,
  SCENARIO_IDS,
  SCENARIOS,
  GRADES,
  round2,
  equityOf,
  returnRate,
  normalizeScenario,
  normalizeAction,
  hashSeed,
  mulberry32,
  generateDeck,
  createGame,
  quoteBuy,
  quoteSell,
  nextCard,
  applyAction,
  isCrashTriggered,
  applyCrash,
  reviewSignals,
  gradeResult,
  buildShareText,
  step,
  playThrough,
} from "./engine.js";

const here = dirname(fileURLToPath(import.meta.url));

test("engine is DOM-free and package.json is type module", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(/\b(document|window|innerHTML|localStorage|sessionStorage)\b/.test(src), false);
  assert.equal(/\bfetch\s*\(/.test(src), false);
  const pkg = JSON.parse(readFileSync(join(here, "package.json"), "utf8"));
  assert.equal(pkg.type, "module");
  assert.equal(pkg.private, true);
});

test("identity constants", () => {
  assert.equal(PAGE_URL, "https://build-100.com/033/");
  assert.equal(BRAND, "TOPRUN-033");
  assert.equal(TITLE.zh, "TOPRUN-033 · 散户生存小游戏");
  assert.equal(INITIAL_CASH, 100000);
  assert.equal(INITIAL_SHARES, 0);
  assert.equal(INITIAL_PRICE, 100);
  assert.equal(FEE_RATE, 0.001);
  assert.equal(BUY_FRACTION, 0.25);
  assert.equal(SELL_FRACTION, 0.25);
  assert.deepEqual([...ACTIONS], ["buy", "hold", "sell"]);
  assert.deepEqual([...SCENARIO_IDS], ["ai", "consumer", "star"]);
  assert.equal(SCENARIOS.ai.nameZh, "北境算力");
  assert.equal(SCENARIOS.consumer.nameZh, "澄江乳业");
  assert.equal(SCENARIOS.star.nameZh, "岚山光电");
  assert.deepEqual(
    GRADES.map((g) => g.zh),
    ["全身而退", "落袋为安", "半山腰离场", "山顶站岗"]
  );
});

test("no real company names in engine copy", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  const banned = [
    "寒武纪",
    "海光",
    "茅台",
    "海天",
    "伊利",
    "蒙牛",
    "宁德",
    "中芯",
    "NVIDIA",
    "Nvidia",
    "华为",
    "中金",
    "中信",
  ];
  for (const name of banned) {
    assert.equal(src.includes(name), false, name);
  }
});

test("createGame opens with 100000 cash and price 100", () => {
  const s = createGame({ seed: 7, scenario: "ai" });
  assert.equal(s.cash, 100000);
  assert.equal(s.shares, 0);
  assert.equal(s.price, 100);
  assert.equal(s.turn, 0);
  assert.equal(s.over, false);
  assert.equal(s.crashed, false);
  assert.equal(s.currentCard, null);
  assert.ok(s.maxTurns >= MIN_TURNS && s.maxTurns <= MAX_TURNS);
  assert.equal(s.cards.length, s.maxTurns);
  assert.equal(equityOf(s), 100000);
  assert.equal(returnRate(s), 0);
  assert.equal(s.scenario, "ai");
  assert.equal(s.nameZh, "北境算力");
});

test("invalid scenario and action fall back", () => {
  assert.equal(normalizeScenario("nope"), "ai");
  assert.equal(normalizeScenario("CONSUMER"), "consumer");
  assert.equal(normalizeAction("BUY"), "buy");
  assert.equal(normalizeAction("zzz"), "hold");
  const s = createGame({ seed: 1, scenario: "??" });
  assert.equal(s.scenario, "ai");
});

test("fee is 0.1% on buy and sell notional", () => {
  let s = nextCard(createGame({ seed: 11, scenario: "ai" }));
  const q = quoteBuy(s);
  assert.ok(q.qty >= 1);
  assert.equal(q.fee, round2(q.notional * FEE_RATE));
  assert.equal(q.notional, round2(q.qty * s.price));
  const afterBuy = applyAction(s, "buy");
  assert.equal(afterBuy.shares, q.qty);
  assert.equal(afterBuy.cash, round2(s.cash - q.notional - q.fee));
  assert.equal(afterBuy.lastTrade.fee, q.fee);
  assert.notEqual(afterBuy.cash, s.cash);

  const qs = quoteSell(afterBuy);
  assert.ok(qs.qty >= 1);
  assert.equal(qs.fee, round2(qs.notional * FEE_RATE));
  const afterSell = applyAction(afterBuy, "sell");
  assert.equal(afterSell, afterBuy);

  let t = nextCard(createGame({ seed: 11, scenario: "ai" }));
  t = applyAction(t, "buy");
  t = nextCard(t);
  const before = { cash: t.cash, shares: t.shares };
  const sellQ = quoteSell(t);
  t = applyAction(t, "sell");
  assert.equal(t.shares, before.shares - sellQ.qty);
  assert.equal(t.cash, round2(before.cash + sellQ.notional - sellQ.fee));
});

test("hold leaves cash and shares unchanged", () => {
  let s = nextCard(createGame({ seed: 21, scenario: "ai" }));
  const cash = s.cash;
  const shares = s.shares;
  const price = s.price;
  s = applyAction(s, "hold");
  assert.equal(s.cash, cash);
  assert.equal(s.shares, shares);
  assert.equal(s.price, price);
  assert.equal(s.lastTrade.qty, 0);
  assert.equal(s.lastTrade.fee, 0);
  assert.equal(s.actedThisTurn, true);
});

test("buy then sell then hold are distinct", () => {
  const seed = 42;
  const buy = playThrough({ seed, scenario: "ai" }, Array(16).fill("buy"));
  const hold = playThrough({ seed, scenario: "ai" }, Array(16).fill("hold"));
  const sell = playThrough({ seed, scenario: "ai" }, Array(16).fill("sell"));
  assert.equal(hold.shares, 0);
  assert.equal(hold.cash, INITIAL_CASH);
  assert.ok(buy.shares > 0);
  assert.ok(buy.cash < INITIAL_CASH);
  assert.equal(sell.shares, 0);
  assert.notEqual(equityOf(buy), equityOf(hold));
});

test("sell with zero shares is a no-op on position", () => {
  let s = nextCard(createGame({ seed: 3, scenario: "star" }));
  s = applyAction(s, "sell");
  assert.equal(s.shares, 0);
  assert.equal(s.cash, INITIAL_CASH);
  assert.equal(s.lastTrade.qty, 0);
});

test("applyAction and nextCard do not mutate input", () => {
  const a = nextCard(createGame({ seed: 9, scenario: "ai" }));
  const cash = a.cash;
  const turn = a.turn;
  const b = applyAction(a, "buy");
  assert.equal(a.cash, cash);
  assert.equal(a.shares, 0);
  assert.ok(b.shares > 0);
  const c = nextCard(b);
  assert.equal(b.turn, turn);
  assert.ok(c.turn >= turn);
});

test("must act before the next card deals", () => {
  const a = nextCard(createGame({ seed: 5, scenario: "consumer" }));
  const again = nextCard(a);
  assert.equal(again.turn, a.turn);
  assert.equal(again.cardIndex, a.cardIndex);
  assert.equal(again.currentCard.id, a.currentCard.id);
});

test("crash drop is in [0.25, 0.40] and always fires on a full hold game", () => {
  const drops = [];
  for (let seed = 1; seed <= 24; seed++) {
    for (const scenario of SCENARIO_IDS) {
      const s = playThrough({ seed, scenario }, Array(16).fill("hold"));
      assert.equal(s.over, true);
      assert.equal(s.crashed, true);
      assert.ok(s.crashDrop >= CRASH_MIN - 1e-12);
      assert.ok(s.crashDrop <= CRASH_MAX + 1e-12);
      assert.ok(s.priceBeforeCrash > 0);
      const crash = s.history.find((h) => h.type === "crash");
      assert.ok(crash);
      assert.equal(crash.drop, s.crashDrop);
      assert.equal(crash.priceAfter, round2(crash.priceBefore * (1 - crash.drop)));
      drops.push(s.crashDrop);
      assert.equal(isCrashTriggered(s), false);
    }
  }
  const uniq = new Set(drops.map((d) => d.toFixed(3)));
  assert.ok(uniq.size > 3);
  assert.ok(Math.min(...drops) >= 0.25);
  assert.ok(Math.max(...drops) <= 0.4);
});

test("isCrashTriggered then applyCrash cuts 25–40%", () => {
  let s = nextCard(createGame({ seed: 88, scenario: "ai" }));
  let guard = 0;
  while (!isCrashTriggered(s) && !s.over && guard < 20) {
    s = step(s, "hold");
    guard += 1;
  }
  if (!isCrashTriggered(s) && s.crashed) {
    assert.ok(s.crashDrop >= 0.25 && s.crashDrop <= 0.4);
    return;
  }
  assert.equal(isCrashTriggered(s), true);
  const before = s.price;
  const drop = s.crashDrop;
  const crashed = applyCrash(s);
  assert.equal(s.price, before);
  assert.equal(crashed.crashed, true);
  assert.equal(crashed.priceBeforeCrash, before);
  const ratio = crashed.price / before;
  assert.ok(ratio <= 1 - 0.25 + 0.001);
  assert.ok(ratio >= 1 - 0.4 - 0.001);
  assert.equal(round2(before * (1 - drop)), crashed.price);
  assert.equal(applyCrash(crashed).price, crashed.price);
});

test("gradeResult covers peak-to-escape labels", () => {
  const peak = playThrough({ seed: 2, scenario: "ai" }, Array(16).fill("buy"));
  const gPeak = gradeResult(peak);
  assert.ok(["peak", "mid", "pocket"].includes(gPeak.id));
  assert.equal(typeof gPeak.zh, "string");
  assert.equal(typeof gPeak.en, "string");
  assert.ok(gPeak.zh.length > 0);
  assert.equal(gPeak.equity, equityOf(peak));

  const empty = gradeResult(createGame({ seed: 1, scenario: "ai" }));
  assert.equal(empty.id, "escape");
  assert.equal(empty.zh, "全身而退");
  assert.equal(empty.en, "Clean escape");
  assert.ok(Math.abs(empty.rate) < 1e-9);

  const hold = playThrough({ seed: 2, scenario: "ai" }, Array(16).fill("hold"));
  const gHold = gradeResult(hold);
  assert.equal(gHold.id, "escape");
  assert.ok(gHold.rate >= -0.005);

  const policy = playThrough({ seed: 4, scenario: "consumer" }, [
    function (st) {
      if (st.currentCard && st.currentCard.isSignal) return "sell";
      if (st.shares === 0 && st.turn <= 3) return "buy";
      return "hold";
    },
  ]);
  const g = gradeResult(policy);
  assert.ok(["escape", "pocket", "mid", "peak"].includes(g.id));
  assert.ok(GRADES.some((x) => x.zh === g.zh));
});

test("reviewSignals lists sells and misses", () => {
  const hold = playThrough({ seed: 13, scenario: "ai" }, Array(16).fill("hold"));
  const rows = reviewSignals(hold);
  assert.ok(rows.length >= 3);
  assert.ok(rows.some((r) => r.kind === "signal"));
  assert.ok(rows.some((r) => r.kind === "disclosure"));
  assert.ok(rows.every((r) => r.missed === true));
  assert.ok(rows.every((r) => r.action === "hold"));

  const sellAll = playThrough({ seed: 13, scenario: "ai" }, Array(16).fill("sell"));
  const sold = reviewSignals(sellAll);
  assert.equal(sold.length, rows.length);
  assert.ok(sold.every((r) => r.missed === false));
  assert.ok(sold.every((r) => r.action === "sell"));
  assert.ok(sold.every((r) => r.didSell === false));

  const mixed = playThrough({ seed: 13, scenario: "ai" }, [
    function (st) {
      if (st.currentCard && st.currentCard.kind === "signal") return "sell";
      return "buy";
    },
  ]);
  const mixRows = reviewSignals(mixed);
  assert.ok(mixRows.some((r) => r.kind === "signal" && r.action === "sell"));
});

test("same seed+scenario is a deterministic sequence", () => {
  const a = generateDeck(99, "ai");
  const b = generateDeck(99, "ai");
  assert.deepEqual(
    a.cards.map((c) => c.id),
    b.cards.map((c) => c.id)
  );
  assert.equal(a.crashDrop, b.crashDrop);
  assert.equal(a.maxTurns, b.maxTurns);
  const g1 = createGame({ seed: 99, scenario: "ai" });
  const g2 = createGame({ seed: 99, scenario: "ai" });
  assert.equal(g1.crashDrop, g2.crashDrop);
  const p1 = playThrough({ seed: 99, scenario: "ai" }, ["buy", "hold", "sell", "buy", "hold"]);
  const p2 = playThrough({ seed: 99, scenario: "ai" }, ["buy", "hold", "sell", "buy", "hold"]);
  assert.equal(p1.cash, p2.cash);
  assert.equal(p1.shares, p2.shares);
  assert.equal(p1.price, p2.price);
  assert.equal(p1.turn, p2.turn);
  assert.deepEqual(
    p1.history.map((h) => h.type + h.turn + (h.action || "")),
    p2.history.map((h) => h.type + h.turn + (h.action || ""))
  );
});

test("string 33 and number 33 share a hash path", () => {
  assert.equal(hashSeed(33), hashSeed("33"));
  const a = createGame({ seed: 33, scenario: "star" });
  const b = createGame({ seed: "33", scenario: "star" });
  assert.equal(a.maxTurns, b.maxTurns);
  assert.equal(a.crashDrop, b.crashDrop);
  assert.deepEqual(
    a.cards.map((c) => c.id),
    b.cards.map((c) => c.id)
  );
});

test("different seeds and scenarios diverge", () => {
  const a = generateDeck(1, "ai");
  const b = generateDeck(2, "ai");
  const c = generateDeck(1, "consumer");
  const d = generateDeck(1, "star");
  const ids = (deck) => deck.cards.map((x) => x.id + x.titleZh).join("|");
  assert.notEqual(ids(a), ids(b));
  assert.notEqual(ids(a), ids(c));
  assert.notEqual(ids(a), ids(d));
  const ga = createGame({ seed: 1, scenario: "ai" });
  const gc = createGame({ seed: 1, scenario: "consumer" });
  const gs = createGame({ seed: 1, scenario: "star" });
  assert.equal(ga.nameZh, "北境算力");
  assert.equal(gc.nameZh, "澄江乳业");
  assert.equal(gs.nameZh, "岚山光电");
  assert.notEqual(ga.cards[0].bodyZh, gc.cards[0].bodyZh);
});

test("every game has 8–12 turns, signals, and one disclosure", () => {
  for (const scenario of SCENARIO_IDS) {
    for (let seed = 50; seed < 58; seed++) {
      const deck = generateDeck(seed, scenario);
      assert.ok(deck.maxTurns >= 8 && deck.maxTurns <= 12);
      const kinds = deck.cards.map((c) => c.kind);
      assert.equal(kinds.filter((k) => k === "disclosure").length, 1);
      assert.ok(kinds.filter((k) => k === "signal").length >= 3);
      const silent = deck.cards
        .filter((c) => c.kind === "signal")
        .reduce((n, c) => n + c.silentSellDelta, 0);
      assert.ok(silent >= 100);
      const disc = deck.cards.find((c) => c.kind === "disclosure");
      const lastSignalTurn = Math.max(
        ...deck.cards.filter((c) => c.kind === "signal").map((c) => c.turn)
      );
      assert.ok(disc.turn > lastSignalTurn);
    }
  }
});

test("mulberry32 is deterministic", () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  assert.equal(a(), b());
  assert.equal(a(), b());
  assert.notEqual(a(), mulberry32(124)());
});

test("round2 and quotes", () => {
  assert.equal(round2(10.005), 10.01);
  assert.equal(round2(1.005), 1.01);
  const s = nextCard(createGame({ seed: 8, scenario: "ai" }));
  const q = quoteBuy(s);
  assert.ok(q.notional + q.fee <= s.cash);
  assert.ok(q.qty <= Math.floor((s.cash * 0.25) / s.price) + 1);
});

test("buildShareText is bilingual and mentions the grade", () => {
  const s = playThrough({ seed: 6, scenario: "ai" }, Array(16).fill("buy"));
  const zh = buildShareText(s, "zh");
  const en = buildShareText(s, "en");
  const g = gradeResult(s);
  assert.ok(zh.includes("TOPRUN-033"));
  assert.ok(zh.includes(g.zh));
  assert.ok(en.includes(g.en));
  assert.ok(zh.includes("build-100.com/033"));
  assert.ok(en.includes("build-100.com/033"));
  const idle = buildShareText(createGame({ seed: 1 }), "zh");
  assert.ok(idle.includes("110"));
});

test("nextCard applies the card price delta", () => {
  const s0 = createGame({ seed: 17, scenario: "ai" });
  const card = s0.cards[0];
  const s1 = nextCard(s0);
  assert.equal(s1.turn, 1);
  assert.equal(s1.currentCard.id, card.id);
  assert.equal(s1.price, Math.max(1, round2(100 * (1 + card.priceDelta))));
  assert.equal(s1.actedThisTurn, false);
});

test("playThrough ends and step matches manual loop", () => {
  const acts = ["buy", "hold", "buy", "sell", "hold", "buy", "hold", "sell", "hold", "hold", "buy", "hold"];
  let s = nextCard(createGame({ seed: 70, scenario: "star" }));
  for (const a of acts) {
    if (s.over) break;
    s = step(s, a);
  }
  const p = playThrough({ seed: 70, scenario: "star" }, acts);
  assert.equal(s.over, true);
  assert.equal(p.over, true);
  assert.equal(s.cash, p.cash);
  assert.equal(s.shares, p.shares);
  assert.equal(s.price, p.price);
  assert.equal(s.crashed, true);
});

test("index.html matches the page format spec", () => {
  const html = readFileSync(join(here, "index.html"), "utf8");
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>TOPRUN-033 · 散户生存小游戏<\/title>/);
  assert.equal(html.includes("· BUILD-100"), false);
  assert.match(html, /033/);
  assert.match(html, /y=['"]42['"]/);
  assert.match(html, /font-size=['"]20['"]/);
  assert.match(html, /TOPRUN<span>·033<\/span>/);
  assert.match(html, /id="langBtn"/);
  assert.match(html, /data-en=/);
  assert.match(html, /function applyLang/);
  assert.match(html, /function t\(/);
  assert.match(html, /class="share-row"/);
  assert.match(html, /class="share-btn"/);
  assert.match(html, /share-canvas-wrap/);
  assert.match(html, /build-100\.com/);
  assert.match(html, /@JCheng557/);
  assert.match(html, /max-width:\s*880px/);
  assert.match(html, /clamp\(2rem,\s*5\.5vw,\s*3\.4rem\)/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /beacon\.js/);
  assert.match(html, /canonical" href="https:\/\/build-100\.com\/033\//);
  assert.match(html, /og-033\.png/);
  assert.match(html, /og:image:height" content="628"/);
  assert.match(html, /--accent:\s*#f59e0b/);
  assert.match(html, /from ["']\.\/engine\.js["']/);
});
