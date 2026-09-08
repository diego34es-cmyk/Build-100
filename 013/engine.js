/** INDEX-013 catalog filter. No DOM. */

export const FILTERS = [
  { id: "all", zh: "全部", en: "All" },
  { id: "finance", zh: "金融", en: "Finance" },
  { id: "learn", zh: "学习", en: "Learn" },
  { id: "life", zh: "生活", en: "Life" },
  { id: "market", zh: "市场", en: "Markets" },
  { id: "tools", zh: "工具效率", en: "Tools" },
];

export const FILTER_IDS = new Set(FILTERS.map((f) => f.id));

export function normalizeCat(cat) {
  const id = String(cat || "all").toLowerCase();
  return FILTER_IDS.has(id) ? id : "all";
}

export function filterSites(sites, cat) {
  const list = Array.isArray(sites) ? sites.slice() : [];
  const id = normalizeCat(cat);
  if (id === "all") return list;
  return list.filter((s) => Array.isArray(s.cats) && s.cats.includes(id));
}

export function rowHref(site) {
  if (!site || site.live !== true) return null;
  if (site.id) return "/" + String(site.id).padStart(3, "0") + "/";
  if (site.url && /^https?:\/\//.test(site.url)) return site.url;
  return null;
}

export function markLive(site, ok) {
  const next = { ...site };
  next.live = !!ok;
  if (next.live && !rowHref(next) && next.id) {
    next.url = "https://build-100.com/" + String(next.id).padStart(3, "0") + "/";
  }
  return next;
}

export function counts(sites) {
  const list = Array.isArray(sites) ? sites : [];
  let live = 0;
  let dev = 0;
  for (const s of list) {
    if (s.live) live += 1;
    else dev += 1;
  }
  return { total: list.length, live, dev };
}

export function catLabels(catIds, lang) {
  const map = Object.fromEntries(FILTERS.map((f) => [f.id, lang === "en" ? f.en : f.zh]));
  return (catIds || []).filter((id) => id !== "all").map((id) => map[id] || id);
}
