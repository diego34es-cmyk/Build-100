/** VAULT-014 — local isolation vault. Pure functions, no DOM. */

export const STORAGE_KEY = "vault-014";
export const PIN_MIN = 4;
export const PIN_MAX = 8;
export const TITLE_MAX = 120;
export const NOTE_MAX = 400;
export const TAG_MAX = 32;
export const TAGS_MAX = 12;
export const URL_MAX = 2048;

const PIN_RE = /^\d{4,8}$/;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function emptyStore() {
  return { blur: false, items: [] };
}

export function makeId() {
  return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Trim; prepend https:// when no scheme. Dangerous schemes are left intact so validate can reject. */
export function normalizeUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (SCHEME_RE.test(s)) return s;
  if (s.startsWith("//")) return "https:" + s;
  return "https://" + s;
}

export function hostFromUrl(raw) {
  try {
    const u = new URL(normalizeUrl(raw));
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.hostname || "";
  } catch {
    return "";
  }
}

export function isHttpUrl(raw) {
  try {
    const u = new URL(normalizeUrl(raw));
    return (u.protocol === "http:" || u.protocol === "https:") && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** Safe href for a new tab, or null. */
export function openHref(raw) {
  if (!isHttpUrl(raw)) return null;
  try {
    return new URL(normalizeUrl(raw)).href;
  } catch {
    return null;
  }
}

export function parseTags(input) {
  let parts;
  if (Array.isArray(input)) parts = input.map((x) => String(x));
  else if (input == null) parts = [];
  else parts = String(input).split(/[,，、]/);
  const out = [];
  const seen = new Set();
  for (const p of parts) {
    const tag = p.trim().slice(0, TAG_MAX);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}

function toCreated(v, fallback) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Date.parse(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function validateItem(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_item" };
  const urlRaw = String(raw.url ?? "").trim();
  if (!urlRaw) return { ok: false, error: "missing_url" };
  if (urlRaw.length > URL_MAX) return { ok: false, error: "invalid_url" };

  const normalized = normalizeUrl(urlRaw);
  let href;
  try {
    const u = new URL(normalized);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "bad_scheme" };
    }
    if (!u.hostname) return { ok: false, error: "invalid_url" };
    href = u.href;
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  const now = Date.now();
  const title = String(raw.title ?? "").trim().slice(0, TITLE_MAX);
  const idRaw = String(raw.id ?? "").trim().slice(0, 64);
  return {
    ok: true,
    item: {
      id: idRaw || makeId(),
      url: href,
      title: title || hostFromUrl(href),
      tags: parseTags(raw.tags),
      note: String(raw.note ?? "").trim().slice(0, NOTE_MAX),
      created: toCreated(raw.created, now),
    },
  };
}

export function displayTitle(item) {
  const title = String(item?.title ?? "").trim();
  if (title) return title;
  return hostFromUrl(item?.url) || String(item?.url ?? "");
}

export function createItem(input, now = Date.now()) {
  return validateItem({
    ...input,
    id: input?.id || makeId(),
    created: input?.created ?? now,
  });
}

export function updateItem(items, id, patch) {
  const list = Array.isArray(items) ? items.slice() : [];
  const idx = list.findIndex((x) => x && x.id === id);
  if (idx < 0) return { ok: false, error: "not_found", items: list };
  const prev = list[idx];
  const merged = {
    ...prev,
    ...(patch && typeof patch === "object" ? patch : {}),
    id: prev.id,
    created: prev.created,
  };
  const v = validateItem(merged);
  if (!v.ok) return { ok: false, error: v.error, items: list };
  list[idx] = v.item;
  return { ok: true, items: list, item: v.item };
}

export function deleteItem(items, id) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((x) => x && x.id !== id);
}

export function isValidPin(pin) {
  return PIN_RE.test(String(pin ?? ""));
}

/** Soft lock only — FNV-1a with a page salt. Not cryptographic. */
export function simplePinHash(pin) {
  const s = "vault-014|" + String(pin ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function verifyPin(pin, pinHash) {
  if (!isValidPin(pin)) return false;
  if (typeof pinHash !== "string" || !pinHash) return false;
  return simplePinHash(pin) === pinHash;
}

/** Memory flag only. A stored pinHash means the next page load starts locked. */
export function initialLocked(store) {
  return Boolean(store && typeof store.pinHash === "string" && store.pinHash);
}

export function withPin(store, pin) {
  if (!isValidPin(pin)) return { ok: false, error: "invalid_pin", store: persistable(store) };
  const next = persistable(store);
  next.pinHash = simplePinHash(pin);
  return { ok: true, store: next };
}

export function withoutPin(store) {
  const next = persistable(store);
  delete next.pinHash;
  return next;
}

export function persistable(store) {
  const items = [];
  if (Array.isArray(store?.items)) {
    for (const raw of store.items) {
      const v = validateItem(raw);
      if (v.ok) items.push(v.item);
    }
  }
  const out = { blur: Boolean(store?.blur), items };
  if (typeof store?.pinHash === "string" && store.pinHash) out.pinHash = store.pinHash;
  return out;
}

export function exportPayload(store) {
  const p = persistable(store);
  return { blur: p.blur, items: p.items };
}

export function exportVaultJson(store) {
  return JSON.stringify(exportPayload(store), null, 2);
}

export function parseStore(raw) {
  if (raw == null || raw === "") return emptyStore();
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return emptyStore();
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return emptyStore();
  const items = [];
  if (Array.isArray(data.items)) {
    for (const it of data.items) {
      const v = validateItem(it);
      if (v.ok) items.push(v.item);
    }
  }
  const store = { blur: Boolean(data.blur), items };
  if (typeof data.pinHash === "string" && data.pinHash) store.pinHash = data.pinHash;
  return store;
}

function readBackup(backup) {
  if (backup == null || backup === "") return { ok: false, error: "invalid_backup" };
  let data = backup;
  if (typeof backup === "string") {
    try {
      data = JSON.parse(backup);
    } catch {
      return { ok: false, error: "invalid_backup" };
    }
  }
  if (Array.isArray(data)) return { ok: true, data: { items: data } };
  if (!data || typeof data !== "object") return { ok: false, error: "invalid_backup" };
  return { ok: true, data };
}

/**
 * Whole-cabinet replace of items.
 * Ignores backup.locked. Keeps the device's existing pinHash (never imported).
 */
export function importVault(current, backup) {
  const read = readBackup(backup);
  if (!read.ok) return { ok: false, error: read.error, store: persistable(current) };
  const src = read.data;
  const rawItems = Array.isArray(src.items) ? src.items : [];
  const items = [];
  let skipped = 0;
  for (const raw of rawItems) {
    const v = validateItem(raw);
    if (v.ok) items.push(v.item);
    else skipped += 1;
  }
  const next = {
    blur: typeof src.blur === "boolean" ? src.blur : Boolean(current?.blur),
    items,
  };
  if (typeof current?.pinHash === "string" && current.pinHash) next.pinHash = current.pinHash;
  return { ok: true, store: next, imported: items.length, skipped };
}

export function filterItems(items, { query = "", tag = "" } = {}) {
  const q = String(query ?? "").trim().toLowerCase();
  const t = String(tag ?? "").trim().toLowerCase();
  let out = Array.isArray(items) ? items.filter(Boolean) : [];
  if (q) {
    out = out.filter((it) => {
      const hay = [it.title, it.url, it.note, ...(it.tags || [])].join("\n").toLowerCase();
      return hay.includes(q);
    });
  }
  if (t) {
    out = out.filter((it) => (it.tags || []).some((x) => String(x).toLowerCase() === t));
  }
  out.sort((a, b) => (Number(b.created) || 0) - (Number(a.created) || 0));
  return out;
}

export function collectTags(items) {
  const seen = new Map();
  for (const it of items || []) {
    for (const tag of it.tags || []) {
      const s = String(tag).trim();
      if (!s) continue;
      const k = s.toLowerCase();
      if (!seen.has(k)) seen.set(k, s);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "zh"));
}

export function buildShareText(lang) {
  if (lang === "en") {
    return "Can't put it on the daily bookmark bar, can't risk losing it. VAULT-014 is a local isolation vault for adult links — blur + optional PIN, nothing leaves this device. https://build-100.com/014/";
  }
  return "日常栏不敢放，又怕丢。VAULT-014 本地隔离柜：成人链接单独收纳，可选模糊与本机软锁，不进云。https://build-100.com/014/";
}
