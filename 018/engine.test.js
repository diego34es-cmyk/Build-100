import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  STORAGE_KEY,
  DEBOUNCE_MS,
  scanText,
  cleanText,
  decodeTags,
  encodeTags,
  previewSegments,
  sampleTrojanSource,
  sampleTagWatermark,
  buildShareText,
  loadPrefs,
  savePrefs,
  formatCodePoint,
  forEachCodePoint,
} from "./engine.js";

const here = dirname(fileURLToPath(import.meta.url));

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

test("storage key and debounce floor", () => {
  assert.equal(STORAGE_KEY, "unhide-018");
  assert.ok(DEBOUNCE_MS >= 80);
});

test("engine is DOM-free", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(/document\.|innerHTML|window\./.test(src), false);
});

test("ZWSP is found and stripped; UTF-16 index", () => {
  const s = "ab\u200Bcd";
  const r = scanText(s);
  assert.equal(r.counts.zeroWidth, 1);
  assert.equal(r.counts.bidi, 0);
  assert.equal(r.counts.tag, 0);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].index, 2);
  assert.equal(r.findings[0].length, 1);
  assert.equal(r.findings[0].codePoint, 0x200b);
  assert.equal(r.findings[0].category, "zeroWidth");
  assert.equal(r.findings[0].label, "ZWSP");
  assert.equal(r.cleaned, "abcd");
  assert.equal(cleanText(s), "abcd");
});

test("WJ / BOM / soft hyphen strip; ZWNJ marked but kept", () => {
  assert.equal(cleanText("a\uFEFFb\u2060c\u00ADd"), "abcd");
  const zwnj = "a\u200Cb";
  const r = scanText(zwnj);
  assert.equal(r.counts.zeroWidth, 1);
  assert.equal(r.findings[0].codePoint, 0x200c);
  assert.equal(cleanText(zwnj), zwnj);
});

test("Tag sequence hello decodes; non-BMP length=2", () => {
  const hello = encodeTags("hello");
  assert.equal(decodeTags(hello), "hello");
  const r = scanText(hello);
  assert.equal(r.counts.tag, 7); // begin + 5 letters + cancel
  assert.equal(r.tagDecoded, "hello");
  const payload = encodeTags("hello", { bounded: false });
  assert.equal(decodeTags(payload), "hello");
  const embedded = "aaa" + hello + "bbb";
  assert.equal(decodeTags(embedded), "hello");
  const tagged = "x" + String.fromCodePoint(0xe0068);
  const one = scanText(tagged);
  assert.equal(one.findings[0].index, 1);
  assert.equal(one.findings[0].length, 2);
  assert.equal(one.findings[0].codePoint, 0xe0068);
  assert.equal(one.findings[0].category, "tag");
  assert.equal(cleanText(tagged), "x");
});

test("decodeTags returns null when nothing to assemble", () => {
  assert.equal(decodeTags(""), null);
  assert.equal(decodeTags("hello"), null);
  assert.equal(decodeTags(null), null);
  assert.equal(decodeTags(String.fromCodePoint(0xe0001, 0xe007f)), null);
});

test("all listed zero-width and bidi code points", () => {
  const zw = [0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad];
  const bidi = [0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
  const s =
    "x" +
    zw.map((cp) => String.fromCodePoint(cp)).join("") +
    bidi.map((cp) => String.fromCodePoint(cp)).join("") +
    "y";
  const r = scanText(s);
  assert.equal(r.counts.zeroWidth, 6);
  assert.equal(r.counts.bidi, 11);
  assert.equal(cleanText(s), "x\u200C\u200Dy");
});

test("Bidi RLO / LRI found and stripped", () => {
  const s = 'if (role !== "user\u202E \u2066admin") {';
  const r = scanText(s);
  assert.equal(r.counts.bidi, 2);
  const cps = r.findings.map((f) => f.codePoint);
  assert.ok(cps.includes(0x202e));
  assert.ok(cps.includes(0x2066));
  assert.equal(cleanText(s).includes("\u202E"), false);
  assert.equal(cleanText(s).includes("\u2066"), false);
  assert.equal(cleanText(s).includes("admin"), true);
});

test("mixed Latin/Cyrillic flags homoglyph; default keeps; strip option maps to ASCII", () => {
  const s = "p\u0430ypal"; // p + Cyrillic а + ypal
  const r = scanText(s);
  assert.equal(r.counts.confusable, 1);
  assert.equal(r.findings[0].category, "confusable");
  assert.equal(r.findings[0].codePoint, 0x0430);
  assert.equal(r.confusableKept, true);
  assert.equal(cleanText(s), s);
  assert.equal(cleanText(s, {}), s);
  assert.equal(cleanText(s, { stripConfusables: true }), "paypal");
});

test("pure Russian is not flagged and not rewritten", () => {
  const ru = "\u043F\u0440\u0438\u0432\u0435\u0442"; // привет (contains е)
  const r = scanText(ru);
  assert.equal(r.counts.confusable, 0);
  assert.equal(r.findings.length, 0);
  assert.equal(cleanText(ru, { stripConfusables: true }), ru);
});

test("emoji ZWJ sequence is marked but kept by default clean", () => {
  const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}";
  const r = scanText(family);
  assert.equal(r.counts.zeroWidth, 3);
  assert.ok(r.findings.every((f) => f.codePoint === 0x200d));
  assert.equal(cleanText(family), family);
  assert.equal(r.cleaned, family);
});

test("clean default vs stripConfusables together with ZWSP and Tag", () => {
  const mixed = "OK \u0430" + "\u200B" + encodeTags("hi");
  const r = scanText(mixed);
  assert.ok(r.counts.zeroWidth >= 1);
  assert.ok(r.counts.tag >= 1);
  assert.equal(r.counts.confusable, 1);
  const def = cleanText(mixed);
  assert.equal(def.includes("\u200B"), false);
  assert.equal(decodeTags(def), null);
  assert.equal(def.includes("\u0430"), true);
  const stripped = cleanText(mixed, { stripConfusables: true });
  assert.equal(stripped.includes("\u0430"), false);
  assert.equal(stripped.includes("a"), true);
});

test("scan iterates code points not UTF-16 units (tag after emoji)", () => {
  const s = "\u{1F600}" + String.fromCodePoint(0xe0068);
  const r = scanText(s);
  assert.equal(r.findings[0].index, 2);
  assert.equal(r.findings[0].length, 2);
  let n = 0;
  forEachCodePoint(s, () => {
    n += 1;
  });
  assert.equal(n, 2);
});

test("preview replaces bidi/zero-width/tag; does not wrap every char", () => {
  const s = "A\u202EB\u200BC" + String.fromCodePoint(0xe0068) + "D";
  const r = scanText(s);
  const segs = previewSegments(s, r.findings);
  const findingSegs = segs.filter((x) => x.type === "finding");
  const textSegs = segs.filter((x) => x.type === "text");
  assert.equal(findingSegs.length, r.findings.length);
  assert.ok(textSegs.length >= 1);
  const blob = segs.map((x) => x.text).join("");
  assert.equal(blob.includes("\u202E"), false);
  assert.equal(blob.includes("\u200B"), false);
  assert.equal(blob.includes(String.fromCodePoint(0xe0068)), false);
  assert.ok(blob.includes("A"));
  assert.ok(blob.includes("B"));
  assert.ok(blob.includes("C"));
  assert.ok(blob.includes("D"));
  const conf = scanText("p\u0430ypal");
  const cSegs = previewSegments("p\u0430ypal", conf.findings);
  const marked = cSegs.find((x) => x.type === "finding");
  assert.equal(marked.text, "\u0430");
});

test("samples use escapes and contain the intended controls", () => {
  const trojan = sampleTrojanSource();
  assert.ok(trojan.includes("\u202E"));
  assert.ok(trojan.includes("\u2066"));
  assert.ok(trojan.includes("\u200B"));
  const mark = sampleTagWatermark();
  assert.equal(decodeTags(mark), "hello");
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(src.includes("\u202E"), false);
  assert.equal(src.includes(String.fromCodePoint(0xe0068)), false);
});

test("share text is a blurb and never embeds the user payload", () => {
  const secret = "UNIQUE_USER_PAYLOAD_918273";
  const text = buildShareText(scanText(secret + "\u200B").counts, "zh");
  assert.equal(text.includes(secret), false);
  assert.ok(text.includes("UNHIDE-018"));
  assert.ok(text.includes("揭开隐形字"));
  const en = buildShareText({ zeroWidth: 1, tag: 2, bidi: 3, confusable: 4 }, "en");
  assert.ok(en.includes("zero-width 1"));
  assert.ok(en.includes("Tag 2"));
});

test("prefs persist stripConfusables only", () => {
  const s = mem();
  assert.equal(loadPrefs(s).stripConfusables, false);
  savePrefs(s, { stripConfusables: true, text: "do-not-store" });
  const raw = s.getItem(STORAGE_KEY);
  assert.equal(JSON.parse(raw).stripConfusables, true);
  assert.equal(JSON.stringify(JSON.parse(raw)).includes("do-not-store"), false);
  assert.equal(loadPrefs(s).stripConfusables, true);
});

test("null / empty scan", () => {
  const r = scanText("");
  assert.deepEqual(r.counts, { zeroWidth: 0, bidi: 0, tag: 0, confusable: 0 });
  assert.equal(r.cleaned, "");
  assert.equal(r.tagDecoded, null);
  assert.equal(scanText(null).cleaned, "");
  assert.equal(formatCodePoint(0x200b), "U+200B");
  assert.equal(formatCodePoint(0xe0068), "U+E0068");
});

test("html source does not contain raw invisible chars", () => {
  const html = readFileSync(join(here, "index.html"), "utf8");
  const banned = [0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad, 0x202e, 0x202d, 0x2066, 0x2067];
  for (const cp of banned) {
    assert.equal(html.includes(String.fromCodePoint(cp)), false, "html has U+" + cp.toString(16));
  }
  assert.equal(html.includes(String.fromCodePoint(0xe0068)), false);
  assert.ok(html.includes('lang="zh-CN"'));
  assert.ok(html.includes("UNHIDE-018 · 粘贴前揭隐形字"));
  assert.ok(html.includes("id=\"langBtn\""));
  assert.ok(html.includes("/beacon.js"));
  assert.ok(html.includes("--accent: #22d3ee"));
});
