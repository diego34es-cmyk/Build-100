/* 铸造返还 LAB / Mint rebate in LAB — 20261027rb7 (rule v2: BNB paid mint + deposit into the Reactor; no follow/repost). Self-contained module; no wallet, no signing.
   Layout (owner 23:02): never takes over the page.
   - "strip" (default, recommended): one slim line inside the Mint tab under the packs, collapsed; it expands in place.
     Plus a one-line hint in the "viewed lab" side panel when the viewed .ai has done its free mint (dismiss remembered).
   - "card": small dismissible card in the side panel (only after a viewed .ai's free mint), opens a drawer.
   - "link": a header link and a footer link that open a drawer.
   Preview: ?rebate_layout=strip|card|link, ?rebate_demo=1 (every status), ?rebate_closed=1 (closed state). */
(function () {
"use strict";
const API = "/lab/api/rebate";
const EN = (window.LAB_LANG || document.documentElement.lang || "zh").startsWith("en");
const L = EN ? "en" : "zh";
const Q = new URLSearchParams(location.search);
const LAYOUT = ["strip", "card", "link"].includes(Q.get("rebate_layout")) ? Q.get("rebate_layout") : "strip";
const DEMO = Q.get("rebate_demo") === "1";
const HINT_KEY = "lab_rb_hint_off";

const T = EN ? {
  title: "Mint rebate in LAB",
  sub: "Mint with BNB and deposit a card into the Reactor, then register: your 1st BNB mint returns 15,000 LAB and your 2nd returns 5,000 LAB. BNB mints made before registering count too. 100 places, one per person.",
  a1: "Back on your 1st BNB mint", a2: "Back on your 2nd BNB mint",
  strip: "Mint rebate: mint with BNB and deposit a card into the Reactor; your 1st BNB mint returns 15,000 LAB.",
  open: "Open", close: "Close",
  step1: "Mint at least once with BNB on this .ai (mints paid in LAB don't count)",
  step2: "Deposit a card into the Reactor (one tap to confirm in your Binance App)",
  step3: "Enter your X username and .ai name, then submit. You can register before steps 1 and 2",
  rulesT: "Rules",
  rules: [
    "1st BNB mint: 15,000 LAB back. With 2 or more BNB mints: 5,000 LAB more, up to 20,000 LAB back per .ai. BNB mints made before registering count too. Mints paid in LAB get no rebate.",
    "Who qualifies: a .ai that has minted with BNB and has deposited at least one card into the Reactor. If you register first, the place is confirmed once both are done; no need to register again.",
    "100 places. One registration per person, and one per .ai and per X account, across the Chinese and English pages. Several .ai or several X accounts of the same person count once.",
    "Once the place is confirmed, the LAB goes out in a daily batch to the wallet bound to this .ai, and each transfer shows its transaction link here. Places confirmed before 27 Oct 2026 are paid under the rules they registered with."
  ],
  lx: "X username (for contact)", px: "yourname (without @)", la: ".ai name", pa: "yourname.ai",
  submit: "Register", check: "See my progress", sending: "Sending...",
  st: {
    input: ["Not registered yet", "Mint with BNB, deposit a card into the Reactor, and register below, in any order."],
    pending: ["Registered", "The place is confirmed once this .ai has minted with BNB and deposited a card into the Reactor. If one is still missing, just do it; no need to register again."],
    checking: ["Registered", "Your registration is being processed."],
    manual: ["Registered", "Your registration is being processed."],
    verified: ["The place is yours", "The LAB goes to the wallet bound to this .ai in a daily batch, earlier BNB mints included."],
    claimed: ["Already registered", "This person, this .ai or this X account is already registered."],
    failed: ["Not registered", ""],
    paid: ["LAB sent", ""],
    closed: ["Places filled", "All 100 places are filled. Registered players keep their place and can see their progress here."]
  },
  noslot: "The place is yours. All 4 mints of this .ai are used, so the LAB goes to its wallet but cannot be used to mint on this .ai.",
  paidNoslot: "All 4 mints of this .ai are used, so the LAB stays in the wallet.",
  why: {
    repost: "This registration did not go through. The rule now: mint with BNB and deposit a card into the Reactor, then register again.",
    follow: "This registration did not go through. The rule now: mint with BNB and deposit a card into the Reactor, then register again.",
    account: "This X account could not be registered.",
    dup: "One registration per person: this .ai or X account belongs to someone already registered.",
    ai: "This .ai name was not found.", nofree: "This .ai has not done its first mint yet. Do that first.",
    format: "The X username or the .ai name looks wrong. Please fix it.", server: "The service is busy. Try again in a minute.",
    full: "All 100 places are taken.", closed: "Registration is closed for now."
  },
  paid: (amt, tx) => `${amt} LAB sent to the wallet bound to this .ai. <a href="https://bscscan.com/tx/${tx}" target="_blank" rel="noopener">View transaction</a>`,
  hint: "Mint rebate: mint with BNB and deposit a card into the Reactor, earlier BNB mints count", hintBtn: "Register", dismiss: "Hide",
  cardT: "Mint rebate in LAB", cardP: "Mint with BNB and deposit a card into the Reactor: 15,000 LAB back on your 1st BNB mint and 5,000 LAB on your 2nd.", cardBtn: "Register",
  link: "Mint rebate",
  popT: "Mint rebate in LAB", popP: "Mint with BNB and deposit a card into the Reactor: your 1st BNB mint returns 15,000 LAB",
  popCta: "See the rules", popClose: "Close",
  demo: "All statuses (sample)"
} : {
  title: "铸造返利 LAB",
  sub: "用 BNB 铸造，并把卡存入反应堆，再登记：第一次 BNB 铸造返 15,000 LAB，第二次返 5,000 LAB。登记前的 BNB 铸造也算。名额 100 个，一人一份。",
  a1: "第一次 BNB 铸造返利", a2: "第二次 BNB 铸造返利",
  strip: "铸造返利：用 BNB 铸造并把卡存入反应堆，第一次 BNB 铸造返 15,000 LAB",
  open: "展开", close: "收起",
  step1: "用这个 .ai 以 BNB 付费铸造至少 1 次（用 LAB 铸造的不算）",
  step2: "把一张卡存入反应堆（要在币安 App 里点一次确认）",
  step3: "填写 X 用户名和 .ai 名称，提交登记。可以先登记，再做第 1、2 步",
  rulesT: "规则",
  rules: [
    "第一次 BNB 铸造返 15,000 LAB；用 BNB 铸造过 2 次及以上，再返 5,000 LAB，每个 .ai 最多返 20,000 LAB。登记前做过的 BNB 铸造也算；用 LAB 铸造没有返利。",
    "条件：这个 .ai 用 BNB 铸造过，并且把至少一张卡存入过反应堆。先登记也可以，两件事都做完后名额自动确认，不用再登记。",
    "名额 100 个。每人只能登记一次，每个 .ai、每个 X 账号也只能登记一次（中文页和英文页合计）；同一个人的多个 .ai 或多个 X 账号只算一次。",
    "名额确认后，LAB 按天分批发到这个 .ai 绑定的钱包，每笔都在这里显示交易链接。2026-10-27 之前已经登记上的，按登记时的规则照常发放。"
  ],
  lx: "X 用户名（用于联系）", px: "yourname（不用加 @）", la: ".ai 名称", pa: "yourname.ai",
  submit: "提交登记", check: "查看进度", sending: "提交中…",
  st: {
    input: ["还没有登记", "用 BNB 铸造、把卡存入反应堆，再在下面登记，顺序不限。"],
    pending: ["登记好了", "这个 .ai 用 BNB 铸造过、并把卡存入过反应堆后，名额就会确认。还差哪一步，做完就行，不用再登记。"],
    checking: ["登记好了", "正在处理你的登记。"],
    manual: ["登记好了", "正在处理你的登记。"],
    verified: ["名额是你的了", "返利的 LAB 会按天分批发到这个 .ai 绑定的钱包，登记前的 BNB 铸造也一起补发。"],
    claimed: ["已经登记过", "这个人、这个 .ai 或这个 X 账号已经登记过了。"],
    failed: ["没有登记上", ""],
    paid: ["LAB 已发放", ""],
    closed: ["名额已满", "100 个名额已经满了。已经登记上的照常发放，可以在这里查看进度。"]
  },
  noslot: "名额是你的了。这个 .ai 的 4 次铸造已经用完，LAB 会发到它绑定的钱包，但不能再用来在这个 .ai 上铸造。",
  paidNoslot: "这个 .ai 的 4 次铸造已经用完，LAB 留在钱包里。",
  why: {
    repost: "这次登记没有通过。现在的规则是用 BNB 铸造并把卡存入反应堆，做完后可以再登记一次。",
    follow: "这次登记没有通过。现在的规则是用 BNB 铸造并把卡存入反应堆，做完后可以再登记一次。",
    account: "这个 X 账号没有登记上。",
    dup: "每人只能登记一次：这个 .ai 或 X 账号和已经登记的属于同一个人。",
    ai: "没有找到这个 .ai 名称。", nofree: "这个 .ai 还没有做第一次铸造，先完成它。",
    format: "请看看 X 用户名和 .ai 名称有没有写错。", server: "服务有点忙，请过一分钟再试。",
    full: "100 个名额已经满了。", closed: "登记暂时关闭。"
  },
  paid: (amt, tx) => `已向这个 .ai 绑定的钱包发放 ${amt} LAB。<a href="https://bscscan.com/tx/${tx}" target="_blank" rel="noopener">查看交易</a>`,
  hint: "铸造返利：用 BNB 铸造并把卡存入反应堆后可以登记，之前的 BNB 铸造也算", hintBtn: "去登记", dismiss: "不再显示",
  cardT: "铸造返利 LAB", cardP: "用 BNB 铸造并把卡存入反应堆：第一次 BNB 铸造返 15,000 LAB，第二次返 5,000 LAB。", cardBtn: "去登记",
  link: "铸造返利",
  popT: "铸造返利 LAB", popP: "用 BNB 铸造并把卡存入反应堆，第一次 BNB 铸造返 15,000 LAB",
  popCta: "看看规则", popClose: "关闭",
  demo: "所有状态预览"
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = n => Number(n).toLocaleString("en-US");
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
let INFO = { open: Q.get("rebate_closed") !== "1" };

function stHTML(s) {
  const st = s.state in T.st ? s.state : "input";
  let [h, p] = T.st[st];
  if (st === "failed") p = T.why[s.reason] || T.why.server;
  if (st === "verified" && s.slots_left === 0) p = T.noslot;
  if (st === "paid") p = (s.payouts || []).map(x => T.paid(fmt(x.amount), esc(x.tx))).join("<br/>") + (s.slots_left === 0 ? "<br/>" + T.paidNoslot : "");
  return `<div class="rb-st s-${st}" role="status"><b>${esc(h)}</b>${p}</div>`;
}

// ---------- the panel (same content in every layout) ----------
function panel() {
  const p = el("div", "rb-panel");
  p.id = "rbPanel";
  p.innerHTML = `
    <p class="rb-sub">${T.sub}</p>
    <div class="rb-amt"><div><b>15,000 LAB</b><span>${T.a1}</span></div><div><b>+5,000 LAB</b><span>${T.a2}</span></div></div>
    <ol class="rb-steps">
      <li><span class="rb-n">1</span><span class="rb-t">${T.step1}</span></li>
      <li><span class="rb-n">2</span><span class="rb-t">${T.step2}</span></li>
      <li><span class="rb-n">3</span><span class="rb-t">${T.step3}</span></li>
    </ol>
    <form id="rbForm" autocomplete="off" novalidate>
      <label>${T.lx}<input id="rbX" name="x" type="text" spellcheck="false" maxlength="16" placeholder="${T.px}"/></label>
      <label>${T.la}<input id="rbAi" name="ai" type="text" spellcheck="false" maxlength="18" placeholder="${T.pa}"/></label>
      <div class="rb-btns"><button class="btn btn-primary btn-sm" type="submit" id="rbSubmit">${T.submit}</button><button class="btn btn-ghost btn-sm" type="button" id="rbCheck">${T.check}</button></div>
    </form>
    <div id="rbStatus" aria-live="polite">${stHTML({ state: INFO.open ? "input" : "closed" })}</div>
    <details class="rb-rules"><summary>${T.rulesT}</summary><ol>${T.rules.map(r => `<li>${r}</li>`).join("")}</ol></details>`;
  if (DEMO) {
    const S = [{ state: "input" }, { state: "pending" }, { state: "checking" }, { state: "manual" }, { state: "verified" },
      { state: "verified", slots_left: 0 }, { state: "claimed" }, { state: "failed", reason: "repost" }, { state: "failed", reason: "dup" },
      { state: "failed", reason: "account" }, { state: "failed", reason: "nofree" }, { state: "failed", reason: "full" }, { state: "closed" },
      { state: "paid", payouts: [{ amount: 15000, tx: "0x" + "0".repeat(64) }] },
      { state: "paid", slots_left: 0, payouts: [{ amount: 15000, tx: "0x" + "0".repeat(64) }, { amount: 5000, tx: "0x" + "1".repeat(64) }] }];
    p.appendChild(el("div", "rb-demo", `<h3>${T.demo}</h3>` + S.map(stHTML).join("")));
  }
  return p;
}

function applyOpen() {
  const f = $("rbForm"); if (!f) return;
  f.classList.toggle("rb-closed", !INFO.open);           // closed: hide X field and Submit, keep status lookup
  const s = $("rbStrip"); if (s) s.classList.toggle("s-closed", !INFO.open);
  const t = $("rbStripText"); if (t) t.textContent = INFO.open ? T.strip : `${T.title}: ${T.st.closed[0]}`;
  if (!INFO.open && /s-input/.test($("rbStatus").innerHTML)) $("rbStatus").innerHTML = stHTML({ state: "closed" });
}

function wire() {
  const normX = v => v.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").split(/[/?#]/)[0];
  const normAi = v => v.trim().toLowerCase().replace(/\.ai$/, "");
  const okX = v => /^[A-Za-z0-9_]{1,15}$/.test(v), okAi = v => /^[a-z0-9]{3,15}$/.test(v);
  const show = s => { $("rbStatus").innerHTML = stHTML(s); };
  async function api(path, opt) {
    const r = await fetch(API + path, Object.assign({ headers: { "Content-Type": "application/json" } }, opt));
    const j = await r.json().catch(() => ({}));
    if (!r.ok && !j.state) throw new Error("http " + r.status);
    return j;
  }
  $("rbForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!INFO.open) return show({ state: "closed" });
    const x = normX($("rbX").value), ai = normAi($("rbAi").value);
    if (!okX(x) || !okAi(ai)) return show({ state: "failed", reason: "format" });
    const b = $("rbSubmit"); b.disabled = true; b.textContent = T.sending;
    try { show(await api("/claim", { method: "POST", body: JSON.stringify({ x, ai, lang: L }) })); }
    catch (_) { show({ state: "failed", reason: "server" }); }
    finally { b.disabled = false; b.textContent = T.submit; }
  });
  $("rbCheck").addEventListener("click", async () => {
    const ai = normAi($("rbAi").value);
    if (!okAi(ai)) return show({ state: "failed", reason: "format" });
    try { show(await api("/status?ai=" + encodeURIComponent(ai))); }
    catch (_) { show({ state: "failed", reason: "server" }); }
  });
}

// ---------- drawer (card / link layouts) ----------
function drawer() {
  if ($("rbDrawer")) return $("rbDrawer");
  const d = el("div", "rb-drawer hidden");
  d.id = "rbDrawer";
  d.innerHTML = `<div class="rb-scrim" data-rb-close></div><div class="rb-sheet" role="dialog" aria-modal="true" aria-labelledby="rbDrawerT">
    <div class="rb-sheet-h"><b id="rbDrawerT">${T.title}</b><button class="btn btn-ghost btn-sm" type="button" data-rb-close>${T.close}</button></div></div>`;
  d.querySelector(".rb-sheet").appendChild(panel());
  document.body.appendChild(d);
  d.addEventListener("click", e => { if (e.target.closest("[data-rb-close]")) closeDrawer(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
  return d;
}
function openDrawer(ai) { const d = drawer(); d.classList.remove("hidden"); document.body.classList.add("rb-noscroll"); if (ai) $("rbAi").value = ai; }
function closeDrawer() { const d = $("rbDrawer"); if (d) d.classList.add("hidden"); document.body.classList.remove("rb-noscroll"); }

// ---------- viewed .ai (home side panel) ----------
function viewed() {
  let v = {}; try { v = (window.__lab && window.__lab.view()) || {}; } catch (_) {}
  const m = parseInt(($("mMints") || {}).textContent, 10);
  const name = String(v.viewName || "").toLowerCase().replace(/\.ai$/, "");
  return { name, mints: isNaN(m) ? 0 : m };
}
const hintOff = () => { try { return localStorage.getItem(HINT_KEY) === "1"; } catch (_) { return false; } };
function sideSlot(node) {
  const me = $("me");
  if (me && me.parentNode) me.parentNode.insertBefore(node, me.nextSibling);
}
function watchViewed(onChange) {
  const tick = () => onChange(viewed());
  const m = $("mMints");
  if (m) new MutationObserver(tick).observe(m, { childList: true, characterData: true, subtree: true });
  tick();
}

// ---------- layouts ----------
function mountStrip() {
  const mint = $("secMint");
  const box = el("div", "rb-strip");
  box.id = "rbStrip";
  box.innerHTML = `<button type="button" class="rb-strip-bar" id="rbStripBtn" aria-expanded="false" aria-controls="rbPanel">
      <span class="rb-dot" aria-hidden="true"></span><span class="rb-strip-t" id="rbStripText">${T.strip}</span><span class="rb-strip-go" id="rbStripGo">${T.open}</span></button>`;
  const pnl = panel(); pnl.classList.add("hidden");
  box.appendChild(pnl);
  const packs = mint && mint.querySelector(".packs");
  if (packs) packs.parentNode.insertBefore(box, packs.nextSibling);
  else (mint || document.querySelector("main") || document.body).appendChild(box);
  const toggle = open => {
    pnl.classList.toggle("hidden", !open);
    $("rbStripBtn").setAttribute("aria-expanded", String(open));
    $("rbStripGo").textContent = open ? T.close : T.open;
  };
  $("rbStripBtn").addEventListener("click", () => toggle(pnl.classList.contains("hidden")));
  if (DEMO || Q.get("rebate") === "open") toggle(true);
  // one-line hint in the side panel when the viewed .ai has done its free mint
  const hint = el("div", "rb-hint hidden");
  hint.id = "rbHint";
  hint.innerHTML = `<button type="button" class="rb-hint-go" id="rbHintGo"><span>${T.hint}</span><b>${T.hintBtn}</b></button><button type="button" class="rb-x" id="rbHintX" aria-label="${T.dismiss}" title="${T.dismiss}">×</button>`;
  sideSlot(hint);
  $("rbHintX").addEventListener("click", () => { try { localStorage.setItem(HINT_KEY, "1"); } catch (_) {} hint.classList.add("hidden"); });
  $("rbHintGo").addEventListener("click", () => {
    const v = viewed();
    if (window.__lab && window.__lab.go) window.__lab.go("mint"); else location.hash = "#mint";
    toggle(true); if (v.name) $("rbAi").value = v.name + ".ai";
    setTimeout(() => box.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
  });
  watchViewed(v => hint.classList.toggle("hidden", !(INFO.open && !hintOff() && ((v.name && v.mints >= 1) || DEMO))));
}
function mountCard() {
  const card = el("div", "rb-card hidden");
  card.id = "rbCard";
  card.innerHTML = `<button type="button" class="rb-x" id="rbCardX" aria-label="${T.dismiss}" title="${T.dismiss}">×</button>
    <b>${T.cardT}</b><p>${T.cardP}</p><button type="button" class="btn btn-primary btn-sm" id="rbCardGo">${T.cardBtn}</button>`;
  sideSlot(card);
  $("rbCardX").addEventListener("click", () => { try { localStorage.setItem(HINT_KEY, "1"); } catch (_) {} card.classList.add("hidden"); });
  $("rbCardGo").addEventListener("click", () => { const v = viewed(); openDrawer(v.name ? v.name + ".ai" : ""); });
  watchViewed(v => card.classList.toggle("hidden", !(INFO.open && !hintOff() && ((v.name && v.mints >= 1) || DEMO))));
  if (DEMO) openDrawer();
}
function mountLink() {
  const w = document.querySelector("#hdr .wallet");
  const a = el("a", "btn btn-sm btn-ghost rb-hdr", esc(T.link));
  a.href = "#rebate"; a.id = "rbHdr";
  if (w) w.insertBefore(a, w.firstChild);
  const f = document.querySelector("footer");
  if (f) { const fl = el("a", "rb-foot", esc(T.title)); fl.href = "#rebate"; f.insertBefore(document.createTextNode(" · "), f.firstChild); f.insertBefore(fl, f.firstChild); }
  document.addEventListener("click", e => { if (e.target.closest("#rbHdr, .rb-foot")) { e.preventDefault(); openDrawer(viewed().name ? viewed().name + ".ai" : ""); } });
  if (DEMO) openDrawer();
}

// ---------- entry popup (owner 23:24): once per browser, only while registration is open ----------
const POP_KEY = "lab_rb_pop_off";
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|headless|lighthouse|python|curl|wget|httpclient|go-http/i;
function popOff() { try { return localStorage.getItem(POP_KEY) === "1"; } catch (_) { return true; } }
function popup() {
  if (LAYOUT !== "strip" || DEMO || Q.get("rebate") === "open" || Q.get("ai") || Q.get("addr") || window.LAB_LANDING || popOff() || BOT.test(navigator.userAgent || "") || $("rbPop")) return; // owner landing views (?ai= / ?addr=) stay clean
  const prev = document.activeElement;
  const w = el("div", "rb-pop");
  w.id = "rbPop";
  w.innerHTML = `<div class="rb-pop-scrim" data-pop-close></div>
    <div class="rb-pop-box" role="dialog" aria-modal="true" aria-labelledby="rbPopT" aria-describedby="rbPopP">
      <button type="button" class="rb-pop-x" data-pop-close aria-label="${T.popClose}" title="${T.popClose}">×</button>
      <b id="rbPopT">${T.popT}</b><p id="rbPopP">${T.popP}</p>
      <button type="button" class="btn btn-primary" id="rbPopCta">${T.popCta}</button>
    </div>`;
  document.body.appendChild(w);
  const done = () => { try { localStorage.setItem(POP_KEY, "1"); } catch (_) {} w.remove(); document.removeEventListener("keydown", key, true); };
  const close = () => { done(); if (prev && prev.focus) prev.focus(); };
  const key = e => {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") {                                // focus trap: close button <-> CTA
      const f = [...w.querySelectorAll("button")]; const i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  };
  document.addEventListener("keydown", key, true);
  w.addEventListener("click", e => { if (e.target.closest("[data-pop-close]")) close(); });
  $("rbPopCta").addEventListener("click", () => {
    done();
    if (window.__lab && window.__lab.go) window.__lab.go("mint"); else location.hash = "#mint";
    const b = $("rbStripBtn");
    if (b && b.getAttribute("aria-expanded") !== "true") b.click();
    setTimeout(() => { const st = $("rbStrip"); if (st) st.scrollIntoView({ block: "start", behavior: "smooth" }); if (b) b.focus(); }, 80);
  });
  $("rbPopCta").focus();
}

({ strip: mountStrip, card: mountCard, link: mountLink })[LAYOUT]();
// drawer layouts build their panel lazily; make sure the form exists before wiring
if (!$("rbForm")) { drawer(); }
wire(); applyOpen();
if (Q.get("rebate_closed") !== "1") {
  fetch(API + "/info", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => {
    if (j && typeof j.open === "boolean") { INFO = j; applyOpen(); if (j.open) setTimeout(popup, 600); }
  }).catch(() => {});
} else applyOpen();
})();
