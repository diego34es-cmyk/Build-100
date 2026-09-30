/** TOPRUN-033 — silent-sell survival game. Pure functions, no DOM. */

export const PAGE_URL = "https://build-100.com/033/";
export const BRAND = "TOPRUN-033";
export const TITLE = Object.freeze({
  zh: "TOPRUN-033 · 散户生存小游戏",
  en: "TOPRUN-033 · Retail survival mini-game",
});

export const INITIAL_CASH = 100000;
export const INITIAL_SHARES = 0;
export const INITIAL_PRICE = 100;
export const FEE_RATE = 0.001;
export const BUY_FRACTION = 0.25;
export const SELL_FRACTION = 0.25;
export const CRASH_MIN = 0.25;
export const CRASH_MAX = 0.4;
export const SILENT_FULL = 100;
export const MIN_TURNS = 8;
export const MAX_TURNS = 12;
export const ACTIONS = Object.freeze(["buy", "hold", "sell"]);
export const SCENARIO_IDS = Object.freeze(["ai", "consumer", "star"]);

export const SCENARIOS = Object.freeze({
  ai: Object.freeze({
    id: "ai",
    zh: "AI 算力妖股",
    en: "AI compute high-flyer",
    nameZh: "北境算力",
    nameEn: "Northridge Compute",
    blurbZh: "研报目标价 150，训练集群的故事最好听。",
    blurbEn: "Target 150 on the note. The training-cluster story sounds best.",
  }),
  consumer: Object.freeze({
    id: "consumer",
    zh: "消费白马价值陷阱",
    en: "Consumer blue-chip value trap",
    nameZh: "澄江乳业",
    nameEn: "Chengjiang Dairy",
    blurbZh: "护城河、分红、渠道深耕——故事越稳，下山越快。",
    blurbEn: "Moat, dividend, deep channels — the calmer the story, the faster the drop.",
  }),
  star: Object.freeze({
    id: "star",
    zh: "次新股",
    en: "Recently listed name",
    nameZh: "岚山光电",
    nameEn: "Lanshan Opto",
    blurbZh: "上市不到一年，解禁临近，锁定期外的人先走。",
    blurbEn: "Listed under a year. Unlock approaching. People outside the lock go first.",
  }),
});

export const GRADES = Object.freeze([
  Object.freeze({ id: "escape", zh: "全身而退", en: "Clean escape" }),
  Object.freeze({ id: "pocket", zh: "落袋为安", en: "Cashed out in time" }),
  Object.freeze({ id: "mid", zh: "半山腰离场", en: "Left mid-slope" }),
  Object.freeze({ id: "peak", zh: "山顶站岗", en: "Stood on the peak" }),
]);

export function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function equityOf(state) {
  if (!state) return 0;
  return round2((state.cash || 0) + (state.shares || 0) * (state.price || 0));
}

export function returnRate(state) {
  return (equityOf(state) - INITIAL_CASH) / INITIAL_CASH;
}

export function normalizeScenario(id) {
  const key = String(id || "").toLowerCase();
  return SCENARIO_IDS.includes(key) ? key : "ai";
}

export function normalizeAction(action) {
  const a = String(action || "").toLowerCase();
  if (a === "buy" || a === "hold" || a === "sell") return a;
  return "hold";
}

export function hashSeed(seed) {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(a) {
  let t = a >>> 0;
  return function rng() {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function freezeCard(card) {
  return Object.freeze({
    id: card.id,
    turn: card.turn,
    kind: card.kind,
    builder: card.builder,
    tagZh: card.tagZh,
    tagEn: card.tagEn,
    titleZh: card.titleZh,
    titleEn: card.titleEn,
    bodyZh: card.bodyZh,
    bodyEn: card.bodyEn,
    priceDelta: card.priceDelta,
    silentSellDelta: card.silentSellDelta,
    isSignal: card.kind === "signal" || card.kind === "disclosure",
  });
}

function noiseResearch(rng, sc) {
  const target = rng() < 0.7 ? 150 : 146 + Math.floor(rng() * 8);
  return {
    builder: "research",
    kind: "noise",
    tagZh: "卖方研报",
    tagEn: "Sell-side note",
    titleZh: `维持买入，目标价 ${target}`,
    titleEn: `Maintain BUY, target ${target}`,
    bodyZh: `某卖方把${sc.nameZh}写进早报：景气向上，维持买入，目标价 ${target}。全文没提股东名单，也没提大宗。`,
    bodyEn: `A sell-side desk kept ${sc.nameEn} at BUY with a ${target} target. The note never mentioned holders or block prints.`,
    priceDelta: [0.018, 0.055],
    silentSellDelta: 0,
  };
}

function noiseForum(rng, sc) {
  return {
    builder: "forum",
    kind: "noise",
    tagZh: "论坛情绪",
    tagEn: "Forum mood",
    titleZh: "赛道是好赛道",
    titleEn: "The lane is still the lane",
    bodyZh: `热帖说${sc.nameZh}只是在洗盘。「赛道是好赛道，调整就是上车。」点赞比引用的半年报多。`,
    bodyEn: `A hot thread says ${sc.nameEn} is just shaking out weak hands. “The lane is still the lane.” Likes outrun anyone quoting the report.`,
    priceDelta: [0.01, 0.04],
    silentSellDelta: 0,
  };
}

function noiseSurvey(rng, sc) {
  const n = 3 + Math.floor(rng() * 4);
  return {
    builder: "survey",
    kind: "noise",
    tagZh: "机构调研",
    tagEn: "Site visit",
    titleZh: `${n} 家机构来看了生产线`,
    titleEn: `${n} desks toured the line`,
    bodyZh: `公告：${n} 家买方来看${sc.nameZh}。纪要写「需求仍旺」，没有人问前十大流通股东为什么在换座位。`,
    bodyEn: `${n} buy-side desks visited ${sc.nameEn}. The memo said demand was firm. Nobody asked why the top-10 holders keep swapping seats.`,
    priceDelta: [0.012, 0.038],
    silentSellDelta: 0,
  };
}

function noiseTheme(rng, sc) {
  return {
    builder: "theme",
    kind: "noise",
    tagZh: "板块联动",
    tagEn: "Theme tape",
    titleZh: "同概念有人涨停，它被带着走",
    titleEn: "A peer limit-up pulled the tape",
    bodyZh: `同一故事里另一只票先封板，${sc.nameZh}被资金带着抬了一截。故事比持仓名单好传播。`,
    bodyEn: `A peer in the same story hit the limit. ${sc.nameEn} was lifted with it. Stories travel faster than holder lists.`,
    priceDelta: [0.02, 0.06],
    silentSellDelta: 0,
  };
}

function noiseBuyback(rng, sc) {
  return {
    builder: "buyback",
    kind: "noise",
    tagZh: "传闻",
    tagEn: "Rumor",
    titleZh: "回购传闻（未公告）",
    titleEn: "Buyback rumor (not filed)",
    bodyZh: `有人传${sc.nameZh}要回购。交易所互动里公司只回了一句「以公告为准」。没有公告。`,
    bodyEn: `A buyback rumor hit ${sc.nameEn}. The company said “refer to filings.” There was no filing.`,
    priceDelta: [0.008, 0.03],
    silentSellDelta: 0,
  };
}

function noiseUpgrade(rng, sc) {
  return {
    builder: "upgrade",
    kind: "noise",
    tagZh: "评级",
    tagEn: "Rating",
    titleZh: "又有人把评级从持有调到买入",
    titleEn: "Another desk moved HOLD to BUY",
    bodyZh: `第二家卖方把${sc.nameZh}从持有调到买入。目标价还是那条熟悉的 150 线。`,
    bodyEn: `A second desk lifted ${sc.nameEn} from HOLD to BUY. The target still sat on that familiar 150 line.`,
    priceDelta: [0.015, 0.042],
    silentSellDelta: 0,
  };
}

function noiseProduct(rng, sc) {
  const line =
    sc.id === "consumer"
      ? ["新品礼盒上了货架", "A gift SKU hit the shelf"]
      : sc.id === "star"
        ? ["导入了一家新的模组客户", "A new module customer was named"]
        : ["训练集群交付节点被写进路演", "A cluster delivery date made the roadshow"];
  return {
    builder: "product",
    kind: "noise",
    tagZh: "基本面噪音",
    tagEn: "Fundamental noise",
    titleZh: line[0],
    titleEn: line[1],
    bodyZh: `${sc.nameZh}对外讲了一个好听的进展。成交量跟着情绪走，不跟着股东名单走。`,
    bodyEn: `${sc.nameEn} told a pleasant operating update. Volume followed the mood, not the holder list.`,
    priceDelta: [0.01, 0.036],
    silentSellDelta: 0,
  };
}

function noiseMorning(rng, sc) {
  return {
    builder: "morning",
    kind: "noise",
    tagZh: "晨会",
    tagEn: "Morning call",
    titleZh: "晨会重点推荐，一句话：别掉队",
    titleEn: "Morning call: do not miss it",
    bodyZh: `某券商晨会把${sc.nameZh}放进「重点」。一句话：景气还在，别掉队。没有附上增减持表。`,
    bodyEn: `A morning call slotted ${sc.nameEn} as a focus name. One line: the cycle is intact. No holder table attached.`,
    priceDelta: [0.014, 0.04],
    silentSellDelta: 0,
  };
}

function signalHolders(rng, sc) {
  const n = 1 + Math.floor(rng() * 3);
  return {
    builder: "holders",
    kind: "signal",
    tagZh: "股东名单",
    tagEn: "Holder list",
    titleZh: `前十大流通股东里有 ${n} 个座位换了人`,
    titleEn: `${n} seat(s) in the top-10 float holders changed`,
    bodyZh: `最新名单：${sc.nameZh}前十大流通股东里 ${n} 个名字对调或持股略降。没有预披露——持股 5% 以下，本来就不用提前说。`,
    bodyEn: `On the latest list, ${n} names in ${sc.nameEn}'s top-10 float holders swapped or trimmed. No pre-notice — below 5%, they do not have to speak first.`,
    priceDelta: [-0.018, 0.012],
    silentSellDelta: 0,
  };
}

function signalBlock(rng, sc) {
  const disc = 5 + Math.floor(rng() * 5);
  return {
    builder: "block",
    kind: "signal",
    tagZh: "大宗交易",
    tagEn: "Block trade",
    titleZh: `盘后大宗，折价 ${disc}%`,
    titleEn: `After-hours block, ${disc}% discount`,
    bodyZh: `${sc.nameZh}盘后出现大宗，折价 ${disc}%。接货方未披露。山顶上的货，经常是这样搬走的。`,
    bodyEn: `${sc.nameEn} printed a block after hours at a ${disc}% discount. The buyer was unnamed. Peak inventory often leaves this way.`,
    priceDelta: [-0.022, 0.008],
    silentSellDelta: 0,
  };
}

function signalVolume(rng, sc) {
  return {
    builder: "volume",
    kind: "signal",
    tagZh: "成交量",
    tagEn: "Volume",
    titleZh: "上涨缩量，下跌放量",
    titleEn: "Up on thin volume, down on heavy volume",
    bodyZh: `${sc.nameZh}这几天：红的时候没量，绿的时候量上来了。像有人在把筹码递给更散的手。`,
    bodyEn: `${sc.nameEn} lately: thin on up days, heavy on down days. It reads like inventory moving into smaller hands.`,
    priceDelta: [-0.02, 0.01],
    silentSellDelta: 0,
  };
}

function signalKin(rng, sc) {
  const lots = 20 + Math.floor(rng() * 40);
  return {
    builder: "kin",
    kind: "signal",
    tagZh: "小额减持",
    tagEn: "Small sale",
    titleZh: "高管亲属卖了一笔，没到预披露线",
    titleEn: "An executive relative sold, under the notice line",
    bodyZh: `一笔约 ${lots} 万股的减持出现在${sc.nameZh}相关人士名下。数量不大，也没到 5% 预披露线。小单也可以是大方向。`,
    bodyEn: `About ${lots}0k shares sold under a ${sc.nameEn}-related name. Not large, and under the 5% notice line. Small lots can still show the direction.`,
    priceDelta: [-0.016, 0.014],
    silentSellDelta: 0,
  };
}

function signalAccounts(rng, sc) {
  const pct = 4 + Math.floor(rng() * 7);
  return {
    builder: "accounts",
    kind: "signal",
    tagZh: "股东户数",
    tagEn: "Holder count",
    titleZh: `股东户数又升了 ${pct}%`,
    titleEn: `Holder count up another ${pct}%`,
    bodyZh: `${sc.nameZh}股东户数再升 ${pct}%。户数往上走、股价还在山顶时，筹码往往是在被摊薄，不是在被集中。`,
    bodyEn: `${sc.nameEn} holder count rose another ${pct}%. Rising accounts at a peak usually means distribution, not concentration.`,
    priceDelta: [-0.012, 0.018],
    silentSellDelta: 0,
  };
}

function signalDesk(rng, sc) {
  return {
    builder: "desk",
    kind: "signal",
    tagZh: "席位",
    tagEn: "Desk tape",
    titleZh: "龙虎榜上，机构席位净卖",
    titleEn: "Public tape: institutional desks net sellers",
    bodyZh: `${sc.nameZh}上了龙虎榜。营业部热闹，机构席位这边是净卖。热闹留给论坛，货留给夜盘。`,
    bodyEn: `${sc.nameEn} hit the public trading board. Branch desks looked busy; institutional seats were net sellers. Heat stays on the forum. Inventory leaves after hours.`,
    priceDelta: [-0.024, 0.006],
    silentSellDelta: 0,
  };
}

function signalPledge(rng, sc) {
  const p = 18 + Math.floor(rng() * 12);
  return {
    builder: "pledge",
    kind: "signal",
    tagZh: "质押",
    tagEn: "Pledge",
    titleZh: `大股东质押率升到 ${p}%`,
    titleEn: `Controller pledge ratio up to ${p}%`,
    bodyZh: `${sc.nameZh}大股东质押比例升至 ${p}%。质押本身不是减持，但山顶上加质押，常常是同一类压力。`,
    bodyEn: `${sc.nameEn}'s controller pledge ratio moved to ${p}%. A pledge is not a sale, but pledging into a peak often rhymes with one.`,
    priceDelta: [-0.014, 0.012],
    silentSellDelta: 0,
  };
}

function disclosureCard(rng, sc) {
  const houses = 4 + Math.floor(rng() * 3);
  const shares = 1800 + Math.floor(rng() * 1600);
  const cash = 12 + Math.floor(rng() * 10);
  return {
    builder: "filing",
    kind: "disclosure",
    tagZh: "半年报披露",
    tagEn: "Interim filing",
    titleZh: "半年报来了：减持写在附录里",
    titleEn: "Interim report: the selling is in the appendix",
    bodyZh: `${sc.nameZh}半年报披露。前十大流通股东中 ${houses} 家在报告期内合计减持约 ${shares} 万股，套现约 ${cash} 亿元。持股 5% 以下无需预披露——你现在看到的，是已经走完的路。`,
    bodyEn: `${sc.nameEn} filed the interim report. ${houses} of the top-10 float holders sold about ${shares}0k shares in the period, cashing ~¥${cash}bn. Below 5% they owed you no warning. You are reading a road already walked.`,
    priceDelta: [-0.045, -0.015],
    silentSellDelta: 0,
  };
}

function afterForum(rng, sc) {
  return {
    builder: "after-forum",
    kind: "aftermath",
    tagZh: "闪崩后",
    tagEn: "After the air pocket",
    titleZh: "论坛在吵：抄底还是接刀",
    titleEn: "The forum: dip or falling knife",
    bodyZh: `${sc.nameZh}已经从山顶滑下来。有人发抄底理由，有人把半年报截图置顶。两种帖的阅读量差不多。`,
    bodyEn: `${sc.nameEn} already slid off the peak. Dip-buy threads and screenshot threads of the filing get about the same reads.`,
    priceDelta: [-0.03, 0.025],
    silentSellDelta: 0,
  };
}

function afterNote(rng, sc) {
  return {
    builder: "after-note",
    kind: "aftermath",
    tagZh: "研报还在",
    tagEn: "The note remains",
    titleZh: "有人把「长期看好」又写了一遍",
    titleEn: "Someone wrote “long-term constructive” again",
    bodyZh: `闪崩之后，仍有一页纸写${sc.nameZh}「长期看好」。目标价没改。改的是你的本金。`,
    bodyEn: `After the air pocket, a note still called ${sc.nameEn} “long-term constructive.” The target did not move. Your principal did.`,
    priceDelta: [-0.02, 0.02],
    silentSellDelta: 0,
  };
}

function afterQuery(rng, sc) {
  return {
    builder: "after-query",
    kind: "aftermath",
    tagZh: "问询",
    tagEn: "Query",
    titleZh: "监管问了一句股东变化（虚构）",
    titleEn: "A regulator asked about holder changes (fictional)",
    bodyZh: `一份问询函要求${sc.nameZh}说明报告期股东变化。函件是虚构的，这种事后提问却很常见。`,
    bodyEn: `A query asked ${sc.nameEn} to explain holder changes in the period. The letter is fictional; the after-the-fact question is not rare.`,
    priceDelta: [-0.028, 0.016],
    silentSellDelta: 0,
  };
}

const NOISE = [noiseResearch, noiseForum, noiseSurvey, noiseTheme, noiseBuyback, noiseUpgrade, noiseProduct, noiseMorning];
const SIGNALS = [signalHolders, signalBlock, signalVolume, signalKin, signalAccounts, signalDesk, signalPledge];
const AFTER = [afterForum, afterNote, afterQuery];

function sampleDelta(rng, pair) {
  return pair[0] + rng() * (pair[1] - pair[0]);
}

function materialize(builder, rng, sc, turn, silent) {
  const raw = builder(rng, sc);
  const silentSellDelta = silent == null ? raw.silentSellDelta : silent;
  return freezeCard({
    id: `${raw.builder}-${turn}`,
    turn,
    kind: raw.kind,
    builder: raw.builder,
    tagZh: raw.tagZh,
    tagEn: raw.tagEn,
    titleZh: raw.titleZh,
    titleEn: raw.titleEn,
    bodyZh: raw.bodyZh,
    bodyEn: raw.bodyEn,
    priceDelta: round2(sampleDelta(rng, raw.priceDelta) * 10000) / 10000,
    silentSellDelta,
  });
}

function allocateSilent(rng, n) {
  if (n <= 0) return [];
  const weights = Array.from({ length: n }, () => 0.75 + rng());
  const wsum = weights.reduce((a, b) => a + b, 0);
  const total = 100 + Math.floor(rng() * 16);
  const alloc = weights.map((w) => Math.max(14, Math.round((total * w) / wsum)));
  let diff = total - alloc.reduce((a, b) => a + b, 0);
  alloc[alloc.length - 1] += diff;
  return alloc;
}

export function generateDeck(seed, scenario) {
  const sc = SCENARIOS[normalizeScenario(scenario)];
  const rng = mulberry32(hashSeed(`${seed}:${sc.id}`));
  const maxTurns = MIN_TURNS + Math.floor(rng() * (MAX_TURNS - MIN_TURNS + 1));
  const crashDrop = CRASH_MIN + Math.floor(rng() * 151) / 1000;
  const minDisc = Math.min(maxTurns - 1, Math.max(5, maxTurns - 3));
  const disclosureIndex = minDisc + Math.floor(rng() * (maxTurns - minDisc));
  const before = disclosureIndex;
  const nSignals = Math.min(before, 3 + Math.floor(rng() * 2));
  const signalSlots = new Set(shuffle(rng, range(before)).slice(0, nSignals));
  const silentAlloc = allocateSilent(rng, nSignals);
  const noiseOrder = shuffle(rng, NOISE.slice());
  const signalOrder = shuffle(rng, SIGNALS.slice());
  const afterOrder = shuffle(rng, AFTER.slice());
  const cards = [];
  let ni = 0;
  let si = 0;
  let ai = 0;
  let silentI = 0;
  for (let i = 0; i < maxTurns; i++) {
    const turn = i + 1;
    if (i === disclosureIndex) {
      cards.push(materialize(disclosureCard, rng, sc, turn, 0));
    } else if (signalSlots.has(i)) {
      const silent = silentAlloc[silentI++];
      cards.push(materialize(signalOrder[si++ % signalOrder.length], rng, sc, turn, silent));
    } else if (i > disclosureIndex) {
      cards.push(materialize(afterOrder[ai++ % afterOrder.length], rng, sc, turn, 0));
    } else {
      cards.push(materialize(noiseOrder[ni++ % noiseOrder.length], rng, sc, turn, 0));
    }
  }
  return Object.freeze({
    maxTurns,
    crashDrop,
    disclosureTurn: disclosureIndex + 1,
    cards: Object.freeze(cards),
  });
}

function cloneState(state, patch) {
  const next = { ...state, ...patch };
  if (!Object.prototype.hasOwnProperty.call(patch, "history")) next.history = state.history.slice();
  if (!Object.prototype.hasOwnProperty.call(patch, "log")) next.log = state.log.slice();
  if (!Object.prototype.hasOwnProperty.call(patch, "priceHistory")) next.priceHistory = state.priceHistory.slice();
  return next;
}

export function createGame(opts = {}) {
  const scenario = normalizeScenario(opts.scenario);
  const seed = opts.seed == null || opts.seed === "" ? 33 : opts.seed;
  const sc = SCENARIOS[scenario];
  const deck = generateDeck(seed, scenario);
  return {
    seed,
    scenario,
    nameZh: sc.nameZh,
    nameEn: sc.nameEn,
    scenarioZh: sc.zh,
    scenarioEn: sc.en,
    cash: INITIAL_CASH,
    shares: INITIAL_SHARES,
    price: INITIAL_PRICE,
    turn: 0,
    maxTurns: deck.maxTurns,
    silentSellProgress: 0,
    crashDrop: deck.crashDrop,
    disclosureTurn: deck.disclosureTurn,
    crashed: false,
    crashPending: false,
    justCrashed: false,
    over: false,
    currentCard: null,
    cards: deck.cards,
    cardIndex: 0,
    actedThisTurn: true,
    lastTrade: null,
    history: [],
    log: [],
    priceHistory: [INITIAL_PRICE],
    peakPrice: INITIAL_PRICE,
    sharesAtCrash: null,
    priceBeforeCrash: null,
    crashTurn: null,
  };
}

export function quoteBuy(state) {
  const price = state && state.price;
  const cash = state && state.cash;
  if (!(price > 0) || !(cash > 0)) {
    return { qty: 0, notional: 0, fee: 0, affordable: false };
  }
  let qty = Math.floor((cash * BUY_FRACTION) / (price * (1 + FEE_RATE)));
  while (qty > 0) {
    const notional = round2(qty * price);
    const fee = round2(notional * FEE_RATE);
    if (notional + fee <= cash + 1e-9) {
      return { qty, notional, fee, affordable: true };
    }
    qty -= 1;
  }
  return { qty: 0, notional: 0, fee: 0, affordable: false };
}

export function quoteSell(state) {
  const shares = (state && state.shares) || 0;
  const price = (state && state.price) || 0;
  if (shares <= 0 || !(price > 0)) {
    return { qty: 0, notional: 0, fee: 0, affordable: false };
  }
  const qty = Math.min(shares, Math.max(1, Math.floor(shares * SELL_FRACTION)));
  const notional = round2(qty * price);
  const fee = round2(notional * FEE_RATE);
  return { qty, notional, fee, affordable: qty > 0 };
}

export function nextCard(state) {
  if (!state || state.over) return state;
  if (state.currentCard && !state.actedThisTurn) return state;
  if (state.cardIndex >= state.cards.length) {
    return cloneState(state, { over: true });
  }
  const card = state.cards[state.cardIndex];
  let price = round2(state.price * (1 + card.priceDelta));
  if (price < 1) price = 1;
  const silent = Math.min(SILENT_FULL, round2(state.silentSellProgress + card.silentSellDelta));
  const crashPending =
    state.crashPending || (card.kind === "disclosure" && silent >= SILENT_FULL);
  const priceHistory = state.priceHistory.concat(price);
  return cloneState(state, {
    turn: card.turn,
    cardIndex: state.cardIndex + 1,
    currentCard: card,
    price,
    silentSellProgress: silent,
    crashPending,
    actedThisTurn: false,
    justCrashed: false,
    lastTrade: null,
    peakPrice: Math.max(state.peakPrice, price),
    priceHistory,
  });
}

export function applyAction(state, action) {
  if (!state || state.over) return state;
  if (!state.currentCard || state.actedThisTurn) return state;
  const act = normalizeAction(action);
  let cash = state.cash;
  let shares = state.shares;
  let qty = 0;
  let fee = 0;
  let notional = 0;
  if (act === "buy") {
    const q = quoteBuy(state);
    if (q.qty > 0) {
      qty = q.qty;
      notional = q.notional;
      fee = q.fee;
      cash = round2(cash - notional - fee);
      shares += qty;
    }
  } else if (act === "sell") {
    const q = quoteSell(state);
    if (q.qty > 0) {
      qty = q.qty;
      notional = q.notional;
      fee = q.fee;
      cash = round2(cash + notional - fee);
      shares -= qty;
    }
  }
  if (cash < 0) cash = 0;
  const lastTrade = Object.freeze({ action: act, qty, fee, notional, price: state.price });
  const entry = Object.freeze({
    type: "action",
    turn: state.turn,
    action: act,
    qty,
    fee,
    notional,
    price: state.price,
    cash,
    shares,
    sharesBefore: state.shares,
    equity: round2(cash + shares * state.price),
    cardId: state.currentCard.id,
    kind: state.currentCard.kind,
    isSignal: !!state.currentCard.isSignal,
    titleZh: state.currentCard.titleZh,
    titleEn: state.currentCard.titleEn,
  });
  const over = state.cardIndex >= state.maxTurns;
  return cloneState(state, {
    cash,
    shares,
    actedThisTurn: true,
    lastTrade,
    history: state.history.concat(entry),
    log: state.log.concat(entry),
    over,
  });
}

export function isCrashTriggered(state) {
  if (!state || state.crashed) return false;
  if (state.crashPending) return true;
  const card = state.currentCard;
  return !!(card && card.kind === "disclosure" && state.silentSellProgress >= SILENT_FULL);
}

export function applyCrash(state) {
  if (!state || state.crashed) return state;
  if (!isCrashTriggered(state)) return state;
  const drop = state.crashDrop;
  const priceBefore = state.price;
  let priceAfter = round2(priceBefore * (1 - drop));
  if (priceAfter < 1) priceAfter = 1;
  const entry = Object.freeze({
    type: "crash",
    turn: state.turn,
    drop,
    priceBefore,
    priceAfter,
    shares: state.shares,
    cash: state.cash,
  });
  return cloneState(state, {
    crashed: true,
    crashPending: false,
    justCrashed: true,
    price: priceAfter,
    priceBeforeCrash: priceBefore,
    sharesAtCrash: state.shares,
    crashTurn: state.turn,
    peakPrice: Math.max(state.peakPrice, priceBefore),
    priceHistory: state.priceHistory.concat(priceAfter),
    history: state.history.concat(entry),
    log: state.log.concat(entry),
  });
}

export function reviewSignals(state) {
  if (!state) return [];
  const byTurn = new Map();
  for (const h of state.history) {
    if (h.type === "action") byTurn.set(h.turn, h);
  }
  const dealt = state.cards.slice(0, state.cardIndex);
  return dealt
    .filter((c) => c.isSignal)
    .map((c) => {
      const h = byTurn.get(c.turn);
      const action = h ? h.action : null;
      const didSell = !!(h && h.action === "sell" && h.qty > 0);
      return Object.freeze({
        turn: c.turn,
        kind: c.kind,
        builder: c.builder,
        tagZh: c.tagZh,
        tagEn: c.tagEn,
        titleZh: c.titleZh,
        titleEn: c.titleEn,
        bodyZh: c.bodyZh,
        bodyEn: c.bodyEn,
        action,
        didSell,
        missed: action !== "sell",
      });
    });
}

export function gradeResult(state) {
  const equity = equityOf(state);
  const rate = (equity - INITIAL_CASH) / INITIAL_CASH;
  const sharesAtCrash = state && state.sharesAtCrash;
  const heldThrough = !!(state && state.crashed && (sharesAtCrash || 0) > 0);
  const heavy =
    heldThrough &&
    sharesAtCrash * (state.priceBeforeCrash || state.price) >= INITIAL_CASH * 0.45;
  let id = "peak";
  if (rate >= -0.005 && !heavy) id = "escape";
  else if (rate >= -0.08) id = "pocket";
  else if (rate >= -0.22) id = "mid";
  else id = "peak";
  if (heavy && rate < -0.15) id = "peak";
  const meta = GRADES.find((g) => g.id === id) || GRADES[3];
  const signals = reviewSignals(state);
  return Object.freeze({
    id: meta.id,
    zh: meta.zh,
    en: meta.en,
    equity,
    rate,
    startCash: INITIAL_CASH,
    crashed: !!(state && state.crashed),
    crashDrop: state ? state.crashDrop : 0,
    crashTurn: state ? state.crashTurn : null,
    missedSignals: signals.filter((s) => s.missed).length,
    signalCount: signals.length,
    peakPrice: state ? state.peakPrice : INITIAL_PRICE,
    shares: state ? state.shares : 0,
    cash: state ? state.cash : 0,
    price: state ? state.price : INITIAL_PRICE,
    scenario: state ? state.scenario : "ai",
    seed: state ? state.seed : 33,
  });
}

export function buildShareText(state, lang) {
  const en = lang === "en";
  if (!state || state.turn === 0) {
    return en
      ? "TOPRUN-033 · The peak at 110 is windy. Research says 150. The large holder is selling. https://build-100.com/033/"
      : "TOPRUN-033 · 110 元的山顶，风很大。研报写 150，大股东在卖。https://build-100.com/033/";
  }
  const g = gradeResult(state);
  const pct = `${g.rate >= 0 ? "+" : ""}${(g.rate * 100).toFixed(1)}%`;
  const name = en ? state.nameEn : state.nameZh;
  const grade = en ? g.en : g.zh;
  const scen = en ? state.scenarioEn : state.scenarioZh;
  if (en) {
    return [
      `TOPRUN-033 · Retail survival`,
      `${name} · ${scen}`,
      `Grade: ${grade}`,
      `Return: ${pct} · Final ¥${g.equity.toFixed(0)}`,
      `Missed ${g.missedSignals}/${g.signalCount} sell signals`,
      `The peak at 110 is windy.`,
      PAGE_URL,
    ].join("\n");
  }
  return [
    `TOPRUN-033 · 散户生存小游戏`,
    `${name} · ${scen}`,
    `评级：${grade}`,
    `收益率：${pct} · 终局 ${g.equity.toFixed(0)} 元`,
    `错过 ${g.missedSignals}/${g.signalCount} 条减持信号`,
    `110 元的山顶，风很大。`,
    PAGE_URL,
  ].join("\n");
}

export function step(state, action) {
  let s = applyAction(state, action);
  if (isCrashTriggered(s) && s.actedThisTurn) s = applyCrash(s);
  if (!s.over) s = nextCard(s);
  return s;
}

export function playThrough(opts, actions) {
  let s = createGame(opts);
  s = nextCard(s);
  const policy =
    typeof actions === "function"
      ? actions
      : Array.isArray(actions) && actions.length === 1 && typeof actions[0] === "function"
        ? actions[0]
        : null;
  const list = Array.isArray(actions) ? actions : [];
  let i = 0;
  let guard = 0;
  while (!s.over && guard < 40) {
    const act = policy ? policy(s) : list[i] || "hold";
    s = step(s, act);
    i += 1;
    guard += 1;
  }
  return s;
}
