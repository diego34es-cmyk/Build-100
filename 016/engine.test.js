import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  DEFAULT_REVIEW_DAYS,
  createItem,
  isValidUrl,
  parseUrl,
  listDueForReview,
  listItems,
  keepItem,
  archiveItem,
  deleteItem,
  loadState,
  saveState,
  computeStats,
  exportJson,
  importJson,
  parseImport,
  emptyState,
  addLocalDays,
  startOfLocalDay,
  endOfLocalDay,
  localDayDiff,
  isDue,
  isGraveyard,
  buildShareText,
  openHref,
  displayTitle,
} from "./engine.js";

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

function localMs(y, m, d, h = 12, min = 0) {
  return new Date(y, m - 1, d, h, min, 0, 0).getTime();
}

function item(over = {}) {
  const now = over.createdAt ?? localMs(2026, 9, 1, 12);
  return {
    id: "i1",
    url: "https://example.com/x",
    title: "Ex",
    why: "need this later",
    createdAt: now,
    nextReviewAt: now,
    status: "active",
    ...over,
  };
}

test("storage key and default review days", () => {
  assert.equal(STORAGE_KEY, "whysave-016");
  assert.equal(DEFAULT_REVIEW_DAYS, 7);
});

test("empty why is rejected (including whitespace)", () => {
  const url = "https://x.com/status/1";
  assert.equal(createItem({ url, why: "" }).error, "missing_why");
  assert.equal(createItem({ url, why: "   " }).error, "missing_why");
  assert.equal(createItem({ url, why: "\n\t" }).error, "missing_why");
  assert.equal(createItem({ url }).error, "missing_why");
  assert.equal(createItem({ url, why: "  keep  " }).ok, true);
  assert.equal(createItem({ url, why: "  keep  " }).item.why, "keep");
});

test("bad URL is rejected: javascript / data / other schemes", () => {
  const why = "reason";
  assert.equal(createItem({ url: "javascript:alert(1)", why }).error, "bad_scheme");
  assert.equal(createItem({ url: "JAVASCRIPT:alert(1)", why }).error, "bad_scheme");
  assert.equal(createItem({ url: "data:text/html,<h1>x</h1>", why }).error, "bad_scheme");
  assert.equal(createItem({ url: "file:///etc/passwd", why }).error, "bad_scheme");
  assert.equal(createItem({ url: "blob:https://x", why }).error, "bad_scheme");
  assert.equal(createItem({ url: "ftp://files.example.com", why }).error, "bad_scheme");
  assert.equal(createItem({ url: "mailto:a@b.com", why }).error, "bad_scheme");
  assert.equal(createItem({ url: "", why }).error, "missing_url");
  assert.equal(createItem({ url: "   ", why }).error, "missing_url");
  assert.equal(createItem(null).error, "invalid_item");
  assert.equal(createItem({ url: "https://", why }).ok, false);
  assert.equal(isValidUrl("javascript:alert(1)"), false);
  assert.equal(isValidUrl("data:text/html,hi"), false);
  assert.equal(isValidUrl("https://ok.example"), true);
  assert.equal(isValidUrl("http://ok.example/a"), true);
  assert.equal(openHref("javascript:alert(1)"), null);
  assert.equal(openHref("https://ok.example/a"), "https://ok.example/a");
  assert.equal(parseUrl("data:text/html,x").error, "bad_scheme");
});

test("http and https are accepted; title is optional", () => {
  const a = createItem({ url: "https://ok.example/p", why: "read later" });
  assert.equal(a.ok, true);
  assert.equal(a.item.url, "https://ok.example/p");
  assert.equal(a.item.title, "");
  assert.equal(a.item.status, "active");
  const b = createItem({ url: "http://insecure.example/z", title: "  Keep ", why: "note" });
  assert.equal(b.ok, true);
  assert.equal(b.item.title, "Keep");
  const c = createItem({ url: "bare.example/z", why: "host" });
  assert.equal(c.ok, true);
  assert.equal(c.item.url.startsWith("https://bare.example/z"), true);
  assert.equal(displayTitle({ title: "", url: "https://bare.example/z" }), "bare.example");
});

test("new item nextReviewAt is createdAt + reviewDays and is not due the same day", () => {
  const now = localMs(2026, 9, 13, 15, 30);
  const v = createItem({ url: "https://a.example/p", why: "for the essay" }, now, 7);
  assert.equal(v.ok, true);
  assert.equal(v.item.nextReviewAt, addLocalDays(now, 7));
  const next = new Date(v.item.nextReviewAt);
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 8);
  assert.equal(next.getDate(), 20);
  assert.equal(next.getHours(), 15);
  assert.equal(v.item.lastReviewedAt, undefined);
  assert.equal(listDueForReview([v.item], now).length, 0);
  assert.equal(isDue(v.item, now), false);
});

test("never-reviewed is not an independent queue condition", () => {
  const now = localMs(2026, 9, 13, 12);
  const fresh = createItem({ url: "https://a.example/new", why: "fresh" }, now, 7).item;
  assert.equal(fresh.lastReviewedAt, undefined);
  assert.equal(listDueForReview([fresh], now).length, 0);

  const overdueNever = item({
    id: "old",
    lastReviewedAt: undefined,
    nextReviewAt: localMs(2026, 9, 10, 9),
    createdAt: localMs(2026, 9, 3, 9),
  });
  delete overdueNever.lastReviewedAt;
  const due = listDueForReview([fresh, overdueNever], now);
  assert.deepEqual(due.map((x) => x.id), ["old"]);
});

test("due uses local calendar day end, not raw timestamp vs now", () => {
  const now = localMs(2026, 9, 13, 9);
  const laterToday = localMs(2026, 9, 13, 21);
  const tomorrowStart = localMs(2026, 9, 14, 0);
  const yesterday = localMs(2026, 9, 12, 23, 50);

  const later = item({ id: "later", nextReviewAt: laterToday });
  const tom = item({ id: "tom", nextReviewAt: tomorrowStart });
  const yest = item({ id: "yest", nextReviewAt: yesterday });
  const archived = item({ id: "arch", nextReviewAt: yesterday, status: "archived" });

  const due = listDueForReview([later, tom, yest, archived], now);
  assert.deepEqual(due.map((x) => x.id), ["yest", "later"]);
  assert.equal(isDue(later, now), true);
  assert.equal(isDue(tom, now), false);
  assert.equal(endOfLocalDay(now), new Date(2026, 8, 13, 23, 59, 59, 999).getTime());
  assert.equal(new Date(startOfLocalDay(laterToday)).getDate(), 13);
});

test("keep stays active, stamps lastReviewedAt, reschedules, leaves today's queue", () => {
  const now = localMs(2026, 9, 13, 10);
  const items = [item({ id: "k1", nextReviewAt: now, status: "active" })];
  assert.equal(listDueForReview(items, now).length, 1);
  const r = keepItem(items, "k1", now, 7);
  assert.equal(r.ok, true);
  assert.equal(r.item.status, "active");
  assert.equal(r.item.lastReviewedAt, now);
  assert.equal(r.item.nextReviewAt, addLocalDays(now, 7));
  assert.equal(listDueForReview(r.items, now).length, 0);
  assert.equal(listDueForReview(r.items, addLocalDays(now, 6)).length, 0);
  assert.equal(listDueForReview(r.items, addLocalDays(now, 7)).length, 1);
});

test("archive leaves main list and review queue; still retrievable as archived", () => {
  const now = localMs(2026, 9, 13, 10);
  const items = [
    item({ id: "a", nextReviewAt: now }),
    item({ id: "b", nextReviewAt: addLocalDays(now, 3) }),
  ];
  const r = archiveItem(items, "a", now);
  assert.equal(r.ok, true);
  assert.equal(r.item.status, "archived");
  assert.equal(r.item.lastReviewedAt, now);
  assert.equal(listDueForReview(r.items, now).length, 0);
  assert.deepEqual(listItems(r.items, "active").map((x) => x.id), ["b"]);
  assert.deepEqual(listItems(r.items, "archived").map((x) => x.id), ["a"]);
  assert.equal(r.items.length, 2);
});

test("delete removes the item permanently", () => {
  const items = [item({ id: "gone" }), item({ id: "stay" })];
  const r = deleteItem(items, "gone");
  assert.equal(r.ok, true);
  assert.deepEqual(r.items.map((x) => x.id), ["stay"]);
  const miss = deleteItem(r.items, "gone");
  assert.equal(miss.ok, false);
  assert.equal(miss.error, "not_found");
});

test("stats: active, due today, graveyard = overdue more than one reviewDays", () => {
  const now = localMs(2026, 9, 20, 12);
  const days = 7;
  const items = [
    item({ id: "today", nextReviewAt: localMs(2026, 9, 20, 8), status: "active" }),
    item({ id: "eq7", nextReviewAt: localMs(2026, 9, 13, 12), status: "active" }),
    item({ id: "over", nextReviewAt: localMs(2026, 9, 12, 12), status: "active" }),
    item({ id: "future", nextReviewAt: localMs(2026, 9, 27, 12), status: "active" }),
    item({ id: "arch", nextReviewAt: localMs(2026, 9, 1, 12), status: "archived" }),
  ];
  const s = computeStats(items, now, days);
  assert.equal(s.active, 4);
  assert.equal(s.due, 3);
  assert.equal(s.graveyard, 1);
  assert.equal(isGraveyard(items[1], now, days), false);
  assert.equal(isGraveyard(items[2], now, days), true);
  assert.equal(isGraveyard(items[4], now, days), false);
  assert.equal(localDayDiff(localMs(2026, 9, 12, 12), now), 8);
  assert.equal(localDayDiff(localMs(2026, 9, 13, 12), now), 7);
});

test("storage roundtrip keeps why, dates, status", () => {
  const now = localMs(2026, 9, 13, 16);
  const created = createItem(
    { url: "https://ex.ample/p", title: "T", why: "because the thread" },
    now,
    7
  );
  assert.equal(created.ok, true);
  const storage = mem();
  const saved = saveState(
    { items: [created.item], settings: { reviewDays: 7 } },
    storage
  );
  assert.equal(storage.getItem(STORAGE_KEY).includes("because the thread"), true);
  assert.equal(saved.items[0].why, "because the thread");
  const loaded = loadState(storage);
  assert.equal(loaded.items.length, 1);
  assert.equal(loaded.items[0].url, created.item.url);
  assert.equal(loaded.items[0].why, "because the thread");
  assert.equal(loaded.items[0].title, "T");
  assert.equal(loaded.items[0].nextReviewAt, created.item.nextReviewAt);
  assert.equal(loaded.items[0].createdAt, created.item.createdAt);
  assert.equal(loaded.items[0].status, "active");
  assert.equal(loaded.settings.reviewDays, 7);
  const again = loadState(storage);
  assert.deepEqual(again, loaded);
});

test("import uses the same createItem checks; export roundtrips", () => {
  const now = localMs(2026, 9, 13, 12);
  const raw = JSON.stringify({
    items: [
      { url: "https://ok.example/x", why: "good" },
      { url: "javascript:alert(1)", why: "xss" },
      { url: "https://ok.example/y", why: "  " },
      { url: "data:text/html,hi", why: "html" },
    ],
  });
  const r = importJson(emptyState(), raw, now);
  assert.equal(r.ok, true);
  assert.equal(r.imported, 1);
  assert.equal(r.skipped, 3);
  assert.equal(r.state.items[0].why, "good");
  assert.equal(r.state.items[0].status, "active");
  assert.equal(r.state.items[0].nextReviewAt, addLocalDays(now, 7));

  const dumped = exportJson(r.state);
  const parsed = parseImport(dumped, now, 7);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].why, "good");

  const bad = parseImport("{not json", now);
  assert.equal(bad.ok, false);
  assert.equal(bad.error, "invalid_json");
});

test("share text mentions today's counts", () => {
  const stats = { active: 10, due: 2, graveyard: 1 };
  const due = [
    item({ why: "write this up" }),
    item({ why: "for the weekly" }),
  ];
  const zh = buildShareText({ stats, due, lang: "zh" });
  assert.match(zh, /待复盘 2/);
  assert.match(zh, /坟场风险 1/);
  assert.match(zh, /write this up/);
  assert.match(zh, /build-100\.com\/016/);
  const en = buildShareText({ stats, due, lang: "en" });
  assert.match(en, /2 due/);
  assert.match(en, /graveyard/);
});
