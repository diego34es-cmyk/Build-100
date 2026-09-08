/** PLAY-012 grading + scenario math. No DOM. */

export const TIME_LIMIT_SEC = 180;

export function annuityFV(monthly, annualRate, years) {
  if (!Number.isFinite(monthly) || !Number.isFinite(annualRate) || !Number.isFinite(years)) {
    return NaN;
  }
  if (monthly === 0 || years <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (Math.abs(r) < 1e-12) return monthly * n;
  return monthly * (Math.pow(1 + r, n) - 1) / r;
}

export function compoundGap({ monthly, annualRate, yearsFull, yearsLate }) {
  const full = annuityFV(monthly, annualRate, yearsFull);
  const late = annuityFV(monthly, annualRate, yearsLate);
  const principalSkipped = monthly * 12 * Math.max(0, yearsFull - yearsLate);
  return {
    full,
    late,
    gap: full - late,
    gapRatio: full === 0 ? 0 : (full - late) / full,
    principalSkipped,
  };
}

export function oddsResidual(price) {
  if (!Number.isFinite(price) || price <= 0 || price >= 1) return { ok: false, error: "price_range" };
  return {
    ok: true,
    price,
    implied: price,
    residual: 1 - price,
    payoutIfYes: 1 / price,
    profitIfYes: 1 / price - 1,
  };
}

export function leveredEquity(equity, leverage, spotMove) {
  if (![equity, leverage, spotMove].every(Number.isFinite)) return NaN;
  return equity * (1 + leverage * spotMove);
}

export function liquidateMove(leverage) {
  if (!Number.isFinite(leverage) || leverage === 0) return NaN;
  return -1 / leverage;
}

export function grade(correctId, pickedId, elapsedSec, timeLimitSec = TIME_LIMIT_SEC) {
  if (!Number.isFinite(elapsedSec) || elapsedSec < 0) {
    return { outcome: "invalid", ok: false, expected: correctId, picked: pickedId, elapsedSec };
  }
  if (pickedId == null || elapsedSec > timeLimitSec) {
    return {
      outcome: "timeout",
      ok: false,
      expected: correctId,
      picked: pickedId,
      elapsedSec,
      timeLimitSec,
    };
  }
  const ok = pickedId === correctId;
  return {
    outcome: ok ? "ok" : "wrong",
    ok,
    expected: correctId,
    picked: pickedId,
    elapsedSec,
    timeLimitSec,
  };
}

export function remainingMs(startedAt, now, timeLimitSec = TIME_LIMIT_SEC) {
  const end = startedAt + timeLimitSec * 1000;
  return Math.max(0, end - now);
}

export function shuffleInPlace(arr, rng = Math.random) {
  const a = arr;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
