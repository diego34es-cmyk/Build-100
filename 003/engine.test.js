import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, SLOT_KEYS } from "./engine.js";

describe("buildPrompt · empty", () => {
  it("returns empty when no input", () => {
    const r = buildPrompt("");
    assert.equal(r.empty, true);
    assert.equal(r.prompt, "");
  });
});

describe("buildPrompt · coding review expands longer", () => {
  const raw =
    "你是资深前端，帮我审查这段 React 登录表单代码：找出安全风险和可维护性问题，按严重程度排序，输出 Markdown 列表，不要改无关文件";

  it("returns paste-ready prose longer than input", () => {
    const r = buildPrompt(raw);
    assert.equal(r.empty, false);
    assert.ok(r.prompt.length > raw.length);
    assert.doesNotMatch(r.prompt, /## Goal/);
    assert.match(r.prompt, /资深前端|代码审查/);
    assert.match(r.prompt, /严重程度/);
    assert.match(r.prompt, /Markdown/);
    assert.match(r.prompt, /无关文件/);
  });

  it("mentions security and maintainability elaboration", () => {
    const r = buildPrompt(raw);
    assert.match(r.prompt, /安全/);
    assert.match(r.prompt, /可维护/);
  });
});

describe("buildPrompt · leave email", () => {
  it("expands into sendable-email instructions", () => {
    const raw = "帮我写一封给老板的请假邮件，正式语气，不超过200字，说明周一发烧";
    const r = buildPrompt(raw);
    assert.ok(r.prompt.length > raw.length);
    assert.match(r.prompt, /老板/);
    assert.match(r.prompt, /正式|专业/);
    assert.match(r.prompt, /200/);
    assert.match(r.prompt, /邮件/);
  });
});

describe("buildPrompt · English expands", () => {
  it("expands onboarding email JSON request", () => {
    const raw =
      "Generate a user onboarding email in a friendly tone, under 120 words, as JSON with subject and body";
    const r = buildPrompt(raw);
    assert.ok(r.prompt.length > raw.length);
    assert.doesNotMatch(r.prompt, /## /);
    assert.match(r.prompt, /JSON/i);
    assert.match(r.prompt, /120/);
    assert.match(r.prompt, /friendly|conversational/i);
  });
});

describe("buildPrompt · thin input", () => {
  it("你好 asks clarifying questions in prose", () => {
    const r = buildPrompt("你好");
    assert.equal(r.thin, true);
    assert.match(r.prompt, /追问|问清/);
  });

  it("写周报 asks for materials first", () => {
    const r = buildPrompt("写周报");
    assert.match(r.prompt, /周报|汇报|问/);
  });
});

describe("buildPrompt · false positives", () => {
  it("会议纪要 does not force action-item wording; 行动项 does", () => {
    const a = buildPrompt("把这段会议录音要点整理成纪要，给项目组看");
    assert.match(a.prompt, /项目组/);
    assert.doesNotMatch(a.prompt, /行动项/);

    const b = buildPrompt("把这段会议录音要点整理成行动项，给项目组看");
    assert.match(b.prompt, /行动项/);
  });
});

describe("buildPrompt · overrides", () => {
  it("format override appears in prose", () => {
    const r = buildPrompt("总结这篇文章", { format: "分点列表" });
    assert.match(r.prompt, /分点列表/);
  });
});

describe("SLOT_KEYS", () => {
  it("is PICCO five", () => {
    assert.deepEqual(SLOT_KEYS, ["persona", "goal", "context", "constraints", "output"]);
  });
});
