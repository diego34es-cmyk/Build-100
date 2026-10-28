// 应用外壳：首屏卡牌扇、最近产出跑马灯、奖励基金公告条、底部实时状态条（只读取 app.js 已渲染的数据）
(() => {
const $ = id => document.getElementById(id);
const lab = window.__lab; if (!lab) return;
const EL = window.LAB_DATA.elements;
const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const SUBF = s => s.replace(/(?<=[A-Za-z)])(\d+)/g, "<sub>$1</sub>");
const UI_EN = () => (document.documentElement.lang || "").startsWith("en");
const nameHTML = id => { const e = EL[id]; if (!e) return "#" + id; const sym = id > 1000 ? SUBF(e.sym) : e.sym; const n = e.zh && e.zh !== e.sym ? String(e.zh) : ""; if (UI_EN() && /[\u3400-\u9fff]/.test(n)) return sym; return n ? `${n} ${sym}` : sym; };

// ---- 首屏卡牌扇：点一张翻转换新 ----
const POOL = [79, 1001, 118, 26, 1010, 8, 1007, 112, 1, 1016, 92, 1018, 29, 1009, 6, 1003, 114, 47, 1019, 80];
const art = $("heroArt");
let shown = [79, 1001, 118];
function paintHero() {
  art.innerHTML = shown.map((id, i) => `<div class="hc hc${i}" data-i="${i}"><div class="hc-f"><div class="hc-in">${lab.card(id, { cls: "hero-card" })}</div></div></div>`).join("");
}
paintHero();
art.addEventListener("click", e => {
  e.stopPropagation();
  const hc = e.target.closest(".hc"); if (!hc || hc.classList.contains("spin")) return;
  const i = Number(hc.dataset.i), pool = POOL.filter(id => !shown.includes(id));
  const next = pool[Math.floor(Math.random() * pool.length)];
  const swap = () => { shown[i] = next; hc.querySelector(".hc-in").innerHTML = lab.card(next, { cls: "hero-card" }); };
  if (RM()) return swap();
  hc.classList.add("spin"); setTimeout(swap, 330);
  hc.querySelector(".hc-in").addEventListener("animationend", () => hc.classList.remove("spin"), { once: true });
});
const focusSearch = () => { const i = $("viewInput"); i.focus(); i.select(); if (innerWidth < 900) scrollTo({ top: 0, behavior: "smooth" }); };
$("btnFocusSearch").onclick = focusSearch;
document.querySelectorAll("[data-focus-search]").forEach(b => b.onclick = focusSearch);

// ---- 最近产出跑马灯 ----
const KIND = { free: "免费首铸", paid: "铸造", syn: "合成" };
const OUTS = Object.keys(EL).map(Number).filter(id => id > 1000).concat(Array.from({ length: 24 }, (_, i) => 95 + i));
let reelKey = "";
function paintReel() {
  const ev = (lab.feed() || []).filter(e => KIND[e.k] && (e.id || e.out || e.rid != null)).slice(0, 16);
  const items = ev.map(e => ({ id: e.k === "syn" ? (lab.state().recipes[e.rid]?.out ?? e.out) : e.id, tag: KIND[e.k] })).filter(x => x.id);
  const first = lab.wall()?.first || {};
  for (const id of OUTS) { if (items.length >= 14) break; if (!items.some(x => x.id === id)) items.push({ id, tag: first[id] ? "已发现" : "待发现" }); }
  const key = items.map(x => x.id + x.tag).join(",");
  if (key === reelKey) return; reelKey = key;
  const one = items.map(x => `<figure class="rc-item">${lab.card(x.id)}<figcaption><b>${nameHTML(x.id)}</b><small>${x.tag}</small></figcaption></figure>`).join("");
  const tr = $("reelTrack");
  tr.innerHTML = one + one.replace(/<figure class="rc-item">/g, '<figure class="rc-item" aria-hidden="true">');
  tr.style.setProperty("--reel-dur", items.length * 4 + "s");
}

// ---- 公告条 / 状态条 / 侧栏标题：同步 app.js 已写入的数字 ----
const txt = id => ($(id)?.textContent || "").trim();
function sync() {
  const base = Number(txt("sBase").replace(/,/g, "")) || 0;
  $("sBaseBar").style.width = Math.min(100, base / 88888 * 100).toFixed(2) + "%";
  $("lbBase").textContent = txt("sBase"); $("lbRate").textContent = txt("sRate");
  $("lbNet").textContent = (txt("netLabel").split("·")[1] || "BNB Chain").trim();
  const p1 = txt("pz1"), st = txt("pz1s");
  if (p1 && p1 !== "-") $("pbText").innerHTML = `阶段一奖励基金已入池 <b>${p1}</b> BNB · ${st.replace(/·\s*截止.*$/, "").trim() || "46 个配方等你的 AI 来发现"}`;
  const vb = document.querySelector("#viewBar b");
  $("meTitle").textContent = vb ? `${vb.textContent} 的实验室` : "TA 的实验室";
  paintReel();
}
const reel = document.querySelector(".reel");
new IntersectionObserver(([en]) => reel.classList.toggle("paused", !en.isIntersecting)).observe(reel);
const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(sync, 120); });
for (const id of ["sBase", "sRate", "pz1", "pz1s", "viewBar", "feed", "wallStat", "netLabel"]) if ($(id)) mo.observe($(id), { childList: true, subtree: true, characterData: true });
sync();

$("prizeBar").addEventListener("click", e => {
  e.preventDefault(); e.stopPropagation();
  lab.go("home"); requestAnimationFrame(() => $("secPrize").scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" }));
});
})();
