/** INTUIT-009 delay-cost calculator. No DOM. */

const LIMITS = {
  monthly: { min: 0, max: 10_000_000 },
  years: { min: 1, max: 80 },
  annualRate: { min: -0.5, max: 0.5 },
  delayYears: { min: 0, max: 79 },
};

export { LIMITS };

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

export function catchUpMonthly(targetFV, annualRate, years) {
  if (!Number.isFinite(targetFV) || !Number.isFinite(annualRate) || !Number.isFinite(years)) {
    return NaN;
  }
  if (years <= 0) return Infinity;
  if (targetFV === 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (Math.abs(r) < 1e-12) return targetFV / n;
  return targetFV * r / (Math.pow(1 + r, n) - 1);
}

export function validateDelayInput(input) {
  if (!input || typeof input !== "object") return "bad_input";
  const { monthly, annualRate, years, delayYears } = input;
  if (![monthly, annualRate, years, delayYears].every(Number.isFinite)) return "not_finite";
  if (monthly < LIMITS.monthly.min || monthly > LIMITS.monthly.max) return "monthly_range";
  if (years < LIMITS.years.min || years > LIMITS.years.max) return "years_range";
  if (annualRate < LIMITS.annualRate.min || annualRate > LIMITS.annualRate.max) return "rate_range";
  if (delayYears < LIMITS.delayYears.min || delayYears > LIMITS.delayYears.max) return "delay_range";
  if (delayYears < 0) return "delay_range";
  return null;
}

/**
 * Cost of starting a monthly savings plan `delayYears` later.
 * Ordinary annuity (end of month). Nominal annual rate, no inflation.
 */
export function delayCost(input) {
  const error = validateDelayInput(input);
  if (error) return { ok: false, error };

  const monthly = input.monthly;
  const annualRate = input.annualRate;
  const years = input.years;
  const delayYears = input.delayYears;
  const laterYears = Math.max(0, years - delayYears);

  const now = annuityFV(monthly, annualRate, years);
  const later = annuityFV(monthly, annualRate, laterYears);
  const gap = now - later;
  const gapRatio = now === 0 ? 0 : gap / now;
  const catchUp = catchUpMonthly(now, annualRate, laterYears);
  const extraMonthly = Number.isFinite(catchUp) ? catchUp - monthly : Infinity;

  return {
    ok: true,
    monthly,
    annualRate,
    years,
    delayYears,
    laterYears,
    now,
    later,
    gap,
    gapRatio,
    catchUpMonthly: catchUp,
    extraMonthly,
    reachable: laterYears > 0 && Number.isFinite(catchUp),
  };
}
