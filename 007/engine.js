/** PPP-007 — purchasing-power math. No DOM. */

export function roundMoney(n, digits = 2) {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function chinaCity(data, chinaId) {
  if (!data?.china) return null;
  return data.china[chinaId] || null;
}

export function basketLines(prices, items) {
  if (!prices || !Array.isArray(items)) throw new Error("bad basket");
  return items.map((item) => {
    const p = prices[item.id];
    if (!p || !Number.isFinite(Number(p.value))) {
      throw new Error("missing price: " + item.id);
    }
    const qty = Number(item.qty);
    const unit = Number(p.value);
    if (!Number.isFinite(qty) || qty < 0) throw new Error("bad qty: " + item.id);
    return {
      id: item.id,
      qty,
      unit,
      line: unit * qty,
      label_zh: item.label_zh,
      label_en: item.label_en,
      qty_unit_zh: item.qty_unit_zh || "",
      qty_unit_en: item.qty_unit_en || "",
      unit_zh: p.unit_zh,
      unit_en: p.unit_en,
      note_zh: p.note_zh || "",
      note_en: p.note_en || "",
    };
  });
}

export function basketTotal(prices, items) {
  return basketLines(prices, items).reduce((s, l) => s + l.line, 0);
}

/**
 * Same-basket PPP: S_madrid / basket_madrid = S_china / basket_china.
 * Baskets stay in local currency; FX is only for a side-by-side cost ratio.
 *
 * from: "cny" | "eur"
 */
export function pppConvert({ amount, from, chinaId, data }) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) return { ok: false, error: "invalid_amount" };
  if (!data?.europe?.prices || !data?.basket?.items || !data?.fx) {
    return { ok: false, error: "bad_data" };
  }
  const city = chinaCity(data, chinaId);
  if (!city) return { ok: false, error: "unknown_city" };

  const items = data.basket.items;
  let madridTotal;
  let chinaTotal;
  let linesMadrid;
  let linesChina;
  try {
    linesMadrid = basketLines(data.europe.prices, items);
    linesChina = basketLines(city.prices, items);
    madridTotal = linesMadrid.reduce((s, l) => s + l.line, 0);
    chinaTotal = linesChina.reduce((s, l) => s + l.line, 0);
  } catch {
    return { ok: false, error: "bad_basket" };
  }
  if (!(madridTotal > 0) || !(chinaTotal > 0)) return { ok: false, error: "empty_basket" };

  const fx = Number(data.fx.eur_cny);
  if (!(fx > 0)) return { ok: false, error: "bad_fx" };

  const eurPerCnyPpp = madridTotal / chinaTotal;
  const cnyPerEurPpp = chinaTotal / madridTotal;

  let salaryCny;
  let salaryEur;
  if (from === "cny") {
    salaryCny = amt;
    salaryEur = amt * eurPerCnyPpp;
  } else if (from === "eur") {
    salaryEur = amt;
    salaryCny = amt * cnyPerEurPpp;
  } else {
    return { ok: false, error: "bad_from" };
  }

  const madridCnyFx = madridTotal * fx;
  const chinaEurFx = chinaTotal / fx;
  const costRatio = madridCnyFx / chinaTotal;
  const baskets = chinaTotal > 0 ? salaryCny / chinaTotal : 0;

  return {
    ok: true,
    from,
    salaryCny,
    salaryEur,
    madridTotal,
    chinaTotal,
    madridCnyFx,
    chinaEurFx,
    fx,
    costRatio,
    baskets,
    fxSalaryEur: salaryCny / fx,
    fxSalaryCny: salaryEur * fx,
    city,
    europe: data.europe,
    linesMadrid,
    linesChina,
    updated: data.updated || "",
  };
}

export function conclusion(result, lang) {
  if (!result?.ok || !result.city) return "";
  const city = lang === "en" ? result.city.name_en : result.city.name_zh;
  if (lang === "en") return `In Madrid this is the same living as in ${city}.`;
  return `在马德里相当于国内${city}的日子。`;
}
