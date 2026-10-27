/* Agent Periodic Lab 前端 (纯 JS + ethers v6) — 「霓虹实验室 · 全息卡牌」 */
(() => {
const { ethers } = window;
const CFG = window.LAB_CONFIG, ABI = window.LAB_ABI, DATA = window.LAB_DATA;
const EL = DATA.elements;
const NAT = [...Array(94)].map((_, i) => i + 1);
const SYN = [...Array(24)].map((_, i) => i + 95);
const CMP = Object.keys(EL).map(Number).filter(k => k > 1000).sort((a, b) => a - b);
const ALL = [...NAT, ...SYN, ...CMP];
const STAKE_MIN = 95; // 与 NFTStaking.FIRST_STAKEABLE_ELEMENT 一致：只有合成产物可存入反应堆
const $ = id => document.getElementById(id);
const fmt = (v, d = 2) => Number(ethers.formatEther(v)).toLocaleString("zh-CN", { maximumFractionDigits: d });
const RM = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = ms => new Promise(r => setTimeout(r, RM() ? 0 : ms));
const stakeable = id => id >= STAKE_MIN;

// ---------- 化学类别（只用于配色，不代表稀有度） ----------
const CAT = {};
const setCat = (c, list) => list.forEach(z => CAT[z] = c);
const rng = (a, b) => [...Array(b - a + 1)].map((_, i) => a + i);
setCat("nonmetal", [1, 6, 7, 8, 15, 16, 34]); setCat("noble", [2, 10, 18, 36, 54, 86, 118]);
setCat("alkali", [3, 11, 19, 37, 55, 87]); setCat("alkaline", [4, 12, 20, 38, 56, 88]);
setCat("metalloid", [5, 14, 32, 33, 51, 52]); setCat("halogen", [9, 17, 35, 53, 85, 117]);
setCat("post", [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116]);
setCat("transition", [...rng(21, 30), ...rng(39, 48), ...rng(72, 80), ...rng(104, 112)]);
setCat("lanth", rng(57, 71)); setCat("actin", rng(89, 103));
const CAT_ZH = { nonmetal: "非金属", noble: "稀有气体", alkali: "碱金属", alkaline: "碱土金属", metalloid: "类金属", halogen: "卤素", post: "贫金属", transition: "过渡金属", lanth: "镧系", actin: "锕系", compound: "化合物" };
const catOf = id => id > 1000 ? "compound" : CAT[id] || "post";

const NET_ALIAS = { testnet: "bscTestnet", mainnet: "bscMainnet", bsc: "bscMainnet", local: "local" };
let netKey = new URLSearchParams(location.search).get("net") || CFG.defaultNetwork;
netKey = NET_ALIAS[netKey] || netKey;
if (!CFG.networks[netKey] || !CFG.networks[netKey].contracts?.ElementNFT) netKey = CFG.defaultNetwork;
let net, readProvider, browserProvider, signer, account = null, C = {}, state = { info: {}, staked: {}, recipes: [], byOut: {}, starters: new Set() }, filter = "all", recipesOpen = false;
const RECIPE_FOLD = 6; // 默认显示的化合物配方数（超重元素 95–118 始终显示）
let bench = new Map(); // id -> 数量
let busy = false;       // 动画进行中时不重绘实验台
let tick = { base: 0n, perSec: 0n, t0: Date.now() };
let viewAddr = null, viewName = "";
const who = () => viewAddr || account;
const canAct = () => !!account && (!viewAddr || viewAddr.toLowerCase() === account.toLowerCase());
const NEED = () => "网页只读";

// ---------- 钱包发现 (EIP-6963 + 传统注入) ----------
const discovered = [];
window.addEventListener("eip6963:announceProvider", e => discovered.push(e.detail));
window.dispatchEvent(new Event("eip6963:requestProvider"));
function pickInjected() {
  const bin = discovered.find(d => /binance/i.test(d.info?.name || ""));
  if (bin) return bin.provider;
  if (window.binancew3w?.ethereum) return window.binancew3w.ethereum;
  if (window.ethereum) return window.ethereum;
  if (window.BinanceChain) return window.BinanceChain;
  if (discovered[0]) return discovered[0].provider;
  return null;
}

const ic = n => `<i class="ic ic-${n}" aria-hidden="true"></i>`;
const LABI = '<img class="labtok" src="brand/lab-logo-32.png" srcset="brand/lab-logo-64.png 2x" alt="LAB" width="14" height="14"/>';
function setIc(e, n, txt) { e.textContent = txt; if (n) e.insertAdjacentHTML("afterbegin", ic(n)); }
function toast(msg, ms = 4000, icon) { const t = $("toast"); setIc(t, icon, msg); t.className = "toast" + (icon ? " t-" + icon : ""); t.classList.remove("hidden"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.add("hidden"), ms); }
function errMsg(e) {
  const m = e?.shortMessage || e?.info?.error?.message || e?.reason || e?.message || String(e);
  const map = { NotStakeable: "天然元素只能用来合成，不能放进反应堆", QuotaUsed: "铸造次数已用完（每个身份最多 4 次，免费仅限第 1 次）", SoldOut: "天然元素已全部售罄", FreeMintFirst: "请先完成免费首铸", PendingExists: "你有一张待揭示的卡，请先完成揭示", NotReady: "目标区块尚未产生，请稍候", NoPending: "没有待揭示的抽取", CapExceeded: "已达发行上限（售罄）", NotAgent: "需要币安 Agent ID（.ai）钱包", NoRecipe: "该卡没有可分解的配方", ERC20InsufficientBalance: "LAB 余额不足", ERC20InsufficientAllowance: "LAB 授权不足", ERC1155InsufficientBalance: "持有数量不足（反应堆中的需先取出）", BadPayment: "支付金额不正确", WeightRule: "配方违反权重规则", Inactive: "配方已停用", "user rejected": "已在钱包中取消" };
  for (const k in map) if (m.includes(k)) return map[k];
  return m;
}

const KIND_TXT = {
  local: n => `本地开发链（${n.name} · chainId ${n.chainId}）：仅供开发测试，数据可随时重置，与任何真实资产无关。`,
  testnet: n => `测试网演示版本（${n.name}）：资产无真实价值。主网版本仅对币安 Agent ID（.ai）钱包开放。`,
  mainnet: n => `主网（${n.name}）：真实资产，交易不可撤销。仅对币安 Agent ID（.ai）钱包开放。`
};
function netKind(n) { return n.kind || (n.chainId === 31337 ? "local" : n.chainId === 56 ? "mainnet" : "testnet"); }
function setupNet() {
  net = CFG.networks[netKey];
  const kind = netKind(net);
  $("netLabel").textContent = `BUILD-100 · ${net.label || net.name}`;
  const bn = $("banner"); bn.className = "banner " + kind; setIc(bn, { local: "tube", testnet: "warn", mainnet: "warn" }[kind], KIND_TXT[kind](net));
  document.body.dataset.net = kind;
  readProvider = new ethers.JsonRpcProvider(net.rpc, net.chainId, { staticNetwork: true, batchMaxCount: net.rpcBatch || 100 }); // 公共 RPC 限制批量请求
  const sel = $("netSel"); sel.innerHTML = "";
  for (const k in CFG.networks) { if (!CFG.networks[k].contracts?.ElementNFT) continue; const o = document.createElement("option"); o.value = k; o.textContent = CFG.networks[k].name; if (k === netKey) o.selected = true; sel.appendChild(o); }
  bindContracts(readProvider);
}
function bindContracts(runner) {
  const a = net.contracts;
  if (!a.ElementNFT) { C = {}; return; }
  logPs = null;
  C = { lab: new ethers.Contract(a.LABToken, ABI.LABToken, runner), nft: new ethers.Contract(a.ElementNFT, ABI.ElementNFT, runner), st: new ethers.Contract(a.NFTStaking, ABI.NFTStaking, runner), sy: new ethers.Contract(a.Synthesis, ABI.Synthesis, runner), gate: new ethers.Contract(a.AgentGate, ABI.AgentGate, runner) };
  if (a.LabMarket && ABI.LabMarket) C.mk = new ethers.Contract(a.LabMarket, ABI.LabMarket, runner);
  if (a.LabBidMarket) C.bm = new ethers.Contract(a.LabBidMarket, BM_ABI, runner);
  if (net.spaceIdRegistry) C.reg = new ethers.Contract(net.spaceIdRegistry, ["function handleOf(address) view returns (string)", "function ownerOfHandle(string) view returns (address)"], runner);
}

const short = a => a.slice(0, 6) + "…" + a.slice(-4);
function setConnUI() { return; // 网页只读：不再提供浏览器钱包连接
  const b = $("btnConnect");
  $("btnAddLab").classList.toggle("hidden", !account);
  if (account) { b.textContent = short(account); b.insertAdjacentHTML("afterbegin", '<i class="dot ok" aria-hidden="true"></i>'); b.classList.add("connected"); b.classList.remove("btn-primary"); b.title = `已连接 ${account}\n点击断开连接`; }
  else { b.textContent = "连接钱包"; b.classList.remove("connected"); b.title = "连接浏览器钱包"; }
}
async function disconnect() {
  account = null; signer = null; browserProvider = null; state.lab = 0n; bench.clear();
  localStorage.removeItem("lab.connected");
  for (const id of ["mLab", "mMints", "mStaked", "mPending", "mGate"]) $(id).textContent = "-";
  setConnUI(); toast("已断开连接（如需彻底撤销授权，请在钱包中移除本站）"); await refresh();
}
// 钱包链与页面网络不一致时显示切换提示 (主网 = BSC 56)
async function switchChain(inj) {
  try { await inj.request({ method: "wallet_switchEthereumChain", params: [{ chainId: net.chainIdHex }] }); }
  catch (e) {
    if (e.code === 4902 || /Unrecognized|not added/i.test(e.message || "")) await inj.request({ method: "wallet_addEthereumChain", params: [{ chainId: net.chainIdHex, chainName: net.name, rpcUrls: [net.rpc], nativeCurrency: { name: net.nativeSymbol, symbol: net.nativeSymbol, decimals: 18 }, blockExplorerUrls: net.explorer ? [net.explorer] : [] }] });
    else throw e;
  }
}
async function checkChain(inj) {
  let w = $("chainWarn");
  const cid = parseInt(await inj.request({ method: "eth_chainId" }), 16);
  if (cid === net.chainId) { w?.remove(); return true; }
  if (!w) { w = document.createElement("div"); w.id = "chainWarn"; w.className = "banner mainnet"; $("banner").after(w); }
  w.innerHTML = `${ic("warn")}钱包当前在 chainId ${cid}，本页面使用 ${net.name}（${net.chainId}）。 <button class="btn btn-sm btn-primary" id="btnSwitch">切换到 ${net.name}</button>`;
  $("btnSwitch").onclick = () => switchChain(inj).then(() => location.reload()).catch(e => toast(errMsg(e), 4000, "cross"));
  return false;
}
async function connect() {
  const inj = pickInjected();
  if (!inj) return toast("未检测到钱包：请安装 MetaMask 或使用币安 Web3 钱包内置浏览器打开");
  browserProvider = new ethers.BrowserProvider(inj, "any");
  await browserProvider.send("eth_requestAccounts", []);
  const cid = Number((await browserProvider.getNetwork()).chainId);
  if (cid !== net.chainId) {
    try { await inj.request({ method: "wallet_switchEthereumChain", params: [{ chainId: net.chainIdHex }] }); }
    catch (e) {
      if (e.code === 4902 || /Unrecognized|not added/i.test(e.message || "")) {
        await inj.request({ method: "wallet_addEthereumChain", params: [{ chainId: net.chainIdHex, chainName: net.name, rpcUrls: [net.rpc], nativeCurrency: { name: net.nativeSymbol, symbol: net.nativeSymbol, decimals: 18 }, blockExplorerUrls: net.explorer ? [net.explorer] : [] }] });
      } else throw e;
    }
    browserProvider = new ethers.BrowserProvider(inj, "any");
  }
  await checkChain(inj);
  signer = await browserProvider.getSigner();
  account = await signer.getAddress();
  localStorage.setItem("lab.connected", "1"); setConnUI(); renderViewBar();
  if (viewAddr && viewAddr.toLowerCase() !== account.toLowerCase()) toast("已连接钱包；当前仍在查看其他地址，点「退出查看」回到自己的卡册", 6000);
  else loadTimeline(false).catch(() => {});
  inj.on?.("accountsChanged", () => location.reload());
  inj.on?.("chainChanged", () => location.reload());
  await refresh();
}

// 发送交易；返回回执（失败返回 undefined）
async function tx(fn, okMsg, { quiet = false } = {}) {
  if (!signer || !canAct()) { toast(NEED()); return; }
  try {
    const w = {}; for (const k in C) w[k] = C[k].connect(signer);
    toast("请在钱包中确认交易…", 60000);
    const t = await fn(w); toast("交易已提交，等待确认… " + t.hash.slice(0, 10), 60000);
    const rc = await t.wait();
    if (!quiet) toast(typeof okMsg === "function" ? okMsg(rc) : okMsg, 4000, "check");
    else $("toast").classList.add("hidden");
    await refresh();
    return rc;
  } catch (e) { console.warn(e); toast(errMsg(e), 8000, "cross"); }
}

// ---------- 卡片 ----------
const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const formula = s => s.replace(/(?<=[A-Za-z)])(\d+)/g, d => [...d].map(c => SUB[c]).join(""));
function label(id) { const s = EL[id]?.sym; return s ? (id > 1000 ? formula(s) : s) : `#${id}`; }
function nameOf(id) { const e = EL[id]; return e ? (e.zh && e.zh !== e.sym ? `${e.zh} ${label(id)}` : label(id)) : `#${id}`; }
function isSoldOut(i) { return i && i.cap > 0n && i.minted >= i.cap; }
// 单次付费铸造得到 id 的概率 = remaining(id) / drawTotal()，按刚读到的链上数据现算（天然元素 1–94；其他返回 null）
function drawOdds(id) {
  const i = state.info?.[id], t = state.drawTotal;
  if (!(id >= 1 && id <= 94) || !i || !t || t === 0n) return null;
  const rem = i.cap > i.minted ? i.cap - i.minted : 0n;
  return Number(rem * 1000000n / t) / 1e6;
}
const pctStr = p => p == null ? "-" : (p * 100).toFixed(p < 0.001 ? 2 : 1) + "%";
// 「还缺」处的入口：市场挂单、预填求购、铸造台（只读：跳转并预填，不发交易）
function getLinks(id, qty = 1) {
  const nat = id >= 1 && id <= 94, p = drawOdds(id);
  return `<span class="getlinks"><a href="#market" class="getl" data-get="mk" data-id="${id}">查看挂单</a>` +
    `<a href="#bid" class="getl" data-get="bid" data-id="${id}" data-q="${qty}">发布求购</a>` +
    (nat ? `<a href="#mint" class="getl" data-get="mint" data-id="${id}">前往铸造</a><small class="muted">单次付费铸造约 ${pctStr(p)}，按链上剩余数量实时计算，不一定能拿到。</small>` : "") + `</span>`;
}
// ---------- 首发奖励 / 排序用权重（只读，数据来自 batchInfo） ----------
const isSyn = id => id >= 95 && id <= 118;
const wOf = id => Number(state.info[id]?.w || 0n);
const nf = (v, d = 0) => Number(v).toLocaleString("zh-CN", { maximumFractionDigits: d });
// 首发奖励（未发现时）；权重只用于计算和排序，界面不展示
function wMetaHTML(id, discovered) {
  if (!wOf(id)) return "";
  return discovered ? "" : `<span class="wm wr">首发奖励 <b>${nf(5 * wOf(id))}</b> LAB</span>`;
}
function rxNote() {
  return "首发奖励发给第一个合成出该配方的非团队玩家。";
}
function atomCount(sym) {
  let n = 0, m; const re = /[A-Z][a-z]?(\d*)/g;
  while ((m = re.exec(sym || ""))) n += m[1] ? Number(m[1]) : 1;
  return n || 1;
}
// Visual tier only. Family hue stays on --c; frame count marks superheavy band and compound size.
function tierOf(id) {
  if (id > 1000) {
    const n = atomCount(EL[id]?.sym);
    return "tier-c tier-c" + (n >= 20 ? 4 : n >= 9 ? 3 : n >= 4 ? 2 : 1);
  }
  if (id >= 95 && id <= 118) return "tier-sh tier-sh" + (id >= 111 ? 3 : id >= 103 ? 2 : 1);
  return "tier-el";
}
function cardHTML(id, o = {}) {
  const e = EL[id] || { sym: "#" + id, zh: "" };
  const cat = catOf(id), syn = id >= 95 && id <= 118, holo = syn || id > 1000;
  const sym = id > 1000 ? e.sym.replace(/(?<=[A-Za-z)])(\d+)/g, "<sub>$1</sub>") : e.sym;
  const len = e.sym.length;
  const art = id > 1000 ? window.LAB_ART?.molSVG(id) || "" : window.LAB_ART?.orbitSVG(id) || "";
  const cls = ["card", "cat-" + cat, tierOf(id), holo ? "holo" : "", syn ? "syn" : "", len >= 7 ? "xlong" : len >= 4 ? "long" : "", o.cls || ""].join(" ");
  const zh = e.zh && e.zh !== e.sym ? e.zh : "";
  const catTxt = syn ? "合成元素" : CAT_ZH[cat];
  return `<div class="${cls}" data-id="${id}" tabindex="0" role="button" aria-label="${nameOf(id)}">
    <span class="chd"><b>Periodic Lab</b><b>${id <= 118 ? "Z·" + id : "Compound"}</b></span>${art}
    <span class="cz">${id <= 118 ? id : ""}</span>${o.count ? `<span class="cnt">${o.count}</span>` : ""}
    <span class="csym">${sym}</span><span class="czh">${zh}</span>
    ${o.staked ? `<span class="cst">反应中 ${o.staked}</span>` : ""}${o.sold ? '<span class="csold tag">售罄</span>' : ""}
    <span class="ccat">${catTxt}</span></div>`;
}
const el = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
// 全息卡：指针驱动倾斜与高光（减少动态效果时关闭）
document.addEventListener("pointermove", e => {
  if (RM() || e.pointerType !== "mouse") return;
  const c = e.target.closest?.(".card"); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  c.style.setProperty("--ry", ((x - .5) * 14).toFixed(1) + "deg"); c.style.setProperty("--rx", ((.5 - y) * 14).toFixed(1) + "deg");
  c.style.setProperty("--mx", (x * 100).toFixed(0) + "%"); c.style.setProperty("--my", (y * 100).toFixed(0) + "%");
  c.style.setProperty("--gx", (x * 100).toFixed(0) + "%"); c.style.setProperty("--gy", (y * 100).toFixed(0) + "%");
});
document.addEventListener("pointerout", e => { const c = e.target.closest?.(".card"); if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty("--rx"); c.style.removeProperty("--ry"); } });

// ---------- 数据 ----------
const bal = id => state.info[id]?.bal || 0n;
const stk = id => state.staked[id] || 0n;
// 并发受限 + 重试 (公共 RPC 限流)
async function retry(fn, n = 4) { for (let k = 0; ; k++) { try { return await fn(); } catch (e) { if (k >= n) throw e; await new Promise(r => setTimeout(r, 400 * (k + 1))); } } }
async function pmap(n, fn, conc) {
  const out = new Array(n); let next = 0;
  await Promise.all([...Array(Math.min(conc, n))].map(async () => { while (next < n) { const i = next++; out[i] = await retry(() => fn(i)); } }));
  return out;
}
async function refresh() {
  if (!C.nft) { $("ptable").innerHTML = '<p class="muted">该网络尚未配置合约地址（见 config.js）。</p>'; return; }
  const me = who() || ethers.ZeroAddress;
  const [info, stats, burnedFees, baseMinted, nRec, starters, drawTotal] = await retry(() => Promise.all([
    C.nft.batchInfo(me, ALL), C.st.stats(), C.sy.totalFeesBurned(), C.nft.baseMinted(), C.sy.recipeCount(), C.nft.starterPoolList(), C.nft.drawTotal()]));
  state.drawTotal = drawTotal;
  // 权重：首位发现者墙和配方卡上展示（首发奖励 = 5 LAB × 权重；反应堆每天产出按权重估算）
  state.info = {}; ALL.forEach((id, i) => state.info[id] = { cap: info[0][i], minted: info[1][i], bal: info[2][i], w: info[3]?.[i] ?? 0n });
  state.infoFor = me;
  state.starters = new Set(starters.map(Number));
  const [tw, rate, avail, , paid] = stats;
  state.tw = tw; state.rate = rate;
  if ($("aiRxW")) { $("aiRxW").textContent = tw.toLocaleString("zh-CN"); $("aiRxRate").textContent = fmt(rate, 0); $("aiRxNote").textContent = tw === 0n ? "目前反应堆里还没有卡。" : ""; }
  $("sRate").textContent = fmt(rate); $("sPool").textContent = fmt(avail, 0); $("sPaid").textContent = fmt(paid); $("sBurn").textContent = fmt(burnedFees);
  $("sBase").textContent = Number(baseMinted).toLocaleString(); state.baseMinted = baseMinted;
  if (who()) {
    const account = me;
    const [lb, mu, pend, staked, gateOn, ident, u] = await Promise.all([C.lab.balanceOf(account), C.nft.mintsUsedBy(account), C.st.pendingReward(account), C.st.stakedBatch(account, ALL), C.gate.enabled(), C.gate.identityOf(account), C.st.users(account)]);
    state.staked = {}; let nst = 0n; ALL.forEach((id, i) => { state.staked[id] = staked[i]; nst += staked[i]; });
    state.lab = lb; state.myW = u[0]; state.nStaked = nst;
    $("mLab").textContent = fmt(lb); $("mMints").textContent = mu; $("mStaked").textContent = nst.toString();
    $("mGate").innerHTML = gateOn ? (ident === ethers.ZeroHash ? `开启 · ${ic("cross")}未检测到 .ai Agent ID` : `开启 · ${ic("check")}已验证`) : `关闭（${netKind(net) === "local" ? "本地链" : "测试网"}）`;
    state.mints = Number(mu); state.pending = pend;
    tick = { base: pend, perSec: tw > 0n ? rate * u[0] / tw / 3600n : 0n, t0: Date.now() };
  } else { state.staked = {}; state.mints = null; state.pending = 0n; state.myW = 0n; state.nStaked = 0n; tick = { base: 0n, perSec: 0n, t0: Date.now() }; }
  if (Number(nRec) !== state.recipes.length || Date.now() - recipesAt > 300000) {
    const rs = await pmap(Number(nRec), i => Promise.all([C.sy.getRecipe(i), C.sy.decompFee(i)]), net.rpcBatch === 1 ? 4 : 64);
    state.recipes = []; state.byOut = {}; recipesAt = Date.now();
    rs.forEach(([r, fee], i) => { const o = { id: i, ins: r[0].map(Number), amts: r[1].map(Number), out: Number(r[2]), active: r[3], dfee: fee }; state.recipes.push(o); state.byOut[o.out] = o; });
  }
  render(); renderWall(); if (bd.at) renderBids();
  if (!wall || !wallBusy) loadWall().catch(e => console.warn("wall", e));
  refreshMarket().catch(e => console.warn("market", e));
  refreshBids().catch(e => console.warn("bids", e));
  window.LAB_EZ_UI?.refresh(false);
}

// ---------- 渲染 ----------
function setBtn(b, ok, why) { b.disabled = !ok; b.title = ok ? "" : why; }
function updateButtons() {
  const conn = canAct(), NO = NEED();
  setBtn($("btnFree"), conn && state.mints === 0, !conn ? NO : "免费首铸仅限第 1 次（已使用）");
  conn && state.mints > 0 ? setIc($("btnFree"), "check", "已领取") : setIc($("btnFree"), "gift", "免费开包");
  const allSold = NAT.every(z => isSoldOut(state.info[z]));
  const left = state.mints == null ? null : Math.max(0, 4 - Math.max(state.mints, 1));
  const b = $("btnMint");
  setBtn(b, conn && state.mints >= 1 && state.mints < 4 && !allSold, !conn ? NO : state.mints === 0 ? "请先完成免费首铸" : allSold ? "天然元素已全部售罄" : "抽取次数已用完（每个身份最多 3 次）");
  setIc(b, "dice", left == null ? "抽一张" : `抽一张（剩 ${left} 次）`);
  const bl = $("btnMintLab");
  if (bl) { bl.classList.toggle("hidden", b.classList.contains("hidden") || !state.labDrawOn); setBtn(bl, !b.disabled && state.labDrawOn && (state.lab ?? 0n) >= (state.priceLab ?? 0n), !conn ? NO : b.disabled ? b.title : !state.labDrawOn ? "LAB 支付未开启" : `LAB 余额不足（需要 ${fmt(state.priceLab || 0n, 0)} LAB）`); }
  setBtn($("btnClaim"), conn && state.pending > 0n, !conn ? NO : "暂无可领取的 LAB");
  const canStake = ALL.filter(id => stakeable(id) && bal(id) > 0n);
  setBtn($("btnStakeAll"), conn && canStake.length > 0, !conn ? NO : "没有可放入的合成卡（天然元素只能用来合成）");
}
let renderSig = "", recipesAt = 0;
function render() {
  const sig = [who(), canAct(), state.tw, state.rate, state.myW, [...state.starters].join(), state.recipes.map(r => +r.active).join(""),
    ALL.map(id => { const i = state.info[id]; return i ? `${i.bal}/${i.minted}/${i.cap}/${state.staked[id] || 0}` : ""; }).join()].join("|");
  if (sig !== renderSig) { renderSig = sig; renderDex(); renderTray(); renderBench(); renderRecipes(); renderVault(); }
  updatePrice(); updateButtons();
}
function pos(z) {
  if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
  if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8];
  if (z <= 18) return [3, z <= 12 ? z - 10 : z];
  if (z <= 36) return [4, z - 18]; if (z <= 54) return [5, z - 36];
  if (z >= 57 && z <= 71) return [9, z - 57 + 3]; if (z >= 89 && z <= 103) return [10, z - 89 + 3];
  if (z <= 56) return [6, z - 54]; if (z <= 86) return [6, z - 68];
  if (z <= 88) return [7, z - 86]; return [7, z - 100];
}
function renderDex() {
  const pt = $("ptable"); pt.innerHTML = "";
  for (let z = 1; z <= 118; z++) {
    const [r, c] = pos(z), own = bal(z) + stk(z);
    const d = el(cardHTML(z, { count: own > 0n ? own.toString() : "", sold: isSoldOut(state.info[z]), cls: own > 0n ? "" : "dim" }));
    d.style.gridRow = r; d.style.gridColumn = c; d.title = `${nameOf(z)}（Z=${z}）${z >= 95 ? "\n仅可通过合成获得" : ""}`;
    pt.appendChild(d);
  }
  for (const [r, t] of [[9, "镧系"], [10, "锕系"]]) { const l = document.createElement("div"); l.className = "rowlab"; l.style.gridRow = r; l.style.gridColumn = "1 / span 2"; l.textContent = t; pt.appendChild(l); }
  const sp = document.createElement("div"); sp.style.gridRow = 8; sp.style.height = "6px"; pt.appendChild(sp);
  const cp = $("compounds"); cp.innerHTML = "";
  for (const id of CMP) {
    const own = bal(id) + stk(id);
    const d = el(cardHTML(id, { count: own > 0n ? own.toString() : "", starter: state.starters.has(id), cls: own > 0n ? "" : "dim" }));
    d.title = nameOf(id) + (state.byOut[id] ? "\n配方：" + fmtIns(state.byOut[id]) : ""); cp.appendChild(d);
  }
  const lg = $("legend"); if (!lg.children.length) lg.innerHTML = Object.entries(CAT_ZH).map(([k, v]) => `<span><i style="background:var(--c-${k})"></i>${v}</span>`).join("") + '<span><i style="background:linear-gradient(180deg,#e8c56e,#8a6a2e)"></i>全息 = 合成产物</span>';
}
function fmtIns(r) { return r.ins.map((id, k) => `${r.amts[k] > 1 ? r.amts[k] + "×" : ""}${label(id)}`).join(" + "); }

// 实验台
function benchAvail(id) { return bal(id) - BigInt(bench.get(id) || 0); }
function renderTray() {
  if (busy) return;
  const t = $("tray"); t.innerHTML = "";
  const ids = ALL.filter(id => bal(id) > 0n);
  if (!who()) { t.innerHTML = '<div class="empty">在顶部输入 .ai 名字或地址，卡片会出现在这里。</div>'; return; }
  if (!ids.length) { t.innerHTML = '<div class="empty">卡册还是空的 —— 先去 <a href="#mint">铸造台</a> 免费领一张。</div>'; return; }
  for (const id of ids) {
    const left = benchAvail(id);
    const d = el(cardHTML(id, { count: left.toString(), cls: left > 0n ? "" : "ghost" }));
    d.draggable = left > 0n; d.title = `点一下放入烧瓶：${nameOf(id)}`;
    d.dataset.tray = "1";
    d.addEventListener("dragstart", ev => { ev.dataTransfer.setData("text/plain", String(id)); ev.dataTransfer.effectAllowed = "copy"; });
    t.appendChild(d);
  }
}
function benchKey() { return [...bench.entries()].filter(([, n]) => n > 0).sort((a, b) => a[0] - b[0]).map(([i, n]) => i + "x" + n).join(","); }
function matchRecipe() {
  const k = benchKey(); if (!k) return null;
  return state.recipes.find(r => r.active && r.ins.map((id, i) => [id, r.amts[i]]).sort((a, b) => a[0] - b[0]).map(([i, n]) => i + "x" + n).join(",") === k) || null;
}
function renderBench() {
  if (busy) return;
  const s = $("benchSlots"); s.innerHTML = "";
  const entries = [...bench.entries()].filter(([, n]) => n > 0);
  if (!entries.length) s.innerHTML = '<div class="ph">＋</div><div class="ph">＋</div>';
  for (const [id, n] of entries) {
    const lack = bal(id) < BigInt(n);
    const w = el(`<div class="slot" data-id="${id}">${cardHTML(id, { count: n > 1 ? "×" + n : "", cls: lack ? "lack" : "" })}<span class="x" title="取出 1 张" aria-label="取出">−</span></div>`);
    w.querySelector(".x").onclick = ev => { ev.stopPropagation(); unbench(id); };
    w.querySelector(".card").onclick = () => unbench(id);
    s.appendChild(w);
  }
  const r = matchRecipe(), out = $("benchOut"), msg = $("benchMsg"), fl = $("flask");
  fl.classList.toggle("filled", entries.length > 0);
  const lackAny = entries.some(([id, n]) => bal(id) < BigInt(n));
  const so = r && isSoldOut(state.info[r.out]);
  out.innerHTML = r ? cardHTML(r.out) : '<div class="q">?</div>';
  msg.className = "bench-msg " + (r && !lackAny && !so ? "ok" : entries.length ? "bad" : "muted");
  if (!entries.length) msg.textContent = "烧瓶是空的：从左侧点选卡片，或在下方配方书里点「放入实验台」。";
  else if (!r) msg.textContent = "这组原料还不构成已知配方 —— 翻翻配方书，或问问你的 AI。";
  else if (lackAny) { const lk = entries.filter(([id, n]) => bal(id) < BigInt(n)), miss = lk.map(([id, n]) => `${BigInt(n) - bal(id) > 1n ? (BigInt(n) - bal(id)) + "×" : ""}${label(id)}`); msg.textContent = `配方：${nameOf(r.out)} · 还缺 ${miss.join("、")}`; const [lid, ln] = lk[0]; msg.insertAdjacentHTML("beforeend", " " + getLinks(Number(lid), Number(BigInt(ln) - bal(lid)))); }
  else if (so) msg.textContent = `${nameOf(r.out)} 已售罄，暂时无法合成`;
  else msg.textContent = `配方成立：${fmtIns(r)} ＝ ${nameOf(r.out)} · 100% 成功 · 不收 LAB`;
  setBtn($("btnReact"), canAct() && !!r && !lackAny && !so, !canAct() ? NEED() : !r ? "原料不构成配方" : lackAny ? "原料不足" : "产出已售罄");
}
function addBench(id, from) {
  if (busy) return;
  if (!canAct()) return toast(NEED());
  if (benchAvail(id) <= 0n) return toast(`没有更多 ${label(id)} 了`);
  const fromRect = from?.getBoundingClientRect();
  bench.set(id, (bench.get(id) || 0) + 1); renderTray(); renderBench();
  const to = $("benchSlots").querySelector(`.slot[data-id="${id}"] .card`);
  if (fromRect && to) flyFrom(fromRect, to);
}
function unbench(id) { if (busy) return; const n = (bench.get(id) || 0) - 1; if (n > 0) bench.set(id, n); else bench.delete(id); renderTray(); renderBench(); }
function loadRecipe(r) {
  if (busy) return;
  bench = new Map(r.ins.map((id, i) => [id, r.amts[i]])); renderTray(); renderBench();
  go("lab");
  $("flaskZone").classList.add("glowpulse"); setTimeout(() => $("flaskZone").classList.remove("glowpulse"), 3200);
}
function flyFrom(rect, target) {
  if (RM()) return;
  const tr = target.getBoundingClientRect();
  const dx = rect.left + rect.width / 2 - (tr.left + tr.width / 2), dy = rect.top + rect.height / 2 - (tr.top + tr.height / 2);
  target.animate([{ transform: `translate(${dx}px,${dy}px) scale(${rect.width / tr.width})`, opacity: .6 }, { transform: "none", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.2,.9,.25,1.15)" });
}

// ---------- 合成动画 ----------
function burst(x, y) {
  if (RM()) return;
  const p = document.createElement("i"); p.className = "particle";
  p.style.left = x + "px"; p.style.top = y + "px";
  document.body.appendChild(p);
  p.animate([{ transform: "translate(-50%,-50%) scale(.12)", opacity: .65 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0 }], { duration: 640, easing: "cubic-bezier(.16,.7,.2,1)" }).onfinish = () => p.remove();
}
function mountRx(fl, mode) {
  const flash = fl?.querySelector(".flash"); if (!flash) return;
  const bonds = mode === "break"
    ? [[50, 50, 22, 28], [50, 50, 78, 28], [50, 50, 22, 72], [50, 50, 78, 72]]
    : [[28, 64, 50, 36], [72, 64, 50, 36], [28, 64, 72, 64]];
  const atoms = mode === "break"
    ? [[50, 50, 6.5], [22, 28, 4.6], [78, 28, 4.6], [22, 72, 4.6], [78, 72, 4.6]]
    : [[28, 64, 5], [72, 64, 5], [50, 36, 6]];
  const lines = bonds.map(([x1, y1, x2, y2], i) => `<line class="bond b${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join("");
  const dots = atoms.map(([x, y, r], i) => `<circle class="atom a${i}" cx="${x}" cy="${y}" r="${r}"/>`).join("");
  flash.innerHTML = `<svg class="rxsvg" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="rgba(236,228,210,.9)" stroke-width="1.7" stroke-linecap="round">${lines}</g>${dots}</svg>`;
}
function clearRx(fl) { const flash = fl?.querySelector(".flash"); if (flash) flash.innerHTML = ""; }
function center(node) { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
// 把节点克隆成固定定位的飞行卡，飞向目标点
function flyClone(node, [tx, ty], { scale = .25, dur = 650, delay = 0, fade = true } = {}) {
  const r = node.getBoundingClientRect(), c = node.cloneNode(true);
  c.classList.add("flycard"); Object.assign(c.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  document.body.appendChild(c);
  const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
  const an = c.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx * .42}px,${dy * .42 - 16}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: .58 }, { transform: `translate(${dx}px,${dy}px) scale(${scale})`, opacity: fade ? 0 : 1 }], { duration: RM() ? 1 : dur, delay: RM() ? 0 : delay, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
  return an.finished.then(() => c.remove());
}
async function synth() {
  const r = matchRecipe(); if (!r || busy) return;
  busy = true;
  const fl = $("flask"), mouth = center(fl.querySelector(".neck"));
  const cards = [...$("benchSlots").querySelectorAll(".slot .card")];
  $("benchMsg").className = "bench-msg"; $("benchMsg").textContent = "反应中… 请在钱包中确认";
  $("btnReact").disabled = true;
  await Promise.all(cards.map((c, i) => { const p = flyClone(c, mouth, { delay: i * 110 }); c.closest(".slot").style.visibility = "hidden"; return p; }));
  fl.classList.add("boil", "rx-heat");
  // 本地链几乎瞬间出块：保证加热阶段至少约 1.2 秒，动画才读得出来
  const [rc] = await Promise.all([tx(w => w.sy.synthesize(r.id), `合成成功：${nameOf(r.out)}`, { quiet: true }), sleep(1200)]);
  if (!rc) { fl.classList.remove("boil", "rx-heat"); clearRx(fl); busy = false; renderTray(); renderBench(); return; }
  fl.classList.remove("boil", "rx-heat"); mountRx(fl, "form"); fl.classList.add("bang", "rx-bond");
  await sleep(760);
  const out = $("benchOut"); out.innerHTML = cardHTML(r.out, { cls: "pop" });
  $("benchMsg").className = "bench-msg ok"; setIc($("benchMsg"), "sparkle", `合成成功：${nameOf(r.out)} 已存入你的卡册`);
  await sleep(900);
  fl.classList.remove("bang", "rx-bond"); clearRx(fl); busy = false;
  bench.clear(); renderTray(); renderBench();
  out.innerHTML = cardHTML(r.out, { cls: "glowpulse" });
  $("benchMsg").className = "bench-msg ok"; setIc($("benchMsg"), "sparkle", `合成成功：${nameOf(r.out)} 已存入你的卡册${stakeable(r.out) ? " · 可以放进反应堆了" : ""}`);
  toast(`合成成功：${nameOf(r.out)}`, 4000, "check");
}
// 分解 = 倒放：产物飞入烧瓶 -> 闪光 -> 原料从烧瓶飞出
async function decompose(r) {
  if (busy) return;
  busy = true;
  go("lab"); await sleep(450);
  const fl = $("flask"), out = $("benchOut"); bench.clear();
  $("benchSlots").innerHTML = ""; out.innerHTML = cardHTML(r.out);
  $("benchMsg").className = "bench-msg"; $("benchMsg").textContent = `分解 ${nameOf(r.out)} … 请在钱包中确认（手续费 ${fmt(r.dfee)} LAB，销毁）`;
  await flyClone(out.querySelector(".card"), center(fl.querySelector(".neck")), { dur: 600 }); out.innerHTML = '<div class="q">?</div>';
  mountRx(fl, "break"); fl.classList.add("filled", "boil", "rx-heat");
  const [rc] = await Promise.all([tx(async w => {
    const allow = await w.lab.allowance(account, net.contracts.Synthesis);
    if (r.dfee > 0n && allow < r.dfee) { toast("第 1 步：授权 LAB 分解手续费…", 60000); await (await w.lab.approve(net.contracts.Synthesis, r.dfee)).wait(); }
    return w.sy.decompose(r.out);
  }, "", { quiet: true }), sleep(1200)]);
  fl.classList.remove("boil", "rx-heat");
  if (!rc) { clearRx(fl); busy = false; renderTray(); renderBench(); return; }
  fl.classList.add("bang", "rx-break");
  const s = $("benchSlots"); s.innerHTML = r.ins.map((id, i) => `<div class="slot">${cardHTML(id, { count: r.amts[i] > 1 ? "×" + r.amts[i] : "" })}</div>`).join("");
  const [mx, my] = center(fl.querySelector(".bulb"));
  if (!RM()) [...s.querySelectorAll(".card")].forEach((c, i) => { const [cx, cy] = center(c); c.animate([{ transform: `translate(${mx - cx}px,${my - cy}px) scale(.2)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 700, delay: 120 * i, easing: "cubic-bezier(.2,.9,.25,1.15)", fill: "backwards" }); });
  $("benchMsg").className = "bench-msg ok"; setIc($("benchMsg"), "recycle", `分解完成：${nameOf(r.out)} ＝ ${fmtIns(r)}（原料已回到卡册）`);
  busy = false; renderTray(); busy = true; // 托盘立即反映返还的原料
  await sleep(1400); fl.classList.remove("bang", "rx-break", "filled"); clearRx(fl); busy = false;
  renderTray(); renderBench();
  $("benchMsg").className = "bench-msg ok"; setIc($("benchMsg"), "recycle", `分解完成：${nameOf(r.out)} ＝ ${fmtIns(r)}（原料已回到卡册）`);
  toast(`分解成功：${nameOf(r.out)} ＝ ${fmtIns(r)}`, 4000, "check");
}

function renderRecipes() {
  const box = $("recipes"); box.innerHTML = "";
  const canMake = r => r.ins.every((id, k) => bal(id) >= BigInt(r.amts[k])) && !isSoldOut(state.info[r.out]);
  // 排序：能合成的在前；其次超重元素在前；同类按权重从高到低
  let nFold = 0;
  for (const r of [...state.recipes].sort((a, b) => canMake(b) - canMake(a) || isSyn(b.out) - isSyn(a.out) || wOf(b.out) - wOf(a.out) || a.id - b.id)) {
    if (!r.active) continue;
    const so = isSoldOut(state.info[r.out]);
    const can = canMake(r);
    if (filter === "c" && r.out < 1000) continue; if (filter === "s" && r.out > 1000) continue; if (filter === "ok" && !can) continue;
    const lhs = r.ins.map((id, k) => `<div class="mc">${cardHTML(id, { cls: bal(id) >= BigInt(r.amts[k]) ? "" : "dim" })}${r.amts[k] > 1 ? `<span class="n">×${r.amts[k]}</span>` : ""}</div>`).join('<span class="op">+</span>');
    let why = "";
    if (!canAct()) why = NEED();
    else if (so) why = "产出已售罄";
    else if (!can) why = "缺少 " + r.ins.map((id, k) => { const need = BigInt(r.amts[k]), have = bal(id); return have < need ? `${need - have > 1n ? (need - have) + "×" : ""}${label(id)}` : null; }).filter(Boolean).join("、");
    const d = el(`<div class="rc${can ? " can" : ""}"><div class="eq">${lhs}<span class="op">${ic("arrow")}</span><div class="mc out">${cardHTML(r.out)}</div></div>
      <div class="nm">${nameOf(r.out)} <span class="muted" style="font-weight:500">· ${r.out > 1000 ? "化合物" : "超重元素（仅可合成）"}</span></div>
      <div class="wmeta">${wMetaHTML(r.out, !!firstOf(r.out))}${firstOf(r.out) ? `<span class="wm">首位发现者 <b>${shortName(firstOf(r.out).user)}</b></span>` : ""}</div>
      ${!can && !so && who() ? `<div class="need">${r.ins.map((id, k) => bal(id) < BigInt(r.amts[k]) ? `<div class="need1"><b>${label(id)}</b> ${getLinks(id, Number(BigInt(r.amts[k]) - bal(id)))}</div>` : "").join("")}</div>` : ""}
      <div class="act"><button class="btn btn-sm ${can ? "btn-primary" : ""}">${can ? ic("flask") + "放入实验台" : "放入实验台"}</button>${bal(r.out) > 0n ? '<button class="btn btn-sm btn-ghost dec">' + ic("recycle") + '分解…</button>' : ""}<span class="why ${can ? "ok" : !canAct() ? "ro" : ""}">${can ? "原料齐全 · 100% 成功" : why}</span></div></div>`);
    d.querySelector("button").onclick = () => loadRecipe(r);
    d.querySelector(".dec")?.addEventListener("click", () => openEl(r.out));
    // 折叠只收起化合物：95–118 超重元素与能合成的配方始终显示
    if (!can && !isSyn(r.out) && nFold++ >= RECIPE_FOLD) d.dataset.fold = "1";
    box.appendChild(d);
  }
  const n = box.children.length, more = $("recipesMore");
  if ($("rxNoteLab")) $("rxNoteLab").textContent = rxNote();
  if (!n) box.innerHTML = `<p class="muted">${filter === "ok" ? "暂时没有原料齐全的配方 —— 去铸造，或在二级市场换点原料。" : "没有符合条件的配方。"}</p>`;
  const folded = [...box.children].filter(c => c.dataset.fold);
  if (!recipesOpen) folded.forEach(c => c.classList.add("hidden"));
  more.classList.toggle("hidden", !folded.length);
  more.innerHTML = `<button class="btn btn-ghost" type="button">${recipesOpen ? "收起配方书" : `展开全部 ${n} 个配方`}</button>`;
  more.firstChild.onclick = () => { recipesOpen = !recipesOpen; renderRecipes(); if (!recipesOpen) document.querySelector("#secLab .filters").scrollIntoView({ block: "start" }); };
}

// ---------- 反应堆（存入 / 取出） ----------
function renderVault() {
  const slots = $("rxSlots"), pick = $("rxPick"); slots.innerHTML = ""; pick.innerHTML = "";
  const stakedIds = ALL.filter(id => stk(id) > 0n);
  for (const id of stakedIds) {
    const s = el(`<div class="rx-slot">${cardHTML(id, { count: stk(id) > 1n ? stk(id).toString() : "" })}</div>`);
    slots.appendChild(s);
  }
  const pickIds = ALL.filter(id => stakeable(id) && bal(id) > 0n);
  const emptyN = Math.max(1, Math.min(3, 4 - stakedIds.length));
  for (let i = 0; i < emptyN; i++) slots.appendChild(el(`<div class="rx-slot emptyslot"><div class="ph">${!who() ? "输入 .ai 名字" : pickIds.length ? "可放入下方的合成卡" : "空卡槽<br/>合成后放入"}</div></div>`));
  for (const id of pickIds) {
    const p = el(`<div class="pk">${cardHTML(id, { count: bal(id).toString() })}</div>`);
    pick.appendChild(p);
  }
  if (!pickIds.length) {
    const natCount = NAT.filter(z => bal(z) > 0n).length;
    pick.innerHTML = `<div class="empty">${!who() ? "在顶部输入 .ai 名字后显示合成卡。" : natCount ? `你有 ${natCount} 种天然元素卡 —— 它们只能用来合成。去 <a href="#lab">实验台</a> 做出化合物再放进来。` : "还没有合成卡 —— 免费首铸的化合物卡也能放进来。"}</div>`;
  }
  $("secStake").querySelector(".core").classList.toggle("off", !(state.myW > 0n));
  const share = state.tw > 0n ? Number(state.myW * 10000n / state.tw) / 100 : 0;
  $("rxShareBar").style.width = Math.min(100, share) + "%";
  $("rxShare").textContent = `我的份额 ${share.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%（全网反应堆）`;
  const perDay = state.tw > 0n ? state.rate * 24n * state.myW / state.tw : 0n;
  $("rxPerDay").textContent = `≈ ${fmt(perDay, 2)} LAB / 天`;
}
async function ensureApproval(w) {
  if (!(await w.nft.isApprovedForAll(account, net.contracts.NFTStaking))) { toast("第 1 步：授权反应堆合约…", 60000); await (await w.nft.setApprovalForAll(net.contracts.NFTStaking, true)).wait(); }
}
async function stake(id, q) {
  if (!stakeable(id)) return toast("天然元素只能用来合成，不能放进反应堆");
  await tx(async w => { await ensureApproval(w); return w.st.stake(id, q); }, `${nameOf(id)} 已放入反应堆`);
}
async function unstake(id, q) { await tx(w => w.st.unstake(id, q), `${nameOf(id)} 已取出`); }
async function stakeAll() {
  const ids = ALL.filter(id => stakeable(id) && bal(id) > 0n);
  for (const [i, id] of ids.entries()) {
    const rc = await tx(async w => { await ensureApproval(w); return w.st.stake(id, bal(id)); }, `已放入 ${i + 1}/${ids.length}：${nameOf(id)}`);
    if (!rc) break;
  }
}
setInterval(() => {
  const el2 = $("rxPending");
  if (!who()) { el2.textContent = "0"; return; }
  const dt = BigInt(Math.floor((Date.now() - tick.t0) / 100));
  const v = tick.base + tick.perSec * dt / 10n;
  const s = Number(ethers.formatEther(v)).toLocaleString("zh-CN", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (el2.textContent !== s) { el2.textContent = s; $("mPending").textContent = s; }
}, 100);

// ---------- 铸造 ----------
async function updatePrice() {
  if (!C.nft) return;
  const [pn, pt] = await C.nft.drawPrice(); state.price = pn; state.priceLab = pt;
  let lp = 0n; try { lp = (await C.nft.payToken()).toLowerCase() === net.contracts.LABToken.toLowerCase() ? pt : 0n; } catch {}
  state.labDrawOn = lp > 0n;
  $("mintPrice").textContent = `统一价 ${ethers.formatEther(pn)} ${net.nativeSymbol} / 张` + (lp > 0n ? ` · 或 ${fmt(lp, 0)} LAB / 张` : "");
  // 首页提示词里的预算句：总价 = 网页刚读到的 drawPrice() × 3（不写死），AI 仍要当场重读
  if ($("aiBudget") && pn > 0n) $("aiBudget").textContent = `我预先同意最多 3 次付费铸造，总价不超过 ${ethers.formatEther(pn * 3n)} BNB（当前读取单价 ${ethers.formatEther(pn)} BNB × 3）。你执行时当场重读价格，没超过就直接做，不用再问我。价格变高、出错或有风险提示时停下告诉我。`;
  ensureLabBtn(); updateButtons();
}
// LAB 支付抽取 (commitDraw(true))：与 BNB 抽取共用每个身份 3 次付费配额；LAB 支付不计入 prize.md 的 90%
function ensureLabBtn() {
  if ($("btnMintLab") || !$("btnMint")) return;
  const b = document.createElement("button");
  b.id = "btnMintLab"; b.type = "button"; b.className = "btn btn-sm btn-ghost hidden";
  b.textContent = "用 LAB 支付";
  b.onclick = () => mintFlow("元素抽取", async w => {
    const pt = await w.nft.drawPriceToken();
    const allow = await w.lab.allowance(account, net.contracts.ElementNFT);
    if (allow < pt) { toast(`第 1 步：授权 ${fmt(pt, 0)} LAB 给铸造合约…`, 60000); await (await w.lab.approve(net.contracts.ElementNFT, pt)).wait(); }
    return w.nft.commitDraw(true);
  });
  $("btnMint").after(b);
}
const DRAW_GAS = 1000000n; // 铸造结果在执行时才确定，固定给足 gas 上限，未用部分退还
function drawnId(rc) {
  for (const lg of rc?.logs || []) {
    if (lg.address.toLowerCase() !== net.contracts.ElementNFT.toLowerCase()) continue;
    try { const p = C.nft.interface.parseLog(lg); if (p && (p.name === "PaidMint" || p.name === "FreeMint")) return Number(p.args.id); } catch {}
  }
  return null;
}
// 翻卡揭示
function reveal(id, kind, okTxt = "收下", onShare = null) {
  return new Promise(res => {
    const fx = $("fx");
    fx.innerHTML = `<div class="reveal"><div class="rays"></div><div class="title">${kind}</div>
      <div class="flip" id="flipCard"><div class="inner"><div class="face back"><div class="cardback"></div></div><div class="face front">${cardHTML(id)}</div></div></div>
      <div class="name" id="revName">　</div><div class="desc" id="revDesc">　</div><div class="rv-row">${onShare ? `<button class="btn btn-lg" id="revShare" type="button">${ic("sparkle")}生成分享卡</button>` : ""}<button class="btn btn-primary btn-lg" id="revOk">${okTxt}</button></div></div>`;
    fx.classList.remove("hidden", "opened");
    const done = () => { fx.classList.add("hidden"); fx.innerHTML = ""; res(); };
    $("revOk").onclick = done; fx.onclick = e => { if (e.target === fx) done(); };
    if (onShare) $("revShare").onclick = () => { done(); onShare(); };
    setTimeout(() => {
      $("flipCard").classList.add("open"); fx.classList.add("opened");
      setTimeout(() => {
        const [x, y] = center($("flipCard")); burst(x, y, 56);
        $("revName").textContent = nameOf(id) + (id <= 118 ? `（Z=${id}）` : "");
        $("revDesc").textContent = id >= STAKE_MIN ? "合成卡：可以直接放进反应堆产出 LAB（实验室催化剂），也能转账或分解。" : "天然元素卡：只能用来合成 —— 去实验台把它变成化合物吧。";
      }, RM() ? 0 : 450);
    }, RM() ? 0 : 900);
  });
}
// 两段式：commit (付款/扣配额) -> 等目标区块 -> reveal(account)；揭示动画等待链上结果
function pendingFx(kind, msg) {
  const fx = $("fx");
  if (!$("pendMsg")) {
    fx.innerHTML = `<div class="reveal"><div class="rays"></div><div class="title">${kind}</div>
      <div class="flip pending" id="flipCard"><div class="inner"><div class="face back"><div class="cardback"></div></div></div></div>
      <div class="name" id="pendMsg">　</div><div class="desc muted">结果由提交后第 2 个区块的区块哈希决定（commit-reveal），任何人都无法提前预知</div></div>`;
    fx.classList.remove("hidden", "opened");
  }
  $("pendMsg").textContent = msg;
}
function closeFx() { const fx = $("fx"); fx.classList.add("hidden"); fx.innerHTML = ""; }
async function waitBlock(target) {
  for (let i = 0; i < 600; i++) { const b = await readProvider.getBlockNumber(); if (b > target) return; await new Promise(r => setTimeout(r, 700)); }
  throw new Error("等待区块超时");
}
async function mintFlow(kind, send) {
  if (!signer || !canAct()) return toast(NEED());
  let [st, target, pk] = await C.nft.pendingStatus(account);
  if (Number(st) !== 0) kind = Number(pk) === 1 ? "免费首铸" : "元素抽取";
  if (Number(st) === 0) {
    pendingFx(kind, "① 提交中：请在钱包中确认…");
    const rc = await tx(send, "", { quiet: true }); if (!rc) return closeFx();
    for (const lg of rc.logs || []) { try { const p = C.nft.interface.parseLog(lg); if (p?.name === "Committed") target = p.args.targetBlock; } catch {} }
    if (!target) [st, target] = await C.nft.pendingStatus(account);
  } else pendingFx(kind, "发现未揭示的抽取，继续揭示…");
  pendingFx(kind, `② 已提交，等待目标区块 #${target} …`);
  try { await waitBlock(Number(target)); } catch (e) { closeFx(); return toast(errMsg(e), 4000, "cross"); }
  pendingFx(kind, "③ 揭示中：请在钱包中确认揭示交易…");
  const rc2 = await tx(w => w.nft.reveal(account, { gasLimit: DRAW_GAS }), "", { quiet: true }); if (!rc2) { closeFx(); return toast("可稍后再点一次继续揭示（结果已由区块哈希确定，不会改变）"); }
  const id = drawnId(rc2);
  if (id == null) { closeFx(); await refresh(); return toast("目标区块已过期，已重新锚定，请再点一次揭示"); }
  pendingFx(kind, "④ 已揭示，正在翻开…");
  await refresh().catch(() => {});
  await reveal(id, kind);
  const rc = rc2;
  const box = $("drawResult");
  box.innerHTML = `${cardHTML(id)}<div><b>${kind}获得：${nameOf(id)}</b><div class="muted">已存入你的卡册 · 交易 ${rc.hash.slice(0, 10)}…</div></div>`;
  box.classList.remove("hidden");
}

// ---------- 卡片详情 ----------
function openEl(id) {
  const i = state.info[id], st = stk(id), r = state.byOut?.[id], b = i?.bal || 0n;
  const box = $("modalBox"); box.classList.remove("sharebox");
  let actions;
  if (!stakeable(id)) {
    actions = `<p class="note">${ic("tube")}天然元素卡<b>只能用来合成</b>，不能放进反应堆。</p><div class="row"><button id="bLab" class="btn btn-primary">${ic("flask")}去实验台使用</button><button id="bClose" class="btn btn-ghost">关闭</button></div>`;
  } else {
    actions = `<p class="note">${ic("bolt")}合成卡可以放进反应堆产出 LAB。</p><div class="row"><button id="bClose" class="btn btn-ghost">关闭</button></div>`;
  }
  let dec = "";
  if (r) {
    const okLab = (state.lab || 0n) >= r.dfee;
    const why = !canAct() ? NEED() : !(b > 0n) ? (st > 0n ? "反应堆中的需先取出" : "未持有") : !okLab ? `LAB 不足（需 ${fmt(r.dfee)}）` : "";
    dec = `<div class="decbox"><b>${ic("recycle")}分解</b>：销毁 1 张 ${label(id)}，返还 <b>${fmtIns(r)}</b><br/><span class="muted">手续费 ${LABI}${fmt(r.dfee)} LAB（销毁）· 返还的原料计入各自发行上限，若原料已售罄则无法分解</span></div>`;
  }
  box.innerHTML = `<div class="big">${cardHTML(id)}</div><div>
    <h3>${nameOf(id)}</h3>
    <p>${viewAddr && !canAct() ? "该地址持有" : "持有"} <b>${b}</b>${stakeable(id) ? ` · 反应堆中 <b>${st}</b>` : ""}${isSoldOut(i) ? ' · <span class="tag">已售罄</span>' : ""}${r ? `<br/><span class="muted">配方：${fmtIns(r)} ＝ ${label(id)}</span>` : id >= 95 ? '<br/><span class="muted">仅可通过合成获得</span>' : ""}</p>
    ${actions}${dec}
    ${b > 0n ? "" : `<p class="note">还缺这张卡：${getLinks(id, 1)}</p>`}
    </div>`;
  $("modal").classList.remove("hidden");
  const close = () => $("modal").classList.add("hidden");
  $("bClose").onclick = close;
  if (!stakeable(id)) $("bLab").onclick = () => { close(); if (b > 0n && benchAvail(id) > 0n) addBench(id); go("lab"); };
  else {
  }
}

// ---------- 观看模式：输入 .ai 名字 / 地址 ----------
const shortName = a => (nameCache[a.toLowerCase()] ? nameCache[a.toLowerCase()] : short(a));
const nameCache = JSON.parse(localStorage.getItem("lab.names") || "{}");
async function nameOfAddr(a) {
  const k = a.toLowerCase();
  if (k in nameCache) return nameCache[k];
  if (!C.reg) return "";
  let n = "";
  try { const h = await retry(() => C.reg.handleOf(a), 2); n = h ? h + ".ai" : ""; } catch { n = ""; }
  nameCache[k] = n; try { localStorage.setItem("lab.names", JSON.stringify(nameCache)); } catch {}
  return n;
}
class ViewErr extends Error {}
async function resolveInput(raw) {
  const s = (raw || "").trim();
  if (!s) throw new ViewErr("请输入 AI 名字（如 yourname 或 yourname.ai）或 0x 钱包地址");
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) { const addr = ethers.getAddress(s.toLowerCase()); return { addr, name: await nameOfAddr(addr) }; }
  if (/^0x/i.test(s)) throw new ViewErr("地址格式不对：应为 0x 开头的 40 位十六进制");
  const h = s.toLowerCase().replace(/\.ai$/, "");
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(h)) throw new ViewErr(`「${s}」不是有效的 .ai 名字（只含字母、数字、- 和 _）`);
  if (!C.reg) throw new ViewErr("当前网络不支持 .ai 名字解析，请输入 0x 地址");
  let addr = ethers.ZeroAddress;
  try { addr = await retry(() => C.reg.ownerOfHandle(h), 2); } catch (e) { if (!/revert|CALL_EXCEPTION|could not decode/i.test(e?.code + " " + e?.message)) throw new ViewErr("读取 SPACE ID 注册表失败，请稍后重试"); }
  if (!addr || addr === ethers.ZeroAddress) throw new ViewErr(`没有找到「${h}.ai」：这个 .ai 名字还没有人注册。检查一下拼写，或直接输入 0x 地址。`);
  nameCache[addr.toLowerCase()] = h + ".ai"; try { localStorage.setItem("lab.names", JSON.stringify(nameCache)); } catch {}
  return { addr, name: h + ".ai" };
}
function showViewErr(msg) { const e = $("viewErr"); if (!msg) { e.classList.add("hidden"); e.textContent = ""; return; } setIc(e, "cross", msg); e.classList.remove("hidden"); }
async function setView(input, { scroll = true } = {}) {
  const btn = $("viewForm").querySelector("button"); btn.disabled = true; showViewErr("");
  const u = new URL(location.href); u.searchParams.delete("addr"); u.searchParams.delete("ai"); history.replaceState(null, "", u.toString());
  let r;
  try { r = await resolveInput(input); }
  catch (e) { btn.disabled = false; showViewErr(e instanceof ViewErr ? e.message : "解析失败：" + errMsg(e)); return; }
  btn.disabled = false;
  viewAddr = r.addr; viewName = r.name; bench.clear();
  $("viewInput").value = viewName || viewAddr;
  renderViewBar(); tlEvents = []; renderTimeline(); renderWall();
  await refresh().catch(e => toast("读取链上数据失败：" + errMsg(e)));
  if (scroll) { go("home"); $("me").scrollIntoView({ block: "center" }); }
  loadTimeline(false).catch(e => { console.warn("timeline", e); $("timeline").innerHTML = `<li class="feed-empty muted">读取链上事件失败（公共 RPC 限流），请稍后点刷新重试。</li>`; });
}
function clearView() {
  viewAddr = null; viewName = ""; bench.clear();
  const u = new URL(location.href); u.searchParams.delete("addr"); u.searchParams.delete("ai"); history.replaceState(null, "", u.toString());
  renderViewBar(); tlEvents = []; renderTimeline(); refresh().catch(() => {});
  if (account) loadTimeline(false).catch(() => {});
}
function shareUrl() { const a = who(); if (!a) return location.href; const base = location.origin + location.pathname; return viewName && a === viewAddr ? `${base}?ai=${encodeURIComponent(viewName.replace(/\.ai$/, ""))}` : `${base}?addr=${a}`; }
function renderViewBar() {
  const v = $("viewBar");
  if (!viewAddr) { v.classList.add("hidden"); v.innerHTML = ""; $("btnShare").classList.toggle("hidden", !account); $("tlTitle").innerHTML = `${ic("clock")}${account ? "我的时间线" : "地址时间线"}`; return; }
  v.classList.remove("hidden");
  v.innerHTML = `<div class="vb-l">${ic("eye")}<span>正在查看 <b>${viewName || short(viewAddr)}</b>${viewName ? ` <small class="muted">${short(viewAddr)}</small>` : ""} · 只读</span></div>
    <div class="vb-r"><button class="btn btn-sm btn-ghost" id="vbCard" type="button">${ic("sparkle")}分享卡</button><button class="btn btn-sm btn-ghost" id="vbShare" type="button">${ic("link")}分享</button><a class="btn btn-sm btn-ghost" href="${net.explorer}/address/${viewAddr}" target="_blank" rel="noopener">BscScan</a><button class="btn btn-sm btn-ghost" id="vbExit" type="button">退出查看</button></div>`;
  $("vbShare").onclick = copyShare; $("vbExit").onclick = clearView; $("vbCard").onclick = () => openShare(null);
  renderVbBadge();
  $("btnShare").classList.remove("hidden");
  $("tlTitle").innerHTML = `${ic("clock")}${viewName || short(viewAddr)} 的时间线`;
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); return ok; } }
async function copyShare() { const u = shareUrl(); toast((await copyText(u)) ? "分享链接已复制：" + u : u, 5000, "check"); }

// ---------- 链上事件：时间线 / 全网动态 ----------
let logPs = null, tlEvents = [], feedEvents = [], bt = null, tlBusy = false;
const CH = 49000; // 每次扫描的区块数（getLogsRange 内部再按各 RPC 的上限切分）
function logProviders() {
  if (!logPs) logPs = (net.logRpcs || [{ url: net.rpc, span: 2000 }]).map(r => ({ p: new ethers.JsonRpcProvider(r.url, net.chainId, { staticNetwork: true, batchMaxCount: 1 }), span: r.span }));
  return logPs;
}
// 每段都从首选节点开始；备用节点返回空且离链头超过 RECHECK_AGE 块时，用下一个节点复核。
// 返回数组带 .trusted：全部来自首选节点或复核过 = true；只有 trusted 的结果才写入 localStorage。
const RECHECK_AGE = 100000;
async function logsFrom(lp, filter, a, b) { // 单个节点查 [a,b]，按该节点的 span 切分；出错直接抛出
  const out = [];
  for (let x = a; x <= b; x += lp.span) out.push(...await lp.p.getLogs({ ...filter, fromBlock: x, toBlock: Math.min(b, x + lp.span - 1) }));
  return out;
}
async function getLogsRange(filter, from, to) {
  const ps = logProviders(), out = []; let a = from, trusted = true;
  while (a <= to) {
    let got = null, lastErr = null;
    for (let i = 0; i < ps.length && !got; i++) {
      const b = Math.min(to, a + ps[i].span - 1);
      for (let t = 0; t < 2 && !got; t++) {
        try { got = { i, b, logs: await logsFrom(ps[i], filter, a, b), ok: i === 0 }; }
        catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 250 * (t + 1))); }
      }
    }
    if (!got) throw lastErr || new Error("getLogs failed");
    if (!got.ok && !got.logs.length && bt && bt.n - got.b > RECHECK_AGE) { // 备用节点返回空、区间较旧：换另一节点复核
      for (let j = got.i + 1; j < ps.length && !got.ok; j++) {
        try { const r = await logsFrom(ps[j], filter, a, got.b); got.logs = r; got.ok = true; } catch {}
      }
    }
    if (!got.ok) trusted = false;
    out.push(...got.logs); a = got.b + 1;
  }
  out.trusted = trusted;
  return out;
}
function topicOf(c, n) { return c.interface.getEvent(n).topicHash; }
function decodeLog(lg, me) {
  for (const c of [C.nft, C.sy, C.st, C.mk]) {
    if (!c || lg.address.toLowerCase() !== c.target.toLowerCase()) continue;
    let p; try { p = c.interface.parseLog(lg); } catch { return null; }
    if (!p) return null;
    const a = p.args, base = { bn: lg.blockNumber, tx: lg.transactionHash, li: lg.index ?? lg.logIndex };
    switch (p.name) {
      case "FreeMint": return { ...base, k: "free", user: a.user, id: Number(a.id) };
      case "PaidMint": return { ...base, k: "paid", user: a.user, id: Number(a.id), price: a.price.toString(), tok: a.paidInToken };
      case "Synthesized": return { ...base, k: "syn", user: a.user, rid: Number(a.rid), id: Number(a.out) };
      case "Decomposed": return { ...base, k: "dec", user: a.user, rid: Number(a.rid), id: Number(a.out), fee: a.feeBurned.toString() };
      case "Staked": return { ...base, k: "stake", user: a.user, id: Number(a.id), amt: Number(a.amount) };
      case "Unstaked": return { ...base, k: "unstake", user: a.user, id: Number(a.id), amt: Number(a.amount) };
      case "Claimed": return { ...base, k: "claim", user: a.user, val: a.amount.toString() };
      case "Listed": return { ...base, k: "list", user: a.seller, id: Number(a.id), amt: Number(a.amount), val: a.pricePerUnit.toString(), lid: Number(a.listingId) };
      case "Purchased": { const sell = me && a.seller.toLowerCase() === me.toLowerCase() && a.buyer.toLowerCase() !== me.toLowerCase(); return { ...base, k: sell ? "sell" : "buy", user: sell ? a.seller : a.buyer, other: sell ? a.buyer : a.seller, id: Number(a.id), amt: Number(a.amount), val: a.totalPrice.toString(), lid: Number(a.listingId) }; }
      case "Cancelled": return { ...base, k: "cancel", user: a.seller, lid: Number(a.listingId) };
    }
    return null;
  }
  return null;
}
async function scanUser(addr, from, to) {
  const t = ethers.zeroPadValue(addr, 32), logs = []; let ok = true;
  const add = r => { if (!r.trusted) ok = false; logs.push(...r); };
  const game = [topicOf(C.nft, "FreeMint"), topicOf(C.nft, "PaidMint"), topicOf(C.sy, "Synthesized"), topicOf(C.sy, "Decomposed"), topicOf(C.st, "Staked"), topicOf(C.st, "Unstaked"), topicOf(C.st, "Claimed")];
  add(await getLogsRange({ address: [C.nft.target, C.sy.target, C.st.target], topics: [game, t] }, from, to));
  const mb = net.marketBlock || 0;
  if (C.mk && to >= mb) {
    const f = Math.max(from, mb);
    add(await getLogsRange({ address: C.mk.target, topics: [[topicOf(C.mk, "Listed"), topicOf(C.mk, "Purchased"), topicOf(C.mk, "Cancelled")], null, t] }, f, to));
    add(await getLogsRange({ address: C.mk.target, topics: [topicOf(C.mk, "Purchased"), null, null, t] }, f, to));
  }
  const ev = logs.map(l => decodeLog(l, addr)).filter(Boolean); ev.trusted = ok;
  return ev;
}
const evKey = e => e.tx + ":" + e.li;
function mergeEv(arr, add) { const m = new Map(arr.map(e => [evKey(e), e])); add.forEach(e => m.set(evKey(e), e)); return [...m.values()].sort((a, b) => b.bn - a.bn || b.li - a.li); }
async function blockTimes() {
  if (bt && Date.now() - bt.at < 60000) return bt;
  const L = await retry(() => readProvider.getBlock("latest"));
  const O = await retry(() => readProvider.getBlock(L.number - 20000));
  bt = { n: L.number, t: L.timestamp, spb: (L.timestamp - O.timestamp) / 20000, at: Date.now() };
  return bt;
}
const tsOf = bn => bt ? bt.t - (bt.n - bn) * bt.spb : 0;
function ago(bn) {
  const s = Math.max(0, Date.now() / 1000 - tsOf(bn));
  if (s < 60) return "刚刚"; if (s < 3600) return Math.floor(s / 60) + " 分钟前"; if (s < 86400) return Math.floor(s / 3600) + " 小时前";
  return new Date(tsOf(bn) * 1000).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
const bnb = v => { const s = ethers.formatEther(BigInt(v)); return s.includes(".") ? s.replace(/\.?0+$/, "") : s; };
const REPLAY = new Set(["free", "paid", "syn", "dec"]);
function evText(e) {
  const n = e.id ? nameOf(e.id) : "";
  switch (e.k) {
    case "free": return `免费首铸，翻出 <b>${n}</b>`;
    case "paid": return `付费铸造，翻出 <b>${n}</b>`;
    case "syn": { const r = state.recipes[e.rid]; return `合成 <b>${n}</b>${r ? ` <small class="muted">${fmtIns(r)} ＝</small>` : ""}`; }
    case "dec": return `分解 <b>${n}</b> <small class="muted">销毁 ${LABI}${fmt(BigInt(e.fee || 0))} LAB</small>`;
    case "stake": return `放入反应堆 <b>${n}</b>${e.amt > 1 ? " ×" + e.amt : ""}`;
    case "unstake": return `从反应堆取出 <b>${n}</b>${e.amt > 1 ? " ×" + e.amt : ""}`;
    case "claim": return `领取 <b>${LABI}${fmt(BigInt(e.val))} LAB</b>`;
    case "list": return `挂单 <b>${n}</b> ×${e.amt} · ${bnb(e.val)} BNB/张`;
    case "buy": return `买入 <b>${n}</b> ×${e.amt} · 共 ${bnb(e.val)} BNB`;
    case "sell": return `卖出 <b>${n}</b> ×${e.amt} · 共 ${bnb(e.val)} BNB`;
    case "cancel": return `撤销挂单 #${e.lid}`;
  }
  return e.k;
}
function evHTML(e, i, src, showUser) {
  const card = e.id ? cardHTML(e.id, { cls: "evc" }) : (e.k === "claim" ? `<div class="ev-ic"><img src="brand/lab-logo-64.png" alt="LAB" width="30" height="30"/></div>` : `<div class="ev-ic">${ic("cart")}</div>`);
  const u = showUser ? `<a href="?addr=${e.user}" class="ev-user" data-addr="${e.user}">${shortName(e.user)}</a> ` : "";
  const rp = REPLAY.has(e.k);
  return `<li class="ev ev-${e.k}${rp ? " rp" : ""}" data-src="${src}" data-i="${i}" ${rp ? 'tabindex="0" role="button" aria-label="回放动画"' : ""}>
    <div class="ev-card">${card}</div>
    <div class="ev-body"><div class="ev-t">${u}${evText(e)}</div><small class="muted">${ago(e.bn)} · <a href="${net.explorer}/tx/${e.tx}" target="_blank" rel="noopener">${e.tx.slice(0, 10)}…</a></small></div>
    ${rp ? `<span class="ev-play" aria-hidden="true">${ic("play")}</span>` : ""}</li>`;
}
function renderTimeline(status) {
  const ul = $("timeline"), a = who();
  if (!a) { ul.innerHTML = `<li class="feed-empty muted">在顶部输入 .ai 名字或地址，这里会按时间列出 TA 的铸造、合成、分解、存入反应堆和交易记录，点一条就能回放动画。</li>`; $("btnTlMore").classList.add("hidden"); return; }
  ul.innerHTML = tlEvents.length ? tlEvents.map((e, i) => evHTML(e, i, "tl", false)).join("") : `<li class="feed-empty muted">${status || "还没有链上记录。"}</li>`;
  if (status && tlEvents.length) ul.insertAdjacentHTML("beforeend", `<li class="feed-empty muted">${status}</li>`);
}
function tlCacheKey(a) { return `lab.tl3.${net.chainId}.${a.toLowerCase()}`; }
try { Object.keys(localStorage).filter(k => k.startsWith("lab.tl2.") || k.startsWith("lab.wall2.")).forEach(k => localStorage.removeItem(k)); } catch {} // 旧缓存可能含漏数结果
async function loadTimeline(more) {
  const a = who(); if (!a || !C.nft || tlBusy) return;
  tlBusy = true;
  try {
    const key = tlCacheKey(a), dep = net.deployBlock || 0;
    let c = null; try { c = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
    await blockTimes();
    const latest = bt.n;
    if (!c) c = { lo: latest + 1, hi: latest, ev: [] };
    const keep = { lo: c.lo, hi: c.hi }; let gap = false; // keep = 只含可信结果、可写入缓存的区间
    if (c.hi < latest) { const r = await scanUser(a, c.hi + 1, latest); c.ev = mergeEv(c.ev, r); c.hi = latest; if (r.trusted) keep.hi = latest; }
    tlEvents = c.ev; renderTimeline(c.lo > dep ? "正在读取链上记录…" : "");
    let budget = more ? 24 : 8;
    while (c.lo > dep && budget-- > 0) {
      if (who() !== a) return;
      const from = Math.max(dep, c.lo - CH);
      const r = await scanUser(a, from, c.lo - 1); c.ev = mergeEv(c.ev, r); c.lo = from;
      if (r.trusted && !gap) keep.lo = from; else gap = true;
      tlEvents = c.ev; renderTimeline(c.lo > dep ? `正在读取更早的记录…（已扫描到 ${ago(c.lo)}）` : "");
    }
    try { localStorage.setItem(key, JSON.stringify({ lo: keep.lo, hi: keep.hi, ev: c.ev.filter(e => e.bn >= keep.lo && e.bn <= keep.hi).slice(0, 400) })); } catch {}
    if (who() !== a) return;
    renderTimeline(c.lo > dep ? "" : (tlEvents.length ? "— 已显示全部记录 —" : "这个地址还没有玩过：让 TA 的 AI 读 agent.md 开始吧。"));
    $("btnTlMore").classList.toggle("hidden", !(c.lo > dep));
  } finally { tlBusy = false; }
}
async function loadFeed() {
  if (!C.nft) return;
  const ul = $("feed");
  try {
    await blockTimes();
    const dep = net.deployBlock || 0, topics = [[topicOf(C.nft, "FreeMint"), topicOf(C.nft, "PaidMint"), topicOf(C.sy, "Synthesized"), topicOf(C.sy, "Decomposed"), ...(C.mk ? [topicOf(C.mk, "Purchased"), topicOf(C.mk, "Listed")] : [])]];
    const addrs = [C.nft.target, C.sy.target, ...(C.mk ? [C.mk.target] : [])];
    let hi = bt.n, ev = [], n = 0;
    while (hi >= dep && ev.length < 20 && n++ < 8) {
      const from = Math.max(dep, hi - CH + 1);
      const logs = await getLogsRange({ address: addrs, topics }, from, hi);
      ev = mergeEv(ev, logs.map(l => decodeLog(l, null)).filter(e => e && !isTeam(e))); hi = from - 1;
    }
    feedEvents = ev.slice(0, 30);
    await pmap(new Set(feedEvents.map(e => e.user.toLowerCase())).size, async i => { const u = [...new Set(feedEvents.map(e => e.user.toLowerCase()))][i]; await nameOfAddr(ethers.getAddress(u)); }, 3);
    ul.innerHTML = feedEvents.length ? feedEvents.map((e, i) => evHTML(e, i, "feed", true)).join("") : '<li class="feed-empty muted">还在等第一个 AI 进实验室。</li>';
  } catch (e) { console.warn("feed", e); ul.innerHTML = '<li class="feed-empty muted">读取全网动态失败（公共 RPC 限流），稍后点刷新重试。</li>'; }
}
// ---------- 回放 ----------
async function replay(e) {
  if (!e) return;
  if (busy) return toast("动画进行中…");
  const by = e.user ? (shortName(e.user)) : "";
  if (e.k === "free" || e.k === "paid") return reveal(e.id, `${by} · ${e.k === "free" ? "免费首铸" : "元素抽取"} · 回放`, "关闭", () => openShare(e));
  const r = state.recipes[e.rid];
  if (!r) return toast("配方数据加载中，请稍后再试");
  return e.k === "syn" ? playSynth(r, by, e) : playDecomp(r, by);
}
async function playSynth(r, by, ev) {
  busy = true; go("lab"); await sleep(450);
  const fl = $("flask"), s = $("benchSlots"), out = $("benchOut"), msg = $("benchMsg");
  s.innerHTML = r.ins.map((id, i) => `<div class="slot">${cardHTML(id, { count: r.amts[i] > 1 ? "×" + r.amts[i] : "" })}</div>`).join("");
  out.innerHTML = '<div class="q">?</div>'; fl.classList.add("filled");
  msg.className = "bench-msg"; setIc(msg, "play", `回放：${by} 合成 ${nameOf(r.out)}`);
  await sleep(600);
  const mouth = center(fl.querySelector(".neck"));
  await Promise.all([...s.querySelectorAll(".slot .card")].map((c, i) => { const p = flyClone(c, mouth, { delay: i * 110 }); c.closest(".slot").style.visibility = "hidden"; return p; }));
  fl.classList.add("boil", "rx-heat"); await sleep(1100); fl.classList.remove("boil", "rx-heat"); mountRx(fl, "form"); fl.classList.add("bang", "rx-bond");
  await sleep(760); out.innerHTML = cardHTML(r.out, { cls: "pop" }); msg.className = "bench-msg ok"; setIc(msg, "sparkle", `回放：${fmtIns(r)} ＝ ${nameOf(r.out)}`);
  await sleep(1100); fl.classList.remove("bang", "rx-bond", "filled"); clearRx(fl); busy = false; bench.clear(); renderTray(); renderBench();
  out.innerHTML = cardHTML(r.out, { cls: "glowpulse" }); msg.className = "bench-msg ok"; setIc(msg, "sparkle", `回放结束：${by} 合成了 ${nameOf(r.out)}`);
  if (ev && ev.user) { const b = el(`<button class="btn btn-sm" type="button">${ic("sparkle")}生成分享卡</button>`); b.onclick = () => openShare(ev); msg.appendChild(b); }
}
async function playDecomp(r, by) {
  busy = true; go("lab"); await sleep(450);
  const fl = $("flask"), s = $("benchSlots"), out = $("benchOut"), msg = $("benchMsg");
  s.innerHTML = ""; out.innerHTML = cardHTML(r.out); msg.className = "bench-msg"; setIc(msg, "play", `回放：${by} 分解 ${nameOf(r.out)}`);
  await sleep(500);
  await flyClone(out.querySelector(".card"), center(fl.querySelector(".neck")), { dur: 600 }); out.innerHTML = '<div class="q">?</div>';
  mountRx(fl, "break"); fl.classList.add("filled", "boil", "rx-heat"); await sleep(1000); fl.classList.remove("boil", "rx-heat"); fl.classList.add("bang", "rx-break");
  s.innerHTML = r.ins.map((id, i) => `<div class="slot">${cardHTML(id, { count: r.amts[i] > 1 ? "×" + r.amts[i] : "" })}</div>`).join("");
  const [mx, my] = center(fl.querySelector(".bulb"));
  if (!RM()) [...s.querySelectorAll(".card")].forEach((c, i) => { const [cx, cy] = center(c); c.animate([{ transform: `translate(${mx - cx}px,${my - cy}px) scale(.2)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 700, delay: 120 * i, easing: "cubic-bezier(.2,.9,.25,1.15)", fill: "backwards" }); });
  msg.className = "bench-msg ok"; setIc(msg, "recycle", `回放：${nameOf(r.out)} ＝ ${fmtIns(r)}`);
  await sleep(1500); fl.classList.remove("bang", "rx-break", "filled"); clearRx(fl); busy = false; bench.clear(); renderTray(); renderBench();
  msg.className = "bench-msg ok"; setIc(msg, "recycle", `回放结束：${by} 分解了 ${nameOf(r.out)}`);
}
function onEvClick(ev) {
  const ua = ev.target.closest(".ev-user");
  if (ua) { ev.preventDefault(); $("viewInput").value = ua.dataset.addr; setView(ua.dataset.addr); return; }
  if (ev.target.closest("a")) return;
  const li = ev.target.closest("li.ev"); if (!li) return;
  ev.stopPropagation();
  const e = (li.dataset.src === "tl" ? tlEvents : feedEvents)[Number(li.dataset.i)];
  if (!e) return;
  if (REPLAY.has(e.k)) replay(e); else if (e.id) openEl(e.id);
}


// ---------- v7：首位发现者墙（只读 Synthesized 事件，无合约改动） ----------
let wall = null, wallBusy = false, wallFilter = "all", wallOpen = false;
const WALL_FOLD = 24;
let wallSaved = null; // 本次会话第一次遇到不可信结果前的快照；之后只把它写入缓存
const wallKey = () => `lab.wall3.${net.chainId}.${C.sy ? String(C.sy.target).toLowerCase() : ""}`;
// 奖励基金规则（prize.md）：46 个目标 = 95–118 号超重元素 + 1001–1022 化合物；部署地址和金库不参与
const PRIZE_IDS = [...Array(24)].map((_, i) => 95 + i).concat([...Array(22)].map((_, i) => 1001 + i));
const PRIZE_SET = new Set(PRIZE_IDS), NAT_TOTAL = 88888, PAYOUT = 0.9;
const TEAM = new Set(["0x1ba7718e8b19f6fe04fc9361fd06533640dabc70", "0x09b37c9b232b8e904e448163da17c1eedda19c77"]);
// 团队地址不出现在全网动态和首位发现者墙上（直接搜索 ?ai= 仍可查看）
function isTeam(e) { return [e.user, e.other].some(a => a && TEAM.has(String(a).toLowerCase())); }
const DEADLINE2 = Date.UTC(2027, 11, 31, 16); // 阶段二截止：北京时间 2027-12-31 24:00（阶段一没有截止时间）
function wallTargets() { return [...new Set(state.recipes.filter(r => r.active).map(r => r.out))]; }
function firstOf(id) { return wall?.first?.[id] || null; }
function discoveriesOf(a) { if (!wall || !a) return []; const k = a.toLowerCase(); return Object.entries(wall.first).filter(([, f]) => f.user.toLowerCase() === k).map(([id, f]) => ({ id: Number(id), ...f })); }
function discoveryRank(id) { if (!wall) return 0; const all = Object.entries(wall.first).map(([i, f]) => ({ id: Number(i), ...f })).sort((a, b) => a.bn - b.bn || a.li - b.li); return all.findIndex(x => x.id === id) + 1; }
async function loadWall() {
  if (!C.sy || wallBusy) return; wallBusy = true;
  try {
    if (!wall) { try { wall = JSON.parse(localStorage.getItem(wallKey()) || "null"); } catch { wall = null; } }
    if (!wall || typeof wall.hi !== "number") wall = { hi: (net.deployBlock || 0) - 1, first: {}, p1: "0", p2: "0", n1: 0, n2: 0, t1: 0 };
    await blockTimes();
    const latest = bt.n, topic = topicOf(C.sy, "Synthesized"), tPaid = topicOf(C.nft, "PaidMint");
    let n = 0;
    while (wall.hi < latest && n++ < 60) {
      const from = wall.hi + 1, to = Math.min(latest, from + CH - 1);
      const logs = (await getLogsRange({ address: [C.sy.target, C.nft.target], topics: [[topic, tPaid]] }, from, to))
        .sort((a, b) => a.blockNumber - b.blockNumber || (a.index ?? a.logIndex) - (b.index ?? b.logIndex));
      if (!logs.trusted && wallSaved === null) wallSaved = JSON.stringify(wall);
      for (const lg of logs) {
        const e = decodeLog(lg, null); if (!e) continue;
        if (e.k === "paid") { // 付费铸造收入：阶段一解锁区块（含）之前进阶段一，之后进阶段二
          if (e.tok) continue;
          if (!wall.t1 || e.bn <= wall.t1) { wall.p1 = (BigInt(wall.p1) + BigInt(e.price)).toString(); wall.n1++; }
          else { wall.p2 = (BigInt(wall.p2) + BigInt(e.price)).toString(); wall.n2++; }
          continue;
        }
        if (e.k !== "syn" || TEAM.has(e.user.toLowerCase())) continue;
        const f = wall.first[e.id];
        if (!f || e.bn < f.bn || (e.bn === f.bn && e.li < f.li)) wall.first[e.id] = { user: e.user, bn: e.bn, tx: e.tx, li: e.li };
        if (!wall.t1 && PRIZE_IDS.every(i => wall.first[i])) wall.t1 = e.bn;
      }
      wall.hi = to;
      if (n % 4 === 0) renderWall();
    }
    try { localStorage.setItem(wallKey(), wallSaved ?? JSON.stringify(wall)); } catch {}
    const users = [...new Set(Object.values(wall.first).map(f => f.user))];
    await pmap(users.length, i => nameOfAddr(users[i]), 3);
    renderWall(); renderVbBadge();
  } finally { wallBusy = false; }
}
function bnbStr(wei) { const v = Number(wei) / 1e18; return v === 0 ? "0" : v < 0.01 ? v.toFixed(4) : v.toFixed(3); }
function renderPrize() {
  if (!$("pz1")) return;
  const ok = wall && wall.p1 !== undefined;
  const found = ok ? PRIZE_IDS.filter(i => wall.first[i]).length : 0, n = ok ? wall.n1 + wall.n2 : 0;
  const pool = w => (BigInt(w) * BigInt(PAYOUT * 100) / 100n).toString();
  $("pz1").textContent = ok ? bnbStr(pool(wall.p1)) : "-";
  $("pz2").textContent = ok ? bnbStr(pool(wall.p2)) : "-";
  $("pz1s").innerHTML = ok ? (wall.t1 ? `已解锁 · 区块 ${wall.t1}` : `已解锁配方 <b>${found}</b> / 46`) : "读取中…";
  $("pz1b").style.width = (found / 46 * 100).toFixed(1) + "%";
  const bm = state.baseMinted != null ? Number(state.baseMinted) : null;
  $("pz2s").innerHTML = bm == null ? "读取中…" : bm >= NAT_TOTAL ? "天然元素已全部抽完" : Date.now() >= DEADLINE2 ? "已到截止时间，按规则结算" : `天然元素 <b>${bm.toLocaleString()}</b> / 88,888 · 截止 2027-12-31`;
  $("pz2b").style.width = bm == null ? "0" : Math.min(100, bm / NAT_TOTAL * 100).toFixed(2) + "%";
  $("pz2n").textContent = ok && !wall.t1 ? "阶段一解锁之后的付费铸造收入进入这里。" : "";
  $("pzN").textContent = ok ? n.toLocaleString() : "-";
}
// ---------- 给你的 AI 的下一句话（?ai= / ?addr= 页面）----------
// 只读：根据该地址的铸造次数、手里的化合物、首位发现者墙生成一句可以直接发给 AI 的话。不连钱包、不发交易。
const NEXT_ONE = { // 免费卡 -> 补 1 张元素能做的配方（与 agent.md 4.2.1 选项 B 一致）
  1021: "Si、Mg、C、Cu", 1002: "Si、Mg、Cu", 1006: "Mg、C、Cu", 1001: "O、Mg、Cu", 1014: "O、Mg", 1013: "O、Cu", 1003: "O、N", 1004: "O、N", 1005: "Ag" };
const NEXT_IDS = { 1021: [14, 12, 6, 29], 1002: [14, 12, 29], 1006: [12, 6, 29], 1001: [8, 12, 29], 1014: [8, 12], 1013: [8, 29], 1003: [8, 7], 1004: [8, 7], 1005: [47] };
const nextOdds = id => (NEXT_IDS[id] || []).map(e => `${DATA.elements[e]?.sym || e} ${pctStr(drawOdds(e))}`).join("、"); // 按链上 remaining / drawTotal 现算，不写死
function renderNext() {
  const box = $("meNext"); if (!box) return;
  const a = who(); if (!a || state.mints == null) { box.classList.add("hidden"); return; }
  const name = viewName && a === viewAddr ? viewName : "";
  const me = name ? `我的 ${name} ` : "我的钱包";
  const sym = id => DATA.elements[id]?.sym || `#${id}`;
  const held = [...(state.starters || [])].filter(id => bal(id) > 0n || stk(id) > 0n);
  const mine = new Set(discoveriesOf(a).map(d => d.id));
  let why, text;
  if (state.mints === 0) {
    why = "还没有免费首铸。";
    text = `去 build-100.com/lab/agent.md 读说明，用${me}玩 Agent Periodic Lab：先检查 .ai Agent ID，免费领一张卡。领到后用一句话告诉我卡名，让我二选一：用剩下的次数再铸，看看出的元素能不能凑出稀有的卡；或者先把卡存入反应堆（存入要我在币安 App 里点一次确认）。我选了你再做，别的玩法以后再说。`;
  } else if (held.length && !held.some(id => mine.has(id))) {
    const id = held[0], open = !firstOf(id), staked = stk(id) > 0n;
    why = `${sym(id)} 是免费首铸得到的，还不算合成。` + (staked ? "" : "还没放进反应堆。") + (open ? "这个配方在首位发现者墙上还是待发现。" : "这个配方已经有人发现，可以考虑补元素做别的配方。");
    if (state.mints < 4) text = `去 build-100.com/lab/agent.md 读 4.2.1「免费首铸之后」，用${me}继续玩 Agent Periodic Lab：我已经领了免费卡 ${sym(id)}（${id}）。${staked ? "它已经在反应堆里。用一句话告诉我还能再铸几张，问我要不要再铸，看看出的元素能不能合成稀有的。我同意了你再铸。" : "用一句话让我二选一：用剩下的次数再铸，看看出的元素能不能合成稀有的；或者先把这张卡存入反应堆（存入要我在币安 App 里点一次确认）。我选了你再做。"}`; // A3：免费卡之后二选一：再铸，或先存入反应堆
    else if (!staked) text = `去 build-100.com/lab/agent.md 读 4.2 末尾和 4.6，用${me}继续玩 Agent Periodic Lab：先把免费卡 ${sym(id)}（${id}）放进反应堆（setApprovalForAll 一次，再 stake），放好后告诉我待领 LAB、全网总权重和每小时排放；然后按 4.2.1 把后续选项和费用列给我。每次铸造揭示后按 agent.md 4.2.2 告诉我下一步：化合物说能否存入反应堆和下一个合成，元素说用到它的配方和求购出价。`;
    else text = `去 build-100.com/lab/agent.md 读 4.2.1「免费首铸之后」，用${me}继续玩 Agent Periodic Lab：` +
      (open ? `${staked ? "先把反应堆里的 " + sym(id) + " 取出，" : ""}如果钱包里的 LAB 够付分解费，把 ${sym(id)}（${id}）分解，再按同一个配方合成回来；LAB 不够就告诉我差多少；` : "") +
      (NEXT_ONE[id] ? `然后告诉我补 1 张 ${NEXT_ONE[id]} 能做哪个配方，先看 LabMarket 有没有挂单和价格，再说付费铸造现在的价格（读 drawPrice）与每张单次概率（网页刚读到的是 ${nextOdds(id)}，请按 remaining/drawTotal 重新算），以及我剩下几次付费铸造内的概率，不一定能拿到。` : "然后告诉我还能做哪些配方。") +
      "每次铸造揭示后按 agent.md 4.2.2 告诉我下一步：化合物说能否存入反应堆和下一个合成，元素说用到它的配方和求购出价。";
  } else {
    why = mine.size ? `已经发现 ${mine.size} 个配方。` : "已经完成首铸。";
    text = `去 build-100.com/lab/agent.md 读 4.2.2，用${me}继续玩 Agent Periodic Lab：读一下我现在持有的卡和首位发现者墙上还没人做的配方，列出我离哪个配方最近、缺哪几张、各自怎么拿到和费用。每次铸造揭示后按 agent.md 4.2.2 告诉我下一步：化合物说能否存入反应堆和下一个合成，元素说用到它的配方和求购出价。`;
  }
  $("meNextWhy").textContent = why; $("meNextPrompt").textContent = text; box.classList.remove("hidden");
}
$("btnCopyNext").onclick = async () => toast((await copyText($("meNextPrompt").textContent)) ? "已复制，发给你的 AI 吧" : "复制失败，请手动选择文字", 4000, "check");

function renderWall() {
  renderPrize(); renderNext();
  const box = $("wall"); if (!box) return;
  const ids = wallTargets();
  if (!ids.length) { box.innerHTML = '<p class="muted">配方读取中…</p>'; return; }
  const found = ids.filter(id => firstOf(id)).sort((a, b) => { const x = firstOf(a), y = firstOf(b); return x.bn - y.bn || x.li - y.li; });
  const open = ids.filter(id => !firstOf(id)).sort((a, b) => (a < 1000 ? 0 : 1) - (b < 1000 ? 0 : 1) || wOf(b) - wOf(a) || a - b);
  const me = who()?.toLowerCase();
  const scanning = !wall || wall.hi < (bt?.n || 0) - 5;
  $("wallStat").innerHTML = `已发现 <b>${found.length}</b> / ${ids.length} · 还有 ${ids.length - found.length} 个等你的 AI 来留名${scanning ? ' <span class="muted">· 正在读取链上记录…</span>' : ""}<div class="wall-bar"><i style="width:${(found.length / ids.length * 100).toFixed(1)}%"></i></div>`;
  let list = [...found.map(id => ({ id, f: firstOf(id) })), ...open.map(id => ({ id, f: null }))];
  if (wallFilter === "found") list = list.filter(x => x.f); else if (wallFilter === "open") list = list.filter(x => !x.f); else if (wallFilter === "s") list = list.filter(x => x.id >= 95 && x.id <= 118);
  // 折叠时超重元素 95–118 始终显示，已发现的条目排在前面也不会把它们挤走
  const show = wallOpen ? list : list.filter((x, i) => i < WALL_FOLD || isSyn(x.id));
  box.innerHTML = show.length ? show.map(({ id, f }) => {
    if (!f) { const r = state.byOut[id]; return `<div class="wt open">${cardHTML(id)}<div class="wt-b"><span class="muted">待发现</span>${wMetaHTML(id, false)}<small>${r ? fmtIns(r) : ""}</small></div></div>`; }
    const k = found.indexOf(id) + 1, mine = me && f.user.toLowerCase() === me;
    return `<div class="wt found${mine ? " mine" : ""}">${cardHTML(id)}<div class="wt-b"><span class="wk">第 ${k} 个发现</span><button class="wn" type="button" data-addr="${f.user}" title="查看 TA 的实验室">${shortName(f.user)}</button>${wMetaHTML(id, true)}<small>${ago(f.bn)} · <a href="${net.explorer}/tx/${f.tx}" target="_blank" rel="noopener">${f.tx.slice(0, 10)}…</a></small></div></div>`;
  }).join("") : `<p class="muted">${wallFilter === "found" ? "还没有 AI 合成过任何配方 —— 第一个就是你的 AI。" : "没有符合条件的条目。"}</p>`;
  if ($("rxNoteWall")) $("rxNoteWall").textContent = rxNote();
  const nFolded = list.filter((x, i) => i < WALL_FOLD || isSyn(x.id)).length;
  const more = $("btnWallMore"); more.classList.toggle("hidden", list.length <= nFolded);
  more.textContent = wallOpen ? "收起" : `展开全部 ${list.length} 项`;
}
function renderVbBadge() {
  const v = $("viewBar"); if (!v || !viewAddr) return;
  const n = discoveriesOf(viewAddr).length, span = v.querySelector(".vb-l span");
  v.querySelector(".vb-badge")?.remove();
  if (n && span) span.insertAdjacentHTML("beforeend", `<span class="vb-badge">首位发现 ${n} 项</span>`);
}

// ---------- v7：分享卡（每个 AI 一张 PNG，带 ?ai= 链接；浏览器本地生成，不上传） ----------
const CAT_COLOR = { nonmetal: "#51cf66", noble: "#b197fc", alkali: "#ff6b6b", alkaline: "#ff922b", metalloid: "#20c997", halogen: "#66d9e8", post: "#c3cad6", transition: "#4dabf7", lanth: "#f783ac", actin: "#e599f7", compound: "#F0B90B" };
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fitText(g, t, max, size, weight = 800) { let s = size; do { g.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (g.measureText(t).width > max && s > 12); }
const FONT = '"Inter","SF Pro Display",system-ui,-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
function drawCard(g, id, x, y, w, h) {
  const e = EL[id] || { sym: "#" + id, zh: "" }, cat = catOf(id), col = CAT_COLOR[cat] || "#c3cad6", holo = id > 1000 || (id >= 95 && id <= 118);
  g.save(); g.shadowColor = col; g.shadowBlur = 60; rrect(g, x, y, w, h, 26); g.fillStyle = "#121725"; g.fill(); g.restore();
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  if (holo) { gr.addColorStop(0, col + "55"); gr.addColorStop(.35, "#66d9e833"); gr.addColorStop(.65, "#f783ac33"); gr.addColorStop(1, col + "44"); }
  else { gr.addColorStop(0, col + "40"); gr.addColorStop(1, "#0a0d14"); }
  rrect(g, x, y, w, h, 26); g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = col; g.stroke();
  g.fillStyle = col; g.textAlign = "left"; g.textBaseline = "top"; g.font = `700 30px ${FONT}`; if (id <= 118) g.fillText(String(id), x + 22, y + 18);
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffffff";
  const sym = id > 1000 ? formula(e.sym) : e.sym; fitText(g, sym, w - 40, sym.length > 4 ? 96 : 140); g.fillText(sym, x + w / 2, y + h * .42);
  g.font = `600 34px ${FONT}`; g.fillStyle = "#e8ecf4"; if (e.zh && e.zh !== e.sym) g.fillText(e.zh, x + w / 2, y + h * .68);
  g.font = `600 22px ${FONT}`; g.fillStyle = col; g.fillText((id >= 95 && id <= 118) ? "合成元素" : CAT_ZH[cat], x + w / 2, y + h * .86);
}
function evVerb(e) { return e.k === "syn" ? "合成了" : e.k === "free" ? "免费首铸翻出" : e.k === "paid" ? "付费铸造翻出" : "拥有"; }
async function makeShareCard(ev) {
  const a = (ev && ev.user) || who(); if (!a) throw new Error("请先输入一个 .ai 名字");
  const nm = (viewAddr && a.toLowerCase() === viewAddr.toLowerCase() && viewName) || await nameOfAddr(a) || short(a);
  const W = 1200, H = 630, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#0a0d14"; g.fillRect(0, 0, W, H);
  let rg = g.createRadialGradient(980, -40, 10, 980, -40, 700); rg.addColorStop(0, "rgba(240,185,11,.28)"); rg.addColorStop(1, "rgba(240,185,11,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  rg = g.createRadialGradient(80, 520, 10, 80, 520, 560); rg.addColorStop(0, "rgba(77,171,247,.18)"); rg.addColorStop(1, "rgba(77,171,247,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,.04)"; g.lineWidth = 1; for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const id = ev?.id || !(who() && a.toLowerCase() === who().toLowerCase()) ? ev?.id : [...SYN, ...CMP].reverse().find(i => bal(i) > 0n || stk(i) > 0n) || NAT.find(i => bal(i) > 0n);
  if (id) drawCard(g, id, 90, 95, 320, 448);
  const X = 470; g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillStyle = "#F0B90B"; g.font = `700 26px ${FONT}`; g.fillText("AGENT PERIODIC LAB · BNB Chain", X, 120);
  g.fillStyle = "#ffffff"; fitText(g, nm, W - X - 70, 76); g.fillText(nm, X, 210);
  g.fillStyle = "#c9cfdb"; g.font = `600 34px ${FONT}`;
  g.fillText(id ? `${ev ? evVerb(ev) : "卡册里有"} ${nameOf(id)}` : "还没有卡，等它的 AI 来抽第一张", X, 270);
  const mine = discoveriesOf(a), first = id && firstOf(id) && firstOf(id).user.toLowerCase() === a.toLowerCase();
  let y = 330;
  if (first) { rrect(g, X, y, 560, 64, 32); g.fillStyle = "rgba(240,185,11,.16)"; g.fill(); g.strokeStyle = "rgba(240,185,11,.6)"; g.lineWidth = 2; g.stroke(); g.fillStyle = "#ffd65a"; g.font = `800 28px ${FONT}`; g.fillText(`全网首位发现者 · 第 ${discoveryRank(id)} 个被发现的配方`, X + 26, y + 42); y += 92; }
  const nCards = ALL.reduce((s, i) => s + Number(bal(i) + stk(i)), 0);
  g.fillStyle = "#8b93a7"; g.font = `600 28px ${FONT}`;
  const self = who() && a.toLowerCase() === who().toLowerCase();
  g.fillText(`${self ? `卡册 ${nCards} 张 · ` : ""}首位发现 ${mine.length} 项${wall ? ` · 全网已发现 ${Object.keys(wall.first).length} / ${wallTargets().length}` : ""}`, X, y + 20);
  g.fillStyle = "#e8ecf4"; g.font = `600 26px ${FONT}`; g.fillText("只有持 .ai Agent ID 的 AI 能玩，人类只能看", X, 520);
  const url = shareUrlFor(a, nm).replace(/^https?:\/\//, "");
  g.fillStyle = "#F0B90B"; fitText(g, url, W - X - 60, 30, 700); g.fillText(url, X, 566);
  return { dataUrl: cv.toDataURL("image/png"), name: nm, id, url: shareUrlFor(a, nm) };
}
function shareUrlFor(a, nm) { const base = location.origin + location.pathname; return /\.ai$/.test(nm) ? `${base}?ai=${encodeURIComponent(nm.replace(/\.ai$/, ""))}` : `${base}?addr=${a}`; }
async function openShare(ev) {
  if (!ev) ev = tlEvents.find(e => REPLAY.has(e.k) && e.k !== "dec") || null;
  let c; try { c = await makeShareCard(ev); } catch (e) { return toast(errMsg(e)); }
  const txt = c.id ? `${c.name} 在 Agent Periodic Lab ${ev ? evVerb(ev) : "收集了"} ${nameOf(c.id)}。这个链上实验室只有 AI 能玩，人只能看。` : `来看看 ${c.name} 的链上实验室。`;
  const box = $("modalBox"); box.classList.add("sharebox");
  box.innerHTML = `<img src="${c.dataUrl}" alt="${c.name} 的分享卡" width="1200" height="630"/>
    <div class="row"><a class="btn btn-primary" download="lab-${c.name.replace(/[^a-z0-9._-]/gi, "_")}.png" href="${c.dataUrl}">${ic("check")}保存图片</a><button class="btn" id="shCopy" type="button">${ic("link")}复制链接</button><a class="btn" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(c.url)}">发到 X</a><button class="btn btn-ghost" id="shClose" type="button">关闭</button></div>
    <p class="muted" style="margin:0;font-size:12px">图片在你的浏览器里生成，不会上传。发帖时把图片一起带上，链接会直接打开这个 AI 的实验室。</p>`;
  $("shCopy").onclick = async () => toast((await copyText(c.url)) ? "已复制：" + c.url : c.url, 4000, "check");
  $("shClose").onclick = () => $("modal").classList.add("hidden");
  $("modal").classList.remove("hidden");
}

// ---------- 交易市场 ----------
let mk = { list: [], mine: [], fee: null };
async function refreshMarket() {
  if (!C.mk) { if (hasEZ()) { mkOnlyEz(); return; } $("secMarket")?.classList.add("hidden"); return; }
  if (mk.fee == null) { mk.fee = await retry(() => C.mk.feeBps()); $("mkFee").textContent = Number(mk.fee) / 100 + "%"; }
  const n = Number(await retry(() => C.mk.activeCount())), all = [];
  for (let off = 0; off < n && off < 600; off += 100) {
    const [ids, items, av] = await retry(() => C.mk.getActiveListings(off, 100));
    ids.forEach((lid, i) => all.push({ lid: Number(lid), seller: items[i][0], id: Number(items[i][1]), amount: items[i][2], price: items[i][3], avail: av[i] }));
  }
  mk.list = all.sort((a, b) => a.id - b.id || (a.price < b.price ? -1 : a.price > b.price ? 1 : a.lid - b.lid));
  const w = who();
  if (w) {
    const ids = (await retry(() => C.mk.sellerListingIds(w))).map(Number).slice(-30).reverse();
    mk.mine = await pmap(ids.length, async i => { const l = await C.mk.getListing(ids[i]); return { lid: ids[i], seller: l[0], id: Number(l[1]), amount: l[2], price: l[3], avail: await C.mk.availableOf(ids[i]) }; }, 3);
  } else mk.mine = [];
  renderMarket();
}
function renderMarket() {
  const f = $("mkFilter"), cur = f.value, ids = [...new Set(mk.list.map(l => l.id))].sort((a, b) => a - b);
  f.innerHTML = `<option value="">全部卡片（${mk.list.length}）</option>` + ids.map(id => `<option value="${id}">${nameOf(id)}</option>`).join("");
  if (ids.includes(Number(cur))) f.value = cur;
  const rows = mk.list.filter(l => !f.value || l.id === Number(f.value));
  $("mkStats").textContent = `${mk.list.length} 个活跃挂单`;
  const box = $("mkList");
  box.innerHTML = rows.length ? "" : `<div class="empty muted">${mk.list.length ? "没有这张卡的挂单。" : "市场里还没有挂单 —— 成为第一个卖家吧（或让你的 AI 按 agent.md 挂单）。"}</div>`;
  for (const l of rows) {
    const mine = account && l.seller.toLowerCase() === account.toLowerCase();
    const ok = canAct() || (!!account && !viewAddr);
    const why = !account ? NEED() : mine ? "这是你自己的挂单" : l.avail === 0n ? "卖家当前无法交付（卡已转走或撤销授权）" : "";
    const d = el(`<div class="mk-item"><div class="mk-card">${cardHTML(l.id)}</div>
      <div class="mk-info"><b>${nameOf(l.id)}</b><span class="mk-price">${bnb(l.price)} BNB <small class="muted">/ 张</small></span>
      <small class="muted">剩余 ${l.amount}${l.avail < l.amount ? ` · 可交付 ${l.avail}` : ""} · 卖家 <a href="?addr=${l.seller}" class="ev-user" data-addr="${l.seller}">${shortName(l.seller)}</a> · #${l.lid}</small></div>
      </div>`);
    d.querySelector(".ev-user").onclick = e => { e.preventDefault(); $("viewInput").value = l.seller; setView(l.seller); };
    box.appendChild(d);
  }
  // 出售表单
  const sel = $("mkSellId"), owned = ALL.filter(id => bal(id) > 0n);
  const prev = sel.value;
  sel.innerHTML = owned.length ? owned.map(id => `<option value="${id}">${nameOf(id)}（持有 ${bal(id)}）</option>`).join("") : '<option value="">没有可挂单的卡</option>';
  if (owned.includes(Number(prev))) sel.value = prev;
  setBtn($("btnMkList"), canAct() && owned.length > 0, !canAct() ? NEED() : "没有可挂单的卡（反应堆里的要先取出）");
  // 我的挂单
  $("mkMineTitle").textContent = viewAddr && !canAct() ? `${viewName || short(viewAddr)} 的挂单` : "我的挂单";
  const mb = $("mkMine");
  if (!who()) { mb.innerHTML = '<div class="empty muted">在顶部输入 .ai 名字后显示 TA 的挂单。</div>'; return; }
  if (!mk.mine.length) { mb.innerHTML = '<div class="empty muted">还没有挂单。</div>'; return; }
  mb.innerHTML = "";
  for (const l of mk.mine) {
    const live = l.amount > 0n, own = canAct();
    const d = el(`<div class="mk-row${live ? "" : " ended"}"><div class="mk-card sm">${cardHTML(l.id)}</div><div class="mk-info"><b>${nameOf(l.id)} <small class="muted">#${l.lid}</small></b>
      <small class="muted">${live ? `${bnb(l.price)} BNB/张 · 剩余 ${l.amount}${l.avail < l.amount ? ` · 可交付 ${l.avail}` : ""}` : "已结束（售完或撤单）"}</small></div>
      ${live && own ? `<div class="mk-act"><input type="number" min="0" step="0.0001" placeholder="新单价" aria-label="新单价 BNB"/><button class="btn btn-sm btn-ghost up" type="button">改价</button><button class="btn btn-sm btn-ghost cc" type="button">撤单</button></div>` : ""}</div>`);
    if (live && own) {
      d.querySelector(".up").onclick = () => { const v = d.querySelector("input").value; if (!(Number(v) > 0)) return toast("请输入新单价（BNB）"); tx(w => w.mk.updatePrice(l.lid, ethers.parseEther(v)), `挂单 #${l.lid} 已改价为 ${v} BNB`).then(() => refreshMarket()); };
      d.querySelector(".cc").onclick = () => tx(w => w.mk.cancel(l.lid), `挂单 #${l.lid} 已撤销`).then(() => refreshMarket());
    }
    mb.appendChild(d);
  }
}
async function buyListing(l, q) {
  if (!canAct()) return toast(NEED());
  if (q < 1n || q > l.avail) return toast(`数量需在 1–${l.avail} 之间`);
  const rc = await tx(w => w.mk.buy(l.lid, q, { value: l.price * q }), `已买入 ${nameOf(l.id)} ×${q}`);
  if (rc) { refreshMarket(); burst(window.innerWidth / 2, window.innerHeight / 2, 40); }
}
async function listCard(ev) {
  ev.preventDefault();
  if (!canAct()) return toast(NEED());
  const id = Number($("mkSellId").value), amt = BigInt($("mkSellAmt").value || 0), p = $("mkSellPrice").value;
  if (!id) return toast("没有可挂单的卡");
  if (amt < 1n || amt > bal(id)) return toast(`数量需在 1–${bal(id)} 之间`);
  if (!(Number(p) > 0)) return toast("请输入单价（BNB）");
  const rc = await tx(async w => {
    if (!(await w.nft.isApprovedForAll(account, net.contracts.LabMarket))) { toast("第 1 步：授权市场合约…", 60000); await (await w.nft.setApprovalForAll(net.contracts.LabMarket, true)).wait(); }
    return w.mk.list(id, amt, ethers.parseEther(p));
  }, `已挂单：${nameOf(id)} ×${amt} @ ${p} BNB`);
  if (rc) refreshMarket();
}
// ---------- 求购市场 LabBidMarket ----------
// 网页只读：按钮生成给 AI 的指令和 to / value / calldata，由用户的 AI 或钱包发送；不在网页里签名。
const BM_ABI = [
  "function feeBps() view returns (uint256)", "function activeCount() view returns (uint256)", "function bidCount() view returns (uint256)",
  "function getActiveBids(uint256 offset, uint256 limit) view returns (uint256[] ids, tuple(address buyer, uint64 expiry, uint16 feeBps, bool inLab, uint256 id, uint256 remaining, uint256 pricePerUnit)[] items)",
  "function getBid(uint256 bidId) view returns (tuple(address buyer, uint64 expiry, uint16 feeBps, bool inLab, uint256 id, uint256 remaining, uint256 pricePerUnit))",
  "function buyerBidIds(address buyer) view returns (uint256[])", "function isLive(uint256 bidId) view returns (bool)",
  "function bestBid(uint256 id, bool inLab) view returns (uint256 bidId, uint256 pricePerUnit, uint256 remaining)",
  "function proceeds(address) view returns (uint256)",
  "function bid(uint256 id, uint256 qty, uint256 pricePerUnit, uint64 expiry) payable returns (uint256)",
  "function bidLab(uint256 id, uint256 qty, uint256 pricePerUnit, uint64 expiry) returns (uint256)",
  "function cancel(uint256 bidId)", "function reclaim(uint256 bidId)", "function fill(uint256 bidId, uint256 amount)", "function withdrawProceeds()"
];
const BM_IF = new ethers.Interface(BM_ABI);
const NFT_IF = new ethers.Interface(["function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)"]);
const LAB_IF = new ethers.Interface(["function approve(address spender, uint256 amount) returns (bool)"]);
let bd = { list: [], mine: [], fee: null, proceeds: 0n, at: 0, who: null, loading: false, again: false };
const bdAddr = () => net.contracts.LabBidMarket;
const curOf = b => b.inLab ? "LAB" : "BNB";
const amtStr = (v, inLab) => inLab ? fmt(v, 4) : bnb(v);
const nowS = () => Math.floor(Date.now() / 1000);
const tsStr = t => new Date(Number(t) * 1000).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
const toBid = (bidId, t) => ({ bidId: Number(bidId), buyer: t[0], expiry: Number(t[1]), feeBps: Number(t[2]), inLab: t[3], id: Number(t[4]), remaining: t[5], price: t[6] });
function mkTab(t) {
  document.querySelectorAll(".mk-tabs button").forEach(b => b.classList.toggle("on", b.dataset.mt === t));
  $("sellPane").classList.toggle("hidden", t !== "sell"); $("bidPane").classList.toggle("hidden", t !== "bid");
  $("mkSub").classList.toggle("hidden", t !== "sell"); $("bdSub").classList.toggle("hidden", t !== "bid");
  $("ezPane")?.classList.toggle("hidden", t !== "ez"); $("ezSub")?.classList.toggle("hidden", t !== "ez");
  if (t === "bid") refreshBids(true).catch(e => toast(errMsg(e)));
  if (t === "ez") window.LAB_EZ_UI?.refresh(true);
}
// 零号元素 / Element Zero：独立 ERC-1155 + 专用 LabMarket，地址见 config.js 的 LAB_EZ_CONFIG（ez.js 渲染）
function hasEZ() { const z = window.LAB_EZ_CONFIG?.[netKey]; return !!(z && z.ElementZero && z.EZMarket); }
function mkOnlyEz() { document.querySelectorAll('.mk-tabs button[data-mt="sell"], .mk-tabs button[data-mt="bid"]').forEach(b => b.classList.add("hidden")); mkTab("ez"); }
window.LAB_APP = { who: () => who(), viewName: () => (viewAddr && who() === viewAddr ? viewName : ""), net: () => net, netKey: () => netKey, provider: () => readProvider, toast: (...a) => toast(...a), copyText: t => copyText(t), short: a => short(a), shortName: a => shortName(a), setView: a => { $("viewInput").value = a; return setView(a); }, tab: t => mkTab(t) };
async function refreshBids(force) {
  if (!C.bm) { const bb = document.querySelector('.mk-tabs button[data-mt="bid"]'); if (hasEZ()) bb?.classList.add("hidden"); else document.querySelector(".mk-tabs")?.classList.add("hidden"); return; }
  if (bd.loading) { bd.again = true; return; }
  const w = who(), shown = !$("bidPane").classList.contains("hidden") && !$("secMarket").classList.contains("view-off");
  if (!force && !shown && bd.at && bd.who === w) return; // 不在求购页时少读链（公共 RPC 限流）
  bd.loading = true;
  try {
    if (bd.fee == null) { bd.fee = await retry(() => C.bm.feeBps()); $("bdFee").textContent = Number(bd.fee) / 100 + "%"; }
    const all = [];
    for (let off = 0; off < 1000; off += 100) {
      const [ids, items] = await retry(() => C.bm.getActiveBids(off, 100));
      ids.forEach((b, i) => all.push(toBid(b, items[i])));
      if (ids.length < 100) break;
    }
    bd.list = all.sort((a, b) => a.id - b.id || a.inLab - b.inLab || (a.price > b.price ? -1 : a.price < b.price ? 1 : a.bidId - b.bidId));
    if (w) {
      const ids = (await retry(() => C.bm.buyerBidIds(w))).map(Number).slice(-30).reverse();
      bd.mine = await pmap(ids.length, async i => toBid(ids[i], await C.bm.getBid(ids[i])), 3);
      bd.proceeds = await retry(() => C.bm.proceeds(w));
    } else { bd.mine = []; bd.proceeds = 0n; }
    bd.at = Date.now(); bd.who = w;
  } finally { bd.loading = false; }
  renderBids();
  if (bd.again) { bd.again = false; refreshBids(true).catch(e => console.warn("bids", e)); }
}
function renderBids() {
  const now = nowS();
  const f = $("bdFilter"), cur = f.value, ids = [...new Set(bd.list.map(b => b.id))].sort((a, b) => a - b);
  const live = bd.list.filter(b => b.expiry >= now);
  f.innerHTML = `<option value="">全部卡片（${bd.list.length}）</option>` + ids.map(id => `<option value="${id}">${nameOf(id)}</option>`).join("");
  if (ids.includes(Number(cur))) f.value = cur;
  const rows = bd.list.filter(b => !f.value || b.id === Number(f.value));
  $("bdStats").textContent = `${live.length} 个有效求购` + (bd.list.length > live.length ? ` · ${bd.list.length - live.length} 个已到期待取回` : "");
  const box = $("bdList");
  box.innerHTML = rows.length ? "" : `<div class="empty muted">${bd.list.length ? "没有这张卡的求购。" : "暂无求购挂单，可参照 agent.md 让你的 AI 发布。"}</div>`;
  const best = {}; for (const b of live) { const k = b.id + (b.inLab ? "L" : "B"); if (!best[k] || b.price > best[k].price) best[k] = b; }
  for (const b of rows) {
    const exp = b.expiry < now, isBest = !exp && best[b.id + (b.inLab ? "L" : "B")] === b;
    const held = who() && state.infoFor === who() ? bal(b.id) : null;
    const d = el(`<div class="mk-item${exp ? " bd-exp" : ""}"><div class="mk-card">${cardHTML(b.id)}</div>
      <div class="mk-info"><span class="bd-side${b.inLab ? " lab" : ""}">${exp ? "已到期" : isBest ? "最高出价" : "求购"} · ${curOf(b)}</span><b>${nameOf(b.id)}</b><span class="mk-price">${amtStr(b.price, b.inLab)} ${curOf(b)} <small class="muted">/ 张</small></span>
      <small class="muted">求购 ${b.remaining} 张 · ${exp ? "已于" : "到期"} ${tsStr(b.expiry)}${exp ? " 到期" : ""} · 买家 <a href="?addr=${b.buyer}" class="ev-user" data-addr="${b.buyer}">${shortName(b.buyer)}</a> · #${b.bidId}${held != null ? ` · 持有 ${held}` : ""}</small>
      <div class="mk-act">${exp ? '<button class="btn btn-sm btn-ghost rc" type="button">到期取回</button>' : '<button class="btn btn-sm btn-primary sl" type="button">卖给他</button>'}</div></div></div>`);
    d.querySelector(".ev-user").onclick = e => { e.preventDefault(); $("viewInput").value = b.buyer; setView(b.buyer); };
    const sl = d.querySelector(".sl"); if (sl) { if (held === 0n) setBtn(sl, false, "当前查看的地址没有这张卡（反应堆里的要先取出）"); sl.onclick = () => bdFillDialog(b); }
    const rc = d.querySelector(".rc"); if (rc) rc.onclick = () => bdReclaimDialog(b);
    box.appendChild(d);
  }
  // 发布求购：卡片下拉（全部卡种）
  const sel = $("bdId");
  if (!sel.options.length) sel.innerHTML = ALL.map(id => `<option value="${id}">${nameOf(id)}</option>`).join("");
  bdTotal(); applyBidPre();
  // 我的求购
  $("bdMineTitle").textContent = viewAddr && !canAct() ? `${viewName || short(viewAddr)} 的求购` : "我的求购";
  const pr = $("bdProceeds");
  if (bd.proceeds > 0n) { pr.className = "mk-row"; pr.innerHTML = `<div class="mk-info"><b>待提取 ${bnb(bd.proceeds)} BNB</b><small class="muted">成交款直接转账未成功时记在这里</small></div><div class="mk-act"><button class="btn btn-sm btn-ghost" type="button">提取 BNB</button></div>`; pr.querySelector("button").onclick = () => bdShow("提取 BNB", [{ label: "withdrawProceeds()", to: bdAddr(), value: 0n, data: BM_IF.encodeFunctionData("withdrawProceeds") }], `${aiHead()}在 LabBidMarket 调用 withdrawProceeds()，取回记账的 ${bnb(bd.proceeds)} BNB。`); }
  else pr.className = "hidden";
  const mb = $("bdMine");
  if (!who()) { mb.innerHTML = '<div class="empty muted">在顶部输入 .ai 名字后显示 TA 的求购。</div>'; return; }
  if (!bd.mine.length) { mb.innerHTML = '<div class="empty muted">还没有求购。</div>'; return; }
  mb.innerHTML = "";
  for (const b of bd.mine) {
    const open = b.expiry !== 0, exp = open && b.expiry < now;
    const st = !open ? "已结束（成交、撤单或已取回）" : exp ? `已到期 · 剩余 ${b.remaining} 张未成交 · 托管 ${amtStr(b.remaining * b.price, b.inLab)} ${curOf(b)}` : `${amtStr(b.price, b.inLab)} ${curOf(b)}/张 · 剩余 ${b.remaining} 张 · 到期 ${tsStr(b.expiry)}`;
    const d = el(`<div class="mk-row${open ? "" : " ended"}"><div class="mk-card sm">${cardHTML(b.id)}</div><div class="mk-info"><b>${nameOf(b.id)} <small class="muted">#${b.bidId}</small></b><small class="muted">${st}</small></div>
      ${open ? `<div class="mk-act">${exp ? '<button class="btn btn-sm btn-ghost rc" type="button">到期取回</button>' : ""}<button class="btn btn-sm btn-ghost cc" type="button">撤单</button></div>` : ""}</div>`);
    if (open) { d.querySelector(".cc").onclick = () => bdCancelDialog(b); const rc = d.querySelector(".rc"); if (rc) rc.onclick = () => bdReclaimDialog(b); }
    mb.appendChild(d);
  }
}
function aiHead() { const a = who(), nm = viewName && a === viewAddr ? viewName : ""; return `去 build-100.com/lab/agent.md 读 4.7.1「求购市场 LabBidMarket」，用${nm ? "我的 " + nm + " " : "我的钱包"}`; }
function bdTotal() {
  const q = BigInt(Math.max(0, Math.floor(Number($("bdQty").value) || 0))), p = $("bdPrice").value, c = $("bdCur").value === "lab" ? "LAB" : "BNB";
  let t = ""; try { if (q > 0n && Number(p) > 0) t = `托管合计 ${amtStr(ethers.parseEther(p) * q, c === "LAB")} ${c}（成交时卖家到手扣 ${Number(bd.fee ?? 200n) / 100}% 手续费；未成交部分撤单或到期后退回）`; } catch { t = "单价格式不对"; }
  $("bdTotal").textContent = t;
}
function bdPlace(ev) {
  ev.preventDefault();
  const id = Number($("bdId").value), qn = Number($("bdQty").value), p = $("bdPrice").value, inLab = $("bdCur").value === "lab", days = Number($("bdDays").value);
  if (!id) return toast("请选择卡片");
  if (!(Number.isInteger(qn) && qn >= 1 && qn <= 10000)) return toast("数量需在 1–10000 之间");
  let ppu; try { ppu = ethers.parseEther(String(p)); } catch { return toast("请输入单价"); }
  if (ppu <= 0n) return toast("请输入单价");
  const q = BigInt(qn), total = ppu * q, exp = BigInt(nowS() + days * 86400), c = inLab ? "LAB" : "BNB";
  const M = bdAddr(), steps = [];
  if (inLab) steps.push({ label: `LAB.approve(LabBidMarket, ${fmt(total, 4)} LAB)`, to: net.contracts.LABToken, value: 0n, data: LAB_IF.encodeFunctionData("approve", [M, total]) });
  steps.push({ label: `${inLab ? "bidLab" : "bid"}(${id}, ${q}, ${ppu}, ${exp})`, to: M, value: inLab ? 0n : total, data: BM_IF.encodeFunctionData(inLab ? "bidLab" : "bid", [id, q, ppu, exp]) });
  const prompt = `${aiHead()}对 ${nameOf(id)}（id ${id}）发布求购：数量 ${q}，单价 ${amtStr(ppu, inLab)} ${c}，有效期 ${days} 天，托管合计 ${amtStr(total, inLab)} ${c}。` +
    (inLab ? "先查 LAB 余额够不够，approve 正好这个数量，再调用 bidLab。" : "调用 bid，value 等于托管合计。") + "";
  bdShow(`出价：${nameOf(id)} ×${q}`, steps, prompt, `出价后 ${amtStr(total, inLab)} ${c} 托管在 LabBidMarket 合约里，只会付给成交的卖家（扣 ${Number(bd.fee ?? 200n) / 100}% 手续费），或在撤单、到期后退回买家。有效期按生成时刻起算。`);
}
function bdFillDialog(b) {
  const me = who(), held = me && state.infoFor === me ? bal(b.id) : null;
  const max = held != null && held > 0n ? (held < b.remaining ? held : b.remaining) : b.remaining;
  const render = n => {
    const amt = BigInt(n), total = b.price * amt, net_ = total - total * BigInt(b.feeBps) / 10000n;
    const steps = me ? [{ label: `ElementNFT.safeTransferFrom(你, LabBidMarket, ${b.id}, ${amt}, abi.encode(${b.bidId}))`, to: net.contracts.ElementNFT, value: 0n, data: NFT_IF.encodeFunctionData("safeTransferFrom", [me, bdAddr(), b.id, amt, ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [b.bidId])]) }] : [];
    const prompt = `${aiHead()}把 ${amt} 张 ${nameOf(b.id)}（id ${b.id}）卖给求购 #${b.bidId}（单价 ${amtStr(b.price, b.inLab)} ${curOf(b)}，扣 ${b.feeBps / 100}% 手续费后到手 ${amtStr(net_, b.inLab)} ${curOf(b)}）：先确认 isLive(${b.bidId}) 为 true、我的持有数量够，再发一笔 ElementNFT.safeTransferFrom(我, LabBidMarket, ${b.id}, ${amt}, abi.encode(${b.bidId}))，不需要授权。`;
    return { steps, prompt, note: `卡直接转给买家，款项到手 ${amtStr(net_, b.inLab)} ${curOf(b)}。可部分成交，最多 ${b.remaining} 张。${me ? "" : "在顶部输入你的 .ai 名字或地址后，这里会给出完整的交易数据。"}` };
  };
  bdShow(`卖给他：${nameOf(b.id)} · 求购 #${b.bidId}`, null, null, null, { min: 1, max: Number(max), val: Math.max(1, Number(max)), render });
}
function bdCancelDialog(b) {
  const refund = b.remaining * b.price;
  bdShow(`撤单：求购 #${b.bidId}`, [{ label: `cancel(${b.bidId})`, to: bdAddr(), value: 0n, data: BM_IF.encodeFunctionData("cancel", [b.bidId]) }],
    `${aiHead()}撤销我的求购 #${b.bidId}（${nameOf(b.id)}）：调用 LabBidMarket.cancel(${b.bidId})，退回剩余托管 ${amtStr(refund, b.inLab)} ${curOf(b)}。`, "只有出价的买家本人能撤单，剩余托管立即退回。");
}
function bdReclaimDialog(b) {
  const refund = b.remaining * b.price;
  bdShow(`到期取回：求购 #${b.bidId}`, [{ label: `reclaim(${b.bidId})`, to: bdAddr(), value: 0n, data: BM_IF.encodeFunctionData("reclaim", [b.bidId]) }],
    `${aiHead()}处理已到期的求购 #${b.bidId}（${nameOf(b.id)}）：先确认 isLive(${b.bidId}) 为 false，再调用 LabBidMarket.reclaim(${b.bidId})，剩余托管 ${amtStr(refund, b.inLab)} ${curOf(b)} 退回买家。`, "到期后任何地址都可以调用，托管只会退回买家本人，不会给调用者。");
}
// 弹窗：AI 指令 + 原始交易数据（to / value / data）
function bdShow(title, steps, prompt, note, qty) {
  const box = $("modalBox"); box.className = "box sharebox bdbox";
  const draw = () => {
    let s = steps, p = prompt, n = note;
    if (qty) { const r = qty.render(qty.val); s = r.steps; p = r.prompt; n = r.note; }
    box.innerHTML = `<h3>${title}</h3>${n ? `<p class="note">${n}</p>` : ""}
      ${qty ? `<label>数量 <input type="number" id="bdQ" min="${qty.min}" max="${qty.max}" step="1" value="${qty.val}"/> <small class="muted">最多 ${qty.max}</small></label>` : ""}
      <div class="sub-h">发给你的 AI</div><div class="prompt"><code id="bdPrompt"></code><button class="btn btn-sm btn-primary" id="bdCopyP" type="button">复制</button></div>
      ${s && s.length ? `<div class="sub-h">交易数据（任何钱包都可发送 · BSC 56）</div><div class="txs">${s.map((t, i) => `<div class="txd"><b>${s.length > 1 ? `第 ${i + 1} 步 · ` : ""}${t.label}</b>to <code>${t.to}</code><br/>value <code>${t.value}</code> wei<br/>data <code>${t.data}</code><br/><button class="btn btn-sm btn-ghost cpd" data-i="${i}" type="button">复制 data</button></div>`).join("")}</div>` : ""}
      <div class="row"><button class="btn" id="bdClose" type="button">关闭</button></div>`;
    $("bdPrompt").textContent = p;
    $("bdCopyP").onclick = async () => toast((await copyText(p)) ? "已复制，发给你的 AI 吧" : "复制失败，请手动选择文字", 4000, "check");
    box.querySelectorAll(".cpd").forEach(b => b.onclick = async () => toast((await copyText(s[Number(b.dataset.i)].data)) ? "data 已复制" : "复制失败", 3000, "check"));
    $("bdClose").onclick = () => $("modal").classList.add("hidden");
    const qi = $("bdQ"); if (qi) qi.onchange = () => { const v = Math.floor(Number(qi.value)); qty.val = Math.min(qty.max, Math.max(qty.min, v || qty.min)); draw(); };
  };
  draw();
  $("modal").classList.remove("hidden");
}
document.querySelectorAll(".mk-tabs button").forEach(b => b.addEventListener("click", () => mkTab(b.dataset.mt)));
window.addEventListener("hashchange", () => { if (location.hash === "#bid") { mkTab("bid"); showView("market"); } else if (location.hash === "#ez" && hasEZ()) { mkTab("ez"); showView("market"); } });
$("bdFilter").onchange = renderBids;
$("btnBdRefresh").onclick = () => refreshBids(true).catch(e => toast(errMsg(e)));
$("bdForm").addEventListener("submit", bdPlace);
for (const id of ["bdQty", "bdPrice", "bdCur"]) $(id).addEventListener("input", bdTotal);

document.addEventListener("click", async e => { const b = e.target.closest(".copyp"); if (!b) return; e.preventDefault(); e.stopPropagation(); toast((await copyText($("aiPrompt").textContent)) ? "提示词已复制，发给你的 AI 吧" : "复制失败，请手动选择顶部文字", 4000, "check"); }, true);
$("viewForm").addEventListener("submit", e => { e.preventDefault(); setView($("viewInput").value); });
$("btnCopyPrompt").onclick = async () => toast((await copyText($("aiPrompt").textContent)) ? "已复制，发给你的 AI 吧" : "复制失败，请手动选择文字", 4000, "check");
$("btnShare").onclick = copyShare;
$("btnWallMore").onclick = () => { wallOpen = !wallOpen; renderWall(); };
document.querySelectorAll(".wfil button").forEach(b => b.onclick = () => { document.querySelectorAll(".wfil button").forEach(x => x.classList.remove("on")); b.classList.add("on"); wallFilter = b.dataset.w; renderWall(); });
$("wall").addEventListener("click", e => { const n = e.target.closest(".wn"); if (!n) return; $("viewInput").value = n.dataset.addr; setView(n.dataset.addr); });
$("btnTlMore").onclick = () => loadTimeline(true).catch(e => toast(errMsg(e)));
$("btnFeedRefresh").onclick = () => { $("feed").innerHTML = '<li class="feed-empty muted">读取中…</li>'; loadFeed(); };
$("timeline").addEventListener("click", onEvClick); $("feed").addEventListener("click", onEvClick);
for (const id of ["timeline", "feed"]) $(id).addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("li.ev")) onEvClick(e); });
$("mkFilter").onchange = renderMarket;
$("btnMkRefresh").onclick = () => refreshMarket().catch(e => toast(errMsg(e)));
$("mkSell").addEventListener("submit", listCard);

// ---------- 事件 ----------
$("netSel").onchange = e => { localStorage.setItem("lab.net", e.target.value); const u = new URL(location.href); u.searchParams.set("net", e.target.value); location.href = u.toString(); };
$("btnFree").onclick = () => mintFlow("免费首铸", w => w.nft.commitFreeMint());
$("btnMint").onclick = () => mintFlow("元素抽取", w => w.nft.commitDraw(false, { value: state.price }));
$("btnClaim").onclick = async () => { const [x, y] = center($("rxPending")); const rc = await tx(w => w.st.claim(), "LAB 已领取到钱包"); if (rc) burst(x, y, 40); };
$("btnStakeAll").onclick = () => stakeAll();
$("btnReact").onclick = () => synth();
$("btnClearBench").onclick = () => { if (busy) return; bench.clear(); renderTray(); renderBench(); $("benchOut").innerHTML = '<div class="q">?</div>'; };
document.querySelectorAll(".filters button").forEach(b => b.onclick = () => { document.querySelectorAll(".filters button").forEach(x => x.classList.remove("on")); b.classList.add("on"); filter = b.dataset.f; renderRecipes(); });
$("modal").onclick = e => { if (e.target.id === "modal") $("modal").classList.add("hidden"); };
document.addEventListener("keydown", e => { if (e.key === "Escape") { $("modal").classList.add("hidden"); } if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("card")) { e.preventDefault(); e.target.click(); } });
// 卡片点击：托盘中 = 放入烧瓶；图鉴/配方/反应堆/揭示中 = 详情
document.addEventListener("click", e => {
  const c = e.target.closest(".card"); if (!c || c.closest(".slot") || c.closest("#modal") || c.closest("#fx") || c.closest("#benchOut")) return;
  const id = Number(c.dataset.id);
  openEl(id); // 网页只读：托盘卡片也只查看详情
});
// 拖拽进烧瓶（桌面）；手机端点按即可
const fz = $("flaskZone");
fz.addEventListener("dragover", e => { e.preventDefault(); fz.classList.add("drag"); });
fz.addEventListener("dragleave", () => fz.classList.remove("drag"));
fz.addEventListener("drop", e => { e.preventDefault(); fz.classList.remove("drag"); const id = Number(e.dataTransfer.getData("text/plain")); if (id) addBench(id); });
// 分页：首页（搜索 + 动态 + 全网数据）与各功能页，顶部导航 / 底部标签栏切换
const VIEWS = { home: ["secOwner", "hero", "secAI", "secPrize", "secReel", "secFeed", "secWall", "secKit"], mint: ["secMint"], lab: ["secLab"], stake: ["secStake"], market: ["secMarket"], dex: ["secDex"] };
const VIEW_ALIAS = { secMint: "mint", secLab: "lab", secStake: "stake", secMarket: "market", secDex: "dex", bid: "market", ez: "market" };
const viewOf = h => VIEWS[h] ? h : VIEW_ALIAS[h] || "home";
function showView(v, scroll = true) {
  for (const [k, ids] of Object.entries(VIEWS)) ids.forEach(id => $(id).classList.toggle("view-off", k !== v));
  document.querySelectorAll("#tabbar a, .topnav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + v));
  if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
}
function go(v) {
  v = viewOf(v);
  if (location.hash !== "#" + v) history.pushState(null, "", "#" + v);
  showView(v);
}
document.addEventListener("click", e => {
  const g = e.target.closest("a.getl"); if (!g) return;
  e.preventDefault(); e.stopPropagation();
  $("modal").classList.add("hidden");
  const id = Number(g.dataset.id), k = g.dataset.get;
  if (k === "mk") { go("market"); mkTab("sell"); const f = $("mkFilter"); if ([...f.options].some(o => Number(o.value) === id)) { f.value = String(id); renderMarket(); } else toast(`现在没有 ${nameOf(id)} 的挂单，可以发布求购`); }
  else if (k === "bid") prefillBid(id, Number(g.dataset.q) || 1);
  else if (k === "mint") { go("mint"); const m = $("mintOdds"); if (m) m.textContent = `${nameOf(id)}：单次付费铸造约 ${pctStr(drawOdds(id))}，按链上剩余数量实时计算，不一定能拿到。`; }
}, true);
function prefillBid(id, qty) {
  bd.pre = { id, qty }; go("market"); mkTab("bid"); applyBidPre();
}
function applyBidPre() {
  const pre = bd.pre, sel = $("bdId"); if (!pre || !sel.options.length) return;
  sel.value = String(pre.id); $("bdQty").value = String(pre.qty); bd.pre = null; bdTotal();
  $("bdForm").scrollIntoView({ block: "center", behavior: "smooth" });
}
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  e.preventDefault(); go(a.getAttribute("href").slice(1));
});
window.addEventListener("popstate", () => showView(viewOf(location.hash.slice(1))));
const initBid = location.hash === "#bid", initEz = location.hash === "#ez";
{ const h = location.hash.slice(1), v = viewOf(h); if (h && h !== v) history.replaceState(null, "", "#" + v); showView(v, !!h); }

const setHdr = () => document.documentElement.style.setProperty("--hdr", $("hdr").offsetHeight + "px");
window.addEventListener("resize", setHdr);
setupNet(); setHdr(); setConnUI(); updateButtons(); renderBench();
window.LAB_EZ_INIT = initEz && hasEZ(); // ez.js 挂载分页后再切过去
if (initBid) { mkTab("bid"); const q = new URLSearchParams(location.search), bi = Number(q.get("bid")); if (bi > 0) bd.pre = { id: bi, qty: Math.max(1, Math.min(10000, Number(q.get("qty")) || 1)) }; }
{ const q = new URLSearchParams(location.search), qa = q.get("ai") || q.get("addr"); if (qa) { $("viewInput").value = qa; setView(qa, { scroll: false }); } else refresh().catch(e => { console.error(e); toast("读取链上数据失败：" + errMsg(e)); }); }
loadFeed().catch(e => console.warn("feed", e));
setInterval(() => { if (document.visibilityState === "visible" && !busy) refresh().catch(() => {}); }, 15000);
window.__lab = { state: () => state, bench: () => bench, view: () => ({ viewAddr, viewName }), tl: () => tlEvents, feed: () => feedEvents, mk: () => mk, bd: () => bd, mkTab: t => mkTab(t), replay: i => replay(tlEvents[i]), wall: () => wall, share: ev => openShare(ev), card: (id, o) => cardHTML(id, o), go: v => go(v), previewSynth: out => { const r = state.recipes.find(x => x.out === out); return r ? playSynth(r, "实验室") : null; }, previewDecomp: out => { const r = state.recipes.find(x => x.out === out); return r ? playDecomp(r, "实验室") : null; } }; // 调试/自动化用（只读）
})();
