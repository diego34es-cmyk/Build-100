import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  STORAGE_KEY,
  DEBOUNCE_MS,
  SAMPLE_HEAD,
  parseMeta,
  checkMissing,
  isRelativeUrl,
  isValidImageUrl,
  previewModel,
  decodeEntities,
  safeImgSrc,
  buildShareText,
  loadDraft,
  saveDraft,
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
  assert.equal(STORAGE_KEY, "ogcard-019");
  assert.ok(DEBOUNCE_MS >= 80);
});

test("engine is DOM-free: no DOMParser / innerHTML / document / window", () => {
  const src = readFileSync(join(here, "engine.js"), "utf8");
  assert.equal(/DOMParser/.test(src), false);
  assert.equal(/innerHTML/.test(src), false);
  assert.equal(/\bdocument\./.test(src), false);
  assert.equal(/\bwindow\./.test(src), false);
});

test("complete head: og + twitter + title + image_src; no missing title/image", () => {
  const parsed = parseMeta(SAMPLE_HEAD);
  assert.equal(parsed.title, "Launch & Share");
  assert.equal(parsed.og.title, "See the share card before you post");
  assert.equal(parsed.og.image, "https://example.com/og.png");
  assert.equal(parsed.og["image:width"], "1200");
  assert.equal(parsed.og["image:height"], "628");
  assert.equal(parsed.twitter.card, "summary_large_image");
  assert.equal(parsed.twitter.image, "https://example.com/og.png");
  assert.equal(parsed.description, "A launch post for the local preview tool.");
  assert.equal(parsed.imageSrc, "https://example.com/og.png");
  assert.equal(parsed.fields.og.title, parsed.og.title);
  const miss = checkMissing(parsed.fields);
  assert.equal(miss.length, 0);
  const x = previewModel("x", parsed.fields);
  assert.equal(x.cardType, "summary_large_image");
  assert.equal(x.title, "See the share card before you post");
  assert.equal(x.imageMode, "placeholder");
  const slack = previewModel("slack", parsed.fields);
  assert.equal(slack.title, "See the share card before you post");
  assert.equal(slack.cardType, "unfurl");
});

test("comments are stripped; commented meta does not win", () => {
  const html = `
    <!-- <meta property="og:title" content="NOPE"> -->
    <meta property="og:title" content="Yep">
  `;
  const parsed = parseMeta(html);
  assert.equal(parsed.og.title, "Yep");
});

test("twitter-only fills X, not Slack / LinkedIn", () => {
  const html = `
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Only TW">
    <meta name="twitter:description" content="tw desc">
    <meta name="twitter:image" content="https://example.com/t.png">
  `;
  const parsed = parseMeta(html);
  const x = previewModel("x", parsed.fields);
  assert.equal(x.title, "Only TW");
  assert.equal(x.description, "tw desc");
  assert.equal(x.image, "https://example.com/t.png");
  assert.equal(x.cardType, "summary");
  const slack = previewModel("slack", parsed.fields);
  const li = previewModel("linkedin", parsed.fields);
  assert.equal(slack.title, "");
  assert.equal(slack.image, "");
  assert.equal(li.title, "");
  const miss = checkMissing(parsed.fields);
  assert.equal(miss.some((m) => m.platform === "x" && m.field === "title"), false);
  assert.equal(miss.some((m) => m.platform === "x" && m.field === "image"), false);
  assert.ok(miss.some((m) => m.platform === "slack" && m.field === "title" && m.reason === "missing"));
  assert.ok(miss.some((m) => m.platform === "linkedin" && m.field === "title" && m.reason === "missing"));
  assert.ok(miss.some((m) => m.platform === "slack" && m.field === "image" && m.reason === "missing"));
});

test("relative image is flagged; no base join", () => {
  const html = `
    <meta property="og:title" content="Rel">
    <meta property="og:description" content="desc">
    <meta property="og:image" content="/images/og.png">
  `;
  const parsed = parseMeta(html);
  assert.equal(isRelativeUrl(parsed.og.image), true);
  const miss = checkMissing(parsed.fields);
  assert.ok(miss.some((m) => m.platform === "slack" && m.field === "image" && m.reason === "relative"));
  assert.ok(miss.some((m) => m.platform === "linkedin" && m.field === "image" && m.reason === "relative"));
  const slack = previewModel("slack", parsed.fields);
  assert.equal(slack.image, "/images/og.png");
  assert.equal(slack.imageMode, "placeholder");
  assert.ok(slack.warnings.includes("relative-image"));
  assert.equal(safeImgSrc(slack.image, slack.imageMode), "");
});

test("missing title and image listed per platform", () => {
  const parsed = parseMeta(`<meta name="description" content="only desc">`);
  const miss = checkMissing(parsed.fields);
  for (const platform of ["x", "slack", "linkedin"]) {
    assert.ok(miss.some((m) => m.platform === platform && m.field === "title" && m.reason === "missing"));
    assert.ok(miss.some((m) => m.platform === platform && m.field === "image" && m.reason === "missing"));
  }
  const x = previewModel("x", parsed.fields);
  assert.equal(x.title, "");
  assert.equal(x.imageMode, "none");
});

test("HTML-escaped attributes; attribute order does not matter", () => {
  const html = `
    <meta content="Tom &amp; Jerry" property="og:title">
    <meta name="twitter:title" content="A &quot;quote&quot; &lt;tag&gt;">
    <link href="https://example.com/from-link.png" rel="image_src">
  `;
  const parsed = parseMeta(html);
  assert.equal(parsed.og.title, "Tom & Jerry");
  assert.equal(parsed.twitter.title, `A "quote" <tag>`);
  assert.equal(parsed.imageSrc, "https://example.com/from-link.png");
});

test("entity decoding: named + decimal + hex", () => {
  assert.equal(
    decodeEntities(`A &amp; B &lt;C&gt; &quot;d&quot; &apos;e&apos; &#65; &#x42;`),
    `A & B <C> "d" 'e' A B`
  );
  const html = `<title>A &#x3C;B&#62; &amp; C</title>`;
  assert.equal(parseMeta(html).title, "A <B> & C");
});

test("same name takes the first occurrence", () => {
  const html = `
    <meta property="og:title" content="First">
    <meta property="og:title" content="Second">
    <meta property="og:image" content="https://example.com/a.png">
    <meta property="og:image" content="https://example.com/b.png">
    <title>Title One</title>
    <title>Title Two</title>
  `;
  const parsed = parseMeta(html);
  assert.equal(parsed.og.title, "First");
  assert.equal(parsed.og.image, "https://example.com/a.png");
  assert.equal(parsed.title, "Title One");
});

test("http image stays placeholder; never a safe img src", () => {
  const html = `
    <meta property="og:title" content="HTTP img">
    <meta property="og:image" content="https://example.com/a.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="628">
  `;
  const parsed = parseMeta(html);
  const x = previewModel("x", parsed.fields);
  assert.equal(x.imageMode, "placeholder");
  assert.equal(x.image, "https://example.com/a.png");
  assert.equal(x.imageWidth, "1200");
  assert.equal(x.imageHeight, "628");
  assert.equal(safeImgSrc(x.image, x.imageMode), "");
  const proto = previewModel(
    "slack",
    parseMeta(`<meta property="og:image" content="//cdn.example.com/a.png">`).fields
  );
  assert.equal(proto.imageMode, "placeholder");
  assert.equal(safeImgSrc(proto.image, proto.imageMode), "");
});

test("data:image may enter img model; javascript: is invalid", () => {
  const gif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const dataParsed = parseMeta(`<meta property="og:image" content="${gif}"><meta property="og:title" content="D">`);
  const m = previewModel("slack", dataParsed.fields);
  assert.equal(m.imageMode, "data");
  assert.equal(safeImgSrc(m.image, m.imageMode), gif);

  const bad = parseMeta(`
    <meta property="og:title" content="xss">
    <meta property="og:description" content="d">
    <meta property="og:image" content="javascript:alert(1)">
  `);
  const miss = checkMissing(bad.fields);
  assert.ok(miss.some((x) => x.field === "image" && x.reason === "invalid"));
  const xm = previewModel("x", bad.fields);
  assert.equal(xm.imageMode, "placeholder");
  assert.ok(xm.warnings.includes("invalid-image"));
  assert.equal(safeImgSrc(xm.image, xm.imageMode), "");
});

test("isRelativeUrl / isValidImageUrl", () => {
  assert.equal(isRelativeUrl("/img.png"), true);
  assert.equal(isRelativeUrl("img.png"), true);
  assert.equal(isRelativeUrl("./x.png"), true);
  assert.equal(isRelativeUrl("https://x.com/a.png"), false);
  assert.equal(isRelativeUrl("http://x.com/a.png"), false);
  assert.equal(isRelativeUrl("data:image/png;base64,xx"), false);
  assert.equal(isRelativeUrl("//cdn.com/a.png"), false);
  assert.equal(isRelativeUrl("javascript:alert(1)"), false);
  assert.equal(isRelativeUrl(""), false);
  assert.equal(isValidImageUrl("https://x.com/a.png"), true);
  assert.equal(isValidImageUrl("http://x.com/a.png"), true);
  assert.equal(isValidImageUrl("data:image/png;base64,xx"), true);
  assert.equal(isValidImageUrl("/img.png"), false);
  assert.equal(isValidImageUrl("javascript:alert(1)"), false);
  assert.equal(isValidImageUrl("//cdn.com/a.png"), false);
});

test("twitter:card player/app marked unsupported; property=twitter works", () => {
  const html = `
    <meta property="twitter:card" content="player">
    <meta property="twitter:title" content="Vid">
    <meta property="twitter:description" content="clip">
    <meta property="twitter:image" content="https://example.com/v.png">
  `;
  const parsed = parseMeta(html);
  assert.equal(parsed.twitter.card, "player");
  const x = previewModel("x", parsed.fields);
  assert.equal(x.cardType, "player");
  assert.ok(x.warnings.includes("unsupported-card"));
  const miss = checkMissing(parsed.fields);
  assert.ok(miss.some((m) => m.platform === "x" && m.field === "card" && m.reason === "unsupported"));
});

test("og fallbacks for X when twitter fields absent", () => {
  const html = `
    <title>Doc Title</title>
    <meta name="description" content="Doc desc">
    <meta property="og:title" content="OG Title">
    <meta property="og:description" content="OG desc">
    <meta property="og:image" content="https://example.com/og.png">
  `;
  const x = previewModel("x", parseMeta(html).fields);
  assert.equal(x.title, "OG Title");
  assert.equal(x.description, "OG desc");
  assert.equal(x.image, "https://example.com/og.png");
});

test("title / description / image_src fallbacks when og empty (Slack)", () => {
  const html = `
    <title>Bare Title</title>
    <meta name="description" content="Bare desc">
    <link rel="image_src" href="https://example.com/src.png">
  `;
  const parsed = parseMeta(html);
  const slack = previewModel("slack", parsed.fields);
  assert.equal(slack.title, "Bare Title");
  assert.equal(slack.description, "Bare desc");
  assert.equal(slack.image, "https://example.com/src.png");
  const miss = checkMissing(parsed.fields);
  assert.equal(miss.some((m) => m.field === "title"), false);
  assert.equal(miss.some((m) => m.field === "image"), false);
});

test("draft round-trip uses ogcard-019", () => {
  const store = mem();
  assert.equal(loadDraft(store), "");
  assert.equal(saveDraft("<meta>", store), true);
  assert.equal(store.getItem("ogcard-019"), "<meta>");
  assert.equal(loadDraft(store), "<meta>");
});

test("share text is a blurb, not user meta", () => {
  const zh = buildShareText("zh");
  const en = buildShareText("en");
  assert.match(zh, /OGCARD-019/);
  assert.match(en, /OGCARD-019/);
  assert.equal(zh.includes("og:title"), false);
  assert.equal(en.includes("javascript:"), false);
});

test("script bodies are not scanned for meta/title", () => {
  const html = `
    <script><title>Hacked</title><meta property="og:title" content="Nope"></script>
    <title>Real</title>
    <meta property="og:title" content="Yes">
  `;
  const parsed = parseMeta(html);
  assert.equal(parsed.title, "Real");
  assert.equal(parsed.og.title, "Yes");
});

test("newlines and mixed-case tags still parse", () => {
  const html = `
    <META
      Property="og:title"
      Content="Break">
    <Title>T</Title>
  `;
  const parsed = parseMeta(html);
  assert.equal(parsed.og.title, "Break");
  assert.equal(parsed.title, "T");
});
