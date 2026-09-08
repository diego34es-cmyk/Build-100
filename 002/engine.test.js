import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compute, LIFE, normalizeInit, validateInputs } from "./engine.js";

describe("validateInputs", () => {
  it("rejects empty and out-of-range age/save", () => {
    assert.equal(validateInputs(null), "bad_input");
    assert.equal(validateInputs({ age: 15, save: 1000 }), "age_range");
    assert.equal(validateInputs({ age: 81, save: 1000 }), "age_range");
    assert.equal(validateInputs({ age: 30, save: -1 }), "save_range");
    assert.equal(validateInputs({ age: 30, save: 0 }), null);
  });
});

describe("compute", () => {
  it("never treats age 85 as a real retirement age", () => {
    const r = compute(80, 0, 0, 65, 2, 1);
    assert.equal(LIFE, 85);
    assert.equal(r.maxK, 5);
    assert.equal(r.need[r.maxK], 0);
    assert.notEqual(r.R, 85);
  });

  it("higher savings retires no later", () => {
    const low = compute(30, 1000, 0, 65, 2.35, 1.75);
    const high = compute(30, 8000, 0, 65, 2.35, 1.75);
    assert.ok(high.R !== null);
    if (low.R === null) return;
    assert.ok(high.R <= low.R);
  });

  it("zero daily cost retires immediately at current age", () => {
    const r = compute(40, 0, 0, 0, 0, 0);
    assert.equal(r.R, 40);
  });
});

describe("normalizeInit", () => {
  it("maps NaN to 0 like the form", () => {
    assert.equal(normalizeInit(""), 0);
    assert.equal(normalizeInit("abc"), 0);
    assert.equal(normalizeInit(12000), 12000);
  });
});
