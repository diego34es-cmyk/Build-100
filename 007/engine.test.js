import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  basketTotal,
  basketLines,
  pppConvert,
  conclusion,
  roundMoney,
} from "./engine.js";

const data = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "data.json"), "utf8")
);

test("data.json has fx, date, madrid, four china cities, five basket items", () => {
  assert.equal(data.fx.base, "EUR");
  assert.equal(data.fx.quote, "CNY");
  assert.ok(data.fx.eur_cny > 0);
  assert.ok(data.updated);
  assert.equal(data.europe.id, "madrid");
  for (const id of ["beijing", "shanghai", "chengdu", "shenzhen"]) {
    assert.ok(data.china[id], id);
  }
  const ids = data.basket.items.map((i) => i.id);
  assert.deepEqual(ids, ["rent_1br", "coffee", "metro_pass", "takeout", "phone"]);
});

test("basket lines keep qty × unit and units are labeled", () => {
  const lines = basketLines(data.europe.prices, data.basket.items);
  assert.equal(lines.length, 5);
  const coffee = lines.find((l) => l.id === "coffee");
  assert.equal(coffee.qty, 20);
  assert.equal(coffee.line, coffee.unit * 20);
  assert.ok(data.europe.prices.rent_1br.unit_zh.includes("月"));
  assert.ok(data.europe.prices.coffee.unit_zh.includes("杯"));
});

test("ppp convert CNY → EUR and back is invertible", () => {
  const a = pppConvert({ amount: 20000, from: "cny", chinaId: "beijing", data });
  assert.equal(a.ok, true);
  assert.ok(a.salaryEur > 0);
  const b = pppConvert({ amount: a.salaryEur, from: "eur", chinaId: "beijing", data });
  assert.ok(Math.abs(b.salaryCny - 20000) < 1e-6);
  assert.ok(Math.abs(a.baskets - b.baskets) < 1e-9);
});

test("same purchasing power means equal basket counts", () => {
  const r = pppConvert({ amount: 15000, from: "cny", chinaId: "chengdu", data });
  const nChina = r.salaryCny / r.chinaTotal;
  const nMadrid = r.salaryEur / r.madridTotal;
  assert.ok(Math.abs(nChina - nMadrid) < 1e-9);
});

test("same CNY in a cheaper city is more purchasing power, so Madrid equivalent is higher", () => {
  const bj = pppConvert({ amount: 20000, from: "cny", chinaId: "beijing", data });
  const cd = pppConvert({ amount: 20000, from: "cny", chinaId: "chengdu", data });
  assert.ok(cd.chinaTotal < bj.chinaTotal);
  assert.ok(cd.salaryEur > bj.salaryEur);
});

test("conclusion names the selected city", () => {
  const r = pppConvert({ amount: 1, from: "cny", chinaId: "shanghai", data });
  assert.equal(conclusion(r, "zh"), "在马德里相当于国内上海的日子。");
  assert.equal(conclusion(r, "en"), "In Madrid this is the same living as in Shanghai.");
});

test("rejects bad amount / city / from", () => {
  assert.equal(pppConvert({ amount: -1, from: "cny", chinaId: "beijing", data }).ok, false);
  assert.equal(pppConvert({ amount: 10, from: "cny", chinaId: "paris", data }).ok, false);
  assert.equal(pppConvert({ amount: 10, from: "usd", chinaId: "beijing", data }).ok, false);
});

test("roundMoney", () => {
  assert.equal(roundMoney(1.005, 2), 1.01);
  assert.equal(basketTotal(data.europe.prices, data.basket.items), data.europe.prices.rent_1br.value * 1
    + data.europe.prices.coffee.value * 20
    + data.europe.prices.metro_pass.value * 1
    + data.europe.prices.takeout.value * 12
    + data.europe.prices.phone.value * 1);
});
