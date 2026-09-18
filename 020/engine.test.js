import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  STORAGE_KEY,
  HEADER,
  asBotList,
  buildRobots,
  parseRobots,
  applyPreset,
  mergeSelections,
  loadDraft,
  saveDraft,
  hydrateSelections,
  stripKnownAgents,
  listedAgents,
  selectionOf,
  buildShareText,
  countActions,
} from "./engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const bots = JSON.parse(readFileSync(join(here, "bots.json"), "utf8"));
const list = asBotList(bots);

function mem(init = {}) {
  const s = { ...init };
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null),
    setItem: (k, v) => {
      s[k] = String(v);
    },
    removeItem: (k) => {
      delete s[k];
    },
  };
}

function knownOf(parsed, ua) {
  const bag = parsed.known;
  if (bag instanceof Map) {
    if (bag.has(ua)) return bag.get(ua);
    const lower = ua.toLowerCase();
    for (const [k, v] of bag) {
      if (String(k).toLowerCase() === lower) return v;
    }
    return undefined;
  }
  if (bag && Object.prototype.hasOwnProperty.call(bag, ua)) return bag[ua];
  if (bag) {
    const lower = ua.toLowerCase();
    for (const k of Object.keys(bag)) {
      if (k.toLowerCase() === lower) return bag[k];
    }
  }
  return undefined;
}

function countUa(text, ua) {
  const re = new RegExp("^\\s*user-agent\\s*:\\s*" + ua.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "gim");
  return (String(text).match(re) || []).length;
}

test("storage key is botrules-020", () => {
  assert.equal(STORAGE_KEY, "botrules-020");
});

test("engine is DOM-free", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(/document\.|innerHTML|window\./.test(src), false);
});

test("OAI-SearchBot is in the baked table", () => {
  assert.ok(list.some((b) => b.ua === "OAI-SearchBot"));
  const required = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "Google-Extended",
    "ClaudeBot",
    "anthropic-ai",
    "Claude-User",
    "Bytespider",
    "CCBot",
    "PerplexityBot",
    "Applebot-Extended",
    "Amazonbot",
    "cohere-ai",
    "FacebookBot",
    "meta-externalagent",
  ];
  const have = new Set(list.map((b) => b.ua));
  for (const ua of required) assert.ok(have.has(ua), "missing " + ua);
});

test("Google-Extended / Applebot-Extended copy says they do not block search bots", () => {
  const g = list.find((b) => b.ua === "Google-Extended");
  const a = list.find((b) => b.ua === "Applebot-Extended");
  assert.match(g.zh, /不挡/);
  assert.match(g.zh, /Googlebot/);
  assert.match(g.en, /does not block Googlebot/i);
  assert.match(a.zh, /不挡/);
  assert.match(a.zh, /Applebot/);
  assert.match(a.en, /does not block Applebot/i);
});

test("Allow: / and Disallow: / — never empty Disallow", () => {
  const selections = { GPTBot: "allow", ClaudeBot: "disallow", Bytespider: "ignore" };
  const out = buildRobots(bots, selections);
  assert.match(out, /User-agent: GPTBot\nAllow: \//);
  assert.match(out, /User-agent: ClaudeBot\nDisallow: \//);
  assert.equal(/^Disallow:\s*$/m.test(out), false);
  assert.equal(/^Allow:\s*$/m.test(out), false);
  assert.equal(out.includes("Disallow:\n"), false);
  assert.equal(out.includes("Allow:\n"), false);
});

test("ignore is omitted from output", () => {
  const out = buildRobots(bots, { GPTBot: "ignore", ClaudeBot: "disallow" });
  assert.equal(countUa(out, "GPTBot"), 0);
  assert.equal(out.includes("GPTBot"), false);
  assert.equal(countUa(out, "ClaudeBot"), 1);
});

test("block-all writes Disallow: / per table token and no wildcard agent", () => {
  const sel = applyPreset("block-all", bots);
  for (const bot of list) assert.equal(sel[bot.ua], "disallow");
  const out = buildRobots(bots, sel);
  assert.equal(/^\s*User-agent:\s*\*\s*$/im.test(out), false);
  assert.equal(out.includes("User-agent: *"), false);
  for (const bot of list) {
    assert.match(out, new RegExp("User-agent: " + bot.ua + "\\nDisallow: /"));
  }
  assert.ok(HEADER.length > 0);
});

test("allow-all writes Allow: / per table token", () => {
  const sel = applyPreset("allow-all", bots);
  const out = buildRobots(bots, sel);
  for (const bot of list) {
    assert.equal(sel[bot.ua], "allow");
    assert.match(out, new RegExp("User-agent: " + bot.ua + "\\nAllow: /"));
  }
  assert.equal(out.includes("User-agent: *"), false);
});

test("reset reads table default and does not invent a wildcard", () => {
  const sel = applyPreset("reset", bots);
  for (const bot of list) assert.equal(sel[bot.ua], bot.default);
  const out = buildRobots(bots, sel);
  assert.equal(out.includes("User-agent: *"), false);
  assert.equal(sel["GPTBot"], "disallow");
  assert.equal(sel["ChatGPT-User"], "allow");
  assert.equal(sel["OAI-SearchBot"], "allow");
  assert.equal(sel["Google-Extended"], "disallow");
});

test("output order follows bots.json", () => {
  const sel = applyPreset("block-all", bots);
  const out = buildRobots(bots, sel);
  let last = -1;
  for (const bot of list) {
    const idx = out.indexOf("User-agent: " + bot.ua);
    assert.ok(idx > last, bot.ua + " out of order");
    last = idx;
  }
});

test("same UA never appears twice even if extras repeats it", () => {
  const extras = "User-agent: GPTBot\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /\n";
  const out = buildRobots(bots, { GPTBot: "allow" }, extras);
  assert.equal(countUa(out, "GPTBot"), 1);
  assert.match(out, /User-agent: GPTBot\nAllow: \//);
});

test("parse + merge put wildcard agent and Sitemap into extras", () => {
  const src = [
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    "User-agent: *",
    "Disallow: /secret",
    "",
    "Sitemap: https://example.com/sitemap.xml",
  ].join("\n");
  const parsed = parseRobots(src);
  assert.equal(knownOf(parsed, "GPTBot"), "disallow");
  assert.match(parsed.extras, /User-agent:\s*\*/i);
  assert.match(parsed.extras, /Sitemap:\s*https:\/\/example.com\/sitemap.xml/);
  assert.equal(/^\s*User-agent:\s*GPTBot\s*$/im.test(parsed.extras), false);

  const merged = mergeSelections(parsed, bots, applyPreset("reset", bots));
  assert.equal(merged.selections.GPTBot, "disallow");
  assert.match(merged.extras, /User-agent:\s*\*/i);
  assert.match(merged.extras, /Sitemap:/);
  assert.equal(countUa(merged.extras, "GPTBot"), 0);

  const out = buildRobots(bots, merged.selections, merged.extras);
  assert.equal(countUa(out, "GPTBot"), 1);
  assert.match(out, /User-agent: GPTBot\nDisallow: \//);
  assert.match(out, /User-agent: \*\nDisallow: \/secret/);
  assert.match(out, /Sitemap: https:\/\/example.com\/sitemap.xml/);
});

test("parse is case-insensitive for UA and only whole-site / counts", () => {
  const parsed = parseRobots("user-agent: gptbot\nAllow: /\n");
  assert.equal(knownOf(parsed, "gptbot"), "allow");
  const merged = mergeSelections(parsed, bots);
  assert.equal(merged.selections.GPTBot, "allow");
});

test("empty Disallow, path rules, crawl-delay, Host, multi-UA stay out of known", () => {
  const empty = parseRobots("User-agent: GPTBot\nDisallow:\n");
  assert.equal(knownOf(empty, "GPTBot"), undefined);
  assert.match(empty.extras, /GPTBot/);

  const path = parseRobots("User-agent: ClaudeBot\nDisallow: /private\nAllow: /public\n");
  assert.equal(knownOf(path, "ClaudeBot"), undefined);
  assert.match(path.extras, /ClaudeBot/);

  const delay = parseRobots("User-agent: Bytespider\nCrawl-delay: 10\nDisallow: /\n");
  assert.equal(knownOf(delay, "Bytespider"), undefined);

  const host = parseRobots("Host: example.com\nUser-agent: GPTBot\nDisallow: /\n");
  assert.equal(knownOf(host, "GPTBot"), "disallow");
  assert.match(host.extras, /Host:\s*example.com/);

  const multi = parseRobots("User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /\n");
  assert.equal(knownOf(multi, "GPTBot"), undefined);
  assert.equal(knownOf(multi, "ClaudeBot"), undefined);
  assert.match(multi.extras, /GPTBot/);
  assert.match(multi.extras, /ClaudeBot/);
});

test("merge peels known UAs from extras; checkbox overrides same-name block", () => {
  const parsed = parseRobots(
    [
      "User-agent: GPTBot",
      "Disallow: /hidden",
      "Allow: /public",
      "",
      "User-agent: *",
      "Allow: /",
    ].join("\n")
  );
  const current = applyPreset("reset", bots);
  current.GPTBot = "allow";
  const merged = mergeSelections(parsed, bots, current);
  assert.equal(merged.selections.GPTBot, "allow");
  assert.equal(countUa(merged.extras, "GPTBot"), 0);
  assert.match(merged.extras, /User-agent:\s*\*/);
  const out = buildRobots(bots, merged.selections, merged.extras);
  assert.equal(countUa(out, "GPTBot"), 1);
  assert.match(out, /User-agent: GPTBot\nAllow: \//);
  assert.equal(out.includes("Disallow: /hidden"), false);
});

test("multi-UA extras peels the table token and keeps the unknown one", () => {
  const extras = "User-agent: GPTBot\nUser-agent: MyShopBot\nDisallow: /nogo\n";
  const stripped = stripKnownAgents(extras, bots);
  assert.equal(countUa(stripped, "GPTBot"), 0);
  assert.equal(countUa(stripped, "MyShopBot"), 1);
  assert.match(stripped, /Disallow: \/nogo/);
});

test("unknown simple UA returns to extras on merge", () => {
  const parsed = parseRobots("User-agent: WeirdBot\nDisallow: /\n");
  assert.equal(knownOf(parsed, "WeirdBot"), "disallow");
  const merged = mergeSelections(parsed, bots, applyPreset("reset", bots));
  assert.equal(merged.selections.WeirdBot, undefined);
  assert.match(merged.extras, /User-agent: WeirdBot\nDisallow: \//);
});

test("merge does not clobber current for bots absent from the paste", () => {
  const current = applyPreset("reset", bots);
  current.GPTBot = "ignore";
  const parsed = parseRobots("User-agent: ClaudeBot\nAllow: /\n");
  const merged = mergeSelections(parsed, bots, current);
  assert.equal(merged.selections.GPTBot, "ignore");
  assert.equal(merged.selections.ClaudeBot, "allow");
});

test("hydrate fills new table tokens from defaults", () => {
  const saved = { GPTBot: "allow" };
  const sel = hydrateSelections(bots, saved);
  assert.equal(sel.GPTBot, "allow");
  assert.equal(sel["Google-Extended"], "disallow");
  assert.equal(sel["ChatGPT-User"], "allow");
});

test("loadDraft / saveDraft round-trip the storage key", () => {
  const s = mem();
  const draft = { selections: { GPTBot: "allow" }, extras: "Sitemap: https://x.test/sitemap.xml" };
  assert.equal(saveDraft(draft, s), true);
  assert.ok(s.getItem(STORAGE_KEY));
  const loaded = loadDraft(s);
  assert.equal(loaded.selections.GPTBot, "allow");
  assert.equal(loaded.extras, draft.extras);
  assert.equal(loadDraft(mem()), null);
  assert.equal(loadDraft(null), null);
});

test("selectionOf is case-insensitive; Map selections work", () => {
  assert.equal(selectionOf({ gptbot: "allow" }, "GPTBot"), "allow");
  const m = new Map([["ClaudeBot", "disallow"]]);
  assert.equal(selectionOf(m, "claudebOT"), "disallow");
});

test("share text mentions BOTRULES-020", () => {
  const zh = buildShareText(bots, applyPreset("block-all", bots), "zh");
  const en = buildShareText(bots, applyPreset("allow-all", bots), "en");
  assert.match(zh, /用 BOTRULES-020 生成了 AI robots\.txt/);
  assert.match(en, /BOTRULES-020/);
  assert.match(zh, /https:\/\/build-100.com\/020\//);
});

test("countActions and listedAgents see block-all size", () => {
  const sel = applyPreset("block-all", bots);
  const tallies = countActions(bots, sel);
  assert.equal(tallies.disallow, list.length);
  assert.equal(tallies.allow, 0);
  const agents = listedAgents(buildRobots(bots, sel));
  assert.equal(agents.includes("*"), false);
  assert.equal(agents.length, list.length);
});

test("blocks are separated by a blank line", () => {
  const out = buildRobots(bots, { GPTBot: "disallow", ClaudeBot: "disallow" });
  assert.match(out, /User-agent: GPTBot\nDisallow: \/\n\nUser-agent: ClaudeBot\nDisallow: \//);
});
