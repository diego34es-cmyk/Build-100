/** Paper-only price grid. Never places, signs, or sends orders. */

export const LIMITS = {
  capital: { min: 1, max: 10_000_000 },
  levels: { min: 2, max: 40 },
  price: { min: 0.0001, max: 1_000_000 },
};

export function validatePlan(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "bad_input" };
  const capital = Number(input.capital);
  const lower = Number(input.lower);
  const upper = Number(input.upper);
  const levels = Number(input.levels);
  const price = Number(input.price);
  if (![capital, lower, upper, levels, price].every(Number.isFinite)) {
    return { ok: false, error: "not_finite" };
  }
  if (capital < LIMITS.capital.min || capital > LIMITS.capital.max) return { ok: false, error: "capital_range" };
  if (!Number.isInteger(levels) || levels < LIMITS.levels.min || levels > LIMITS.levels.max) {
    return { ok: false, error: "levels_range" };
  }
  if (lower < LIMITS.price.min || upper < LIMITS.price.min || price < LIMITS.price.min) {
    return { ok: false, error: "price_range" };
  }
  if (upper <= lower) return { ok: false, error: "range_order" };
  if (price < lower || price > upper) return { ok: false, error: "price_outside_range" };
  return { ok: true, capital, lower, upper, levels, price };
}

/**
 * Equal-notional arithmetic grid. Buys below spot, sells above spot.
 * Always dry-run: output is a worksheet, not an order ticket.
 */
export function buildGrid(input) {
  const parsed = validatePlan(input);
  if (!parsed.ok) return parsed;
  const { capital, lower, upper, levels, price } = parsed;
  const step = (upper - lower) / (levels - 1);
  const rungs = [];
  for (let i = 0; i < levels; i++) {
    const rungPrice = Number((lower + step * i).toFixed(8));
    const side = rungPrice < price ? "BUY_PAPER" : rungPrice > price ? "SELL_PAPER" : "SPOT_MARK";
    rungs.push({ i, price: rungPrice, side });
  }
  const working = rungs.filter((r) => r.side !== "SPOT_MARK");
  const notional = working.length ? capital / working.length : 0;
  const rows = rungs.map((r) => {
    if (r.side === "SPOT_MARK") {
      return { ...r, qty: 0, notional: 0, note: "mark only — no paper order" };
    }
    const qty = notional / r.price;
    return { ...r, qty, notional, note: "paper worksheet" };
  });
  const buyNotional = rows.filter((r) => r.side === "BUY_PAPER").reduce((s, r) => s + r.notional, 0);
  const sellNotional = rows.filter((r) => r.side === "SELL_PAPER").reduce((s, r) => s + r.notional, 0);
  return {
    ok: true,
    dryRun: true,
    liveOrders: false,
    capital,
    spot: price,
    step,
    rows,
    buyNotional,
    sellNotional,
    leftover: Number((capital - buyNotional - sellNotional).toFixed(8)),
  };
}

export function summarize(plan) {
  if (!plan.ok) return plan.error;
  return `PAPER ${plan.rows.length} rungs · buy ${plan.buyNotional.toFixed(2)} · sell ${plan.sellNotional.toFixed(2)} · liveOrders=${plan.liveOrders}`;
}
