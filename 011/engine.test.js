import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TEMPLATES,
  getTemplate,
  mergeTemplate,
  checklistProgress,
  remainingItems,
  printLines,
} from "./engine.js";

test("three templates: NIE, rent, return", () => {
  assert.equal(DEFAULT_TEMPLATES.length, 3);
  assert.deepEqual(
    DEFAULT_TEMPLATES.map((t) => t.id),
    ["nie", "rent", "return"]
  );
  for (const t of DEFAULT_TEMPLATES) {
    assert.ok(t.items.length >= 8);
    for (const it of t.items) {
      assert.ok(it.zh && it.es, it.id + " needs zh+es");
    }
  }
});

test("getTemplate falls back to NIE", () => {
  assert.equal(getTemplate("nie").id, "nie");
  assert.equal(getTemplate("nope").id, "nie");
});

test("mergeTemplate checks + custom", () => {
  const t = getTemplate("nie");
  const items = mergeTemplate(t, {
    checked: { "nie-passport": true },
    custom: [{ id: "x", zh: "U盘", es: "USB" }],
  });
  assert.equal(items.find((i) => i.id === "nie-passport").checked, true);
  const custom = items.find((i) => i.id === "x");
  assert.equal(custom.custom, true);
  assert.equal(custom.es, "USB");
});

test("progress and remaining", () => {
  const items = [
    { id: "a", checked: true, zh: "甲", es: "A" },
    { id: "b", checked: false, zh: "乙", es: "B" },
    { id: "c", checked: false, zh: "丙", es: "C" },
  ];
  assert.deepEqual(checklistProgress(items), { total: 3, done: 1, left: 2, pct: 33 });
  assert.deepEqual(
    remainingItems(items).map((i) => i.id),
    ["b", "c"]
  );
});

test("printLines bilingual", () => {
  const items = [
    { checked: false, zh: "护照", es: "Pasaporte" },
    { checked: true, zh: "表格", es: "Formulario" },
  ];
  const zh = printLines(items, "zh");
  const es = printLines(items, "es");
  assert.equal(zh[0], "[ ] 护照 / Pasaporte");
  assert.equal(es[1], "[x] Formulario / 表格");
});
