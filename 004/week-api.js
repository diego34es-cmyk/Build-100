/** WEEK-004 request validation + fixture writer. No live market calls. */

export const THEMES = ["politics", "economy", "tech", "humanities"];
export const LANGS = ["zh", "en"];

export function normalizeThreshold(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, error: "threshold_not_finite" };
  const unit = n > 1 ? n / 100 : n;
  if (unit < 0.5 || unit > 0.95) return { ok: false, error: "threshold_range" };
  return { ok: true, threshold: unit };
}

export function parseWeekRequest(input) {
  if (input === null || input === undefined) {
    return { ok: false, error: "empty_body" };
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid_body" };
  }
  const theme = String(input.theme || "").trim();
  if (!THEMES.includes(theme)) return { ok: false, error: "unknown_theme" };
  const lang = String(input.lang || "zh").trim();
  if (!LANGS.includes(lang)) return { ok: false, error: "unknown_lang" };
  const thr = normalizeThreshold(input.threshold);
  if (!thr.ok) return thr;
  return { ok: true, theme, lang, threshold: thr.threshold };
}

export function originAllowed(origin, allowList, { strict = false } = {}) {
  if (!origin) return !strict;
  return allowList.includes(origin);
}

export function buildWeekFixture(req, fixtures) {
  const parsed = parseWeekRequest(req);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const pack = fixtures?.[parsed.theme];
  const facts = Array.isArray(pack?.facts) ? pack.facts.filter((f) => f.confidence >= parsed.threshold) : [];
  if (!facts.length) {
    return { ok: false, error: parsed.lang === "en" ? "Not enough markets." : "没有足够的市场。" };
  }
  const story = parsed.lang === "en" ? pack.story_en : pack.story_zh;
  return {
    ok: true,
    theme: parsed.theme,
    threshold: parsed.threshold,
    lang: parsed.lang,
    facts,
    story,
    source: "fixture",
  };
}
