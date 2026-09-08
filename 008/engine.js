/** REGRET-008 — already-paid subscription waste. No DOM. */

export const DAYS_PER_MONTH = 30;

export function computeRegret({ monthlyFee, months, usedDays }) {
  const fee = Number(monthlyFee);
  const m = Number(months);
  const used = Number(usedDays);

  if (![fee, m, used].every((n) => Number.isFinite(n))) {
    return { ok: false, error: "invalid_number" };
  }
  if (fee < 0 || m <= 0 || used < 0) {
    return { ok: false, error: "out_of_range" };
  }

  const totalDays = m * DAYS_PER_MONTH;
  const totalPaid = fee * m;
  const unusedDays = Math.max(0, totalDays - used);
  const dailyIfFull = totalDays > 0 ? totalPaid / totalDays : 0;
  const actualDaily = used > 0 ? totalPaid / used : null;
  const waste = unusedDays * dailyIfFull;
  const usageRate = totalDays > 0 ? used / totalDays : 0;

  return {
    ok: true,
    monthlyFee: fee,
    months: m,
    usedDays: used,
    totalDays,
    totalPaid,
    unusedDays,
    dailyIfFull,
    actualDaily,
    waste,
    usageRate,
    overUsed: used > totalDays,
  };
}

export function aggregate(items) {
  const rows = [];
  let totalPaid = 0;
  let waste = 0;
  let usedDays = 0;
  let totalDays = 0;
  for (const it of items || []) {
    const r = computeRegret(it);
    if (!r.ok) continue;
    rows.push({ ...it, ...r });
    totalPaid += r.totalPaid;
    waste += r.waste;
    usedDays += r.usedDays;
    totalDays += r.totalDays;
  }
  const actualDaily = usedDays > 0 ? totalPaid / usedDays : null;
  const dailyIfFull = totalDays > 0 ? totalPaid / totalDays : 0;
  return {
    rows,
    count: rows.length,
    totalPaid,
    waste,
    usedDays,
    totalDays,
    unusedDays: Math.max(0, totalDays - usedDays),
    actualDaily,
    dailyIfFull,
    usageRate: totalDays > 0 ? usedDays / totalDays : 0,
  };
}
