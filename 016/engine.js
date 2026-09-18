/** WHYSAVE-016 — why + review queue. Pure functions, no DOM. */

export const STORAGE_KEY = "whysave-016";
export const DEFAULT_REVIEW_DAYS = 7;
export const URL_MAX = 2048;
export const TITLE_MAX = 160;
export const WHY_MAX = 280;

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const MS_DAY = 24 * 60 * 60 * 1000;

export function emptyState() {
  return { items: [], settings: { reviewDays: DEFAULT_REVIEW_DAYS } };
}

export function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function clampReviewDays(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_REVIEW_DAYS;
  const i = Math.round(n);
  if (i < 1) return DEFAULT_REVIEW_DAYS;
  if (i > 365) return 365;
  return i;
}

export function startOfLocalDay(ms) {
  const d = new Date(Number(ms));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfLocalDay(ms) {
  const d = new Date(Number(ms));
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function addLocalDays(ms, days) {
  const d = new Date(Number(ms));
  d.setDate(d.getDate() + Number(days));
  return d.getTime();
}

export function localDayDiff(fromMs, toMs) {
  return Math.round((startOfLocalDay(toMs) - startOfLocalDay(fromMs)) / MS_DAY);
}

export function toTime(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Date.parse(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Trim; prepend https:// when no scheme. Dangerous schemes stay so validate can reject. */
export function normalizeUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (SCHEME_RE.test(s)) return s;
  if (s.startsWith("//")) return "https:" + s;
  return "https://" + s;
}

export function isValidUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s.length > URL_MAX) return false;
  try {
    const u = new URL(normalizeUrl(s));
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function parseUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, error: "missing_url" };
  if (s.length > URL_MAX) return { ok: false, error: "invalid_url" };
  try {
    const u = new URL(normalizeUrl(s));
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "bad_scheme" };
    }
    if (!u.hostname) return { ok: false, error: "invalid_url" };
    return { ok: true, href: u.href };
  } catch {
    return { ok: false, error: "invalid_url" };
  }
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

export function openHref(raw) {
  const p = parseUrl(raw);
  return p.ok ? p.href : null;
}

export function displayTitle(item) {
  const title = String(item?.title ?? "").trim();
  if (title) return title;
  return hostFromUrl(item?.url) || String(item?.url ?? "");
}

function serializeItem(it) {
  const out = {
    id: it.id,
    url: it.url,
    title: it.title,
    why: it.why,
    createdAt: it.createdAt,
    nextReviewAt: it.nextReviewAt,
    status: it.status === "archived" ? "archived" : "active",
  };
  if (it.lastReviewedAt != null) out.lastReviewedAt = it.lastReviewedAt;
  return out;
}

/**
 * New save: nextReviewAt = createdAt + reviewDays.
 * Import / load: keep nextReviewAt, status, lastReviewedAt when present.
 * Never treats “never reviewed” as its own queue condition.
 */
export function createItem(input, now = Date.now(), reviewDays = DEFAULT_REVIEW_DAYS) {
  if (!input || typeof input !== "object") return { ok: false, error: "invalid_item" };

  const urlRes = parseUrl(input.url);
  if (!urlRes.ok) return urlRes;

  const why = String(input.why ?? "").trim().slice(0, WHY_MAX);
  if (!why) return { ok: false, error: "missing_why" };

  const title = String(input.title ?? "").trim().slice(0, TITLE_MAX);
  const days = clampReviewDays(reviewDays);
  const createdAt = toTime(input.createdAt) ?? now;
  const nextReviewAt = toTime(input.nextReviewAt) ?? addLocalDays(createdAt, days);
  const status = input.status === "archived" ? "archived" : "active";
  const idRaw = String(input.id ?? "").trim().slice(0, 80);
  const item = {
    id: idRaw || makeId(),
    url: urlRes.href,
    title,
    why,
    createdAt,
    nextReviewAt,
    status,
  };
  const last = toTime(input.lastReviewedAt);
  if (last != null) item.lastReviewedAt = last;
  return { ok: true, item };
}

export function isDue(item, now = Date.now()) {
  if (!item || item.status !== "active") return false;
  const nr = toTime(item.nextReviewAt);
  if (nr == null) return false;
  return nr <= endOfLocalDay(now);
}

/** Active and nextReviewAt overdue by more than one reviewDays (local calendar days). */
export function isGraveyard(item, now = Date.now(), reviewDays = DEFAULT_REVIEW_DAYS) {
  if (!item || item.status !== "active") return false;
  const nr = toTime(item.nextReviewAt);
  if (nr == null) return false;
  return localDayDiff(nr, now) > clampReviewDays(reviewDays);
}

export function listDueForReview(items, now = Date.now()) {
  const list = Array.isArray(items) ? items : [];
  return list
    .filter((it) => isDue(it, now))
    .slice()
    .sort((a, b) => (a.nextReviewAt - b.nextReviewAt) || (a.createdAt - b.createdAt));
}

export function listItems(items, status = "active") {
  const want = status === "archived" ? "archived" : "active";
  return (Array.isArray(items) ? items : [])
    .filter((it) => it && it.status === want)
    .slice()
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

export function keepItem(items, id, now = Date.now(), reviewDays = DEFAULT_REVIEW_DAYS) {
  const list = Array.isArray(items) ? items.slice() : [];
  const idx = list.findIndex((x) => x && x.id === id);
  if (idx < 0) return { ok: false, error: "not_found", items: list };
  const prev = list[idx];
  const next = {
    ...prev,
    status: "active",
    lastReviewedAt: now,
    nextReviewAt: addLocalDays(now, clampReviewDays(reviewDays)),
  };
  list[idx] = next;
  return { ok: true, items: list, item: next };
}

export function archiveItem(items, id, now = Date.now()) {
  const list = Array.isArray(items) ? items.slice() : [];
  const idx = list.findIndex((x) => x && x.id === id);
  if (idx < 0) return { ok: false, error: "not_found", items: list };
  const next = { ...list[idx], status: "archived", lastReviewedAt: now };
  list[idx] = next;
  return { ok: true, items: list, item: next };
}

export function deleteItem(items, id) {
  const list = Array.isArray(items) ? items.slice() : [];
  const idx = list.findIndex((x) => x && x.id === id);
  if (idx < 0) return { ok: false, error: "not_found", items: list };
  list.splice(idx, 1);
  return { ok: true, items: list };
}

export function computeStats(items, now = Date.now(), reviewDays = DEFAULT_REVIEW_DAYS) {
  const list = Array.isArray(items) ? items : [];
  const days = clampReviewDays(reviewDays);
  let active = 0;
  let due = 0;
  let graveyard = 0;
  for (const it of list) {
    if (!it || it.status !== "active") continue;
    active += 1;
    if (isDue(it, now)) due += 1;
    if (isGraveyard(it, now, days)) graveyard += 1;
  }
  return { active, due, graveyard };
}

export function normalizeState(data) {
  if (Array.isArray(data)) data = { items: data };
  if (!data || typeof data !== "object") return emptyState();
  const reviewDays = clampReviewDays(data.settings?.reviewDays ?? data.reviewDays);
  const items = [];
  const src = Array.isArray(data.items) ? data.items : [];
  const seen = new Set();
  for (const raw of src) {
    const v = createItem(raw, Date.now(), reviewDays);
    if (!v.ok) continue;
    let item = v.item;
    if (seen.has(item.id)) item = { ...item, id: makeId() };
    seen.add(item.id);
    items.push(serializeItem(item));
  }
  return { items, settings: { reviewDays } };
}

export function parseState(raw) {
  if (raw == null || raw === "") return emptyState();
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return emptyState();
    }
  }
  return normalizeState(data);
}

export function loadState(storage) {
  if (!storage || typeof storage.getItem !== "function") return emptyState();
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return emptyState();
  }
  return parseState(raw);
}

export function saveState(state, storage) {
  const next = normalizeState(state);
  if (storage && typeof storage.setItem === "function") {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  return next;
}

export function exportJson(state) {
  return JSON.stringify(normalizeState(state), null, 2);
}

export function parseImport(raw, now = Date.now(), reviewDays = DEFAULT_REVIEW_DAYS) {
  if (raw == null || raw === "") return { ok: false, error: "invalid_json" };
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  if (Array.isArray(data)) data = { items: data };
  if (!data || typeof data !== "object") return { ok: false, error: "invalid_json" };
  const days = clampReviewDays(data.settings?.reviewDays ?? reviewDays);
  const items = [];
  let skipped = 0;
  const src = Array.isArray(data.items) ? data.items : [];
  for (const rawItem of src) {
    const v = createItem(rawItem, now, days);
    if (v.ok) items.push(v.item);
    else skipped += 1;
  }
  return { ok: true, items, settings: { reviewDays: days }, skipped };
}

export function importJson(state, raw, now = Date.now()) {
  const current = normalizeState(state);
  const parsed = parseImport(raw, now, current.settings.reviewDays);
  if (!parsed.ok) return { ok: false, error: parsed.error, state: current };
  const items = current.items.slice();
  const ids = new Set(items.map((x) => x.id));
  let imported = 0;
  for (const it of parsed.items) {
    let item = serializeItem(it);
    if (ids.has(item.id)) item = { ...item, id: makeId() };
    ids.add(item.id);
    items.push(item);
    imported += 1;
  }
  const next = { items, settings: current.settings };
  return { ok: true, state: next, imported, skipped: parsed.skipped };
}

export function buildShareText({ stats, due, lang } = {}) {
  const s = stats || { active: 0, due: 0, graveyard: 0 };
  const lines = [];
  if (lang === "en") {
    lines.push("WHYSAVE-016 · today's review");
    lines.push(
      `${s.due} due · ${s.active} active · ${s.graveyard} graveyard risk`
    );
  } else {
    lines.push("WHYSAVE-016 · 今日复盘");
    lines.push(`待复盘 ${s.due} · 在册 ${s.active} · 坟场风险 ${s.graveyard}`);
  }
  const queue = Array.isArray(due) ? due : [];
  const max = 5;
  for (let i = 0; i < Math.min(max, queue.length); i++) {
    const why = String(queue[i]?.why ?? "").trim();
    if (why) lines.push("· " + why);
  }
  if (queue.length > max) {
    lines.push(lang === "en" ? `· +${queue.length - max} more` : `· 另有 ${queue.length - max} 条`);
  }
  if (lang === "en") {
    lines.push("Write the why when you save, or it becomes a graveyard.");
  } else {
    lines.push("存链接时先写下为什么，不然就是坟场。");
  }
  lines.push("https://build-100.com/016/");
  return lines.join("\n");
}
