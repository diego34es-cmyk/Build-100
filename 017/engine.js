/** REDACT-017 — local mosaic. Pure functions, no DOM. */

export const DEFAULT_BLOCK_SIZE = 24;
export const MIN_BLOCK_SIZE = 16;
export const MAX_BLOCK_SIZE = 48;
export const DEFAULT_BRUSH_RADIUS = 16;
export const MIN_BRUSH_RADIUS = 4;
export const MAX_BRUSH_RADIUS = 80;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const DOWNLOAD_NAME = "redact-017.png";

export const MSG = {
  missing: { zh: "没有文件", en: "No file" },
  too_large: { zh: "文件超过 20MB", en: "File is larger than 20MB" },
  empty: { zh: "文件是空的", en: "File is empty" },
  svg: { zh: "不支持 SVG。请用 PNG / JPEG / WebP / GIF", en: "SVG is not supported. Use PNG / JPEG / WebP / GIF." },
  heic: { zh: "不支持 HEIC / HEIF。iPhone 请先导出 JPEG", en: "HEIC/HEIF is not supported. On iPhone, export JPEG first." },
  unsupported: { zh: "只接受 PNG / JPEG / WebP / GIF 静帧", en: "Only PNG / JPEG / WebP / GIF stills are accepted" },
};

const HEIF_BRANDS = new Set([
  "heic", "heix", "heif", "hevc", "hevx", "heim", "heis",
  "hevm", "hevs", "mif1", "msf1", "avci", "avcs",
]);

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function toU8(input) {
  if (input == null) return null;
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (typeof input === "string") {
    const out = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = input.charCodeAt(i) & 0xff;
    return out;
  }
  return null;
}

function asciiAt(u8, start, n) {
  const end = Math.min(u8.length, start + n);
  let s = "";
  for (let i = start; i < end; i++) s += String.fromCharCode(u8[i]);
  return s;
}

function startsWith(u8, i, s) {
  if (i + s.length > u8.length) return false;
  for (let k = 0; k < s.length; k++) {
    if (u8[i + k] !== s.charCodeAt(k)) return false;
  }
  return true;
}

function isJpeg(u8) {
  return u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xd8;
}

function isPng(u8) {
  return (
    u8.length >= 8 &&
    u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47 &&
    u8[4] === 0x0d && u8[5] === 0x0a && u8[6] === 0x1a && u8[7] === 0x0a
  );
}

function isGif(u8) {
  if (u8.length < 6) return false;
  if (!startsWith(u8, 0, "GIF8")) return false;
  return (u8[4] === 0x37 || u8[4] === 0x39) && u8[5] === 0x61;
}

function isWebp(u8) {
  return u8.length >= 12 && startsWith(u8, 0, "RIFF") && startsWith(u8, 8, "WEBP");
}

function isHeif(u8) {
  if (u8.length < 16) return false;
  if (!startsWith(u8, 4, "ftyp")) return false;
  const brands = [asciiAt(u8, 8, 4)];
  for (let i = 16; i + 4 <= Math.min(u8.length, 96); i += 4) {
    brands.push(asciiAt(u8, i, 4));
  }
  return brands.some((b) => HEIF_BRANDS.has(b.toLowerCase()));
}

function isSvg(u8) {
  if (!u8 || u8.length < 4) return false;
  let i = 0;
  if (u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) i = 3;
  while (i < u8.length && (u8[i] === 0x20 || u8[i] === 0x09 || u8[i] === 0x0a || u8[i] === 0x0d)) i++;
  const n = Math.min(u8.length - i, 256);
  let head = "";
  for (let k = 0; k < n; k++) {
    const c = u8[i + k];
    if (c === 0) break;
    head += String.fromCharCode(c);
  }
  head = head.toLowerCase();
  if (head.startsWith("<svg")) return true;
  if (head.includes("<svg")) return true;
  if (head.startsWith("<?xml") && head.includes("svg")) return true;
  return false;
}

/** @returns {string|null} mime from magic bytes */
export function detectMimeFromMagic(input) {
  const u8 = toU8(input);
  if (!u8 || u8.length < 2) return null;
  if (isPng(u8)) return "image/png";
  if (isJpeg(u8)) return "image/jpeg";
  if (isGif(u8)) return "image/gif";
  if (isWebp(u8)) return "image/webp";
  if (isHeif(u8)) return "image/heic";
  if (isSvg(u8)) return "image/svg+xml";
  return null;
}

function fail(reason) {
  const m = MSG[reason] || MSG.unsupported;
  return { ok: false, reason, code: reason, messageZh: m.zh, messageEn: m.en };
}

function nameOf(file) {
  return String(file && file.name != null ? file.name : "");
}

function typeOf(file) {
  return String(file && file.type != null ? file.type : "").toLowerCase();
}

function looksSvg(file) {
  const name = nameOf(file).toLowerCase();
  const type = typeOf(file);
  return type === "image/svg+xml" || type === "text/svg+xml" || /\.svgz?$/.test(name);
}

function looksHeic(file) {
  const name = nameOf(file).toLowerCase();
  const type = typeOf(file);
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    /\.(heic|heif)$/.test(name)
  );
}

function looksAllowed(file) {
  const name = nameOf(file).toLowerCase();
  const type = typeOf(file);
  if (ALLOWED.has(type)) return type === "image/jpg" ? "image/jpeg" : type;
  if (/\.(png)$/.test(name)) return "image/png";
  if (/\.(jpe?g)$/.test(name)) return "image/jpeg";
  if (/\.(webp)$/.test(name)) return "image/webp";
  if (/\.(gif)$/.test(name)) return "image/gif";
  return null;
}

/**
 * @param {{name?:string,type?:string,size?:number,bytes?:ArrayBufferView|ArrayBuffer}} file
 * @returns {{ok:boolean, mime?:string, reason?:string}}
 */
export function validateImageFile(file) {
  if (file == null || typeof file !== "object") return fail("missing");

  const bytes = file.bytes != null ? toU8(file.bytes) : null;
  const sizeField = Number(file.size);
  const byteLen = bytes ? bytes.byteLength : 0;
  const size = Math.max(Number.isFinite(sizeField) ? sizeField : 0, byteLen);

  if (size > MAX_FILE_BYTES) return fail("too_large");
  if (size <= 0 && byteLen <= 0) return fail("empty");

  if (bytes && byteLen > 0) {
    const mime = detectMimeFromMagic(bytes);
    if (ALLOWED.has(mime)) return { ok: true, mime, size: byteLen };
    if (mime === "image/svg+xml") return fail("svg");
    if (mime === "image/heic") return fail("heic");
    if (looksSvg(file)) return fail("svg");
    if (looksHeic(file)) return fail("heic");
    return fail("unsupported");
  }

  if (looksSvg(file)) return fail("svg");
  if (looksHeic(file)) return fail("heic");
  const guessed = looksAllowed(file);
  if (guessed) return { ok: true, mime: guessed, size };
  return fail("unsupported");
}

export function clampBlockSize(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_BLOCK_SIZE;
  const i = Math.round(n);
  if (i < MIN_BLOCK_SIZE) return MIN_BLOCK_SIZE;
  if (i > MAX_BLOCK_SIZE) return MAX_BLOCK_SIZE;
  return i;
}

export function clampBrushRadius(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_BRUSH_RADIUS;
  const i = Math.round(n);
  if (i < MIN_BRUSH_RADIUS) return MIN_BRUSH_RADIUS;
  if (i > MAX_BRUSH_RADIUS) return MAX_BRUSH_RADIUS;
  return i;
}

function normBlockSize(blockSize) {
  const n = Math.floor(Number(blockSize));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_BLOCK_SIZE;
  return n;
}

function dim(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}

/** Inclusive pixel coverage, clamped to the image. Negative w/h swap corners. */
export function clampRect(x, y, w, h, imgW, imgH) {
  const W = dim(imgW);
  const H = dim(imgH);
  if (W <= 0 || H <= 0) return { x: 0, y: 0, w: 0, h: 0 };

  let x0 = Number(x);
  let y0 = Number(y);
  let ww = Number(w);
  let hh = Number(h);
  if (!Number.isFinite(x0)) x0 = 0;
  if (!Number.isFinite(y0)) y0 = 0;
  if (!Number.isFinite(ww)) ww = 0;
  if (!Number.isFinite(hh)) hh = 0;

  let x1 = x0 + ww;
  let y1 = y0 + hh;
  if (x1 < x0) {
    const t = x0;
    x0 = x1;
    x1 = t;
  }
  if (y1 < y0) {
    const t = y0;
    y0 = y1;
    y1 = t;
  }

  x0 = Math.max(0, Math.min(W, x0));
  x1 = Math.max(0, Math.min(W, x1));
  y0 = Math.max(0, Math.min(H, y0));
  y1 = Math.max(0, Math.min(H, y1));

  const ix = Math.floor(x0);
  const iy = Math.floor(y0);
  const ix1 = Math.ceil(x1);
  const iy1 = Math.ceil(y1);
  return {
    x: ix,
    y: iy,
    w: Math.max(0, ix1 - ix),
    h: Math.max(0, iy1 - iy),
  };
}

function makeBlock(bx, by, bs, imgW, imgH) {
  const x = bx * bs;
  const y = by * bs;
  const w = Math.min(bs, imgW - x);
  const h = Math.min(bs, imgH - y);
  return { bx, by, x, y, w, h };
}

/**
 * Global origin-aligned grid. Any block that intersects the rect is included whole
 * (edge cells may be smaller than blockSize because the image ends).
 */
export function blocksForRect(rect, blockSize, imgW, imgH) {
  const W = dim(imgW);
  const H = dim(imgH);
  const bs = normBlockSize(blockSize);
  if (W <= 0 || H <= 0) return [];

  const src = rect && typeof rect === "object" ? rect : {};
  const r = clampRect(src.x, src.y, src.w, src.h, W, H);
  if (r.w <= 0 || r.h <= 0) return [];

  const maxBx = Math.floor((W - 1) / bs);
  const maxBy = Math.floor((H - 1) / bs);
  const bx0 = Math.max(0, Math.min(maxBx, Math.floor(r.x / bs)));
  const by0 = Math.max(0, Math.min(maxBy, Math.floor(r.y / bs)));
  const lastX = r.x + r.w - 1;
  const lastY = r.y + r.h - 1;
  const bx1 = Math.max(0, Math.min(maxBx, Math.floor(lastX / bs)));
  const by1 = Math.max(0, Math.min(maxBy, Math.floor(lastY / bs)));

  const out = [];
  for (let by = by0; by <= by1; by++) {
    for (let bx = bx0; bx <= bx1; bx++) {
      const b = makeBlock(bx, by, bs, W, H);
      if (b.w > 0 && b.h > 0) out.push(b);
    }
  }
  return out;
}

function readPoint(p) {
  if (p == null) return null;
  if (Array.isArray(p) && p.length >= 2) {
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }
  const x = Number(p.x);
  const y = Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function normalizePoints(points) {
  if (points == null) return [];
  if (!Array.isArray(points)) {
    const one = readPoint(points);
    return one ? [one] : [];
  }
  const out = [];
  for (const p of points) {
    const n = readPoint(p);
    if (n) out.push(n);
  }
  return out;
}

function distPointToRect(px, py, x, y, w, h) {
  const x1 = x + w;
  const y1 = y + h;
  const cx = px < x ? x : px > x1 ? x1 : px;
  const cy = py < y ? y : py > y1 ? y1 : py;
  return Math.hypot(px - cx, py - cy);
}

function addBlock(seen, out, bx, by, bs, imgW, imgH) {
  const key = bx + ":" + by;
  if (seen.has(key)) return;
  const b = makeBlock(bx, by, bs, imgW, imgH);
  if (b.w <= 0 || b.h <= 0) return;
  seen.add(key);
  out.push(b);
}

/**
 * Unique origin-aligned blocks whose cell intersects the brush capsule
 * (circles at each point, stadium along the path).
 */
export function blocksForBrush(points, brushRadius, blockSize, imgW, imgH) {
  const W = dim(imgW);
  const H = dim(imgH);
  const bs = normBlockSize(blockSize);
  const pts = normalizePoints(points);
  if (W <= 0 || H <= 0 || !pts.length) return [];

  let r = Number(brushRadius);
  if (!Number.isFinite(r) || r < 0) r = 0;

  const seen = new Set();
  const out = [];
  const maxBx = Math.floor((W - 1) / bs);
  const maxBy = Math.floor((H - 1) / bs);

  function stamp(px, py) {
    if (r <= 0) {
      if (px < 0 || py < 0 || px >= W || py >= H) return;
      const bx = Math.max(0, Math.min(maxBx, Math.floor(px / bs)));
      const by = Math.max(0, Math.min(maxBy, Math.floor(py / bs)));
      addBlock(seen, out, bx, by, bs, W, H);
      return;
    }
    const bx0 = Math.floor((px - r) / bs);
    const by0 = Math.floor((py - r) / bs);
    const bx1 = Math.floor((px + r) / bs);
    const by1 = Math.floor((py + r) / bs);
    for (let by = by0; by <= by1; by++) {
      if (by < 0 || by > maxBy) continue;
      for (let bx = bx0; bx <= bx1; bx++) {
        if (bx < 0 || bx > maxBx) continue;
        const key = bx + ":" + by;
        if (seen.has(key)) continue;
        const b = makeBlock(bx, by, bs, W, H);
        if (b.w <= 0 || b.h <= 0) continue;
        if (distPointToRect(px, py, b.x, b.y, b.w, b.h) <= r) {
          seen.add(key);
          out.push(b);
        }
      }
    }
  }

  const step = Math.max(1, Math.min(bs, r > 0 ? r : bs) / 2);
  let prev = null;
  for (const p of pts) {
    if (!prev) {
      stamp(p.x, p.y);
      prev = p;
      continue;
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const dist = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let k = 1; k <= n; k++) {
      stamp(prev.x + (dx * k) / n, prev.y + (dy * k) / n);
    }
    prev = p;
  }
  return out;
}

export function cloneBuffer(imageData) {
  if (!imageData || imageData.data == null) {
    return { data: new Uint8ClampedArray(0), width: 0, height: 0 };
  }
  return {
    data: new Uint8ClampedArray(imageData.data),
    width: imageData.width | 0,
    height: imageData.height | 0,
  };
}

function wrapImageData(data, width, height) {
  if (typeof ImageData === "function") {
    try {
      return new ImageData(data, width, height);
    } catch {
      /* node / older engines */
    }
  }
  return { data, width, height };
}

/**
 * Average each block from the source buffer once, write onto a copy.
 * Does not re-average already-written destination pixels.
 */
export function mosaicRegion(imageData, blocks) {
  if (!imageData || imageData.data == null) {
    return wrapImageData(new Uint8ClampedArray(0), 0, 0);
  }
  const width = imageData.width | 0;
  const height = imageData.height | 0;
  const src = imageData.data;
  const out = new Uint8ClampedArray(src);
  const list = Array.isArray(blocks) ? blocks : [];

  for (const b of list) {
    if (!b) continue;
    let x = Math.floor(Number(b.x));
    let y = Math.floor(Number(b.y));
    let w = Math.floor(Number(b.w));
    let h = Math.floor(Number(b.h));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) continue;
    if (w <= 0 || h <= 0) continue;
    if (x < 0) {
      w += x;
      x = 0;
    }
    if (y < 0) {
      h += y;
      y = 0;
    }
    if (x >= width || y >= height) continue;
    if (x + w > width) w = width - x;
    if (y + h > height) h = height - y;
    if (w <= 0 || h <= 0) continue;

    let r = 0;
    let g = 0;
    let bl = 0;
    let a = 0;
    let n = 0;
    for (let yy = y; yy < y + h; yy++) {
      let i = (yy * width + x) * 4;
      for (let xx = 0; xx < w; xx++) {
        r += src[i];
        g += src[i + 1];
        bl += src[i + 2];
        a += src[i + 3];
        n++;
        i += 4;
      }
    }
    if (n === 0) continue;
    const rr = Math.round(r / n);
    const gg = Math.round(g / n);
    const bb = Math.round(bl / n);
    const aa = Math.round(a / n);
    for (let yy = y; yy < y + h; yy++) {
      let i = (yy * width + x) * 4;
      for (let xx = 0; xx < w; xx++) {
        out[i] = rr;
        out[i + 1] = gg;
        out[i + 2] = bb;
        out[i + 3] = aa;
        i += 4;
      }
    }
  }

  return wrapImageData(out, width, height);
}

/**
 * Map a pointer in CSS pixels to source image pixels.
 * Assumes the canvas CSS box shows the full source image (no letterbox).
 */
export function mapPointerToSource(clientX, clientY, canvasRect, srcW, srcH) {
  const W = Number(srcW);
  const H = Number(srcH);
  const rect = canvasRect || {};
  const left = Number(rect.left != null ? rect.left : rect.x);
  const top = Number(rect.top != null ? rect.top : rect.y);
  const rw = Number(rect.width);
  const rh = Number(rect.height);
  const cx = Number(clientX);
  const cy = Number(clientY);
  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
    return { x: 0, y: 0 };
  }
  const boxW = Number.isFinite(rw) && rw > 0 ? rw : 1;
  const boxH = Number.isFinite(rh) && rh > 0 ? rh : 1;
  const ox = Number.isFinite(left) ? left : 0;
  const oy = Number.isFinite(top) ? top : 0;
  const px = Number.isFinite(cx) ? cx : ox;
  const py = Number.isFinite(cy) ? cy : oy;
  let x = ((px - ox) / boxW) * W;
  let y = ((py - oy) / boxH) * H;
  if (!Number.isFinite(x)) x = 0;
  if (!Number.isFinite(y)) y = 0;
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x > W) x = W;
  if (y > H) y = H;
  return { x, y };
}

export function buildShareText(lang = "zh") {
  return lang === "en"
    ? "Redacted locally with REDACT-017 — image never left this device."
    : "已用 REDACT-017 本地打码 · 图片不离开本机";
}
