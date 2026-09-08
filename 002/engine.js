/** RETIRE-002 savings-only math. Keep in sync with the IIFE in index.html. No DOM. */

export const LIFE = 85;

/**
 * @param {number} age0 current age
 * @param {number} save monthly savings
 * @param {number} init starting balance
 * @param {number} dailyCost today's daily spend
 * @param {number} i inflation percent
 * @param {number} r nominal annual return percent
 */
export function compute(age0, save, init, dailyCost, i, r) {
  const maxK = LIFE - age0;
  const bal = new Array(maxK + 1);
  bal[0] = init;
  for (let k = 1; k <= maxK; k++) {
    bal[k] = bal[k - 1] * (1 + r / 100) + save * 12;
  }
  const Tmax = LIFE - 1 - age0;
  const need = new Array(maxK + 1);
  let R = null;
  for (let k2 = 0; k2 <= maxK; k2++) {
    let n = 0;
    for (let t = Tmax; t >= k2; t--) {
      n = (n + dailyCost * 365 * Math.pow(1 + i / 100, t)) / (1 + r / 100);
    }
    need[k2] = n * (1 + r / 100);
    if (R === null && k2 < maxK && bal[k2] >= need[k2]) R = age0 + k2;
  }
  return { bal, need, R, maxK };
}

export function validateInputs(vals) {
  if (vals == null || typeof vals !== "object") return "bad_input";
  const age = Number(vals.age);
  const save = Number(vals.save);
  if (!Number.isFinite(age) || age < 16 || age > 80) return "age_range";
  if (!Number.isFinite(save) || save < 0) return "save_range";
  return null;
}

export function normalizeInit(init) {
  const n = Number(init);
  return Number.isFinite(n) ? n : 0;
}
