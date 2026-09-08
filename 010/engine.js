/** DECIDE-010 scoring engine. No DOM. */

export const LIMITS = {
  minOptions: 2,
  maxOptions: 4,
  minCriteria: 2,
  maxCriteria: 6,
  minScore: 0,
  maxScore: 10,
  minWeight: 0,
  maxWeight: 5,
  maxTitle: 80,
  maxNote: 200,
  maxName: 24,
  maxOptNote: 80,
};

export const DEFAULT_PAPER = {
  title: "要不要换工作",
  note: "下个季度前做完决定。分数 0–10，权重 0–5。",
  options: [
    { id: "o1", name: "留下", note: "现岗位，熟悉但增长慢" },
    { id: "o2", name: "跳槽", note: "钱更多，适应成本也更高" },
    { id: "o3", name: "自己干", note: "接项目或创业，弹性最大" },
  ],
  criteria: [
    { id: "c1", name: "收入", weight: 3 },
    { id: "c2", name: "成长", weight: 2 },
    { id: "c3", name: "时间自由", weight: 2 },
    { id: "c4", name: "风险可控", weight: 3 },
  ],
  scores: {
    o1: { c1: 6, c2: 4, c3: 5, c4: 8 },
    o2: { c1: 8, c2: 7, c3: 4, c4: 5 },
    o3: { c1: 4, c2: 9, c3: 9, c4: 3 },
  },
};

export function clonePaper(paper) {
  return JSON.parse(JSON.stringify(paper));
}

export function defaultPaper() {
  return clonePaper(DEFAULT_PAPER);
}

export function clamp(n, lo, hi, fallback = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(hi, Math.max(lo, x));
}

export function clampScore(n) {
  return clamp(n, LIMITS.minScore, LIMITS.maxScore, 0);
}

export function clampWeight(n) {
  return clamp(n, LIMITS.minWeight, LIMITS.maxWeight, 1);
}

export function nid(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 8);
}

export function getScore(paper, oid, cid) {
  return clampScore(paper?.scores?.[oid]?.[cid]);
}

export function setScore(paper, oid, cid, value) {
  const next = clonePaper(paper);
  if (!next.scores) next.scores = {};
  if (!next.scores[oid]) next.scores[oid] = {};
  next.scores[oid][cid] = clampScore(value);
  return next;
}

function weightSumOf(criteria) {
  const list = criteria || [];
  const sum = list.reduce((a, c) => a + clampWeight(c.weight), 0);
  if (sum > 0) return { sum, equal: false };
  return { sum: list.length || 1, equal: true };
}

export function totals(paper) {
  const criteria = paper?.criteria || [];
  const options = paper?.options || [];
  const ws = weightSumOf(criteria);
  return options.map((opt) => {
    let raw = 0;
    for (const c of criteria) {
      const w = ws.equal ? 1 : clampWeight(c.weight);
      raw += getScore(paper, opt.id, c.id) * w;
    }
    const avg = ws.sum ? raw / ws.sum : 0;
    return {
      id: opt.id,
      name: opt.name || "",
      note: opt.note || "",
      raw,
      avg,
      weightSum: ws.sum,
      equalWeights: ws.equal,
    };
  });
}

export function ranked(paper) {
  return totals(paper)
    .slice()
    .sort((a, b) => b.avg - a.avg || b.raw - a.raw || String(a.name).localeCompare(String(b.name), "zh"));
}

export function leaders(paper) {
  const list = ranked(paper);
  if (!list.length) return [];
  const top = list[0].avg;
  return list.filter((x) => Math.abs(x.avg - top) < 1e-9);
}

export function addOption(paper) {
  const next = clonePaper(paper);
  if (next.options.length >= LIMITS.maxOptions) return next;
  const id = nid("o");
  next.options.push({
    id,
    name: "选项 " + (next.options.length + 1),
    note: "",
  });
  if (!next.scores) next.scores = {};
  next.scores[id] = {};
  for (const c of next.criteria) next.scores[id][c.id] = 5;
  return next;
}

export function removeOption(paper, id) {
  const next = clonePaper(paper);
  if (next.options.length <= LIMITS.minOptions) return next;
  if (!next.options.some((o) => o.id === id)) return next;
  next.options = next.options.filter((o) => o.id !== id);
  if (next.scores) delete next.scores[id];
  return next;
}

export function addCriterion(paper) {
  const next = clonePaper(paper);
  if (next.criteria.length >= LIMITS.maxCriteria) return next;
  const id = nid("c");
  next.criteria.push({
    id,
    name: "标准 " + (next.criteria.length + 1),
    weight: 1,
  });
  if (!next.scores) next.scores = {};
  for (const o of next.options) {
    if (!next.scores[o.id]) next.scores[o.id] = {};
    next.scores[o.id][id] = 5;
  }
  return next;
}

export function removeCriterion(paper, id) {
  const next = clonePaper(paper);
  if (next.criteria.length <= LIMITS.minCriteria) return next;
  if (!next.criteria.some((c) => c.id === id)) return next;
  next.criteria = next.criteria.filter((c) => c.id !== id);
  if (next.scores) {
    for (const oid of Object.keys(next.scores)) delete next.scores[oid][id];
  }
  return next;
}

export function updateOption(paper, id, fields) {
  const next = clonePaper(paper);
  const opt = next.options.find((o) => o.id === id);
  if (!opt) return next;
  if (fields.name !== undefined) opt.name = String(fields.name).slice(0, LIMITS.maxName);
  if (fields.note !== undefined) opt.note = String(fields.note).slice(0, LIMITS.maxOptNote);
  return next;
}

export function updateCriterion(paper, id, fields) {
  const next = clonePaper(paper);
  const c = next.criteria.find((x) => x.id === id);
  if (!c) return next;
  if (fields.name !== undefined) c.name = String(fields.name).slice(0, LIMITS.maxName);
  if (fields.weight !== undefined) c.weight = clampWeight(fields.weight);
  return next;
}

export function sanitizePaper(raw) {
  const base = defaultPaper();
  if (!raw || typeof raw !== "object") return base;

  const title = String(raw.title ?? "").slice(0, LIMITS.maxTitle);
  const note = String(raw.note ?? "").slice(0, LIMITS.maxNote);

  let options = Array.isArray(raw.options) ? raw.options : [];
  let criteria = Array.isArray(raw.criteria) ? raw.criteria : [];

  const seenO = new Set();
  options = options.slice(0, LIMITS.maxOptions).map((o, i) => {
    let id = String(o?.id || "o" + (i + 1)).slice(0, 24);
    if (!id || seenO.has(id)) id = "o" + (i + 1) + "_" + i;
    seenO.add(id);
    return {
      id,
      name: String(o?.name || "选项 " + (i + 1)).slice(0, LIMITS.maxName),
      note: String(o?.note || "").slice(0, LIMITS.maxOptNote),
    };
  });

  const seenC = new Set();
  criteria = criteria.slice(0, LIMITS.maxCriteria).map((c, i) => {
    let id = String(c?.id || "c" + (i + 1)).slice(0, 24);
    if (!id || seenC.has(id)) id = "c" + (i + 1) + "_" + i;
    seenC.add(id);
    return {
      id,
      name: String(c?.name || "标准 " + (i + 1)).slice(0, LIMITS.maxName),
      weight: clampWeight(c?.weight),
    };
  });

  while (options.length < LIMITS.minOptions) {
    const extra = base.options[options.length];
    options.push(extra ? clonePaper(extra) : { id: nid("o"), name: "选项 " + (options.length + 1), note: "" });
  }
  while (criteria.length < LIMITS.minCriteria) {
    const extra = base.criteria[criteria.length];
    criteria.push(extra ? clonePaper(extra) : { id: nid("c"), name: "标准 " + (criteria.length + 1), weight: 1 });
  }

  const scores = {};
  for (const o of options) {
    scores[o.id] = {};
    for (const c of criteria) {
      scores[o.id][c.id] = clampScore(raw.scores?.[o.id]?.[c.id]);
    }
  }

  return {
    title: title || base.title,
    note,
    options,
    criteria,
    scores,
  };
}

export function toMarkdown(paper) {
  const p = sanitizePaper(paper);
  const lead = leaders(p);
  const sorted = ranked(p);
  const lines = [];
  lines.push("# " + (p.title || "未命名决策"));
  lines.push("");
  if (p.note) {
    lines.push(p.note);
    lines.push("");
  }
  lines.push("> DECIDE-010 · 决策一页纸 · https://build-100.com/010/");
  lines.push("");
  lines.push("## 选项");
  for (const o of p.options) {
    lines.push("- **" + o.name + "**" + (o.note ? " — " + o.note : ""));
  }
  lines.push("");
  lines.push("## 标准与权重");
  lines.push("");
  lines.push("| 标准 | 权重 |");
  lines.push("| --- | ---: |");
  for (const c of p.criteria) {
    lines.push("| " + c.name + " | " + clampWeight(c.weight) + " |");
  }
  lines.push("");
  lines.push("## 打分（0–10）");
  lines.push("");
  const head = ["标准", ...p.options.map((o) => o.name)];
  lines.push("| " + head.join(" | ") + " |");
  lines.push("| " + head.map((_, i) => (i === 0 ? "---" : "---:")).join(" | ") + " |");
  for (const c of p.criteria) {
    const row = [
      c.name + " (×" + clampWeight(c.weight) + ")",
      ...p.options.map((o) => String(getScore(p, o.id, c.id))),
    ];
    lines.push("| " + row.join(" | ") + " |");
  }
  lines.push("");
  lines.push("## 加权汇总");
  lines.push("");
  lines.push("| 选项 | 加权均分 | 加权总分 |");
  lines.push("| --- | ---: | ---: |");
  for (const x of sorted) {
    const mark = lead.some((l) => l.id === x.id) ? " ←" : "";
    lines.push("| " + x.name + mark + " | " + x.avg.toFixed(2) + " | " + x.raw.toFixed(1) + " |");
  }
  lines.push("");
  if (lead.length === 1) {
    lines.push("**结论：** " + lead[0].name + "（加权均分 " + lead[0].avg.toFixed(2) + "）");
  } else if (lead.length > 1) {
    lines.push("**结论：** 并列 — " + lead.map((l) => l.name).join(" / "));
  }
  lines.push("");
  return lines.join("\n");
}

export function fileSlug(title) {
  const s = String(title || "decide-010")
    .trim()
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return (s || "decide-010") + ".md";
}
