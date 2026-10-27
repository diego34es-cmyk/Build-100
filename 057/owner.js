/* Owner landing (?ai= / ?addr=) and recipe kit board — 20261027ow1. Read-only: no wallet, no signing, no transactions.
   Loaded before app.js so it can see the ?ai= / ?addr= parameter before app.js strips it from the URL.
   Data: window.__lab (live chain state read by app.js: balances, Reactor, mints, timeline, discoverer wall, LabMarket listings). Nothing hardcoded. */
(function () {
"use strict";
const Q0 = new URLSearchParams(location.search);
const LAND = (Q0.get("ai") || Q0.get("addr") || "").trim();
window.LAB_LANDING = LAND;   // rebate.js loads after app.js has stripped ?ai= / ?addr=; it reads this to keep the landing clean
const EN = () => (window.LAB_LANG || document.documentElement.lang || "zh").startsWith("en");
const T = () => EN() ? {
  landT: n => `${n}: your cards`, landSub: "Read straight from the chain. View only, no wallet connection.",
  inWallet: "In wallet", inReactor: "In the Reactor", noCards: "No cards yet.",
  didT: "What your AI just did", mintsUsed: n => `Mints used: ${n} / 4`, didLoading: "Reading the on-chain history...", didNone: "Nothing on-chain yet.",
  ev: { free: x => `Got a free ${x} card`, paid: x => `Minted ${x}`, syn: x => `Synthesized ${x}`, dec: x => `Decomposed ${x}`, stake: x => `Deposited ${x} into the Reactor`, unstake: x => `Took ${x} out of the Reactor`, claim: () => "Collected LAB from the Reactor", list: x => `Listed ${x} for sale`, buy: x => `Bought ${x}`, sell: x => `Sold ${x}`, cancel: () => "Cancelled a listing" },
  tx: "transaction",
  nextT: "Next step",
  nFree: "Let your AI do the free first mint with your .ai.",
  nFreeSay: n => `Read build-100.com/lab/agent.md and play Agent Periodic Lab with my ${n}: do the free mint first, then tell me the card's name and let me pick one: mint again, or first deposit the card into the Reactor.`,
  nStake: x => `Deposit ${x} into the Reactor, where it shares LAB by weight. Network fee only; it needs one tap to confirm in your Binance App, and the card can be taken out at any time.`,
  nStakeSay: (x, n) => `Please deposit my ${x} card into the Reactor with my ${n}, following build-100.com/lab/agent.md section 4.6.`,
  nKit: "Your cards are in the Reactor. Next, see which open recipe you are closest to (kit board below).",
  nKitSay: n => `Read section 4.2.2 in build-100.com/lab/agent.md, then keep playing Agent Periodic Lab with my ${n}: look at the cards I hold and the recipes still open on the discoverer wall, and tell me which one I'm closest to, which cards I'm missing, how to get each one and what it costs.`,
  sayT: "Send this to your AI", copy: "Copy", copied: "Copied. Send it to your AI.",
  wallT: "Discoverer wall", wallP: (d, t, o) => `${d} of ${t} recipe outputs have been made; ${o} are still waiting for their first discoverer. The first .ai to make one is written on the wall.`,
  wallMine: (n, k) => `${n} is on the wall ${k} time${k === 1 ? "" : "s"}.`,
  full: "See the full lab", hide: "Hide",
  kitT: "Recipe kit board", kitSub: "Which open compound recipes can be put together right now from LabMarket listings (plus the wallet you are viewing). Read live from the chain.",
  kitReady: "Can be put together now", kitMiss: "Still missing", kitHold: "held", kitList: p => `listed from ${p} BNB`, kitDec: x => `from a ${x} listing, decomposed (LAB fee)`,
  kitNone: "missing", kitEmpty: "No open compound recipe right now.", kitLoading: "Reading listings...",
  kitNote: "Each ingredient is counted on its own. Decomposing costs a LAB fee. Tap a listing to open it in the market.",
  kitMore: "Show all", kitLess: "Show fewer"
} : {
  landT: n => `${n} 的卡`, landSub: "直接读取链上数据，只读，不用连钱包。",
  inWallet: "在钱包里", inReactor: "在反应堆里", noCards: "还没有卡。",
  didT: "你的 AI 刚做了什么", mintsUsed: n => `已用铸造次数：${n} / 4`, didLoading: "正在读取链上记录…", didNone: "还没有链上记录。",
  ev: { free: x => `免费领到 ${x} 卡`, paid: x => `铸造得到 ${x}`, syn: x => `合成了 ${x}`, dec: x => `分解了 ${x}`, stake: x => `把 ${x} 存入反应堆`, unstake: x => `把 ${x} 从反应堆取出`, claim: () => "领取了反应堆里的 LAB", list: x => `挂单出售 ${x}`, buy: x => `买入 ${x}`, sell: x => `卖出 ${x}`, cancel: () => "撤销了一个挂单" },
  tx: "交易",
  nextT: "下一步",
  nFree: "让你的 AI 用你的 .ai 免费领第一张卡。",
  nFreeSay: n => `去 build-100.com/lab/agent.md 读说明，用我的 ${n} 玩 Agent Periodic Lab：先免费领一张卡，领到后告诉我卡名，让我二选一：再铸，或者先把卡存入反应堆。`,
  nStake: x => `把 ${x} 存入反应堆，按权重分 LAB。只花网络费，需要你在币安 App 里点一次确认，卡可以随时取出。`,
  nStakeSay: (x, n) => `请用我的 ${n} 把 ${x} 卡存入反应堆，按 build-100.com/lab/agent.md 4.6 做。`,
  nKit: "卡已经在反应堆里。下一步看看离哪个待发现的配方最近（见下面的配方凑齐板）。",
  nKitSay: n => `去 build-100.com/lab/agent.md 读 4.2.2，用我的 ${n} 继续玩 Agent Periodic Lab：读一下我现在持有的卡和首位发现者墙上还没人做的配方，列出我离哪个配方最近、缺哪几张、各自怎么拿到和费用。`,
  sayT: "把这句发给你的 AI", copy: "复制", copied: "已复制，发给你的 AI 吧",
  wallT: "首位发现者墙", wallP: (d, t, o) => `${t} 个配方产出里已经有 ${d} 个被做出来，还有 ${o} 个等着第一个发现者。第一个做出的 .ai 名字会刻在墙上。`,
  wallMine: (n, k) => `${n} 已经在墙上留名 ${k} 次。`,
  full: "看完整实验室", hide: "收起",
  kitT: "配方凑齐板", kitSub: "用现在市场上的挂单（加上你正在查看的钱包里的卡），哪些待发现的化合物配方能凑齐。直接读取链上数据。",
  kitReady: "现在能凑齐", kitMiss: "还缺", kitHold: "持有", kitList: p => `有挂单，${p} BNB 起`, kitDec: x => `买 ${x} 挂单分解得到（要付 LAB 分解费）`,
  kitNone: "缺", kitEmpty: "现在没有待发现的化合物配方。", kitLoading: "正在读取挂单…",
  kitNote: "每种原料分别计算。分解要付 LAB 分解费。点挂单会跳到市场里对应的卡。",
  kitMore: "展开全部", kitLess: "收起"
};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const SUB = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
const EL = id => ((window.LAB_DATA || {}).elements || {})[id] || null;
const sym = id => { const e = EL(id); return e ? String(e.sym).replace(/\d/g, d => SUB[d]) : "#" + id; };
const nm = id => { const e = EL(id); if (!e) return "#" + id; return !EN() && e.zh && e.zh !== e.sym && !/^[A-Za-z0-9]+$/.test(e.zh) ? `${e.zh} ${sym(id)}` : sym(id); };
const img = id => `meta/img/${id}.png`;
const big = v => { try { return BigInt(v || 0); } catch (_) { return 0n; } };
const bnb = wei => { try { return window.ethers.formatEther(wei); } catch (_) { return "?"; } };
const L = () => window.__lab;

const css = document.createElement("style");
css.textContent = `
#secOwner{border-color:rgba(240,185,11,.35)}
#secOwner .ow-top{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;justify-content:space-between}
#secOwner h2{margin:0;font-size:22px}
.ow-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;margin-top:14px}
.ow-cards{display:flex;gap:12px;flex-wrap:wrap}
.ow-card{flex:1 1 150px;max-width:230px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:10px;text-align:center}
.ow-card img{width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:12px;display:block;background:var(--bg2)}
.ow-card b{display:block;margin-top:6px;font-size:16px}.ow-card small{color:var(--mut)}
.ow-card.st{border-color:rgba(240,185,11,.45)}
.ow-box{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px}
.ow-box h3{margin:0 0 8px;font-size:14px;color:var(--mut);font-weight:600}
.ow-did{list-style:none;margin:0;padding:0;font-size:14px;line-height:1.7}
.ow-did a{color:var(--mut);font-size:12px;margin-left:6px}
.ow-next{border-color:rgba(240,185,11,.45)}.ow-next p{margin:0 0 10px;font-size:15px;line-height:1.6}
.ow-say{display:flex;flex-direction:column;gap:8px}.ow-say code{white-space:normal;overflow-wrap:anywhere;font-size:13px;line-height:1.6;padding:10px;border-radius:10px;background:var(--bg2);border:1px solid var(--line)}
.ow-bar{height:8px;border-radius:6px;background:var(--bg2);overflow:hidden;margin:8px 0}.ow-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--bnb),var(--bnb2))}
.ow-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
.kit-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.kit{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px;display:flex;gap:12px}
.kit.ok{border-color:rgba(74,222,128,.45)}
.kit img{width:64px;height:64px;object-fit:contain;border-radius:10px;flex:none;background:var(--bg2)}
.kit b{font-size:16px}.kit .kit-st{font-size:12px;margin-left:6px;color:var(--mut)}.kit.ok .kit-st{color:var(--ok)}
.kit ul{list-style:none;margin:6px 0 0;padding:0;font-size:13px;line-height:1.7}
.kit li span{color:var(--mut)}.kit li.miss{color:var(--bad)}
.kit a.getl{color:var(--bnb2)}
@media (max-width:760px){.ow-grid{grid-template-columns:1fr;gap:10px}.ow-card{max-width:none;padding:8px}.ow-card:nth-child(n+3){display:none}.ow-card img{max-height:170px}.ow-card b{font-size:14px}#secOwner h2{font-size:19px}#secOwner{padding:16px}}
`;
document.head.appendChild(css);

function section(id, after) {
  let s = $(id); if (s) return s;
  s = document.createElement("section"); s.id = id; s.className = "panel";
  if (after && after.parentNode) after.parentNode.insertBefore(s, after.nextSibling);
  return s;
}

// ---------- owner landing ----------
let landAddr = null, landOff = !LAND, lastSig = "";
function landName() { const v = L().view(); return v.viewName || (v.viewAddr ? v.viewAddr.slice(0, 6) + "…" + v.viewAddr.slice(-4) : LAND); }
function nextStep(st, name) {
  const t = T();
  if (st.mints === 0) return { p: t.nFree, say: t.nFreeSay(name) };
  const ids = Object.keys(st.info || {}).map(Number);
  const loose = ids.filter(id => id >= 1001 && big(st.info[id].bal) > 0n);
  const starters = st.starters || new Set();
  const pick = loose.find(id => starters.has(id)) || loose[0];
  if (pick && big(st.nStaked) === 0n) return { p: t.nStake(nm(pick)), say: t.nStakeSay(sym(pick), name) };
  if (pick && !ids.some(id => big((st.staked || {})[id]) > 0n)) return { p: t.nStake(nm(pick)), say: t.nStakeSay(sym(pick), name) };
  return { p: t.nKit, say: t.nKitSay(name) };
}
function renderLanding() {
  const lab = L(); if (!lab) return;
  const v = lab.view(), st = lab.state();
  if (landOff || !v.viewAddr) { hideLanding(); return; }
  if (!landAddr) landAddr = v.viewAddr;
  if (v.viewAddr !== landAddr) { landOff = true; hideLanding(); return; }   // user looked up someone else
  if (st.infoFor !== v.viewAddr || st.mints == null) return;                // chain state not loaded yet
  const t = T(), name = landName();
  const ids = Object.keys(st.info).map(Number);
  const cards = [];
  ids.forEach(id => { const s = big((st.staked || {})[id]); if (s > 0n) cards.push({ id, st: true, n: s }); });
  ids.forEach(id => { const b = big(st.info[id].bal); if (b > 0n) cards.push({ id, st: false, n: b }); });
  cards.sort((a, b) => (b.id >= 1001) - (a.id >= 1001) || (b.st - a.st));
  const tl = lab.tl() || [];
  const wall = lab.wall() || { first: {} };
  const tot = (st.recipes || []).length, disc = Object.keys(wall.first || {}).length;
  const mine = Object.values(wall.first || {}).filter(f => f && f.user && f.user.toLowerCase() === v.viewAddr.toLowerCase()).length;
  const nx = nextStep(st, name);
  const sig = JSON.stringify([EN(), name, st.mints, cards.map(c => [c.id, c.st, String(c.n)]), tl.slice(0, 4).map(e => e.tx + e.li), tot, disc, mine, nx.say]);
  const s = section("secOwner", $("viewErr"));
  s.classList.remove("hidden");
  const nb = $("meNext"); if (nb) nb.style.display = "none";             // one next step on this page: the landing's
  if (sig === lastSig) return; lastSig = sig;
  const evs = tl.slice(0, 4).map(e => {
    const f = t.ev[e.k]; if (!f) return "";
    const x = e.id != null ? nm(e.id) : "";
    return `<li>${esc(f(x))}${e.tx ? `<a href="https://bscscan.com/tx/${esc(e.tx)}" target="_blank" rel="noopener">${t.tx}</a>` : ""}</li>`;
  }).filter(Boolean).join("");
  const didHead = `<p class="muted" style="margin:0 0 6px;font-size:13px">${esc(t.mintsUsed(st.mints))}</p>`;
  const didBody = didHead + (evs ? `<ul class="ow-did">${evs}</ul>` : `<p class="muted" style="margin:0">${tl.length || st.mints === 0 ? t.didNone : t.didLoading}</p>`);
  const cardsHTML = cards.length ? cards.slice(0, 4).map(c => `<div class="ow-card${c.st ? " st" : ""}"><img src="${img(c.id)}" alt="${esc(sym(c.id))}" loading="lazy"/><b>${esc(nm(c.id))}${c.n > 1n ? " ×" + c.n : ""}</b><small>${c.st ? t.inReactor : t.inWallet}</small></div>`).join("") : `<p class="muted">${t.noCards}</p>`;
  const pct = tot ? Math.round(disc / tot * 100) : 0;
  s.innerHTML = `<div class="ow-top"><h2>${esc(t.landT(name))}</h2><span class="muted" style="font-size:13px">${t.landSub}</span></div>
    <div class="ow-grid">
      <div><div class="ow-cards">${cardsHTML}</div></div>
      <div>
        <div class="ow-box"><h3>${t.didT}</h3>${didBody}</div>
        <div class="ow-box ow-next"><h3>${t.nextT}</h3><p>${esc(nx.p)}</p>
          <div class="ow-say"><small class="muted">${t.sayT}</small><code id="owSay">${esc(nx.say)}</code><button class="btn btn-primary btn-sm" type="button" id="owCopy">${t.copy}</button></div></div>
        <div class="ow-box"><h3>${t.wallT}</h3><div class="ow-bar"><i style="width:${pct}%"></i></div><p style="margin:0;font-size:14px;line-height:1.6">${tot ? esc(t.wallP(disc, tot, tot - disc)) : ""}${mine ? " " + esc(t.wallMine(name, mine)) : ""}</p></div>
        <div class="ow-foot"><button class="btn btn-ghost btn-sm" type="button" id="owFull">${t.full}</button></div>
      </div>
    </div>`;
  $("owCopy").onclick = async () => { const ok = await (window.LAB_APP && window.LAB_APP.copyText ? window.LAB_APP.copyText($("owSay").textContent) : Promise.resolve(false)); if (window.LAB_APP) window.LAB_APP.toast(ok ? t.copied : $("owSay").textContent, 4000, "check"); };
  $("owFull").onclick = () => { landOff = true; hideLanding(); const me = $("me"); if (me) me.scrollIntoView({ block: "center", behavior: "smooth" }); };
}
function hideLanding() {
  const s = $("secOwner"); if (s) s.classList.add("hidden");
  const nb = $("meNext"); if (nb) nb.style.display = "";
}

// ---------- recipe kit board (A4) ----------
let kitAll = false, kitSig = "";
function renderKit() {
  const lab = L(); if (!lab) return;
  const st = lab.state(), mk = lab.mk() || { list: [] }, wall = lab.wall() || { first: {} };
  const s = section("secKit", $("secWall"));
  const t = T();
  const recs = (st.recipes || []).filter(r => r.active && r.out >= 1001 && !(wall.first || {})[r.out]);
  const list = mk.list || [];
  const sig = JSON.stringify([EN(), kitAll, recs.map(r => r.id), list.map(l => [l.lid, String(l.avail)]), st.infoFor, Object.keys(st.info || {}).filter(id => big(st.info[id].bal) > 0n)]);
  if (sig === kitSig) return; kitSig = sig;
  if (!(st.recipes || []).length) { s.innerHTML = `<div class="panel-h"><h2>${t.kitT}</h2></div><p class="muted">${t.kitLoading}</p>`; return; }
  const viewing = st.infoFor && !/^0x0{40}$/i.test(st.infoFor);
  const hold = id => viewing ? Number(big((st.info[id] || {}).bal)) : 0;
  const byId = {}; list.forEach(l => { const a = Number(big(l.avail)); if (a > 0) (byId[l.id] = byId[l.id] || []).push({ l, a }); });
  const rows = recs.map(r => {
    let miss = 0;
    const ins = r.ins.map((e, i) => {
      const need = r.amts[i] || 1;
      let have = hold(e), how = [];
      if (have > 0) how.push(`<span>${t.kitHold} ${have}</span>`);
      if (have < need && byId[e]) {
        const n = byId[e].reduce((x, y) => x + y.a, 0), p = byId[e].reduce((m, y) => (m == null || y.l.price < m ? y.l.price : m), null);
        have += n; how.push(`<a href="#market" class="getl" data-get="mk" data-id="${e}">${t.kitList(bnb(p))}</a>`);
      }
      if (have < need) {
        for (const c of Object.keys(byId).map(Number)) {
          const cr = st.byOut && st.byOut[c]; if (!cr || c === r.out) continue;
          const k = cr.ins.indexOf(e); if (k < 0) continue;
          have += byId[c].reduce((x, y) => x + y.a, 0) * (cr.amts[k] || 1);
          how.push(`<a href="#market" class="getl" data-get="mk" data-id="${c}">${esc(t.kitDec(sym(c)))}</a>`);
          if (have >= need) break;
        }
      }
      const ok = have >= need; if (!ok) miss += need - Math.min(have, need);
      return `<li class="${ok ? "" : "miss"}">${esc(sym(e))} ×${need} · ${how.length ? how.join(" · ") : ""}${ok ? "" : `${how.length ? " · " : ""}${t.kitNone} ${need - Math.min(have, need)}`}</li>`;
    });
    return { r, miss, html: `<div class="kit${miss ? "" : " ok"}"><img src="${img(r.out)}" alt="${esc(sym(r.out))}"/><div><b>${esc(nm(r.out))}</b><span class="kit-st">${miss ? t.kitMiss + " " + miss : t.kitReady}</span><ul>${ins.join("")}</ul></div></div>` };
  }).sort((a, b) => a.miss - b.miss || a.r.out - b.r.out);
  const shown = kitAll ? rows : rows.slice(0, 6);
  s.innerHTML = `<div class="panel-h"><h2>${t.kitT}</h2><p class="muted">${t.kitSub}</p></div>
    ${rows.length ? `<div class="kit-list">${shown.map(x => x.html).join("")}</div>` : `<p class="muted">${t.kitEmpty}</p>`}
    <p class="muted" style="font-size:12px;margin-top:10px">${t.kitNote}</p>
    ${rows.length > 6 ? `<div class="row center"><button class="btn btn-sm btn-ghost" type="button" id="kitMore">${kitAll ? t.kitLess : t.kitMore}</button></div>` : ""}`;
  const m = $("kitMore"); if (m) m.onclick = () => { kitAll = !kitAll; kitSig = ""; renderKit(); };
}

function tick() {
  if (!L()) return;
  try { renderLanding(); } catch (e) { console.warn("owner", e); }
  try { renderKit(); } catch (e) { console.warn("kit", e); }
}
section("secOwner", $("viewErr")).classList.add("hidden"); // always present: app.js VIEWS.home lists it
section("secKit", $("secWall"));
setInterval(tick, 1500);
window.addEventListener("hashchange", () => setTimeout(tick, 50));
})();
