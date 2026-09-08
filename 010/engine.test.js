import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DEFAULT_PAPER,
  LIMITS,
  addCriterion,
  addOption,
  clampScore,
  clampWeight,
  defaultPaper,
  fileSlug,
  getScore,
  leaders,
  ranked,
  removeCriterion,
  removeOption,
  sanitizePaper,
  setScore,
  toMarkdown,
  totals,
  updateCriterion,
} from "./engine.js";

const root = dirname(fileURLToPath(import.meta.url));

test("default.json matches engine default", () => {
  const disk = JSON.parse(readFileSync(join(root, "default.json"), "utf8"));
  assert.deepEqual(disk, DEFAULT_PAPER);
});

test("default paper: 跳槽 wins at 6.10", () => {
  const t = totals(defaultPaper());
  const by = Object.fromEntries(t.map((x) => [x.name, x]));
  assert.equal(by["留下"].avg, 6);
  assert.equal(by["留下"].raw, 60);
  assert.equal(Number(by["跳槽"].avg.toFixed(2)), 6.1);
  assert.equal(by["跳槽"].raw, 61);
  assert.equal(Number(by["自己干"].avg.toFixed(2)), 5.7);
  assert.equal(leaders(defaultPaper())[0].name, "跳槽");
  assert.equal(ranked(defaultPaper())[0].name, "跳槽");
});

test("all-zero weights fall back to equal weight", () => {
  const p = defaultPaper();
  p.criteria.forEach((c) => {
    c.weight = 0;
  });
  const t = totals(p);
  const stay = t.find((x) => x.name === "留下");
  assert.equal(stay.equalWeights, true);
  assert.equal(stay.raw, 6 + 4 + 5 + 8);
  assert.equal(stay.avg, stay.raw / 4);
});

test("setScore clamps to 0–10", () => {
  let p = defaultPaper();
  p = setScore(p, "o1", "c1", 99);
  assert.equal(getScore(p, "o1", "c1"), 10);
  p = setScore(p, "o1", "c1", -3);
  assert.equal(getScore(p, "o1", "c1"), 0);
  assert.equal(clampScore("nope"), 0);
  assert.equal(clampWeight(9), 5);
});

test("add/remove respect 2–4 options and 2–6 criteria", () => {
  let p = defaultPaper();
  assert.equal(p.options.length, 3);
  p = addOption(p);
  assert.equal(p.options.length, 4);
  const frozen = addOption(p);
  assert.equal(frozen.options.length, LIMITS.maxOptions);
  p = removeOption(p, p.options[3].id);
  assert.equal(p.options.length, 3);
  p = removeOption(p, p.options[2].id);
  assert.equal(p.options.length, 2);
  const minned = removeOption(p, p.options[0].id);
  assert.equal(minned.options.length, LIMITS.minOptions);

  p = defaultPaper();
  p = addCriterion(p);
  p = addCriterion(p);
  assert.equal(p.criteria.length, 6);
  assert.equal(addCriterion(p).criteria.length, 6);
  p = removeCriterion(p, p.criteria[5].id);
  assert.equal(p.criteria.length, 5);
});

test("sanitize repairs garbage and fills minimums", () => {
  const p = sanitizePaper({
    title: "x".repeat(200),
    options: [{ name: "A" }],
    criteria: [{ name: "K", weight: 80 }],
    scores: { o1: { c1: 12 } },
  });
  assert.equal(p.title.length, LIMITS.maxTitle);
  assert.equal(p.options.length, 2);
  assert.equal(p.criteria.length, 2);
  assert.equal(p.criteria[0].weight, 5);
  assert.ok(p.scores[p.options[0].id][p.criteria[0].id] <= 10);
  assert.deepEqual(sanitizePaper(null).options.map((o) => o.id), DEFAULT_PAPER.options.map((o) => o.id));
});

test("markdown export names the winner and is offline-friendly", () => {
  const md = toMarkdown(defaultPaper());
  assert.match(md, /^# 要不要换工作/m);
  assert.match(md, /跳槽 ←/);
  assert.match(md, /\*\*结论：\*\* 跳槽/);
  assert.match(md, /build-100\.com\/010/);
  assert.equal(fileSlug("要不要换工作"), "要不要换工作.md");
  assert.equal(fileSlug("a/b c"), "a-b-c.md");
});

test("tied leaders both surface", () => {
  const p = defaultPaper();
  p.criteria.forEach((c) => {
    c.weight = 1;
  });
  p.options = p.options.slice(0, 2);
  p.criteria = p.criteria.slice(0, 2);
  p.scores = {
    o1: { c1: 5, c2: 5 },
    o2: { c1: 5, c2: 5 },
  };
  const lead = leaders(p);
  assert.equal(lead.length, 2);
  assert.match(toMarkdown(p), /并列/);
});

test("updateCriterion weight is clamped", () => {
  const p = updateCriterion(defaultPaper(), "c1", { weight: -2, name: "钱" });
  assert.equal(p.criteria[0].weight, 0);
  assert.equal(p.criteria[0].name, "钱");
});
