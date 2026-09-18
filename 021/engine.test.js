import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  STORAGE_KEY,
  DOWNLOAD_NAME,
  emptyDoc,
  normalizeDoc,
  formatLink,
  buildLlms,
  parseLlms,
  applyPreset,
  loadDraft,
  saveDraft,
  buildShareText,
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

test("storage key and download name", () => {
  assert.equal(STORAGE_KEY, "llmstxt-021");
  assert.equal(DOWNLOAD_NAME, "llms.txt");
});

test("engine is DOM-free", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(/document\.|innerHTML|window\./.test(src), false);
});

test("formatLink drops empty title/url; keeps note", () => {
  assert.equal(formatLink({ title: "", url: "https://x" }), null);
  assert.equal(formatLink({ title: "A", url: "" }), null);
  assert.equal(formatLink({ title: "A", url: "https://x" }), "- [A](https://x)");
  assert.equal(
    formatLink({ title: "A", url: "https://x", note: "note" }),
    "- [A](https://x): note"
  );
});

test("buildLlms order: H1 → summary → details → sections → Optional → extras", () => {
  const text = buildLlms({
    title: "Docs",
    summary: "A map.",
    details: "Start here.",
    sections: [
      {
        name: "Docs",
        links: [{ title: "Home", url: "https://example.com/", note: "" }],
      },
    ],
    optionalEnabled: true,
    optionalLinks: [{ title: "Change", url: "https://example.com/c", note: "" }],
    extras: "### Extra\n\nkeep me",
  });
  assert.equal(
    text,
    [
      "# Docs",
      "",
      "> A map.",
      "",
      "Start here.",
      "",
      "## Docs",
      "",
      "- [Home](https://example.com/)",
      "",
      "## Optional",
      "",
      "- [Change](https://example.com/c)",
      "",
      "### Extra",
      "",
      "keep me",
      "",
    ].join("\n")
  );
});

test("section named Optional collides into Optional bucket", () => {
  const text = buildLlms({
    title: "X",
    sections: [
      {
        name: "Optional",
        links: [{ title: "A", url: "https://a.example/", note: "" }],
      },
    ],
    optionalEnabled: false,
    optionalLinks: [],
  });
  assert.match(text, /## Optional\n\n- \[A\]\(https:\/\/a\.example\/\)\n/);
  assert.equal((text.match(/## Optional/g) || []).length, 1);
});

test("parseLlms always returns {doc, extras}; round-trips core fields", () => {
  const src = [
    "# Title",
    "",
    "> Sum",
    "",
    "Details here.",
    "",
    "## Docs",
    "",
    "- [Home](https://example.com/): note",
    "",
    "## Optional",
    "",
    "- [Opt](https://example.com/opt)",
    "",
    "### Leftover",
    "",
    "tail",
    "",
  ].join("\n");
  const { doc, extras } = parseLlms(src);
  assert.equal(doc.title, "Title");
  assert.equal(doc.summary, "Sum");
  assert.equal(doc.details, "Details here.");
  assert.equal(doc.sections.length, 1);
  assert.equal(doc.sections[0].name, "Docs");
  assert.equal(doc.sections[0].links[0].title, "Home");
  assert.equal(doc.sections[0].links[0].note, "note");
  assert.equal(doc.optionalEnabled, true);
  assert.equal(doc.optionalLinks[0].title, "Opt");
  assert.match(extras, /### Leftover/);
  assert.match(extras, /tail/);
  const rebuilt = buildLlms(doc, extras);
  assert.match(rebuilt, /^# Title\n/);
  assert.match(rebuilt, /> Sum/);
  assert.match(rebuilt, /## Docs/);
  assert.match(rebuilt, /## Optional/);
  assert.match(rebuilt, /### Leftover/);
});

test("applyPreset docs / personal", () => {
  const docs = applyPreset("docs");
  assert.equal(docs.title, "Docs");
  assert.ok(docs.sections.length >= 1);
  assert.equal(docs.optionalEnabled, true);
  const me = applyPreset("个人站");
  assert.equal(me.title, "Your Name");
  assert.equal(applyPreset("nope").title, "");
});

test("draft round-trip via storage", () => {
  const store = mem();
  const doc = normalizeDoc({
    title: "T",
    summary: "S",
    sections: [{ name: "A", links: [{ title: "L", url: "https://l/", note: "" }] }],
  });
  assert.equal(saveDraft(doc, store), true);
  const loaded = loadDraft(store);
  assert.equal(loaded.title, "T");
  assert.equal(loaded.sections[0].links[0].url, "https://l/");
  assert.equal(loadDraft(mem()), null);
  assert.equal(emptyDoc().title, "");
});

test("buildShareText bilingual", () => {
  const doc = {
    title: "Docs",
    sections: [
      {
        name: "Docs",
        links: [
          { title: "A", url: "https://a/", note: "" },
          { title: "B", url: "https://b/", note: "" },
        ],
      },
    ],
    optionalEnabled: false,
    optionalLinks: [],
  };
  const zh = buildShareText(doc, "zh");
  const en = buildShareText(doc, "en");
  assert.match(zh, /LLMSTXT-021/);
  assert.match(zh, /1 个分区/);
  assert.match(zh, /2 条链接/);
  assert.match(en, /1 sections/);
  assert.match(en, /2 links/);
  assert.match(en, /https:\/\/build-100\.com\/021\//);
});
