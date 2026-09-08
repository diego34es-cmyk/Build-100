import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildGrid, summarize, validatePlan } from "./engine.js";

const BASE = { capital: 1000, lower: 100, upper: 200, levels: 5, price: 150 };

describe("validatePlan", () => {
  it("rejects empty, inverted range, and price outside band", () => {
    assert.equal(validatePlan(null).error, "bad_input");
    assert.equal(validatePlan({ ...BASE, upper: 90 }).error, "range_order");
    assert.equal(validatePlan({ ...BASE, price: 50 }).error, "price_outside_range");
    assert.equal(validatePlan({ ...BASE, levels: 1 }).error, "levels_range");
    assert.equal(validatePlan(BASE).ok, true);
  });
});

describe("buildGrid", () => {
  it("is always dry-run and never flags live orders", () => {
    const g = buildGrid(BASE);
    assert.equal(g.ok, true);
    assert.equal(g.dryRun, true);
    assert.equal(g.liveOrders, false);
    assert.equal(g.rows.length, 5);
    assert.ok(g.rows.every((r) => r.side !== "BUY" && r.side !== "SELL"));
  });

  it("splits capital across working rungs and marks the spot", () => {
    const g = buildGrid(BASE);
    const buys = g.rows.filter((r) => r.side === "BUY_PAPER");
    const sells = g.rows.filter((r) => r.side === "SELL_PAPER");
    const marks = g.rows.filter((r) => r.side === "SPOT_MARK");
    assert.equal(marks.length, 1);
    assert.equal(buys.length + sells.length, 4);
    assert.ok(Math.abs(g.buyNotional + g.sellNotional - 1000) < 1e-6);
    assert.ok(buys.every((r) => r.price < 150));
    assert.ok(sells.every((r) => r.price > 150));
  });

  it("empty/error path returns structured error, not a worksheet", () => {
    const g = buildGrid({ ...BASE, capital: 0 });
    assert.equal(g.ok, false);
    assert.equal(g.rows, undefined);
  });
});

describe("summarize", () => {
  it("mentions paper and liveOrders=false", () => {
    const line = summarize(buildGrid(BASE));
    assert.match(line, /PAPER/);
    assert.match(line, /liveOrders=false/);
  });
});
