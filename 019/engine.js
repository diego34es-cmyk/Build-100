/** OGCARD-019 — paste meta, preview share cards. Pure functions, no DOM. */

export const STORAGE_KEY = "ogcard-019";
export const DEBOUNCE_MS = 80;

export const SAMPLE_HEAD = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <!-- 注释里的 meta 应被忽略：<meta property="og:title" content="NOPE"> -->
  <title>Launch &amp; Share</title>
  <meta name="description" content="A launch post for the local preview tool.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="See the share card before you post">
  <meta property="og:description" content="Paste meta, preview X / Slack / LinkedIn locally.">
  <meta property="og:url" content="https://example.com/launch">
  <meta property="og:site_name" content="Example">
  <meta property="og:image" content="https://example.com/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="628">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="See the share card before you post">
  <meta name="twitter:description" content="Paste meta, preview locally.">
  <meta name="twitter:image" content="https://example.com/og.png">
  <meta name="twitter:site" content="@example">
  <link rel="image_src" href="https://example.com/og.png">
</head>
</html>
`;

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
};

export function decodeEntities(s) {
  if (s == null) return "";
  return String(s).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (full, body) => {
    if (body[0] === "#") {
      const hex = body[1] === "x" || body[1] === "X";
      const code = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return full;
      try {
        return String.fromCodePoint(code);
      } catch {
        return full;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : full;
  });
}

function stripComments(html) {
  return String(html ?? "").replace(/<!--[\s\S]*?-->/g, "");
}

function parseAttrs(raw) {
  const attrs = {};
  const s = String(raw || "");
  let i = 0;
  const n = s.length;
  while (i < n) {
    while (i < n && /[\s/]/.test(s[i])) i++;
    if (i >= n) break;
    const kStart = i;
    while (i < n && /[^\s=<>/]/.test(s[i])) i++;
    if (i === kStart) {
      i++;
      continue;
    }
    const key = s.slice(kStart, i).toLowerCase();
    while (i < n && /\s/.test(s[i])) i++;
    let val = "";
    if (s[i] === "=") {
      i++;
      while (i < n && /\s/.test(s[i])) i++;
      if (s[i] === '"' || s[i] === "'") {
        const q = s[i++];
        const vStart = i;
        while (i < n && s[i] !== q) i++;
        val = s.slice(vStart, i);
        if (s[i] === q) i++;
      } else {
        const vStart = i;
        while (i < n && /[^\s>]/.test(s[i])) i++;
        val = s.slice(vStart, i);
      }
    }
    if (!(key in attrs)) attrs[key] = decodeEntities(val);
  }
  return attrs;
}

function skipQuotedGt(html, start) {
  const n = html.length;
  let i = start;
  let quote = null;
  while (i < n) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
    i++;
  }
  return n;
}

function scanTags(html) {
  const tags = [];
  const n = html.length;
  let i = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) break;
    let j = lt + 1;
    if (j >= n) break;
    const lead = html[j];
    if (lead === "!" || lead === "?") {
      const gt = html.indexOf(">", j);
      i = gt === -1 ? n : gt + 1;
      continue;
    }
    const closing = lead === "/";
    if (closing) j++;
    while (j < n && /\s/.test(html[j])) j++;
    const nameStart = j;
    while (j < n && /[A-Za-z0-9:-]/.test(html[j])) j++;
    const name = html.slice(nameStart, j).toLowerCase();
    if (!name) {
      i = lt + 1;
      continue;
    }
    const gt = skipQuotedGt(html, j);
    const attrsRaw = html.slice(j, gt);
    const end = gt < n ? gt + 1 : n;
    tags.push({ name, closing, attrsRaw, start: lt, end });
    if (!closing && (name === "script" || name === "style" || name === "noscript")) {
      const closeRe = new RegExp(`<\\/\\s*${name}\\s*>`, "i");
      const rest = html.slice(end);
      const m = closeRe.exec(rest);
      i = m ? end + m.index + m[0].length : n;
      continue;
    }
    i = end;
  }
  return tags;
}

function relTokens(rel) {
  return String(rel || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

export function isRelativeUrl(u) {
  if (u == null) return false;
  const s = String(u).trim();
  if (!s) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return false;
  if (s.startsWith("//")) return false;
  return true;
}

export function isValidImageUrl(u) {
  const s = String(u || "").trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^data:/i.test(s)) return true;
  return false;
}

export function safeImgSrc(image, imageMode) {
  const s = String(image || "");
  if (imageMode !== "data") return "";
  if (!/^data:image\//i.test(s)) return "";
  if (/[\s]/.test(s)) return "";
  return s;
}

export function hostnameOf(url) {
  const s = String(url || "").trim();
  const m = s.match(/^https?:\/\/([^/#?]+)/i);
  if (!m) return "";
  return m[1].replace(/^www\./i, "");
}

function coerce(input) {
  if (!input || typeof input !== "object") {
    return { og: {}, twitter: {}, title: "", description: "", imageSrc: "" };
  }
  const src = input.fields && typeof input.fields === "object" && (input.og || input.fields.og)
    ? { ...input, ...input.fields, og: input.og || input.fields.og, twitter: input.twitter || input.fields.twitter }
    : input;
  const og = { ...(src.og || {}) };
  const twitter = { ...(src.twitter || {}) };
  if (!src.og) {
    for (const [k, v] of Object.entries(src)) {
      if (k.startsWith("og:") && og[k.slice(3)] == null) og[k.slice(3)] = v;
      else if (k.startsWith("twitter:") && twitter[k.slice(8)] == null) twitter[k.slice(8)] = v;
    }
  }
  return {
    og,
    twitter,
    title: src.title || "",
    description: src.description || "",
    imageSrc: src.imageSrc || src.image_src || "",
  };
}

function pickFor(platform, parsed) {
  const p = String(platform || "").toLowerCase();
  const { og, twitter, title, description, imageSrc } = parsed;
  if (p === "x") {
    return {
      title: firstNonEmpty(twitter.title, og.title, title),
      description: firstNonEmpty(twitter.description, og.description, description),
      image: firstNonEmpty(
        twitter.image,
        twitter["image:src"],
        og.image,
        og["image:url"],
        og["image:secure_url"],
        imageSrc
      ),
      site: firstNonEmpty(hostnameOf(og.url), og.site_name, twitter.site, twitter.domain),
      url: firstNonEmpty(og.url, twitter.url),
    };
  }
  return {
    title: firstNonEmpty(og.title, title),
    description: firstNonEmpty(og.description, description),
    image: firstNonEmpty(og.image, og["image:url"], og["image:secure_url"], imageSrc),
    site: firstNonEmpty(og.site_name, hostnameOf(og.url)),
    url: firstNonEmpty(og.url),
  };
}

export function parseMeta(htmlOrMeta) {
  const og = {};
  const twitter = {};
  let title = "";
  let description = "";
  let imageSrc = "";

  const html = stripComments(htmlOrMeta);
  const tags = scanTags(html);

  for (let t = 0; t < tags.length; t++) {
    const tag = tags[t];
    if (tag.closing) continue;

    if (tag.name === "title") {
      if (title) continue;
      let closeIdx = -1;
      for (let k = t + 1; k < tags.length; k++) {
        if (tags[k].name === "title" && tags[k].closing) {
          closeIdx = k;
          break;
        }
      }
      const inner = closeIdx >= 0 ? html.slice(tag.end, tags[closeIdx].start) : "";
      title = decodeEntities(inner.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
      continue;
    }

    if (tag.name === "meta") {
      const a = parseAttrs(tag.attrsRaw);
      const key = firstNonEmpty(a.property, a.name).trim().toLowerCase();
      const content = a.content != null && a.content !== "" ? a.content : (a.value || "");
      if (!key) continue;
      if (key.startsWith("og:")) {
        const k = key.slice(3);
        if (!(k in og)) og[k] = content;
      } else if (key.startsWith("twitter:")) {
        const k = key.slice(8);
        if (!(k in twitter)) twitter[k] = content;
      } else if (key === "description") {
        if (!description) description = content;
      }
      continue;
    }

    if (tag.name === "link") {
      const a = parseAttrs(tag.attrsRaw);
      if (relTokens(a.rel).includes("image_src") && !imageSrc) {
        imageSrc = String(a.href || "").trim();
      }
    }
  }

  const fields = { og: { ...og }, twitter: { ...twitter }, title, description, imageSrc };
  return { og, twitter, title, description, imageSrc, fields };
}

export function checkMissing(fields) {
  const parsed = coerce(fields);
  const out = [];
  for (const platform of ["x", "slack", "linkedin"]) {
    const picked = pickFor(platform, parsed);
    if (!picked.title) {
      out.push({ platform, field: "title", reason: "missing" });
    }
    if (!picked.description) {
      out.push({ platform, field: "description", reason: "missing" });
    }
    if (!picked.image) {
      out.push({ platform, field: "image", reason: "missing" });
    } else if (isRelativeUrl(picked.image)) {
      out.push({ platform, field: "image", reason: "relative" });
    } else if (!isValidImageUrl(picked.image)) {
      out.push({ platform, field: "image", reason: "invalid" });
    }
    if (platform === "x") {
      const card = String(parsed.twitter.card || "").trim().toLowerCase();
      if (card === "player" || card === "app") {
        out.push({ platform, field: "card", reason: "unsupported" });
      }
    }
  }
  return out;
}

export function previewModel(platform, fields) {
  const p = String(platform || "").toLowerCase();
  const parsed = coerce(fields);
  const picked = pickFor(p, parsed);
  const warnings = [];
  const image = picked.image || "";
  let imageMode = "none";
  if (image) {
    if (/^data:image\//i.test(image)) imageMode = "data";
    else imageMode = "placeholder";
    if (isRelativeUrl(image)) warnings.push("relative-image");
    if (!isValidImageUrl(image)) warnings.push("invalid-image");
    if (/^javascript:/i.test(image) || /^vbscript:/i.test(image) || /^data:text\/html/i.test(image)) {
      if (!warnings.includes("invalid-image")) warnings.push("invalid-image");
    }
  }

  let cardType = "summary";
  if (p === "x") {
    const card = String(parsed.twitter.card || "").trim().toLowerCase();
    if (card === "summary" || card === "summary_large_image") {
      cardType = card;
    } else if (card === "player" || card === "app") {
      cardType = card;
      warnings.push("unsupported-card");
    } else {
      cardType = image ? "summary_large_image" : "summary";
    }
  } else if (p === "slack") {
    cardType = "unfurl";
  } else if (p === "linkedin") {
    cardType = "article";
  }

  return {
    title: picked.title,
    description: picked.description,
    image,
    imageMode,
    cardType,
    site: picked.site,
    warnings,
    imageWidth: firstNonEmpty(parsed.og["image:width"], parsed.twitter["image:width"]),
    imageHeight: firstNonEmpty(parsed.og["image:height"], parsed.twitter["image:height"]),
  };
}

export function buildShareText(lang = "zh") {
  return lang === "en"
    ? "Previewed a share card with OGCARD-019 — paste meta, preview X / Slack / LinkedIn locally. https://build-100.com/019/"
    : "用 OGCARD-019 预览了分享卡——粘贴 meta，本地看 X / Slack / LinkedIn。https://build-100.com/019/";
}

export function loadDraft(storage) {
  if (!storage || typeof storage.getItem !== "function") return "";
  try {
    const v = storage.getItem(STORAGE_KEY);
    return v == null ? "" : String(v);
  } catch {
    return "";
  }
}

export function saveDraft(text, storage) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(STORAGE_KEY, String(text ?? ""));
    return true;
  } catch {
    return false;
  }
}
