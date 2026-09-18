/** LLMSTXT-021 — llms.txt builder. Pure functions, no DOM. */

export const STORAGE_KEY = "llmstxt-021";
export const DOWNLOAD_NAME = "llms.txt";

function isOptionalName(name) {
  return String(name ?? "").trim().toLowerCase() === "optional";
}

function asLink(raw) {
  if (!raw || typeof raw !== "object") return { title: "", url: "", note: "" };
  return {
    title: String(raw.title ?? ""),
    url: String(raw.url ?? ""),
    note: String(raw.note ?? ""),
  };
}

function asLinks(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(asLink);
}

function asSections(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => ({
    name: String(s?.name ?? ""),
    links: asLinks(s?.links),
  }));
}

export function emptyDoc() {
  return {
    title: "",
    summary: "",
    details: "",
    sections: [],
    optionalEnabled: false,
    optionalLinks: [],
    extras: "",
  };
}

export function normalizeDoc(doc) {
  const d = emptyDoc();
  if (!doc || typeof doc !== "object") return d;
  d.title = String(doc.title ?? "");
  d.summary = String(doc.summary ?? "");
  d.details = String(doc.details ?? "");
  d.sections = asSections(doc.sections);
  d.optionalEnabled = Boolean(doc.optionalEnabled);
  d.optionalLinks = asLinks(doc.optionalLinks);
  d.extras = String(doc.extras ?? "");
  return d;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function flattenLine(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function trimBlock(s) {
  return String(s ?? "").replace(/^\s+|\s+$/g, "");
}

export function formatLink(link) {
  const title = String(link?.title ?? "").trim();
  const url = String(link?.url ?? "").trim();
  if (!title || !url) return null;
  const note = String(link?.note ?? "").trim();
  if (note) return `- [${title}](${url}): ${note}`;
  return `- [${title}](${url})`;
}

function formatLinks(links) {
  const out = [];
  for (const l of asLinks(links)) {
    const line = formatLink(l);
    if (line) out.push(line);
  }
  return out;
}

/**
 * Grammar (llmstxt.org):
 *   # Title
 *   > summary            (optional)
 *   details              (optional, no heading)
 *   ## Section           (zero or more; list of links)
 *   ## Optional          (at most one, last, links only)
 *   extras               (remaining markdown, as-is)
 * Blank line between blocks. File ends with \n.
 */
export function buildLlms(doc, extrasText) {
  const d = normalizeDoc(doc);
  const extras = extrasText !== undefined ? String(extrasText ?? "") : d.extras;

  const parts = [];
  const title = flattenLine(d.title);
  if (title) parts.push("# " + title);

  const summary = flattenLine(d.summary);
  if (summary) parts.push("> " + summary);

  const details = trimBlock(d.details);
  if (details) parts.push(details);

  const collided = [];
  for (const section of d.sections) {
    const name = String(section.name ?? "").trim();
    const links = formatLinks(section.links);
    if (!name || !links.length) continue;
    if (isOptionalName(name)) {
      collided.push(...links);
      continue;
    }
    parts.push("## " + name + "\n\n" + links.join("\n"));
  }

  const optionalLines = [];
  if (d.optionalEnabled) optionalLines.push(...formatLinks(d.optionalLinks));
  optionalLines.push(...collided);
  if (optionalLines.length) {
    parts.push("## Optional\n\n" + optionalLines.join("\n"));
  }

  const extra = trimBlock(extras);
  if (extra) parts.push(extra);

  let out = parts.join("\n\n");
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

const LINK_RE = /^- \[([^\]]+)\]\((.*)\)(?:\s*:\s*(.*?))?\s*$/;

function parseLinkLine(line) {
  const m = String(line ?? "").trim().match(LINK_RE);
  if (!m) return null;
  const title = m[1].trim();
  const url = m[2].trim();
  if (!title || !url) return null;
  const note = (m[3] ?? "").trim();
  return { title, url, note };
}

function isFence(line) {
  return String(line ?? "").trim().startsWith("```");
}

function isH1(line) {
  return /^#(?!#)/.test(line) && String(line).replace(/^#\s*/, "").trim() !== "";
}

function isH2(line) {
  return /^##(?!#)/.test(line);
}

function isH3Plus(line) {
  return /^#{3,}/.test(line);
}

function h1Text(line) {
  return String(line).replace(/^#\s*/, "").trim();
}

function h2Text(line) {
  return String(line).replace(/^##\s*/, "").trim();
}

function skipFence(lines, i) {
  const n = lines.length;
  if (i >= n || !isFence(lines[i])) return i;
  i += 1;
  while (i < n && !isFence(lines[i])) i += 1;
  if (i < n) i += 1;
  return i;
}

function joinExtras(lines, consumed) {
  const extraIdx = [];
  for (let k = 0; k < lines.length; k++) {
    if (!consumed[k]) extraIdx.push(k);
  }
  while (extraIdx.length && !String(lines[extraIdx[0]]).trim()) extraIdx.shift();
  while (extraIdx.length && !String(lines[extraIdx[extraIdx.length - 1]]).trim()) extraIdx.pop();
  if (!extraIdx.length) return "";
  const parts = [];
  for (let n0 = 0; n0 < extraIdx.length; n0++) {
    const idx = extraIdx[n0];
    if (n0 > 0) {
      const gap = extraIdx[n0] - extraIdx[n0 - 1];
      parts.push(gap === 1 ? "\n" : "\n\n");
    }
    parts.push(lines[idx]);
  }
  return parts.join("");
}

/**
 * Always returns { doc, extras }. extras is leftover original markdown.
 * Best-effort: H1, following blockquote, details until first H2,
 * H2 link lists, ## Optional. YAML / H3 / fences / non-list → extras.
 */
export function parseLlms(text) {
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  const lines = src.split(/\r?\n/);
  const n = lines.length;
  const consumed = new Array(n).fill(false);
  const doc = emptyDoc();

  let i = 0;
  if (n && lines[0].trim() === "---") {
    let end = -1;
    for (let k = 1; k < n; k++) {
      if (lines[k].trim() === "---") {
        end = k;
        break;
      }
    }
    if (end >= 0) i = end + 1;
  }

  let h1Idx = -1;
  for (let k = i; k < n; k++) {
    if (isFence(lines[k])) {
      k = skipFence(lines, k) - 1;
      continue;
    }
    if (isH2(lines[k]) || isH3Plus(lines[k])) break;
    if (isH1(lines[k])) {
      h1Idx = k;
      break;
    }
  }
  if (h1Idx >= 0) {
    doc.title = h1Text(lines[h1Idx]);
    consumed[h1Idx] = true;
    i = h1Idx + 1;
  }

  while (i < n && !String(lines[i]).trim()) i += 1;

  if (i < n && /^\s*>/.test(lines[i])) {
    const bits = [];
    while (i < n && /^\s*>/.test(lines[i])) {
      consumed[i] = true;
      bits.push(lines[i].replace(/^\s*>\s?/, "").replace(/\s+$/g, ""));
      i += 1;
    }
    doc.summary = bits.join(" ").replace(/\s+/g, " ").trim();
  }

  while (i < n && !String(lines[i]).trim()) i += 1;

  const detailsLines = [];
  while (i < n && !isH2(lines[i])) {
    const line = lines[i];
    if (isFence(line)) {
      i = skipFence(lines, i);
      continue;
    }
    if (isH3Plus(line) || (isH1(line) && !isH2(line)) || parseLinkLine(line)) {
      i += 1;
      continue;
    }
    detailsLines.push(line);
    consumed[i] = true;
    i += 1;
  }
  while (detailsLines.length && !detailsLines[0].trim()) detailsLines.shift();
  while (detailsLines.length && !detailsLines[detailsLines.length - 1].trim()) detailsLines.pop();
  doc.details = detailsLines.join("\n");

  while (i < n) {
    if (!isH2(lines[i])) {
      i += 1;
      continue;
    }
    const name = h2Text(lines[i]);
    const headingIdx = i;
    i += 1;
    const linkItems = [];
    const linkIdxs = [];
    while (i < n && !isH2(lines[i])) {
      if (isFence(lines[i])) {
        i = skipFence(lines, i);
        continue;
      }
      if (isH3Plus(lines[i])) {
        i += 1;
        continue;
      }
      const link = parseLinkLine(lines[i]);
      if (link) {
        linkItems.push(link);
        linkIdxs.push(i);
      }
      i += 1;
    }
    if (!name || !linkItems.length) continue;
    consumed[headingIdx] = true;
    for (const idx of linkIdxs) consumed[idx] = true;
    if (isOptionalName(name)) {
      doc.optionalEnabled = true;
      doc.optionalLinks.push(...linkItems);
    } else {
      doc.sections.push({ name, links: linkItems });
    }
  }

  const extras = joinExtras(lines, consumed);
  doc.extras = extras;
  return { doc, extras };
}

const PRESETS = {
  docs: {
    title: "Docs",
    summary: "Documentation for this project.",
    details: "Start here. This file is a map of the docs for language models.",
    sections: [
      {
        name: "Docs",
        links: [
          { title: "Documentation", url: "https://example.com/docs", note: "Full documentation" },
          { title: "API reference", url: "https://example.com/api", note: "" },
        ],
      },
      {
        name: "Examples",
        links: [
          { title: "Quickstart", url: "https://example.com/quickstart", note: "Get running in minutes" },
        ],
      },
    ],
    optionalEnabled: true,
    optionalLinks: [{ title: "Changelog", url: "https://example.com/changelog", note: "" }],
    extras: "",
  },
  personal: {
    title: "Your Name",
    summary: "Personal site.",
    details: "",
    sections: [
      {
        name: "About",
        links: [{ title: "Home", url: "https://example.com/", note: "" }],
      },
      {
        name: "Writing",
        links: [{ title: "Blog", url: "https://example.com/blog", note: "Notes and essays" }],
      },
    ],
    optionalEnabled: false,
    optionalLinks: [],
    extras: "",
  },
};

export function applyPreset(name) {
  const key = String(name ?? "").trim().toLowerCase();
  if (key === "docs" || key === "doc" || key === "文档站" || key === "文档") {
    return normalizeDoc(clone(PRESETS.docs));
  }
  if (key === "personal" || key === "me" || key === "个人站" || key === "个人") {
    return normalizeDoc(clone(PRESETS.personal));
  }
  return emptyDoc();
}

export function loadDraft(storage) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeDoc(parsed);
  } catch {
    return null;
  }
}

export function saveDraft(doc, storage) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeDoc(doc)));
    return true;
  } catch {
    return false;
  }
}

export function buildShareText(doc, lang) {
  const d = normalizeDoc(doc);
  const en = lang === "en";
  const title = flattenLine(d.title) || (en ? "(untitled)" : "未命名");
  let nSec = 0;
  let nLinks = 0;
  for (const s of d.sections) {
    const name = String(s.name ?? "").trim();
    const links = formatLinks(s.links);
    if (!name || !links.length) continue;
    if (isOptionalName(name)) {
      nLinks += links.length;
      continue;
    }
    nSec += 1;
    nLinks += links.length;
  }
  if (d.optionalEnabled) nLinks += formatLinks(d.optionalLinks).length;
  const lines = en
    ? [
        "Generated llms.txt with LLMSTXT-021.",
        title + " · " + nSec + " sections · " + nLinks + " links.",
        "https://build-100.com/021/",
      ]
    : [
        "用 LLMSTXT-021 生成了 llms.txt",
        title + " · " + nSec + " 个分区 · " + nLinks + " 条链接。",
        "https://build-100.com/021/",
      ];
  return lines.join("\n");
}
