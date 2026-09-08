/** LIFE-006 — pure functions, no DOM. */

export const SOON_DAYS = 7;

export const CYCLES = [
  { id: "weekly", perYear: 52 },
  { id: "monthly", perYear: 12 },
  { id: "quarterly", perYear: 4 },
  { id: "yearly", perYear: 1 },
];

const CYCLE_SET = new Set(CYCLES.map((c) => c.id));

export function parseISODate(s) {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d, n) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Whole days from today (start of local day) to iso date. Negative = overdue. */
export function daysUntil(iso, today = new Date()) {
  const d = parseISODate(iso);
  if (!d) return null;
  return Math.round((startOfDay(d) - startOfDay(today)) / 86400000);
}

export function dueStatus(iso, today = new Date(), soonDays = SOON_DAYS) {
  const n = daysUntil(iso, today);
  if (n === null) return "unknown";
  if (n < 0) return "overdue";
  if (n <= soonDays) return "soon";
  return "ok";
}

export function monthlyEquivalent(amount, cycle) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (cycle === "weekly") return (n * 52) / 12;
  if (cycle === "monthly") return n;
  if (cycle === "quarterly") return n / 3;
  if (cycle === "yearly") return n / 12;
  return n;
}

export function totalMonthly(subs) {
  if (!Array.isArray(subs)) return 0;
  return subs.reduce((sum, s) => sum + monthlyEquivalent(s.fee, s.cycle), 0);
}

export function soonestDue(subs, today = new Date()) {
  if (!Array.isArray(subs) || !subs.length) return null;
  let best = null;
  for (const s of subs) {
    const n = daysUntil(s.next, today);
    if (n === null) continue;
    if (!best || n < best.days) best = { sub: s, days: n };
  }
  return best;
}

export function normalizeSub(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim().slice(0, 80);
  const fee = Number(raw.fee);
  const cycle = CYCLE_SET.has(raw.cycle) ? raw.cycle : "monthly";
  const next = parseISODate(raw.next) ? String(raw.next).trim() : "";
  const id = String(raw.id || "").slice(0, 64);
  if (!id) return null;
  return {
    id,
    name,
    fee: Number.isFinite(fee) && fee >= 0 ? fee : 0,
    cycle,
    next,
  };
}

export function rentPerSqm(rent, area) {
  const r = Number(rent);
  const a = Number(area);
  if (!Number.isFinite(r) || !Number.isFinite(a) || a <= 0) return null;
  return r / a;
}

export function moveInCost(rent, deposit) {
  const r = Number(rent);
  const d = Number(deposit);
  if (!Number.isFinite(r) || !Number.isFinite(d)) return null;
  return r + d;
}

function positive(n) {
  return Number.isFinite(n) && n > 0;
}

export function aptMetrics(apt) {
  const rent = Number(apt?.rent);
  const deposit = Number(apt?.deposit);
  const commute = Number(apt?.commute);
  const area = Number(apt?.area);
  return {
    rent: Number.isFinite(rent) ? rent : 0,
    deposit: Number.isFinite(deposit) ? deposit : 0,
    commute: Number.isFinite(commute) ? commute : 0,
    area: Number.isFinite(area) ? area : 0,
    perSqm: rentPerSqm(rent, area),
    moveIn: moveInCost(
      Number.isFinite(rent) ? rent : 0,
      Number.isFinite(deposit) ? deposit : 0
    ),
  };
}

/**
 * Highlight winners per row. Lower is better except area (higher).
 * Ties all win. Zero / empty values are ignored.
 */
export function compareRents(apts) {
  const list = Array.isArray(apts) ? apts : [];
  const rows = list.map((apt) => ({ apt, m: aptMetrics(apt) }));

  function bestOf(pick, mode) {
    const vals = rows
      .map((r) => pick(r.m))
      .filter((v) => v !== null && positive(v));
    if (!vals.length) return null;
    return mode === "max" ? Math.max(...vals) : Math.min(...vals);
  }

  const best = {
    rent: bestOf((m) => m.rent, "min"),
    deposit: bestOf((m) => m.deposit, "min"),
    commute: bestOf((m) => m.commute, "min"),
    area: bestOf((m) => m.area, "max"),
    perSqm: bestOf((m) => m.perSqm, "min"),
    moveIn: bestOf((m) => m.moveIn, "min"),
  };

  function isWin(key, value) {
    if (best[key] === null || value === null || !positive(value)) return false;
    return value === best[key];
  }

  return {
    best,
    rows: rows.map((r) => ({
      id: r.apt.id,
      metrics: r.m,
      win: {
        rent: isWin("rent", r.m.rent),
        deposit: isWin("deposit", r.m.deposit),
        commute: isWin("commute", r.m.commute),
        area: isWin("area", r.m.area),
        perSqm: isWin("perSqm", r.m.perSqm),
        moveIn: isWin("moveIn", r.m.moveIn),
      },
    })),
  };
}

export function clampAptCount(n) {
  const x = Number(n);
  if (!Number.isInteger(x)) return 2;
  return Math.min(4, Math.max(2, x));
}

export function packProgress(items) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const done = list.filter((i) => !!i.checked).length;
  return {
    total,
    done,
    left: total - done,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
}

export const DEFAULT_PACK = {
  travel: [
    { id: "t-passport", zh: "护照 / 签证页", en: "Passport / visa pages" },
    { id: "t-id", zh: "身份证", en: "National ID" },
    { id: "t-tickets", zh: "机票与住宿确认", en: "Tickets & lodging confirmation" },
    { id: "t-cards", zh: "银行卡 / 少量现金", en: "Bank cards / some cash" },
    { id: "t-charger", zh: "充电器与转换插头", en: "Charger & travel adaptor" },
    { id: "t-powerbank", zh: "充电宝", en: "Power bank" },
    { id: "t-meds", zh: "常用药与处方", en: "Meds & prescriptions" },
    { id: "t-toiletries", zh: "洗漱包", en: "Toiletry bag" },
    { id: "t-clothes", zh: "换洗衣物", en: "Clothes for the trip" },
    { id: "t-weather", zh: "外套 / 雨具", en: "Jacket / rain gear" },
    { id: "t-earphones", zh: "耳机", en: "Earphones" },
    { id: "t-copies", zh: "证件复印件 / 云备份", en: "ID copies / cloud backup" },
    { id: "t-insurance", zh: "旅行保险", en: "Travel insurance" },
    { id: "t-keys", zh: "家门钥匙安排", en: "House-key plan" },
  ],
  move: [
    { id: "m-contract", zh: "租房合同与交接清单", en: "Lease & handover list" },
    { id: "m-deposit", zh: "押金收据", en: "Deposit receipt" },
    { id: "m-keys", zh: "新旧钥匙", en: "Old and new keys" },
    { id: "m-photos", zh: "房间原状照片", en: "Photos of the empty rooms" },
    { id: "m-meter", zh: "水电表读数拍照", en: "Meter readings (photo)" },
    { id: "m-utilities", zh: "水电燃气过户 / 销户", en: "Utilities transfer / close" },
    { id: "m-net", zh: "网络销户或新装", en: "Internet cancel / install" },
    { id: "m-address", zh: "银行 / 手机地址变更", en: "Bank / phone address change" },
    { id: "m-boxes", zh: "纸箱、胶带、气泡膜", en: "Boxes, tape, bubble wrap" },
    { id: "m-clean", zh: "清洁用品", en: "Cleaning supplies" },
    { id: "m-tools", zh: "螺丝刀 / 六角扳手", en: "Screwdriver / hex keys" },
    { id: "m-valuables", zh: "贵重物品单独装箱", en: "Valuables packed separately" },
    { id: "m-change", zh: "快递 / 订阅地址", en: "Parcel / subscription address" },
    { id: "m-building", zh: "物业或房东交接预约", en: "Handover appointment" },
  ],
};

export function mergePack(kind, saved) {
  const base = DEFAULT_PACK[kind] || DEFAULT_PACK.travel;
  const checked = (saved && saved.checked) || {};
  const custom = Array.isArray(saved && saved.custom) ? saved.custom : [];
  const items = base.map((it) => ({
    ...it,
    custom: false,
    checked: !!checked[it.id],
  }));
  for (const c of custom) {
    if (!c || !c.id) continue;
    items.push({
      id: String(c.id),
      zh: String(c.zh || c.label || "").slice(0, 80),
      en: String(c.en || c.label || c.zh || "").slice(0, 80),
      custom: true,
      checked: !!checked[c.id],
    });
  }
  return items;
}

export function seedSubs(today = new Date()) {
  return [
    {
      id: "seed-icloud",
      name: "iCloud+",
      fee: 2.99,
      cycle: "monthly",
      next: toISODate(addDays(today, 4)),
    },
    {
      id: "seed-netflix",
      name: "Netflix",
      fee: 12.99,
      cycle: "monthly",
      next: toISODate(addDays(today, 18)),
    },
  ];
}

export function seedApts() {
  return [
    {
      id: "apt-a",
      name: "A · Malasaña",
      rent: 980,
      deposit: 1960,
      commute: 22,
      area: 42,
      note: "四楼无电梯",
    },
    {
      id: "apt-b",
      name: "B · Usera",
      rent: 820,
      deposit: 820,
      commute: 38,
      area: 55,
      note: "押一、近地铁",
    },
  ];
}
