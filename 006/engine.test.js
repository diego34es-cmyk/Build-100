import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseISODate,
  daysUntil,
  dueStatus,
  monthlyEquivalent,
  totalMonthly,
  soonestDue,
  rentPerSqm,
  moveInCost,
  compareRents,
  clampAptCount,
  packProgress,
  mergePack,
  toISODate,
  addDays,
  seedSubs,
} from "./engine.js";

const DAY = new Date(2026, 8, 3); // 2026-09-03 local

test("parseISODate rejects impossible dates", () => {
  assert.equal(parseISODate("2026-09-03")?.getDate(), 3);
  assert.equal(parseISODate("2026-02-31"), null);
  assert.equal(parseISODate("nope"), null);
});

test("daysUntil and dueStatus", () => {
  assert.equal(daysUntil("2026-09-03", DAY), 0);
  assert.equal(daysUntil("2026-09-10", DAY), 7);
  assert.equal(daysUntil("2026-09-02", DAY), -1);
  assert.equal(dueStatus("2026-09-02", DAY), "overdue");
  assert.equal(dueStatus("2026-09-10", DAY), "soon");
  assert.equal(dueStatus("2026-09-11", DAY), "ok");
  assert.equal(dueStatus("bad", DAY), "unknown");
});

test("monthlyEquivalent", () => {
  assert.equal(monthlyEquivalent(12, "monthly"), 12);
  assert.equal(monthlyEquivalent(30, "quarterly"), 10);
  assert.equal(monthlyEquivalent(120, "yearly"), 10);
  assert.equal(monthlyEquivalent(10, "weekly"), (10 * 52) / 12);
  assert.equal(monthlyEquivalent(-1, "monthly"), 0);
});

test("totalMonthly and soonestDue", () => {
  const subs = [
    { fee: 12, cycle: "monthly", next: "2026-09-20", name: "A" },
    { fee: 120, cycle: "yearly", next: "2026-09-05", name: "B" },
  ];
  assert.equal(totalMonthly(subs), 22);
  const soon = soonestDue(subs, DAY);
  assert.equal(soon.sub.name, "B");
  assert.equal(soon.days, 2);
});

test("rent metrics and compareRents winners", () => {
  assert.equal(rentPerSqm(900, 45), 20);
  assert.equal(rentPerSqm(900, 0), null);
  assert.equal(moveInCost(900, 1800), 2700);

  const cmp = compareRents([
    { id: "a", rent: 980, deposit: 1960, commute: 22, area: 42 },
    { id: "b", rent: 820, deposit: 820, commute: 38, area: 55 },
  ]);
  const a = cmp.rows.find((r) => r.id === "a");
  const b = cmp.rows.find((r) => r.id === "b");
  assert.equal(b.win.rent, true);
  assert.equal(a.win.rent, false);
  assert.equal(b.win.deposit, true);
  assert.equal(a.win.commute, true);
  assert.equal(b.win.area, true);
  assert.equal(b.win.moveIn, true);
  assert.ok(b.metrics.perSqm < a.metrics.perSqm);
  assert.equal(b.win.perSqm, true);
});

test("clampAptCount stays 2–4", () => {
  assert.equal(clampAptCount(1), 2);
  assert.equal(clampAptCount(2), 2);
  assert.equal(clampAptCount(4), 4);
  assert.equal(clampAptCount(9), 4);
});

test("packProgress and mergePack", () => {
  assert.deepEqual(packProgress([{ checked: true }, { checked: false }, { checked: true }]), {
    total: 3,
    done: 2,
    left: 1,
    pct: 67,
  });
  const items = mergePack("travel", {
    checked: { "t-passport": true },
    custom: [{ id: "c1", zh: "自拍杆", en: "Selfie stick" }],
  });
  assert.equal(items.find((i) => i.id === "t-passport").checked, true);
  assert.equal(items.find((i) => i.id === "c1").custom, true);
  assert.ok(items.length > 10);
});

test("seedSubs next dates are relative", () => {
  const seeds = seedSubs(DAY);
  assert.equal(seeds[0].next, toISODate(addDays(DAY, 4)));
  assert.equal(dueStatus(seeds[0].next, DAY), "soon");
});
