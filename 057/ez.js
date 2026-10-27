/* 零号元素 / Element Zero —— 交易市场里的独立分页（2026-10-27）
 * 网页只读：和求购市场一样，按钮只生成「发给 AI 的指令」和 to / value / data，由用户的 AI 或钱包发送，网页不签名。
 * 地址来自 config.js 的 window.LAB_EZ_CONFIG[当前网络]；为空时整个分页不显示。
 * 文案在本文件内按 window.LAB_LANG 直接给出中英文（i18n.js 只翻译含中文的文字，英文原样保留）。 */
(() => {
  "use strict";
  const { ethers } = window;
  const APP = window.LAB_APP, CFG = window.LAB_EZ_CONFIG || {};
  if (!APP || !ethers) return;
  const $ = id => document.getElementById(id);
  const EN = window.LAB_LANG === "en";
  const EZ_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)",
    "function isApprovedForAll(address account, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved)",
    "function granted() view returns (uint256)", "function MAX_SUPPLY() view returns (uint256)"
  ];
  const MK_ABI = (window.LAB_ABI && window.LAB_ABI.LabMarket) || [
    "function feeBps() view returns (uint256)", "function activeCount() view returns (uint256)",
    "function getActiveListings(uint256 offset, uint256 limit) view returns (uint256[] ids, tuple(address seller, uint256 id, uint256 amount, uint256 pricePerUnit, uint64 createdAt)[] items, uint256[] available)",
    "function getListing(uint256 listingId) view returns (tuple(address seller, uint256 id, uint256 amount, uint256 pricePerUnit, uint64 createdAt))",
    "function availableOf(uint256 listingId) view returns (uint256)", "function sellerListingIds(address seller) view returns (uint256[])",
    "function list(uint256 id, uint256 amount, uint256 pricePerUnit) returns (uint256)", "function buy(uint256 listingId, uint256 amount) payable",
    "function cancel(uint256 listingId)", "function updatePrice(uint256 listingId, uint256 pricePerUnit)"
  ];
  const EZ_IF = new ethers.Interface(EZ_ABI), MK_IF = new ethers.Interface(MK_ABI);
  const ID = 0n, MAXP = (1n << 128n) - 1n;

  // ---------- 文案（中文 / English）----------
  const T = EN ? {
    tab: "Element Zero", name: "Element Zero",
    sub: fee => `Element Zero: 100 cards in total, at most 1 granted per address, transferable. Its own fixed-price market, priced in BNB, partial fills, fee ${fee}. Redemption is not open yet.`,
    issued: (g, m) => `Granted ${g} / ${m}`, redeemOff: "Redemption is not open yet",
    holdNone: "Enter a .ai name or address at the top to see its Element Zero balance.",
    hold: (who, n) => `${who} holds ${n}`, refresh: "Refresh", loading: "Loading…",
    readFail: "Could not read the chain (public RPC limit). Tap Refresh to try again.",
    stats: n => `${n} active listing${n === 1 ? "" : "s"}`,
    empty: "No Element Zero listings yet. A holder can list one below, or ask their AI to follow agent.md 4.7.2.",
    per: "/ card", left: (a, av) => `${a} left${av !== null ? ` · ${av} deliverable` : ""}`, seller: "seller",
    buy: "Buy", ownL: "This is the viewed address's own listing", stale: "The seller cannot deliver right now (card moved or approval removed)",
    sellH: "List for sale", qty: "Amount", price: "Price (BNB)", gen: "Get listing steps",
    sellHintNone: "Enter your .ai name or address at the top first; the steps then check that address's balance and approval.",
    sellHintZero: "The viewed address holds no Element Zero, so a listing would fail.",
    sellHintOk: (n, ap) => `Holds ${n}. ${ap ? "Market already approved: one step." : "Two steps: approve the market once, then list."}`,
    mineT: "My listings", mineOf: w => `Listings by ${w}`, mineNone: "Enter a .ai name at the top to see its listings.", mineEmpty: "No listings yet.",
    ended: "Ended (sold out or cancelled)", newP: "New price", upd: "Update price", cancel: "Cancel",
    ai: "Send to your AI", copy: "Copy", copyData: "Copy data", close: "Close", qtyL: "Amount", maxL: n => `max ${n}`,
    txH: n => `Transaction data (any wallet can send it · ${n})`, step: i => `Step ${i} · `,
    copied: "Copied. Send it to your AI.", copyFail: "Copy failed, please select the text by hand", dataCopied: "data copied",
    needQty: n => `Amount must be between 1 and ${n}`, needPrice: "Enter a price in BNB", badPrice: "Price format is not valid",
    netTag: n => n.kind === "testnet" ? ` (BNB Chain testnet, chainId ${n.chainId}; test assets have no value)` : ` (BNB Chain, chainId ${n.chainId})`,
    head: (doc, nm) => `Read section 4.7.2 (Element Zero market) in ${doc}, then use ${nm ? "my " + nm : "my wallet"} to `,
    pList: (amt, p, mk) => `list ${amt} Element Zero (ElementZero token id 0) at ${p} BNB each: first read ElementZero.balanceOf(me, 0) and make sure I hold enough, then read ElementZero.isApprovedForAll(me, ${mk}); if it is false, call setApprovalForAll(${mk}, true) once and wait for the receipt, then call list(0, ${amt}, <price in wei>) on the Element Zero market. Tell me the listingId.`,
    nList: (fee, need) => `The card stays in your wallet until someone buys it; the buyer pays the price and you receive it minus the ${fee} fee. ${need ? "" : "Approval is only needed once per address."}`,
    tList: (amt, p) => `List: Element Zero ×${amt} @ ${p} BNB`,
    pBuy: (q, lid, p, tot) => `buy ${q} Element Zero from listing #${lid} (${p} BNB each, ${tot} BNB in total): first read availableOf(${lid}) on the Element Zero market and make sure it is at least ${q}, then call buy(${lid}, ${q}) with value exactly ${tot} BNB. No approval needed.`,
    nBuy: (q, tot, fee) => `You pay exactly ${tot} BNB for ${q}; the card moves to your wallet in the same transaction. The seller receives it minus the ${fee} fee.`,
    tBuy: lid => `Buy: Element Zero · listing #${lid}`,
    pCancel: lid => `cancel my Element Zero listing #${lid}: call cancel(${lid}) on the Element Zero market.`,
    nCancel: "Only the seller can cancel. The card never left the wallet, so nothing comes back.", tCancel: lid => `Cancel: listing #${lid}`,
    pUpd: (lid, p) => `change the price of my Element Zero listing #${lid} to ${p} BNB: call updatePrice(${lid}, <price in wei>) on the Element Zero market.`,
    tUpd: lid => `Update price: listing #${lid}`, nUpd: "Only the seller can change the price.",
    you: "<you>", selfBuy: "The seller cannot buy their own listing."
  } : {
    tab: "零号元素", name: "零号元素",
    sub: fee => `零号元素：总量 100 张，每个地址最多发放 1 张，可转让。独立的固定价市场，BNB 计价，可部分成交，手续费 ${fee}。兑换功能暂未开放。`,
    issued: (g, m) => `已发放 ${g} / ${m}`, redeemOff: "兑换功能暂未开放",
    holdNone: "在顶部输入 .ai 名字或地址后显示持有数量。",
    hold: (who, n) => `${who} 持有 ${n} 张`, refresh: "刷新", loading: "读取中…",
    readFail: "读取链上数据失败（公共 RPC 限流），请点刷新重试。",
    stats: n => `${n} 个活跃挂单`,
    empty: "还没有零号元素的挂单。持有人可以在下方挂单，或让 AI 按 agent.md 4.7.2 挂单。",
    per: "/ 张", left: (a, av) => `剩余 ${a}${av !== null ? ` · 可交付 ${av}` : ""}`, seller: "卖家",
    buy: "买入", ownL: "这是当前查看地址自己的挂单", stale: "卖家当前无法交付（卡已转走或撤销授权）",
    sellH: "挂单出售", qty: "数量", price: "单价（BNB）", gen: "生成挂单指令",
    sellHintNone: "先在顶部输入你的 .ai 名字或地址，指令会按该地址检查持有和授权。",
    sellHintZero: "当前查看的地址没有零号元素，挂单会失败。",
    sellHintOk: (n, ap) => `持有 ${n} 张。${ap ? "已授权市场，只需 1 步。" : "共 2 步：先授权市场（只需一次），再挂单。"}`,
    mineT: "我的挂单", mineOf: w => `${w} 的挂单`, mineNone: "在顶部输入 .ai 名字后显示 TA 的挂单。", mineEmpty: "还没有挂单。",
    ended: "已结束（售完或撤单）", newP: "新单价", upd: "改价", cancel: "撤单",
    ai: "发给你的 AI", copy: "复制", copyData: "复制 data", close: "关闭", qtyL: "数量", maxL: n => `最多 ${n}`,
    txH: n => `交易数据（任何钱包都可发送 · ${n}）`, step: i => `第 ${i} 步 · `,
    copied: "已复制，发给你的 AI 吧", copyFail: "复制失败，请手动选择文字", dataCopied: "data 已复制",
    needQty: n => `数量需在 1–${n} 之间`, needPrice: "请输入单价（BNB）", badPrice: "单价格式不对",
    netTag: n => n.kind === "testnet" ? `（BNB Chain 测试网，chainId ${n.chainId}，测试资产无价值）` : `（BNB Chain，chainId ${n.chainId}）`,
    head: (doc, nm) => `去 ${doc} 读 4.7.2「零号元素市场」，用${nm ? "我的 " + nm + " " : "我的钱包"}`,
    pList: (amt, p, mk) => `挂单出售 ${amt} 张零号元素（ElementZero 的 token id 0），单价 ${p} BNB：先读 ElementZero.balanceOf(我, 0) 确认持有数量够，再读 ElementZero.isApprovedForAll(我, ${mk})；为 false 时先调用一次 setApprovalForAll(${mk}, true)，等回执成功，再调用零号元素市场的 list(0, ${amt}, <单价 wei>)。完成后告诉我 listingId。`,
    nList: (fee, need) => `卡留在你的钱包里直到成交；成交时买家付款，你到手扣 ${fee} 手续费。${need ? "" : "同一地址只需授权一次。"}`,
    tList: (amt, p) => `挂单：零号元素 ×${amt} @ ${p} BNB`,
    pBuy: (q, lid, p, tot) => `买 ${q} 张零号元素，挂单 #${lid}（单价 ${p} BNB，合计 ${tot} BNB）：先读零号元素市场的 availableOf(${lid}) 确认不少于 ${q}，再调用 buy(${lid}, ${q})，value 正好 ${tot} BNB。不需要授权。`,
    nBuy: (q, tot, fee) => `一共付 ${tot} BNB 买 ${q} 张，同一笔交易里卡转到你的钱包。卖家到手扣 ${fee} 手续费。`,
    tBuy: lid => `买入：零号元素 · 挂单 #${lid}`,
    pCancel: lid => `撤销我的零号元素挂单 #${lid}：调用零号元素市场的 cancel(${lid})。`,
    nCancel: "只有卖家本人能撤单。卡一直在卖家钱包里，撤单后不需要取回。", tCancel: lid => `撤单：挂单 #${lid}`,
    pUpd: (lid, p) => `把我的零号元素挂单 #${lid} 改价为 ${p} BNB：调用零号元素市场的 updatePrice(${lid}, <单价 wei>)。`,
    tUpd: lid => `改价：挂单 #${lid}`, nUpd: "只有卖家本人能改价。",
    you: "<你>", selfBuy: "卖家不能买自己的挂单。"
  };

  // ---------- 样式（紧凑，复用市场的 mk-* / bdbox 样式）----------
  const css = document.createElement("style"); css.id = "ezCss";
  css.textContent = `.ez-head{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 12px;padding:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.ez-tile{width:44px;height:58px;flex:none;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,rgba(240,185,11,.22),rgba(240,185,11,.05));border:1px solid rgba(240,185,11,.55);color:var(--bnb2);line-height:1}
.ez-tile b{font-size:24px;font-weight:800} .ez-tile i{font-style:normal;font-size:9px;margin-top:4px;color:var(--mut);white-space:nowrap}
.mk-card .ez-tile{width:100%;height:auto;aspect-ratio:3/4} .mk-card.sm .ez-tile b{font-size:18px}
.ez-meta{flex:1;min-width:180px;display:flex;flex-direction:column;gap:2px} .ez-meta small{font-size:12px}
#ezList{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))} #ezList .mk-item{flex-direction:row;align-items:center} #ezList .mk-item .mk-card{width:40px} #ezList>.empty{padding:14px}
.ez-off{font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--mut);align-self:flex-start}`;
  document.head.appendChild(css);

  // ---------- 状态 ----------
  let z = null, ez = null, mk = null, netKey = null, net = null;
  const S = { fee: null, max: null, granted: null, list: [], mine: [], bal: null, approved: null, who: null, at: 0, loading: false, again: false, err: false };
  const bnb = v => { const s = ethers.formatEther(BigInt(v)); return s.includes(".") ? s.replace(/\.?0+$/, "") : s; };
  const feeStr = () => S.fee == null ? "5%" : Number(S.fee) / 100 + "%";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const node = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const tile = () => `<div class="ez-tile" aria-hidden="true"><b>0</b><i>${EN ? "Zero" : "零号"}</i></div>`;
  async function retry(fn, n = 3) { for (let k = 0; ; k++) { try { return await fn(); } catch (e) { if (k >= n) throw e; await new Promise(r => setTimeout(r, 400 * (k + 1))); } } }
  const docUrl = () => (location.host + location.pathname.replace(/[^/]*$/, "") + "agent.md").replace(/^www\./, "");
  const head = () => T.head(docUrl(), APP.viewName());
  const netName = () => `${net.name} · chainId ${net.chainId}`;

  function setup() {
    netKey = APP.netKey(); net = APP.net(); z = CFG[netKey];
    if (!z || !z.ElementZero || !z.EZMarket) return false;
    const p = APP.provider();
    ez = new ethers.Contract(z.ElementZero, EZ_ABI, p); mk = new ethers.Contract(z.EZMarket, MK_ABI, p);
    return true;
  }

  function mount() {
    const tabs = document.querySelector("#secMarket .mk-tabs"), bidPane = $("bidPane");
    if (!tabs || !bidPane || $("ezPane")) return;
    const b = document.createElement("button"); b.type = "button"; b.dataset.mt = "ez"; b.setAttribute("role", "tab"); b.textContent = T.tab;
    b.addEventListener("click", () => APP.tab("ez"));
    tabs.appendChild(b);
    const sub = document.createElement("p"); sub.className = "muted hidden"; sub.id = "ezSub"; sub.textContent = T.sub(feeStr());
    document.querySelector("#secMarket .panel-h").appendChild(sub);
    const pane = node(`<div id="ezPane" class="hidden">
      <div class="ez-head">${tile()}<div class="ez-meta"><b>${T.name}</b><small class="muted" id="ezIssued"></small><small id="ezHold" class="muted"></small></div>
        <span class="ez-off">${T.redeemOff}</span><button id="btnEzRefresh" class="btn btn-sm btn-ghost" type="button"><i class="ic ic-refresh" aria-hidden="true"></i>${T.refresh}</button></div>
      <div class="mk-bar"><span id="ezStats" class="muted"></span></div>
      <div id="ezList" class="mk-list"><div class="empty muted">${T.loading}</div></div>
      <div class="mk-cols">
        <div class="mk-box"><div class="sub-h"><i class="ic ic-cart" aria-hidden="true"></i>${T.sellH}</div>
          <form id="ezSell" class="mk-sell" autocomplete="off">
            <label>${T.qty}<input id="ezAmt" type="number" min="1" step="1" value="1"/></label>
            <label>${T.price}<input id="ezPrice" type="number" min="0" step="any" placeholder="0.01"/></label>
            <button id="btnEzList" class="btn btn-primary" type="submit">${T.gen}</button>
          </form><p class="muted bd-total" id="ezHint"></p></div>
        <div class="mk-box"><div class="sub-h" id="ezMineTitle">${T.mineT}</div><div id="ezMine" class="mk-mine"></div></div>
      </div></div>`);
    bidPane.after(pane);
    $("btnEzRefresh").onclick = () => refresh(true, true);
    $("ezSell").addEventListener("submit", e => { e.preventDefault(); listDialog(); });
  }

  // ---------- 读链 ----------
  async function refresh(force, loud) {
    if (!ez) return;
    const w = APP.who() || null, shown = !$("ezPane").classList.contains("hidden") && !$("secMarket").classList.contains("view-off");
    if (!force && !shown) return; // 不在这个分页时不读链（公共 RPC 限流）；切到分页时 mkTab 会强制刷新
    if (S.loading) { S.again = true; return; }
    S.loading = true;
    try {
      if (S.fee == null) { const [f, m] = await retry(() => Promise.all([mk.feeBps(), ez.MAX_SUPPLY()])); S.fee = f; S.max = m; $("ezSub").textContent = T.sub(feeStr()); }
      const n = Number(await retry(() => mk.activeCount())), all = [];
      for (let off = 0; off < n && off < 300; off += 100) {
        const [ids, items, av] = await retry(() => mk.getActiveListings(off, 100));
        ids.forEach((lid, i) => all.push({ lid: Number(lid), seller: items[i][0], id: items[i][1], amount: items[i][2], price: items[i][3], avail: av[i] }));
      }
      S.list = all.filter(l => l.id === ID).sort((a, b) => (a.price < b.price ? -1 : a.price > b.price ? 1 : a.lid - b.lid));
      S.granted = await retry(() => ez.granted());
      if (w) {
        const [b, ap, lids] = await retry(() => Promise.all([ez.balanceOf(w, ID), ez.isApprovedForAll(w, z.EZMarket), mk.sellerListingIds(w)]));
        S.bal = b; S.approved = ap;
        const ids = lids.map(Number).slice(-30).reverse(), mine = [];
        for (const lid of ids) { const [l, av] = await retry(() => Promise.all([mk.getListing(lid), mk.availableOf(lid)])); mine.push({ lid, seller: l[0], id: l[1], amount: l[2], price: l[3], avail: av }); }
        S.mine = mine;
      } else { S.bal = null; S.approved = null; S.mine = []; }
      S.who = w; S.at = Date.now(); S.err = false;
    } catch (e) { console.warn("ez", e); S.err = true; if (loud) APP.toast(T.readFail); }
    finally { S.loading = false; }
    render();
    if (S.again) { S.again = false; refresh(true); }
  }

  // ---------- 渲染 ----------
  function render() {
    const w = S.who, nm = APP.viewName() || (w ? APP.short(w) : "");
    $("ezIssued").textContent = S.granted != null ? T.issued(S.granted, S.max ?? 100) : "";
    $("ezHold").textContent = w && S.bal != null ? T.hold(nm, S.bal) : T.holdNone;
    $("ezStats").textContent = S.err && !S.at ? T.readFail : T.stats(S.list.length);
    const box = $("ezList"); box.innerHTML = "";
    if (!S.list.length) box.innerHTML = `<div class="empty muted">${S.err && !S.at ? T.readFail : T.empty}</div>`;
    for (const l of S.list) {
      const own = w && l.seller.toLowerCase() === w.toLowerCase();
      const d = node(`<div class="mk-item"><div class="mk-card">${tile()}</div>
        <div class="mk-info"><b>${T.name}</b><span class="mk-price">${bnb(l.price)} BNB <small class="muted">${T.per}</small></span>
        <small class="muted">${T.left(l.amount, l.avail < l.amount ? l.avail : null)} · ${T.seller} <a href="?addr=${l.seller}" class="ev-user">${esc(APP.shortName(l.seller))}</a> · #${l.lid}</small>
        <div class="mk-act"><button class="btn btn-sm btn-primary by" type="button">${T.buy}</button></div></div></div>`);
      d.querySelector(".ev-user").onclick = e => { e.preventDefault(); APP.setView(l.seller); };
      const by = d.querySelector(".by");
      if (own || l.avail === 0n) { by.disabled = true; by.title = own ? T.ownL : T.stale; }
      by.onclick = () => buyDialog(l);
      box.appendChild(d);
    }
    // 挂单表单提示
    const hint = $("ezHint"), btn = $("btnEzList"), amt = $("ezAmt");
    if (!w) { hint.textContent = T.sellHintNone; btn.disabled = false; amt.removeAttribute("max"); }
    else if (S.bal === 0n) { hint.textContent = T.sellHintZero; btn.disabled = true; btn.title = T.sellHintZero; }
    else if (S.bal != null) { hint.textContent = T.sellHintOk(S.bal, S.approved); btn.disabled = false; btn.title = ""; amt.max = String(S.bal); }
    // 我的挂单
    $("ezMineTitle").textContent = APP.viewName() || w ? T.mineOf(nm) : T.mineT;
    const mb = $("ezMine");
    if (!w) { mb.innerHTML = `<div class="empty muted">${T.mineNone}</div>`; return; }
    if (!S.mine.length) { mb.innerHTML = `<div class="empty muted">${T.mineEmpty}</div>`; return; }
    mb.innerHTML = "";
    for (const l of S.mine) {
      const live = l.amount > 0n;
      const d = node(`<div class="mk-row${live ? "" : " ended"}"><div class="mk-card sm">${tile()}</div><div class="mk-info"><b>${T.name} <small class="muted">#${l.lid}</small></b>
        <small class="muted">${live ? `${bnb(l.price)} BNB ${T.per} · ${T.left(l.amount, l.avail < l.amount ? l.avail : null)}` : T.ended}</small></div>
        ${live ? `<div class="mk-act"><input type="number" min="0" step="any" placeholder="${T.newP}" aria-label="${T.newP} BNB"/><button class="btn btn-sm btn-ghost up" type="button">${T.upd}</button><button class="btn btn-sm btn-ghost cc" type="button">${T.cancel}</button></div>` : ""}</div>`);
      if (live) {
        d.querySelector(".up").onclick = () => updDialog(l, d.querySelector("input").value);
        d.querySelector(".cc").onclick = () => show(T.tCancel(l.lid), [{ label: `cancel(${l.lid})`, to: z.EZMarket, value: 0n, data: MK_IF.encodeFunctionData("cancel", [l.lid]) }], head() + T.pCancel(l.lid) + T.netTag(net), T.nCancel);
      }
      mb.appendChild(d);
    }
  }

  // ---------- 指令 + 交易数据 ----------
  function parsePrice(v) {
    if (!(Number(v) > 0)) { APP.toast(T.needPrice); return null; }
    let w; try { w = ethers.parseEther(String(v)); } catch { APP.toast(T.badPrice); return null; }
    if (w <= 0n || w > MAXP) { APP.toast(T.badPrice); return null; }
    return w;
  }
  function listDialog() {
    const w = S.who, max = w && S.bal != null ? S.bal : 10n;
    const an = Number($("ezAmt").value);
    if (!Number.isInteger(an) || an < 1 || BigInt(an) > max) return APP.toast(T.needQty(max));
    const ppu = parsePrice($("ezPrice").value); if (ppu == null) return;
    const amt = BigInt(an), p = bnb(ppu), steps = [];
    const needApprove = !(w && S.approved === true);
    if (needApprove) steps.push({ label: `ElementZero.setApprovalForAll(${APP.short(z.EZMarket)}, true)`, to: z.ElementZero, value: 0n, data: EZ_IF.encodeFunctionData("setApprovalForAll", [z.EZMarket, true]) });
    steps.push({ label: `list(0, ${amt}, ${ppu})`, to: z.EZMarket, value: 0n, data: MK_IF.encodeFunctionData("list", [ID, amt, ppu]) });
    show(T.tList(amt, p), steps, head() + T.pList(amt, p, z.EZMarket) + T.netTag(net), T.nList(feeStr(), needApprove));
  }
  function buyDialog(l) {
    const max = Number(l.avail < l.amount ? l.avail : l.amount) || 1;
    const self = S.who && l.seller.toLowerCase() === S.who.toLowerCase();
    const render = n => {
      const q = BigInt(n), tot = l.price * q;
      return { steps: [{ label: `buy(${l.lid}, ${q}) · value ${bnb(tot)} BNB`, to: z.EZMarket, value: tot, data: MK_IF.encodeFunctionData("buy", [l.lid, q]) }],
        prompt: head() + T.pBuy(q, l.lid, bnb(l.price), bnb(tot)) + T.netTag(net), note: T.nBuy(q, bnb(tot), feeStr()) + (self ? " " + T.selfBuy : "") };
    };
    show(T.tBuy(l.lid), null, null, null, { min: 1, max, val: 1, render });
  }
  function updDialog(l, v) {
    const ppu = parsePrice(v); if (ppu == null) return;
    show(T.tUpd(l.lid), [{ label: `updatePrice(${l.lid}, ${ppu})`, to: z.EZMarket, value: 0n, data: MK_IF.encodeFunctionData("updatePrice", [l.lid, ppu]) }], head() + T.pUpd(l.lid, bnb(ppu)) + T.netTag(net), T.nUpd);
  }
  function show(title, steps, prompt, note, qty) {
    const box = $("modalBox"); box.className = "box sharebox bdbox ezbox";
    const draw = () => {
      let s = steps, p = prompt, n = note;
      if (qty) { const r = qty.render(qty.val); s = r.steps; p = r.prompt; n = r.note; }
      box.innerHTML = `<h3>${esc(title)}</h3>${n ? `<p class="note">${esc(n)}</p>` : ""}
        ${qty && qty.max > 1 ? `<label>${T.qtyL} <input type="number" id="ezQ" min="${qty.min}" max="${qty.max}" step="1" value="${qty.val}"/> <small class="muted">${T.maxL(qty.max)}</small></label>` : ""}
        <div class="sub-h">${T.ai}</div><div class="prompt"><code id="ezPrompt"></code><button class="btn btn-sm btn-primary" id="ezCopyP" type="button">${T.copy}</button></div>
        <div class="sub-h">${T.txH(netName())}</div><div class="txs">${s.map((t, i) => `<div class="txd"><b>${s.length > 1 ? T.step(i + 1) : ""}${esc(t.label)}</b>to <code>${t.to}</code><br/>value <code>${t.value}</code> wei<br/>data <code class="ezd">${t.data}</code><br/><button class="btn btn-sm btn-ghost cpd" data-i="${i}" type="button">${T.copyData}</button></div>`).join("")}</div>
        <div class="row"><button class="btn" id="ezClose" type="button">${T.close}</button></div>`;
      $("ezPrompt").textContent = p;
      $("ezCopyP").onclick = async () => APP.toast((await APP.copyText(p)) ? T.copied : T.copyFail, 4000, "check");
      box.querySelectorAll(".cpd").forEach(b => b.onclick = async () => APP.toast((await APP.copyText(s[Number(b.dataset.i)].data)) ? T.dataCopied : T.copyFail, 3000, "check"));
      $("ezClose").onclick = () => $("modal").classList.add("hidden");
      const qi = $("ezQ"); if (qi) qi.onchange = () => { const v = Math.floor(Number(qi.value)); qty.val = Math.min(qty.max, Math.max(qty.min, v || qty.min)); draw(); };
    };
    draw();
    $("modal").classList.remove("hidden");
  }

  // ---------- 启动 ----------
  if (!setup()) { window.LAB_EZ_UI = { refresh() {}, live: () => false }; return; }
  mount();
  window.LAB_EZ_UI = { refresh: (force) => refresh(!!force), live: () => true, state: S };
  if (window.LAB_EZ_INIT) APP.tab("ez");
})();
