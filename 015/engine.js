/** METASTRIP-015 — JPEG APP1 scan + segment strip. No DOM, no CDN. */

export const STORAGE_KEY = "metastrip-015";
export const MAX_BYTES = 20 * 1024 * 1024;
export const JPEG_QUALITY = 0.92;

export const MSG = {
  too_large: {
    zh: "文件超过 20MB",
    en: "File is larger than 20MB",
  },
  empty: {
    zh: "文件是空的",
    en: "File is empty",
  },
  heic: {
    zh: "不支持 HEIC / HEIF。iPhone 请先导出 JPEG",
    en: "HEIC/HEIF is not supported. On iPhone, export JPEG first.",
  },
  dng: {
    zh: "不支持 DNG / RAW。iPhone 请先导出 JPEG",
    en: "DNG/RAW is not supported. On iPhone, export JPEG first.",
  },
  unsupported: {
    zh: "只接受 JPEG / PNG / WebP",
    en: "Only JPEG / PNG / WebP are accepted",
  },
};

const HEIF_BRANDS = new Set([
  "heic", "heix", "heif", "hevc", "hevx", "heim", "heis",
  "hevm", "hevs", "mif1", "msf1", "avci", "avcs",
]);

const T_BYTE = 1;
const T_ASCII = 2;
const T_SHORT = 3;
const T_LONG = 4;
const T_RATIONAL = 5;
const T_UNDEF = 7;
const T_SLONG = 9;
const T_SRATIONAL = 10;

const TYPE_W = {
  [T_BYTE]: 1,
  [T_ASCII]: 1,
  [T_SHORT]: 2,
  [T_LONG]: 4,
  [T_RATIONAL]: 8,
  [T_UNDEF]: 1,
  [T_SLONG]: 4,
  [T_SRATIONAL]: 8,
};

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_ORIENT = 0x0112;
const TAG_SOFTWARE = 0x0131;
const TAG_DATETIME = 0x0132;
const TAG_WIDTH = 0x0100;
const TAG_LENGTH = 0x0101;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DTO = 0x9003;
const TAG_DTD = 0x9004;
const TAG_PX = 0xa002;
const TAG_PY = 0xa003;
const TAG_GPS_LAT_REF = 0x0001;
const TAG_GPS_LAT = 0x0002;
const TAG_GPS_LON_REF = 0x0003;
const TAG_GPS_LON = 0x0004;

const SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

export function toU8(input) {
  if (input == null) return new Uint8Array();
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array();
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

function isWebp(u8) {
  return u8.length >= 12 && startsWith(u8, 0, "RIFF") && startsWith(u8, 8, "WEBP");
}

function isTiff(u8) {
  if (u8.length < 4) return false;
  const ii = u8[0] === 0x49 && u8[1] === 0x49 && u8[2] === 0x2a && u8[3] === 0x00;
  const mm = u8[0] === 0x4d && u8[1] === 0x4d && u8[2] === 0x00 && u8[3] === 0x2a;
  return ii || mm;
}

function isHeif(u8) {
  if (u8.length < 16) return false;
  if (!startsWith(u8, 4, "ftyp")) return false;
  const brands = [asciiAt(u8, 8, 4)];
  for (let i = 16; i + 4 <= Math.min(u8.length, 96); i += 4) {
    brands.push(asciiAt(u8, i, 4));
  }
  return brands.some((b) => HEIF_BRANDS.has(b));
}

export function detectMime(input) {
  const u8 = toU8(input);
  if (isJpeg(u8)) return "image/jpeg";
  if (isPng(u8)) return "image/png";
  if (isWebp(u8)) return "image/webp";
  if (isHeif(u8)) return "image/heic";
  if (isTiff(u8)) return "image/tiff";
  return null;
}

function fail(code) {
  const m = MSG[code] || MSG.unsupported;
  return { ok: false, code, messageZh: m.zh, messageEn: m.en };
}

export function validateFile(file = {}) {
  const name = String(file.name || "");
  const bytes = file.bytes != null ? toU8(file.bytes) : null;
  const sizeField = Number(file.size);
  const byteLen = bytes ? bytes.byteLength : 0;
  const size = Math.max(
    Number.isFinite(sizeField) ? sizeField : 0,
    byteLen
  );

  if (size > MAX_BYTES) return fail("too_large");
  if (!bytes || byteLen === 0) return fail("empty");

  const mime = detectMime(bytes);
  const lower = name.toLowerCase();

  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") {
    return { ok: true, mime, size: byteLen };
  }
  if (mime === "image/heic" || /\.(heic|heif)$/.test(lower)) return fail("heic");
  if (mime === "image/tiff" || /\.(dng|cr2|nef|arw|raf|orf|rw2)$/.test(lower)) {
    return fail("dng");
  }
  if (/\.(heic|heif)$/.test(lower)) return fail("heic");
  return fail("unsupported");
}

function walkJpeg(u8, onSeg) {
  if (!isJpeg(u8)) return;
  let i = 2;
  while (i < u8.length) {
    if (u8[i] !== 0xff) break;
    while (i < u8.length && u8[i] === 0xff) i++;
    if (i >= u8.length) break;
    const marker = u8[i];
    const markerStart = i - 1;
    i++;
    if (marker === 0xd9) {
      onSeg({ marker, start: markerStart, end: markerStart + 2, standalone: true });
      break;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      onSeg({ marker, start: markerStart, end: markerStart + 2, standalone: true });
      continue;
    }
    if (i + 1 >= u8.length) break;
    const len = (u8[i] << 8) | u8[i + 1];
    if (len < 2) break;
    const dataStart = i + 2;
    const dataEnd = i + len;
    const end = Math.min(u8.length, markerStart + 2 + len);
    const payloadEnd = Math.min(u8.length, dataEnd);
    const stop = onSeg({
      marker,
      start: markerStart,
      end,
      len,
      dataStart,
      dataEnd: payloadEnd,
      payload: u8.subarray(dataStart, payloadEnd),
    });
    if (stop === false) break;
    if (marker === 0xda) break;
    i = dataEnd;
  }
}

export function hasApp1(input) {
  const u8 = toU8(input);
  let found = false;
  walkJpeg(u8, (seg) => {
    if (seg.marker === 0xe1) {
      found = true;
      return false;
    }
  });
  return found;
}

function isXmpPayload(payload) {
  if (!payload || payload.length < 4) return false;
  if (startsWith(payload, 0, "http://ns.adobe.com/xap")) return true;
  if (startsWith(payload, 0, "http://ns.adobe.com/xmp")) return true;
  return false;
}

export function stripJpegSegments(input) {
  const u8 = toU8(input);
  if (!isJpeg(u8)) return u8.slice();
  const chunks = [];
  let copiedSos = false;
  walkJpeg(u8, (seg) => {
    if (copiedSos) return false;
    const drop =
      seg.marker === 0xe1 ||
      seg.marker === 0xed ||
      isXmpPayload(seg.payload);
    if (seg.marker === 0xda) {
      if (!drop) chunks.push(u8.subarray(seg.start));
      copiedSos = true;
      return false;
    }
    if (!drop) chunks.push(u8.subarray(seg.start, seg.end));
  });
  if (!copiedSos) {
    // truncated / no SOS: still a valid prefix
  }
  let total = 2;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  out[0] = 0xff;
  out[1] = 0xd8;
  let o = 2;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function dvOf(u8) {
  return new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
}

function decodeAscii(u8) {
  let end = u8.length;
  while (end > 0 && u8[end - 1] === 0) end--;
  const slice = u8.subarray(0, end);
  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(slice).trim();
    } catch {
      /* fall through */
    }
  }
  let s = "";
  for (let i = 0; i < slice.length; i++) s += String.fromCharCode(slice[i]);
  return s.trim();
}

function parseIfd(dv, tiffStart, ifdRel, le, fileLen) {
  const abs = tiffStart + ifdRel;
  if (abs < 0 || abs + 2 > fileLen) return null;
  const n = dv.getUint16(abs, le);
  if (n === 0 || n > 128) return { tags: new Map(), next: 0 };
  const tags = new Map();
  let p = abs + 2;
  for (let i = 0; i < n; i++) {
    if (p + 12 > fileLen) break;
    const tag = dv.getUint16(p, le);
    const type = dv.getUint16(p + 2, le);
    const count = dv.getUint32(p + 4, le);
    tags.set(tag, { type, count, valOff: p + 8 });
    p += 12;
  }
  let next = 0;
  if (p + 4 <= fileLen) next = dv.getUint32(p, le);
  return { tags, next };
}

function valueAbs(dv, tiffStart, rec, le, unit) {
  const nbytes = unit * rec.count;
  if (nbytes <= 4) return rec.valOff;
  const rel = dv.getUint32(rec.valOff, le);
  return tiffStart + rel;
}

function readAsciiTag(u8, dv, tiffStart, rec, le) {
  if (!rec) return "";
  const abs = valueAbs(dv, tiffStart, rec, le, 1);
  const n = rec.count;
  if (abs < 0 || n < 0 || abs + n > u8.length) return "";
  return decodeAscii(u8.subarray(abs, abs + n));
}

function readIntTag(dv, tiffStart, rec, le, fileLen) {
  if (!rec) return null;
  const w = TYPE_W[rec.type] || 1;
  const abs = valueAbs(dv, tiffStart, rec, le, w);
  if (abs < 0 || abs + Math.min(w, 4) > fileLen) return null;
  if (rec.type === T_SHORT) return dv.getUint16(abs, le);
  if (rec.type === T_LONG) return dv.getUint32(abs, le);
  if (rec.type === T_SLONG) return dv.getInt32(abs, le);
  if (rec.type === T_BYTE) return dv.getUint8(abs);
  return null;
}

function readRats(dv, tiffStart, rec, le, fileLen) {
  if (!rec) return [];
  const signed = rec.type === T_SRATIONAL;
  const abs = valueAbs(dv, tiffStart, rec, le, 8);
  const out = [];
  for (let i = 0; i < rec.count; i++) {
    const o = abs + i * 8;
    if (o + 8 > fileLen) break;
    const n = signed ? dv.getInt32(o, le) : dv.getUint32(o, le);
    const d = signed ? dv.getInt32(o + 4, le) : dv.getUint32(o + 4, le);
    out.push({ n, d });
  }
  return out;
}

function ratsToDeg(rats) {
  if (!rats || rats.length < 3) return null;
  const num = (r) => {
    if (!r || !r.d) return 0;
    return r.n / r.d;
  };
  return num(rats[0]) + num(rats[1]) / 60 + num(rats[2]) / 3600;
}

function fmtCoord(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

function parseExifPayload(u8, payload, payloadAbs) {
  if (!payload || payload.length < 8) return null;
  if (!startsWith(payload, 0, "Exif") || payload[4] !== 0 || payload[5] !== 0) {
    return null;
  }
  const tiffStart = payloadAbs + 6;
  const dv = dvOf(u8);
  const fileLen = u8.length;
  if (tiffStart + 8 > fileLen) return null;
  const b0 = u8[tiffStart];
  const b1 = u8[tiffStart + 1];
  const le = b0 === 0x49 && b1 === 0x49;
  const be = b0 === 0x4d && b1 === 0x4d;
  if (!le && !be) return null;
  const magic = dv.getUint16(tiffStart + 2, le);
  if (magic !== 0x002a) return null;
  const ifd0Rel = dv.getUint32(tiffStart + 4, le);
  const visited = new Set();
  const ifd0 = parseIfd(dv, tiffStart, ifd0Rel, le, fileLen);
  if (!ifd0) return null;

  const out = {
    make: "",
    model: "",
    software: "",
    datetime: "",
    orientation: null,
    width: null,
    height: null,
    gps: null,
  };

  const apply = (ifd) => {
    if (!ifd) return;
    const t = ifd.tags;
    if (t.has(TAG_MAKE) && !out.make) {
      out.make = readAsciiTag(u8, dv, tiffStart, t.get(TAG_MAKE), le);
    }
    if (t.has(TAG_MODEL) && !out.model) {
      out.model = readAsciiTag(u8, dv, tiffStart, t.get(TAG_MODEL), le);
    }
    if (t.has(TAG_SOFTWARE) && !out.software) {
      out.software = readAsciiTag(u8, dv, tiffStart, t.get(TAG_SOFTWARE), le);
    }
    if (t.has(TAG_ORIENT) && out.orientation == null) {
      out.orientation = readIntTag(dv, tiffStart, t.get(TAG_ORIENT), le, fileLen);
    }
    if (t.has(TAG_WIDTH) && out.width == null) {
      out.width = readIntTag(dv, tiffStart, t.get(TAG_WIDTH), le, fileLen);
    }
    if (t.has(TAG_LENGTH) && out.height == null) {
      out.height = readIntTag(dv, tiffStart, t.get(TAG_LENGTH), le, fileLen);
    }
    if (t.has(TAG_PX) && out.width == null) {
      out.width = readIntTag(dv, tiffStart, t.get(TAG_PX), le, fileLen);
    }
    if (t.has(TAG_PY) && out.height == null) {
      out.height = readIntTag(dv, tiffStart, t.get(TAG_PY), le, fileLen);
    }
    const dto = t.has(TAG_DTO) ? readAsciiTag(u8, dv, tiffStart, t.get(TAG_DTO), le) : "";
    const dtd = t.has(TAG_DTD) ? readAsciiTag(u8, dv, tiffStart, t.get(TAG_DTD), le) : "";
    const dt = t.has(TAG_DATETIME) ? readAsciiTag(u8, dv, tiffStart, t.get(TAG_DATETIME), le) : "";
    if (dto) out.datetime = dto;
    else if (!out.datetime && dtd) out.datetime = dtd;
    else if (!out.datetime && dt) out.datetime = dt;
  };

  apply(ifd0);

  const follow = (tag) => {
    const rec = ifd0.tags.get(tag);
    if (!rec) return;
    const rel = readIntTag(dv, tiffStart, rec, le, fileLen);
    if (rel == null || visited.has(rel)) return;
    visited.add(rel);
    const sub = parseIfd(dv, tiffStart, rel, le, fileLen);
    apply(sub);
    return sub;
  };

  follow(TAG_EXIF_IFD);
  const gpsIfd = follow(TAG_GPS_IFD);
  if (gpsIfd && gpsIfd.tags.has(TAG_GPS_LAT) && gpsIfd.tags.has(TAG_GPS_LON)) {
    const latRef = (readAsciiTag(u8, dv, tiffStart, gpsIfd.tags.get(TAG_GPS_LAT_REF), le) || "N").charAt(0);
    const lonRef = (readAsciiTag(u8, dv, tiffStart, gpsIfd.tags.get(TAG_GPS_LON_REF), le) || "E").charAt(0);
    const latRats = readRats(dv, tiffStart, gpsIfd.tags.get(TAG_GPS_LAT), le, fileLen);
    const lonRats = readRats(dv, tiffStart, gpsIfd.tags.get(TAG_GPS_LON), le, fileLen);
    let lat = ratsToDeg(latRats);
    let lon = ratsToDeg(lonRats);
    if (lat != null && lon != null) {
      if (latRef === "S" || latRef === "s") lat = -Math.abs(lat);
      if (lonRef === "W" || lonRef === "w") lon = -Math.abs(lon);
      if (latRef === "N" || latRef === "n") lat = Math.abs(lat);
      if (lonRef === "E" || lonRef === "e") lon = Math.abs(lon);
      const text = fmtCoord(lat, lon);
      if (text) out.gps = { lat, lon, text };
    }
  }
  return out;
}

function jpegSofSize(u8) {
  let size = null;
  walkJpeg(u8, (seg) => {
    if (SOF.has(seg.marker) && seg.payload && seg.payload.length >= 5) {
      const p = seg.payload;
      const height = (p[1] << 8) | p[2];
      const width = (p[3] << 8) | p[4];
      size = { width, height };
      return false;
    }
  });
  return size;
}

function pngSize(u8) {
  if (!isPng(u8) || u8.length < 24) return null;
  if (!startsWith(u8, 12, "IHDR")) return null;
  const dv = dvOf(u8);
  const width = dv.getUint32(16);
  const height = dv.getUint32(20);
  if (!width || !height) return null;
  return { width, height };
}

function webpSize(u8) {
  if (!isWebp(u8) || u8.length < 30) return null;
  let p = 12;
  while (p + 8 <= u8.length) {
    const tag = asciiAt(u8, p, 4);
    const size = u8[p + 4] | (u8[p + 5] << 8) | (u8[p + 6] << 16) | (u8[p + 7] << 24);
    const data = p + 8;
    if (tag === "VP8X" && data + 10 <= u8.length) {
      const w = 1 + (u8[data + 4] | (u8[data + 5] << 8) | (u8[data + 6] << 16));
      const h = 1 + (u8[data + 7] | (u8[data + 8] << 8) | (u8[data + 9] << 16));
      return { width: w, height: h };
    }
    p = data + size + (size & 1);
    if (size < 0) break;
  }
  return null;
}

function deviceOf(make, model) {
  const a = (make || "").trim();
  const b = (model || "").trim();
  if (a && b) {
    if (b.toLowerCase().startsWith(a.toLowerCase())) return b;
    return `${a} ${b}`;
  }
  return a || b || "";
}

export function listMetaSummary(input) {
  const u8 = toU8(input);
  const mime = detectMime(u8);
  const empty = {
    mime,
    hasApp1: false,
    almostNoExif: true,
    gps: null,
    datetime: null,
    make: null,
    model: null,
    device: null,
    software: null,
    orientation: null,
    width: null,
    height: null,
  };

  if (mime === "image/png") {
    const sz = pngSize(u8);
    return { ...empty, width: sz && sz.width, height: sz && sz.height };
  }
  if (mime === "image/webp") {
    const sz = webpSize(u8);
    return { ...empty, width: sz && sz.width, height: sz && sz.height };
  }
  if (mime !== "image/jpeg") return empty;

  const app1 = hasApp1(u8);
  const sof = jpegSofSize(u8);
  const result = {
    ...empty,
    hasApp1: app1,
    almostNoExif: !app1,
    width: sof && sof.width,
    height: sof && sof.height,
  };

  if (!app1) return result;

  try {
    walkJpeg(u8, (seg) => {
      if (seg.marker !== 0xe1) return;
      const parsed = parseExifPayload(u8, seg.payload, seg.dataStart);
      if (!parsed) return;
      if (parsed.gps && !result.gps) result.gps = parsed.gps;
      if (parsed.datetime && !result.datetime) result.datetime = parsed.datetime;
      if (parsed.make && !result.make) result.make = parsed.make;
      if (parsed.model && !result.model) result.model = parsed.model;
      if (parsed.software && !result.software) result.software = parsed.software;
      if (parsed.orientation != null && result.orientation == null) {
        result.orientation = parsed.orientation;
      }
      if (result.width == null && parsed.width) result.width = parsed.width;
      if (result.height == null && parsed.height) result.height = parsed.height;
    });
  } catch {
    /* malformed APP1 — still report almostNoExif=false if APP1 exists */
  }

  result.device = deviceOf(result.make, result.model) || null;
  if (!result.make) result.make = null;
  if (!result.model) result.model = null;
  if (!result.software) result.software = null;
  if (!result.datetime) result.datetime = null;
  return result;
}

function normalizeFormat(f) {
  return f === "png" ? "png" : "jpeg";
}

export function loadPrefs(source) {
  let data = source;
  if (source && typeof source.getItem === "function") {
    try {
      data = source.getItem(STORAGE_KEY);
    } catch {
      data = null;
    }
  }
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  if (data && typeof data === "object") {
    return { format: normalizeFormat(data.format) };
  }
  return { format: "jpeg" };
}

export function savePrefs(prefs, storage) {
  const next = { format: normalizeFormat(prefs && prefs.format) };
  if (storage && typeof storage.setItem === "function") {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private mode */
    }
  }
  return next;
}

export function downloadName(originalName, format) {
  const ext = normalizeFormat(format) === "png" ? "png" : "jpg";
  let base = String(originalName || "image").trim();
  base = base.split(/[/\\]/).pop() || "image";
  base = base.replace(/\.[^.]+$/, "");
  base = base.replace(/[^\w.\-\u4e00-\u9fff]+/g, "_").replace(/^_+|_+$/g, "");
  if (!base) base = "image";
  return `${base}-clean.${ext}`;
}

export function buildShareText(lang = "zh") {
  if (lang === "en") {
    return "METASTRIP-015 — check GPS before you post. Strip EXIF in the browser; nothing is uploaded.\nhttps://build-100.com/015/";
  }
  return "METASTRIP-015 · 发图前清 EXIF — 发原图前先看有没有定位。浏览器里剥元数据，不上传。\nhttps://build-100.com/015/";
}
