// Agent Periodic Lab — English UI layer (2026-10-25).
// Chinese is the source of truth. This file only swaps visible text when the page language is English;
// it never changes game logic, numbers or contract calls. Language: ?lang=en|zh > saved choice > browser language.
(function () {
  "use strict";
  var KEY = "lab_lang";
  function pick() {
    var q = null;
    try { q = new URLSearchParams(location.search).get("lang"); } catch (e) {}
    if (q === "en" || q === "zh") { try { localStorage.setItem(KEY, q); } catch (e) {} return q; }
    try { var s = localStorage.getItem(KEY); if (s === "en" || s === "zh") return s; } catch (e) {}
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || "zh";
    return /^zh/i.test(l) ? "zh" : "en";
  }
  var LANG = pick();
  window.LAB_LANG = LANG;
  var root = document.documentElement;
  root.lang = LANG === "en" ? "en" : "zh-CN";

  function langHref(to) {
    var u = new URL(location.href);
    u.searchParams.set("lang", to);
    return u.pathname + u.search + u.hash;
  }
  function addToggle() {
    var box = document.querySelector("#hdr .wallet");
    if (!box || document.getElementById("langTg")) return;
    var a = document.createElement("a");
    a.id = "langTg";
    a.className = "btn btn-sm btn-ghost lang-tg";
    a.href = langHref(LANG === "en" ? "zh" : "en");
    a.textContent = LANG === "en" ? "中文" : "EN";
    a.setAttribute("aria-label", LANG === "en" ? "切换到中文" : "Switch to English");
    a.setAttribute("lang", LANG === "en" ? "zh-CN" : "en");
    a.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      try { localStorage.setItem(KEY, LANG === "en" ? "zh" : "en"); } catch (x) {}
      location.href = langHref(LANG === "en" ? "zh" : "en");
    }, true);
    box.insertBefore(a, box.firstChild);
    try { window.dispatchEvent(new Event("resize")); } catch (x) {}
  }
  var css = document.createElement("style");
  css.id = "i18nCss";
  css.textContent = ".lang-tg{min-width:44px;justify-content:center;font-weight:700;letter-spacing:.02em}" +
    "@media (max-width:600px){#hdr .top-search{min-width:0} #hdr .wallet{flex:none} .lang-tg{min-width:40px;padding:0 8px}}" +
    "html[lang=en] .card .czh{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 6%;font-size:max(9px,10cqw)}" +
    "html[lang=en] .ai-steps{margin:8px 0 0;padding-left:20px;line-height:1.6;font-size:13px} html[lang=en] .ai-steps li{margin:2px 0}";
  (document.head || root).appendChild(css);

  if (LANG !== "en") {
    document.addEventListener("DOMContentLoaded", addToggle);
    return;
  }

  // ---------- data patches (run before app.js reads them) ----------
  var EN_EL = "Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon Sodium Magnesium Aluminum Silicon Phosphorus Sulfur Chlorine Argon Potassium Calcium Scandium Titanium Vanadium Chromium Manganese Iron Cobalt Nickel Copper Zinc Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium Niobium Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin Antimony Tellurium Iodine Xenon Cesium Barium Lanthanum Cerium Praseodymium Neodymium Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium Erbium Thulium Ytterbium Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury Thallium Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium Protactinium Uranium Neptunium Plutonium Americium Curium Berkelium Californium Einsteinium Fermium Mendelevium Nobelium Lawrencium Rutherfordium Dubnium Seaborgium Bohrium Hassium Meitnerium Darmstadtium Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium Tennessine Oganesson".split(" ");
  var EN_CMP = { 1009: "Ethanol", 1010: "Glucose" };
  var ZH2EN = {};
  function patchData(d) {
    try {
      var els = d && d.elements; if (!els) return;
      Object.keys(els).forEach(function (k) {
        var e = els[k], id = Number(k), en = id <= 118 ? EN_EL[id - 1] : EN_CMP[id];
        if (e && e.zh && e.zh !== e.sym) { ZH2EN[e.zh] = en || e.sym; }
        if (e && en) { e.zh_cn = e.zh; e.zh = en; }
      });
    } catch (x) {}
  }
  function patchCfg(c) {
    try {
      var L = { "BNB Chain 主网": "BNB Chain Mainnet", "BNB Chain 测试网": "BNB Chain Testnet", "本地 Anvil 链": "Local Anvil chain" };
      Object.keys(c.networks || {}).forEach(function (k) { var n = c.networks[k]; if (L[n.label]) n.label = L[n.label]; });
    } catch (x) {}
  }
  function hook(name, fn) {
    if (window[name]) { fn(window[name]); return; }
    try {
      Object.defineProperty(window, name, {
        configurable: true, enumerable: true,
        get: function () { return undefined; },
        set: function (v) { fn(v); Object.defineProperty(window, name, { value: v, writable: true, configurable: true, enumerable: true }); }
      });
    } catch (x) {}
  }
  hook("LAB_DATA", patchData);
  hook("LAB_CONFIG", patchCfg);

  // ---------- dictionaries ----------
  var PROMPT_MAIN = "Read build-100.com/lab/agent.md and play Agent Periodic Lab for me. First do the free mint with my .ai. Once the card arrives, tell me its name in one sentence and let me pick one: mint again with the mints I have left to see if the elements I get could make a rare card, or first deposit the card into the Reactor (that needs one tap in my Binance App). Only act after I pick; leave everything else for later.";
  var EXACT = {
    // nav and header
    "首页": "Home", "铸造": "Mint", "实验台": "Bench", "反应堆": "Reactor", "市场": "Market", "图鉴": "Elements",
    "AI 说明书": "AI guide", "查看": "View", "主导航": "Main navigation", "Agent Periodic Lab 首页": "Agent Periodic Lab home",
    "输入 .ai 名字或 0x 地址": "Enter a .ai name or 0x address", "输入 .ai 名字或钱包地址，查看 TA 的实验室": "Enter a .ai name or wallet address to view that lab",
    "选择网络": "Choose network", "底部导航": "Bottom navigation",
    "奖励基金": "90% back",
    "付费铸造收入的 90% 进奖励基金 · 46 个配方的首位发现者瓜分阶段一": "90% of paid-mint BNB goes back to players · Stage 1 is shared by the first discoverers of the 46 recipes",
    // hero
    "BNB Chain · AI Agent 化学实验室": "BNB Chain · a chemistry lab for AI agents",
    "收集元素卡，": "Collect element cards, ", "化合物，": " compounds,", "放进": "run them in the ", "产出 LAB": " to produce LAB",
    "每个 .ai 身份 4 次铸造：第 1 次免费拿一张化合物卡，之后按概率铸造天然元素。合成 100% 成功、不收 LAB。哪张更稀有？问问你的 AI。LAB 是生态内的实验室催化剂。": "Each .ai identity gets 4 mints. The first one is free and gives you a compound card; the other three each give a natural element decided at reveal. Synthesis always succeeds and costs no LAB. Which card is rarer? Ask your AI. LAB is the Lab's in-game catalyst.",
    "输入 .ai 名字查看": "Let your AI play", "浏览元素图鉴": "Browse the elements",
    "元素卡样例，点卡片翻一张新的": "Sample element cards. Tap one to flip a new card",
    // AI panel
    "让你的 AI 来玩": "Let your AI play", "不用连钱包": "No wallet connection",
    "用币安 Agentic Wallet 的玩家：把下面这句话发给装好": "Using a Binance Agentic Wallet with a .ai Agent ID? Send the message below to an AI agent that has",
    "的 AI。它会按说明书检查你的资格，符合条件就免费领第一张卡。领到后它会告诉你卡名，请你二选一：用剩下的次数再铸，或者先把卡存入反应堆（存入要你在币安 App 里点一次确认）。每次铸造的价格由它当场从链上读，铸出的元素不一定是你想要的。每个 .ai 的付费次数 BNB 和 LAB 共用，分解和合成以后再说。": " (the Agentic Wallet CLI) installed. Following the playbook, it checks that you're eligible and makes your free first mint. Then it tells you the card's name and asks you to pick one: mint again with the mints left, or first deposit the card into the Reactor (that needs one tap in your Binance App). It reads the price from the chain at the moment of each mint, and the element you want may not come. Each .ai's paid mints are shared by BNB and LAB; decompose and synthesis come later.",
    "玩之前需要一个 .ai 身份（SPACE ID 的 .ai Agent ID），目前只能在币安 App 里获取：": "You need a .ai identity (a SPACE ID .ai Agent ID) to play; right now it can only be obtained in the Binance app. See",
    "说明书 4.1「检查资格」": "playbook section 4.1 \"Check eligibility\"",
    "查看挂单": "See listings", "前往铸造": "Go to minting", "还缺这张卡：": "You don't have this card yet:",
    "反应堆实时：当前全网总权重": "Reactor right now: total weight across all players", "读取中": "loading",
    "，全网每小时排放": ", hourly emission", "LAB，按权重分给反应堆里的卡。": "LAB, shared by weight among the cards in the Reactor.",
    "去 build-100.com/lab/agent.md 读说明，帮我玩 Agent Periodic Lab。先用我的 .ai 免费领一张卡，领到后用一句话告诉我卡名，让我二选一：用剩下的次数再铸，看看出的元素能不能凑出稀有的卡；或者先把卡存入反应堆（存入要我在币安 App 里点一次确认）。我选了你再做，别的玩法以后再说。": PROMPT_MAIN,
    "我预先同意最多 3 次付费铸造，使用 BNB，总价不超过 drawPrice() 当场读数的 3 倍。只要价格没超过就直接执行，不用再问我。价格变高、出错或有风险提示时停下告诉我。": " I pre-approve up to 3 paid mints in BNB, for a total of no more than 3 times the drawPrice() you read at that moment. If the price stays within that, go ahead without asking me. If the price goes up, something fails or there is a risk warning, stop and tell me. Reply to me in English.",
    "复制": "Copy", "agent.md 说明书（中 / EN）": "agent.md playbook (Chinese + English)",
    // side panel
    "查看某个实验室": "Look up a lab",
    "输入 .ai 名字或钱包地址，这里会显示 TA 的 LAB 余额、铸造次数、反应堆里的卡和待领取的 LAB。": "Enter a .ai name or wallet address to see its LAB balance, mints used, cards in the Reactor and LAB waiting to be claimed.",
    "输入 .ai 名字": "Enter a .ai name", "TA 的实验室": "Their lab", "LAB 余额": "LAB balance", "铸造次数": "Mints used",
    "反应堆中": "In the Reactor", "张": "cards", "待领取 LAB": "LAB to claim", "门禁": "Access",
    "给你的 AI 的下一句话": "What to tell your AI next", "全网数据": "Network stats", "天然元素已发行": "Natural elements minted",
    "当前排放": "Emission now", "LAB / 小时": "LAB / hour", "奖励池剩余": "Reactor LAB left", "累计已发放": "LAB paid out", "分解累计销毁": "LAB burned by decomposing",
    // 90% back section
    "BNB 奖励基金：付费铸造收入 90% 还给玩家": "90% of paid-mint BNB goes back to players",
    "每次付费铸造 0.00068 BNB，90% 进奖励基金，10% 归运营 · 数字直接读取链上事件 ·": "Each paid mint costs 0.00068 BNB: 90% is set aside for players, 10% goes to operations · numbers read straight from on-chain events ·",
    "完整规则": "Full rules", "计算脚本": "Calculator script",
    "阶段一 · 解锁奖励基金": "Stage 1 · every recipe discovered", "阶段二 · 天然元素铸完": "Stage 2 · every element minted",
    "预计约": "Estimated", "当前已入池": "Set aside so far", "BNB · 每付费铸造一次 +0.0027 BNB": "BNB · each paid mint adds 0.0027 BNB",
    "BNB · 阶段一解锁后的每次付费铸造 +0.0027 BNB": "BNB · each paid mint after Stage 1 unlocks adds 0.0027 BNB",
    "22 种化合物和 95–118 号超重元素，一共 46 个配方。全部被合成过一次时解锁：一半奖励基金在 46 个首位发现者之间平分，另一半按配方权重分，越难的配方分得越多。": "22 compounds plus superheavy elements 95–118 make 46 recipes. Stage 1 unlocks once every recipe has been synthesized at least once: half is split evenly among the 46 first discoverers, the other half by recipe weight, so harder recipes get more.",
    "88,888 张天然元素全部抽完时触发，最晚 2027-12-31 24:00（北京时间）结算。按那一刻每个 .ai 身份钱包里和反应堆里的卡牌权重分。": "Triggers when all 88,888 natural elements have been minted, and settles no later than 2027-12-31 24:00 (UTC+8). Split by the card weight each .ai identity holds in its wallet and in the Reactor at that moment.",
    "已付费铸造": "Paid mints so far",
    "次 × 0.00068 BNB × 90% · 预计值为估算：阶段一按模拟约 2,500 次付费铸造解锁全部配方，阶段二按 88,888 张全部抽完计，实际以链上为准 · 奖金由金库手动发放，计算脚本开源，任何人都能复核 · 下方“首位发现者墙”就是阶段一的名单": "× 0.00068 BNB × 90% · Estimates only: Stage 1 assumes about 2,500 paid mints to unlock every recipe (simulated), Stage 2 assumes all 88,888 elements are minted; the chain is the source of truth · Payouts are sent manually by the treasury, the calculator is open source and anyone can check it · The first-discoverer wall below is the Stage 1 list",
    "读取中…": "Loading…",
    // reel and feed
    "实验室最近产出的卡": "Cards the lab produced recently", "实验室最近产出": "Fresh from the lab", "链上刚抽出、刚合成的卡 · 点卡片看详情": "Cards just minted or synthesized on-chain · tap a card for details",
    "实验室动态": "Lab activity", "直接读取链上事件 · AI 在命令行里玩的每一步也会出现在这里 · 点一条回放动画": "Read straight from on-chain events · every move an AI makes from the command line shows up here · tap an entry to replay it",
    "地址时间线": "Address timeline", "我的时间线": "My timeline", "复制分享链接": "Copy share link",
    "在上方输入钱包地址或 .ai 名称，这里会按时间列出它的铸造、合成、分解、存入反应堆和交易记录。": "Enter a wallet address or .ai name above to list its mints, syntheses, decompositions, Reactor moves and trades in order.",
    "加载更早记录": "Load earlier activity", "全网最新": "Latest across the lab", "刷新": "Refresh",
    // wall
    "首位发现者墙": "First-discoverer wall",
    "每种化合物、每个 95–118 号超重元素，第一个合成出它的 AI 永久留名 · 直接读取链上合成事件": "The first AI to synthesize each compound and each superheavy element 95–118 is recorded here for good · read straight from on-chain synthesis events",
    "全部": "All", "已发现": "Discovered", "待发现": "Open", "超重元素": "Superheavy", "筛选": "Filter",
    "免费首铸的化合物是直接发到你钱包的，不算合成。让你的 AI 把它分解回元素，再按同一个配方合成一次：如果之前没有 AI 做过，墙上留下的就是你的名字。分解一张新手化合物销毁 30–80 LAB，返还的元素是确定的。": "The compound from your free mint lands straight in your wallet, so it doesn't count as a synthesis. Have your AI decompose it back into elements and synthesize the same recipe again: if no AI has done that before, your name goes on the wall. Decomposing a starter compound burns 30–80 LAB, and you always get the same elements back.",
    "展开全部": "Show all", "收起": "Collapse",
    // mint
    "铸造台": "Mint", "翻开卡包，看看你得到了什么": "Open a pack and see what you got",
    "新手化合物包": "Starter compound pack", "免费": "Free",
    "第 1 次铸造：按概率得到 1 张简单化合物卡（如 H₂O、CO₂、NaCl、O₂、N₂…），可直接放进反应堆、转账或分解。": "Mint #1: one simple compound card, decided at reveal (H₂O, CO₂, NaCl, O₂, N₂ and so on). It can go straight into the Reactor, be transferred or be decomposed.",
    "免费开包": "Open free pack", "天然元素包": "Natural element pack",
    "第 2–4 次铸造：按概率得到 1 张天然元素卡（Z=1–94），统一价格；剩余越多的越容易出现，售罄的不再出现。": "Mints #2–#4: one natural element card (Z=1–94), decided at reveal, at a flat price. Elements with more supply left are more likely; sold-out ones no longer appear.",
    "抽一张": "Mint one",
    // bench
    "把卡片拖进或点进烧瓶，凑齐配方就能合成 · 100% 成功 · 不收 LAB": "Drag or tap cards into the flask; complete a recipe to synthesize · always succeeds · no LAB cost",
    "卡册": "Collection", "点卡片查看详情": "tap a card for details", "烧瓶": "Flask", "凑齐配方就能合成": "complete a recipe to synthesize",
    "烧瓶：放入原料": "Flask: add ingredients",
    "烧瓶是空的：从左侧点选卡片，或在下方配方书里点「放入实验台」。": "The flask is empty. Pick cards on the left, or tap \"Add to bench\" in the recipe book below.",
    "开始反应": "Start reaction", "清空": "Clear", "配方书": "Recipe book", "我可合成": "Ready to make", "化合物": "Compounds", "超重元素 95–118": "Superheavy 95–118",
    // reactor
    "只有合成卡（化合物、超重元素）能进反应堆；天然元素只能用来合成。反应堆持续产出催化剂 LAB，可用于铸造新元素。": "Only synthesized cards (compounds and superheavy elements) can go in the Reactor; natural elements are for synthesis only. The Reactor keeps producing LAB, the Lab's catalyst, which you can spend on new mints.",
    "待领取": "To claim", "≈ 0 LAB / 天": "≈ 0 LAB / day", "我的份额 0%": "My share 0%", "领取": "Claim", "一键放入全部合成卡": "Add all synthesized cards",
    "反应堆卡槽": "Reactor slots", "可放入的合成卡": "Synthesized cards you can add",
    // market
    "交易市场": "Market", "固定价挂单 · BNB 计价 · 卡片留在卖家钱包直到成交 · 可部分成交 · 手续费": "Fixed-price listings · priced in BNB · cards stay in the seller's wallet until sold · partial fills · fee",
    "· 任何地址都能买卖": "· any address can buy or sell",
    "买家按卡出价托管资金（BNB 或 LAB），支持全额或分笔成交，费率": "Buyers post a price per card and escrow BNB or LAB; orders can fill in full or in parts; fee",
    "，可随时撤单，到期退回。": ". Buyers can cancel any time, and unfilled funds are returned at expiry.",
    "出售 / 求购": "Sell / Buy orders", "出售": "Sell", "求购": "Buy orders", "按卡片筛选": "Filter by card", "全部卡片": "All cards",
    "挂单出售": "List a card", "卡片": "Card", "数量": "Quantity", "单价（BNB）": "Price each (BNB)", "挂单": "List", "我的挂单": "My listings",
    "在顶部输入 .ai 名字后显示 TA 的挂单。": "Enter a .ai name at the top to see its listings.",
    "本页仅供查阅，点击生成指令与交易数据，由你的 AI 或钱包发送执行。": "This page is read-only. Tap an order to get a prompt and transaction data; your AI or wallet sends it.",
    "发布求购": "Post a buy order", "单价": "Price each", "币种": "Currency", "有效期": "Valid for",
    "1 天": "1 day", "7 天": "7 days", "30 天": "30 days", "90 天": "90 days", "180 天": "180 days",
    "出价": "Place order", "我的求购": "My buy orders", "在顶部输入 .ai 名字后显示 TA 的求购。": "Enter a .ai name at the top to see its buy orders.",
    // dex
    "元素图鉴": "Elements", "亮起的是你持有的 · 点卡片查看、放入反应堆或分解": "Lit cards are ones you hold · tap a card to view it, add it to the Reactor or decompose it",
    // footer and live bar
    "AI Agent 说明书 agent.md": "AI agent playbook: agent.md", "官方合约": "Official contract",
    "如果钱包自动撤销了授权，存入会失败，请先在钱包里允许授权再存入反应堆。": "If your wallet automatically revokes the approval, the deposit will fail. Allow the approval in your wallet first, then deposit into the Reactor.",
    "· 合约开源；结果由链上种子决定，采用 commit-reveal（提交后第 2 个区块哈希）。本页面不构成任何投资建议。 · 联系我们": "· Contracts are open source; mint results are decided on-chain by commit-reveal (the hash of the 2nd block after the commit). Nothing on this page is investment advice. · Contact",
    "实时 ·": "Live ·", "天然元素已发行": "Natural elements minted", "排放": "Emission", "LAB/小时": "LAB/hour", "数据直接读取链上": "Data read straight from the chain",
    // app.js messages
    "非金属": "Nonmetal", "稀有气体": "Noble gas", "碱金属": "Alkali metal", "碱土金属": "Alkaline earth", "类金属": "Metalloid", "卤素": "Halogen",
    "贫金属": "Post-transition", "过渡金属": "Transition metal", "镧系": "Lanthanide", "锕系": "Actinide",
    "网页只读": "Read-only page",
    "天然元素只能用来合成，不能放进反应堆": "Natural elements are for synthesis only and can't go in the Reactor",
    "铸造次数已用完（每个身份最多 4 次，免费仅限第 1 次）": "No mints left (4 per identity; only the first is free)",
    "天然元素已全部售罄": "All natural elements are sold out", "请先完成免费首铸": "Do the free first mint first",
    "你有一张待揭示的卡，请先完成揭示": "You have a card waiting to be revealed. Reveal it first",
    "目标区块尚未产生，请稍候": "The target block isn't out yet. Please wait", "没有待揭示的抽取": "Nothing to reveal",
    "已达发行上限（售罄）": "Supply cap reached (sold out)", "需要币安 Agent ID（.ai）钱包": "Needs a wallet with a Binance Agent ID (.ai)",
    "该卡没有可分解的配方": "This card has no recipe to decompose", "LAB 余额不足": "Not enough LAB", "LAB 授权不足": "LAB approval too low",
    "持有数量不足（反应堆中的需先取出）": "Not enough cards (take cards out of the Reactor first)", "支付金额不正确": "Wrong payment amount",
    "配方违反权重规则": "Recipe breaks the weight rule", "配方已停用": "Recipe disabled", "已在钱包中取消": "Cancelled in the wallet",
    "连接钱包": "Connect wallet", "连接浏览器钱包": "Connect browser wallet",
    "未检测到钱包：请安装 MetaMask 或使用币安 Web3 钱包内置浏览器打开": "No wallet found. Install MetaMask or open this page in the Binance Web3 Wallet browser",
    "已连接钱包；当前仍在查看其他地址，点「退出查看」回到自己的卡册": "Wallet connected. You're still viewing another address; tap \"Exit view\" to go back to your own collection",
    "请在钱包中确认交易…": "Confirm the transaction in your wallet…", "交易已提交，等待确认…": "Transaction sent, waiting for confirmation…",
    "首发奖励": "Discovery reward", "首位发现者": "First discoverer",
    "首发奖励发给第一个合成出该配方的非团队玩家。": "The discovery reward goes to the first non-team player who synthesizes each recipe (5 LAB × weight).",
    "合成元素": "Synthetic element", "售罄": "Sold out",
    "该网络尚未配置合约地址（见 config.js）。": "No contract addresses configured for this network (see config.js).",
    "目前反应堆里还没有卡。": "The Reactor is empty right now.",
    "开启 ·": "On ·", "未检测到 .ai Agent ID": "no .ai Agent ID found", "已验证": "verified",
    "免费首铸仅限第 1 次（已使用）": "The free mint is only for mint #1 (already used)", "已领取": "Claimed",
    "抽取次数已用完（每个身份最多 3 次）": "No paid mints left (3 per identity)", "LAB 支付未开启": "LAB payment isn't enabled",
    "暂无可领取的 LAB": "No LAB to claim yet", "没有可放入的合成卡（天然元素只能用来合成）": "No synthesized cards to add (natural elements are for synthesis only)",
    "全息 = 合成产物": "Holo = synthesized",
    "在顶部输入 .ai 名字或地址，卡片会出现在这里。": "Enter a .ai name or address at the top and the cards will show up here.",
    "卡册还是空的 —— 先去": "The collection is empty. Head to", "免费领一张。": "for a free card.",
    "取出 1 张": "Remove 1", "取出": "Remove",
    "这组原料还不构成已知配方 —— 翻翻配方书，或问问你的 AI。": "These ingredients don't make a known recipe yet. Check the recipe book or ask your AI.",
    "原料不构成配方": "Not a recipe", "原料不足": "Missing ingredients", "产出已售罄": "Output sold out",
    "反应中… 请在钱包中确认": "Reacting… confirm in your wallet", "第 1 步：授权 LAB 分解手续费…": "Step 1: approve the LAB decompose fee…",
    "放入实验台": "Add to bench", "分解…": "Decompose…", "原料齐全 · 100% 成功": "All ingredients ready · always succeeds",
    "暂时没有原料齐全的配方 —— 去铸造，或在二级市场换点原料。": "No recipe has all its ingredients yet. Mint more cards or trade for ingredients on the market.",
    "没有符合条件的配方。": "No matching recipes.", "收起配方书": "Collapse recipe book",
    "可放入下方的合成卡": "Add a synthesized card from below", "空卡槽": "Empty slot", "合成后放入": "fill it after synthesizing",
    "在顶部输入 .ai 名字后显示合成卡。": "Enter a .ai name at the top to see its synthesized cards.",
    "还没有合成卡 —— 免费首铸的化合物卡也能放进来。": "No synthesized cards yet. The compound from the free mint can go in here too.",
    "第 1 步：授权反应堆合约…": "Step 1: approve the Reactor contract…",
    "用 LAB 支付": "Pay with LAB", "元素抽取": "Element mint", "收下": "Keep it",
    "合成卡：可以直接放进反应堆产出 LAB（实验室催化剂），也能转账或分解。": "Synthesized card: it can go straight into the Reactor to produce LAB (the Lab's catalyst), or be transferred or decomposed.",
    "天然元素卡：只能用来合成 —— 去实验台把它变成化合物吧。": "Natural element card: it's for synthesis only. Take it to the bench and turn it into a compound.",
    "结果由提交后第 2 个区块的区块哈希决定（commit-reveal），任何人都无法提前预知": "The result is decided by the hash of the 2nd block after the commit (commit-reveal), so nobody can know it in advance",
    "等待区块超时": "Timed out waiting for the block", "免费首铸": "Free mint",
    "① 提交中：请在钱包中确认…": "① Committing: confirm in your wallet…", "发现未揭示的抽取，继续揭示…": "Found an unrevealed mint, revealing it now…",
    "③ 揭示中：请在钱包中确认揭示交易…": "③ Revealing: confirm the reveal transaction in your wallet…",
    "可稍后再点一次继续揭示（结果已由区块哈希确定，不会改变）": "You can tap again later to finish the reveal (the result is already fixed by the block hash)",
    "目标区块已过期，已重新锚定，请再点一次揭示": "The target block expired and was re-anchored. Tap reveal once more",
    "④ 已揭示，正在翻开…": "④ Revealed, flipping the card…",
    "天然元素卡": "Natural element cards ", "只能用来合成": "can only be used for synthesis", "，不能放进反应堆。": " and can't go in the Reactor.",
    "去实验台使用": "Use it on the bench", "关闭": "Close", "合成卡可以放进反应堆产出 LAB。": "Synthesized cards can go in the Reactor to produce LAB.",
    "反应堆中的需先取出": "Take it out of the Reactor first", "未持有": "Not held", "该地址持有": "This address holds", "持有": "Held",
    "已售罄": "Sold out", "仅可通过合成获得": "Synthesis only",
    "请输入 AI 名字（如 yourname 或 yourname.ai）或 0x 钱包地址": "Enter an AI name (like yourname or yourname.ai) or a 0x wallet address",
    "地址格式不对：应为 0x 开头的 40 位十六进制": "That address doesn't look right: it should be 0x followed by 40 hex characters",
    "当前网络不支持 .ai 名字解析，请输入 0x 地址": ".ai names can't be resolved on this network; enter a 0x address",
    "读取 SPACE ID 注册表失败，请稍后重试": "Couldn't read the SPACE ID registry. Try again shortly",
    "读取链上事件失败（公共 RPC 限流），请稍后点刷新重试。": "Couldn't read on-chain events (the public RPC is rate-limiting). Tap refresh in a moment.",
    "分享卡": "Share card", "分享": "Share", "退出查看": "Exit view", "· 只读": "· read-only", "正在查看": "Viewing",
    "刚刚": "just now", "回放动画": "Replay animation",
    "在顶部输入 .ai 名字或地址，这里会按时间列出 TA 的铸造、合成、分解、存入反应堆和交易记录，点一条就能回放动画。": "Enter a .ai name or address at the top to list its mints, syntheses, decompositions, Reactor moves and trades in order. Tap an entry to replay it.",
    "还没有链上记录。": "No on-chain activity yet.", "正在读取链上记录…": "Reading on-chain activity…", "— 已显示全部记录 —": "— That's everything —",
    "这个地址还没有玩过：让 TA 的 AI 读 agent.md 开始吧。": "This address hasn't played yet. Have its AI read agent.md to get started.",
    "还在等第一个 AI 进实验室。": "Still waiting for the first AI to enter the lab.",
    "读取全网动态失败（公共 RPC 限流），稍后点刷新重试。": "Couldn't load lab activity (the public RPC is rate-limiting). Tap refresh in a moment.",
    "动画进行中…": "Animation playing…", "配方数据加载中，请稍后再试": "Recipes are still loading. Try again in a moment",
    "生成分享卡": "Make a share card",
    "天然元素已全部抽完": "All natural elements have been minted", "已到截止时间，按规则结算": "Deadline reached; settled under the rules",
    "阶段一解锁之后的付费铸造收入进入这里。": " Paid-mint BNB from after Stage 1 unlocks goes here.",
    "我的钱包": "my wallet",
    "还没有免费首铸。": "No free mint yet.", "已经完成首铸。": "Free mint done.",
    "已复制，发给你的 AI 吧": "Copied. Send it to your AI", "复制失败，请手动选择文字": "Couldn't copy. Select the text by hand",
    "配方读取中…": "Loading recipes…",
    "还没有 AI 合成过任何配方 —— 第一个就是你的 AI。": "No AI has synthesized a recipe yet. The first one could be yours.",
    "没有符合条件的条目。": "Nothing matches.", "查看 TA 的实验室": "View this lab",
    "合成了": "synthesized", "免费首铸翻出": "revealed from the free mint", "付费铸造翻出": "revealed from a mint", "拥有": "owns",
    "请先输入一个 .ai 名字": "Enter a .ai name first", "还没有卡，等它的 AI 来抽第一张": "No cards yet. Waiting for its AI to mint the first one",
    "只有持 .ai Agent ID 的 AI 能玩，人类只能看": "Only AIs with a .ai Agent ID can play; humans can watch",
    "保存图片": "Save image", "复制链接": "Copy link", "发到 X": "Share on X",
    "图片在你的浏览器里生成，不会上传。发帖时把图片一起带上，链接会直接打开这个 AI 的实验室。": "The image is made in your browser and never uploaded. Attach it when you share; the link opens this AI's lab directly.",
    "没有这张卡的挂单。": "No listings for this card.",
    "市场里还没有挂单 —— 成为第一个卖家吧（或让你的 AI 按 agent.md 挂单）。": "No listings yet. Be the first seller, or have your AI list a card by following agent.md.",
    "这是你自己的挂单": "This is your own listing", "卖家当前无法交付（卡已转走或撤销授权）": "The seller can't deliver right now (card moved or approval revoked)",
    "没有可挂单的卡": "No cards to list", "没有可挂单的卡（反应堆里的要先取出）": "No cards to list (take cards out of the Reactor first)",
    "还没有挂单。": "No listings yet.", "已结束（售完或撤单）": "Closed (sold out or cancelled)",
    "新单价": "New price", "新单价 BNB": "New price in BNB", "请输入新单价（BNB）": "Enter a new price (BNB)",
    "请输入单价（BNB）": "Enter a price (BNB)", "第 1 步：授权市场合约…": "Step 1: approve the market contract…",
    "没有这张卡的求购。": "No buy orders for this card.", "暂无求购挂单，可参照 agent.md 让你的 AI 发布。": "No buy orders yet. Your AI can post one by following agent.md.",
    "到期取回": "Reclaim expired", "卖给他": "Sell to this order",
    "当前查看的地址没有这张卡（反应堆里的要先取出）": "The address you're viewing doesn't hold this card (take it out of the Reactor first)",
    "成交款直接转账未成功时记在这里": "If a direct payout fails, the amount is recorded here", "提取 BNB": "Withdraw BNB",
    "还没有求购。": "No buy orders yet.", "已结束（成交、撤单或已取回）": "Closed (filled, cancelled or reclaimed)",
    "单价格式不对": "Price format isn't valid", "请选择卡片": "Choose a card", "数量需在 1–10000 之间": "Quantity must be 1–10000", "请输入单价": "Enter a price",
    "只有出价的买家本人能撤单，剩余托管立即退回。": "Only the buyer who posted the order can cancel it; the remaining escrow is returned right away.",
    "到期后任何地址都可以调用，托管只会退回买家本人，不会给调用者。": "After expiry anyone can call this; the escrow only ever goes back to the buyer, never to the caller.",
    "发给你的 AI": "Send to your AI", "交易数据（任何钱包都可发送 · BSC 56）": "Transaction data (any wallet can send it · BSC 56)",
    "复制 data": "Copy data", "data 已复制": "data copied", "复制失败": "Couldn't copy",
    "提示词已复制，发给你的 AI 吧": "Prompt copied. Send it to your AI", "复制失败，请手动选择顶部文字": "Couldn't copy. Select the text at the top by hand",
    "LAB 已领取到钱包": "LAB claimed to the wallet", "我的": "My"
  };
  // text inside a specific container
  var CTX = [
    ["#hero h1", { "合成": "synthesize" }],
    [".ev-t", { "合成": "Synthesized", "分解": "Decomposed", "挂单": "Listed", "买入": "Bought", "卖出": "Sold", "领取": "Claimed", "放入反应堆": "Put in the Reactor", "从反应堆取出": "Took out of the Reactor", "销毁": "burned", "免费首铸，翻出": "Free mint, revealed", "付费铸造，翻出": "Paid mint, revealed" }],
    [".decbox", { "分解": "Decompose", "手续费": "Fee" }],
    [".rc-item", { "免费首铸": "Free mint", "铸造": "Mint", "合成": "Synthesized" }],
    [".ccat", { "化合物": "Compound" }], ["#legend", { "化合物": "Compound" }],
    [".empty", { "铸造台": "Mint page" }],
    ["#pbText", { "阶段一奖励基金已入池": "Stage 1 so far" }]
  ];
  var RX = [
    [/^主网（(.+?)）：真实资产，交易不可撤销。仅对币安 Agent ID（\.ai）钱包开放。$/, "Mainnet ($1): real assets, and transactions can't be undone. Gameplay is open only to wallets with a Binance Agent ID (.ai)."],
    [/^测试网演示版本（(.+?)）：资产无真实价值。主网版本仅对币安 Agent ID（\.ai）钱包开放。$/, "Testnet demo ($1): assets have no real value. The mainnet version is open only to wallets with a Binance Agent ID (.ai)."],
    [/^本地开发链（(.+?) · chainId (\d+)）：仅供开发测试，数据可随时重置，与任何真实资产无关。$/, "Local dev chain ($1 · chainId $2): for development only, data may be reset at any time, no real assets."],
    [/^已连接 (\S+)\n点击断开连接$/, "Connected $1\nClick to disconnect"],
    [/^钱包当前在 chainId (\d+)，本页面使用 (.+?)（(\d+)）。$/, "Your wallet is on chainId $1; this page uses $2 ($3)."],
    [/^切换到 (.+)$/, "Switch to $1"],
    [/^关闭（本地链）$/, "Off (local chain)"], [/^关闭（测试网）$/, "Off (testnet)"],
    [/^抽一张（剩 (\d+) 次）$/, "Mint one ($1 left)"],
    [/^LAB 余额不足（需要 (.+) LAB）$/, "Not enough LAB (needs $1 LAB)"],
    [/^反应中 (\d+)$/, "In Reactor $1"],
    [/^点一下放入烧瓶：(.+)$/, "Tap to add to the flask: $1"],
    [/^配方：(.+) · 还缺 (.+)$/, "Recipe: $1 · still missing $2"],
    [/^单次付费铸造约 (.+?)，按链上剩余数量实时计算，不一定能拿到。$/, "About $1 per paid mint, computed live from the remaining supply on-chain; it may not come."],
    [/^(.+)：单次付费铸造约 (.+?)，按链上剩余数量实时计算，不一定能拿到。$/, "$1: about $2 per paid mint, computed live from the remaining supply on-chain; it may not come."],
    [/^我预先同意最多 3 次付费铸造，总价不超过 (\S+) BNB（当前读取单价 (\S+) BNB × 3）。你执行时当场重读价格，没超过就直接做，不用再问我。价格变高、出错或有风险提示时停下告诉我。$/, " I pre-approve up to 3 paid mints, $1 BNB in total at most (the page just read $2 BNB each, \u00d7 3). Re-read the price when you mint; if it's within that, go ahead without asking me. If the price goes up, something fails or there is a risk warning, stop and tell me. Reply to me in English."],
    [/^现在没有 (.+) 的挂单，可以发布求购$/, "No listing for $1 right now; you can post a buy order"],
    [/^(.+) 已售罄，暂时无法合成$/, "$1 is sold out and can't be synthesized right now"],
    [/^配方成立：(.+) ＝ (.+) · 100% 成功 · 不收 LAB$/, "Recipe complete: $1 = $2 · always succeeds · no LAB cost"],
    [/^没有更多 (.+) 了$/, "No more $1"],
    [/^合成成功：(.+) 已存入你的卡册 · 可以放进反应堆了$/, "Synthesized $1 · it's in your collection and ready for the Reactor"],
    [/^合成成功：(.+) 已存入你的卡册$/, "Synthesized $1 · it's in your collection"],
    [/^合成成功：(.+)$/, "Synthesized $1"],
    [/^分解 (.+) … 请在钱包中确认（手续费 (.+) LAB，销毁）$/, "Decomposing $1… confirm in your wallet (fee $2 LAB, burned)"],
    [/^分解完成：(.+) ＝ (.+)（原料已回到卡册）$/, "Decomposed $1 = $2 (the ingredients are back in your collection)"],
    [/^分解成功：(.+) ＝ (.+)$/, "Decomposed $1 = $2"],
    [/^缺少 (.+)$/, "Missing $1"],
    [/^· 化合物$/, "· Compound"], [/^· 超重元素（仅可合成）$/, "· Superheavy element (synthesis only)"],
    [/^展开全部 (\d+) 个配方$/, "Show all $1 recipes"],
    [/^你有 (\d+) 种天然元素卡 —— 它们只能用来合成。去$/, "You have $1 kinds of natural element cards; they're for synthesis only. Go to the"],
    [/^做出化合物再放进来。$/, "to make a compound, then add it here."],
    [/^我的份额 (.+)%（全网反应堆）$/, "My share $1% (of the whole Reactor)"],
    [/^≈ (.+) LAB \/ 天$/, "≈ $1 LAB / day"],
    [/^(.+) 已放入反应堆$/, "$1 is in the Reactor"], [/^(.+) 已取出$/, "$1 taken out"],
    [/^已放入 (\d+)\/(\d+)：(.+)$/, "Added $1/$2: $3"],
    [/^第 1 步：授权 (.+) LAB 给铸造合约…$/, "Step 1: approve $1 LAB for the mint contract…"],
    [/^② 已提交，等待目标区块 #(\d+) …$/, "② Committed, waiting for target block #$1…"],
    [/^(免费首铸|元素抽取)获得：(.+)$/, function (m, k, n) { return (k === "免费首铸" ? "Free mint" : "Element mint") + ": " + n; }],
    [/^已存入你的卡册 · 交易 (.+)$/, "Added to your collection · tx $1"],
    [/^LAB 不足（需 (.+)）$/, "Not enough LAB (needs $1)"],
    [/^：销毁 1 张 (.+)，返还$/, ": burns 1 $1 and returns"],
    [/^(.+) LAB（销毁）· 返还的原料计入各自发行上限，若原料已售罄则无法分解$/, "$1 LAB (burned) · returned ingredients count toward their supply caps; if one is sold out, you can't decompose"],
    [/^· 反应堆中$/, "· in the Reactor"],
    [/^配方：(.+) ＝ (.+)$/, "Recipe: $1 = $2"],
    [/^「(.+)」不是有效的 \.ai 名字（只含字母、数字、- 和 _）$/, "\"$1\" isn't a valid .ai name (letters, digits, - and _ only)"],
    [/^没有找到「(.+)」：这个 \.ai 名字还没有人注册。检查一下拼写，或直接输入 0x 地址。$/, "Couldn't find \"$1\": nobody has registered this .ai name. Check the spelling, or enter a 0x address."],
    [/^(.+) 的时间线$/, "$1's timeline"],
    [/^(\d+) 分钟前$/, "$1 min ago"], [/^(\d+) 小时前$/, "$1 h ago"],
    [/^撤销挂单 #(\d+)$/, "Cancelled listing #$1"],
    [/^正在读取更早的记录…（已扫描到 (.+)）$/, "Reading earlier activity… (scanned back to $1)"],
    [/^(.+) · (免费首铸|元素抽取) · 回放$/, function (m, by, k) { return by + " · " + (k === "免费首铸" ? "Free mint" : "Element mint") + " · replay"; }],
    [/^回放：(.+) 合成 (.+)$/, "Replay: $1 synthesizes $2"],
    [/^回放：(.+) 分解 (.+)$/, "Replay: $1 decomposes $2"],
    [/^回放：(.+) ＝ (.+)$/, "Replay: $1 = $2"],
    [/^回放结束：(.+) 合成了 (.+)$/, "Replay done: $1 synthesized $2"],
    [/^回放结束：(.+) 分解了 (.+)$/, "Replay done: $1 decomposed $2"],
    [/^已解锁 · 区块 (.+)$/, "Unlocked · block $1"],
    [/^已解锁配方$/, "Recipes discovered"],
    [/^天然元素$/, "Natural elements"], [/^\/ 88,888 · 截止 2027-12-31$/, "/ 88,888 · deadline 2027-12-31"],
    [/^\/ (\d+) · 还有 (\d+) 个等你的 AI 来留名$/, "/ $1 · $2 still open for your AI"],
    [/^· 正在读取链上记录…$/, "· reading on-chain activity…"],
    [/^第 (\d+) 个发现$/, "Discovery #$1"],
    [/^展开全部 (\d+) 项$/, "Show all $1"],
    [/^首位发现 (\d+) 项$/, "$1 first discoveries"],
    [/^全网首位发现者 · 第 (\d+) 个被发现的配方$/, "First discoverer · recipe #$1 to be discovered"],
    [/^(.+) 的分享卡$/, "Share card for $1"],
    [/^全部卡片（(\d+)）$/, "All cards ($1)"],
    [/^(\d+) 个活跃挂单$/, "$1 active listings"],
    [/^剩余 (\d+)$/, "$1 left"],
    [/^(.+)（持有 (\d+)）$/, "$1 (held $2)"],
    [/^(.+) 的挂单$/, "$1's listings"],
    [/^挂单 #(\d+) 已改价为 (.+) BNB$/, "Listing #$1 repriced to $2 BNB"], [/^挂单 #(\d+) 已撤销$/, "Listing #$1 cancelled"],
    [/^数量需在 1–(\d+) 之间$/, "Quantity must be 1–$1"],
    [/^已买入 (.+) ×(\d+)$/, "Bought $1 ×$2"],
    [/^已挂单：(.+) ×(\d+) @ (.+) BNB$/, "Listed $1 ×$2 @ $3 BNB"],
    [/^(\d+) 个有效求购$/, "$1 open buy orders"],
    [/^(已到期|最高出价|求购) · (BNB|LAB)$/, function (m, k, c) { return ({ "已到期": "Expired", "最高出价": "Best bid", "求购": "Buy order" })[k] + " · " + c; }],
    [/^(.+) 的求购$/, "$1's buy orders"],
    [/^待提取 (.+) BNB$/, "$1 BNB to withdraw"],
    [/^已到期 · 剩余 (\d+) 张未成交 · 托管 (.+)$/, "Expired · $1 unfilled · $2 in escrow"],
    [/^(.+)\/张 · 剩余 (\d+) 张 · 到期 (.+)$/, "$1 each · $2 left · expires $3"],
    [/^托管合计 (.+?)（成交时卖家到手扣 (.+?)% 手续费；未成交部分撤单或到期后退回）$/, "Escrow total $1 (the seller receives it minus a $2% fee; anything unfilled is returned on cancel or expiry)"],
    [/^出价：(.+) ×(\d+)$/, "Buy order: $1 ×$2"],
    [/^出价后 (.+?) 托管在 LabBidMarket 合约里，只会付给成交的卖家（扣 (.+?)% 手续费），或在撤单、到期后退回买家。有效期按生成时刻起算。$/, "Once posted, $1 is held in escrow by the LabBidMarket contract. It only goes to sellers who fill the order (minus a $2% fee), or back to the buyer on cancel or expiry. The validity period starts when this is generated."],
    [/^卡直接转给买家，款项到手 (.+?)。可部分成交，最多 (\d+) 张。(.*)$/, function (m, a, n, rest) { return "The card goes straight to the buyer and you receive " + a + ". Partial fills are fine, up to " + n + ". " + (rest ? "Enter your .ai name or address at the top to get the full transaction data here." : ""); }],
    [/^卖给他：(.+) · 求购 #(\d+)$/, "Sell: $1 · buy order #$2"],
    [/^撤单：求购 #(\d+)$/, "Cancel buy order #$1"],
    [/^到期取回：求购 #(\d+)$/, "Reclaim expired buy order #$1"],
    [/^最多 (\d+)$/, "max $1"],
    [/^第 (\d+) 步 · (.+)$/, "Step $1 · $2"],
    [/^(.+) 的实验室$/, "$1's lab"]
  ];
  var ME = "(?:我的 (\\S+) |我的钱包)";
  function me(x) { return x ? "my " + x : "my wallet"; }
  var SENT = [
    [new RegExp("去 build-100\\.com/lab/agent\\.md 读说明，用" + ME + "玩 Agent Periodic Lab：", "g"), function (m, x) { return "Read build-100.com/lab/agent.md and play Agent Periodic Lab with " + me(x) + ": "; }],
    [new RegExp("去 build-100\\.com/lab/agent\\.md 读 4\\.2 末尾和 4\\.6，用" + ME + "继续玩 Agent Periodic Lab：", "g"), function (m, x) { return "Read the end of section 4.2 and section 4.6 in build-100.com/lab/agent.md, then keep playing Agent Periodic Lab with " + me(x) + ": "; }],
    [new RegExp("去 build-100\\.com/lab/agent\\.md 读 4\\.2\\.1「免费首铸之后」，用" + ME + "继续玩 Agent Periodic Lab：", "g"), function (m, x) { return "Read section 4.2.1 \"After the free mint\" in build-100.com/lab/agent.md, then keep playing Agent Periodic Lab with " + me(x) + ": "; }],
    [new RegExp("去 build-100\\.com/lab/agent\\.md 读 4\\.2\\.2，用" + ME + "继续玩 Agent Periodic Lab：", "g"), function (m, x) { return "Read section 4.2.2 in build-100.com/lab/agent.md, then keep playing Agent Periodic Lab with " + me(x) + ": "; }],
    [/去 build-100\.com\/lab\/agent\.md 读 4\.7\.1「求购市场 LabBidMarket」，用(?:我的 (\S+) |我的钱包)/g, function (m, x) { return "Read section 4.7.1 (LabBidMarket buy orders) in build-100.com/lab/agent.md, then use " + me(x) + " to "; }],
    [/先检查 \.ai Agent ID，免费领一张卡。/g, "check my .ai Agent ID and do my free mint. "],
    [/先把免费卡 (\S+)（(\d+)）放进反应堆（setApprovalForAll 一次，再 stake），放好后告诉我待领 LAB、全网总权重和每小时排放；然后按 4\.2\.1 把后续选项和费用列给我。/g, "first put my free card $1 ($2) into the Reactor (one setApprovalForAll, then the Reactor deposit call). Once it's in, tell me my pending LAB, the total Reactor weight and the hourly emission; then follow 4.2.1 and list my next options with their costs. "],
    [/我已经领了免费卡 (\S+?)（(\d+)）。用一句话让我二选一：用剩下的次数再铸，看看出的元素能不能合成稀有的；或者先把这张卡存入反应堆（存入要我在币安 App 里点一次确认）。我选了你再做。/g, "I already have my free card $1 ($2). In one sentence, let me pick one: mint again with the mints I have left to see if the elements I get can synthesize something rare, or first deposit this card into the Reactor (that needs one tap in my Binance App). Only act after I pick. Reply to me in English."],
    [/我已经领了免费卡 (\S+?)（(\d+)）。它已经在反应堆里。用一句话告诉我还能再铸几张，问我要不要再铸，看看出的元素能不能合成稀有的。我同意了你再铸。/g, "I already have my free card $1 ($2), and it is already in the Reactor. Tell me in one sentence how many more mints I have left and ask whether I want to mint again to see if the elements I get can synthesize something rare. Only mint after I say yes. Reply to me in English."],
    [/先把反应堆里的 (\S+) 取出，/g, "take $1 out of the Reactor first, then "],
    [/如果钱包里的 LAB 够付分解费，把 (\S+)（(\d+)）分解，再按同一个配方合成回来；LAB 不够就告诉我差多少；/g, "if my wallet has enough LAB for the decompose fee, decompose $1 ($2) and synthesize it back with the same recipe; if LAB is short, tell me how much is missing; "],
    [/然后告诉我补 1 张 (.+?) 能做哪个配方，先看 LabMarket 有没有挂单和价格，再说付费铸造现在的价格（读 drawPrice）与每张单次概率（网页刚读到的是 (.+?)，请按 remaining\/drawTotal 重新算），以及我剩下几次付费铸造内的概率，不一定能拿到。/g, "then tell me which recipe I could make by adding 1 $1: first whether LabMarket has a listing and its price, then the current paid-mint price (read drawPrice) and the per-mint odds for each card (the page just read $2; recompute with remaining/drawTotal), and the odds over my paid mints left; the card may not come. "],
    [/然后告诉我还能做哪些配方。/g, "then tell me which other recipes I can make. "],
    [/读一下我现在持有的卡和首位发现者墙上还没人做的配方，列出我离哪个配方最近、缺哪几张、各自怎么拿到和费用。/g, "look at the cards I hold and the recipes still open on the first-discoverer wall, and tell me which recipe I'm closest to, which cards I'm missing, how to get each one and what it costs. "],
    [/领到后用一句话告诉我卡名，让我二选一：用剩下的次数再铸，看看出的元素能不能凑出稀有的卡；或者先把卡存入反应堆（存入要我在币安 App 里点一次确认）。我选了你再做，别的玩法以后再说。/g, "Once the card arrives, tell me its name in one sentence and let me pick one: mint again with the mints I have left to see if the elements I get could make a rare card, or first deposit the card into the Reactor (that needs one tap in my Binance App). Only act after I pick; leave everything else for later. Reply to me in English."],
    [/每次铸造揭示后按 agent\.md 4\.2\.2 告诉我下一步：化合物说能否存入反应堆和下一个合成，元素说用到它的配方和求购出价。/g, "After every reveal, follow 4.2.2: for a compound, tell me whether it can go in the Reactor and what to synthesize next; for an element, tell me which recipes use it and any buy-order prices. Reply to me in English."],
    [/(\S+) 是免费首铸得到的，还不算合成。/g, "$1 came from the free mint, so it doesn't count as a synthesis yet. "],
    [/还没放进反应堆。/g, "It isn't in the Reactor yet. "],
    [/这个配方在首位发现者墙上还是待发现。/g, "Its recipe is still open on the first-discoverer wall."],
    [/这个配方已经有人发现，可以考虑补元素做别的配方。/g, "Someone has already discovered its recipe, so consider adding an element to make a different one."],
    [/已经发现 (\d+) 个配方。/g, function (m, n) { return "You've discovered " + n + (n === "1" ? " recipe." : " recipes."); }],
    [/在 LabBidMarket 调用 withdrawProceeds\(\)，取回记账的 (.+?) BNB。/g, "call withdrawProceeds() on LabBidMarket to collect the $1 BNB recorded for me. "],
    [/对 (.+?)（id (\d+)）发布求购：数量 (\d+)，单价 (.+?)，有效期 (\d+) 天，托管合计 (.+?)。/g, "post a buy order for $1 (id $2): quantity $3, $4 each, valid for $5 days, $6 escrowed in total. "],
    [/先查 LAB 余额够不够，approve 正好这个数量，再调用 bidLab。/g, "Check my LAB balance first, approve exactly this amount, then call bidLab. "],
    [/调用 bid，value 等于托管合计。/g, "Call bid with value equal to the escrow total. "],
    [/把 (\d+) 张 (.+?)（id (\d+)）卖给求购 #(\d+)（单价 (.+?)，扣 (.+?)% 手续费后到手 (.+?)）：先确认 isLive\((\d+)\) 为 true、我的持有数量够，再发一笔 ElementNFT\.safeTransferFrom\(我, /g, "sell $1 $2 (id $3) into buy order #$4 ($5 each, $7 after the $6% fee): first check that isLive($8) is true and that I hold enough, then send one ElementNFT.safeTransferFrom(me, "],
    [/\)，不需要授权。/g, "); no approval needed. "],
    [/撤销我的求购 #(\d+)（(.+?)）：调用 LabBidMarket\.cancel\((\d+)\)，退回剩余托管 (.+?)。/g, "cancel my buy order #$1 ($2): call LabBidMarket.cancel($3) to get back the remaining escrow of $4. "],
    [/处理已到期的求购 #(\d+)（(.+?)）：先确认 isLive\((\d+)\) 为 false，再调用 LabBidMarket\.reclaim\((\d+)\)，剩余托管 (.+?) 退回买家。/g, "handle expired buy order #$1 ($2): first check that isLive($3) is false, then call LabBidMarket.reclaim($4) so the remaining escrow of $5 goes back to the buyer. "],
    [/ElementNFT\.safeTransferFrom\(你, /g, "ElementNFT.safeTransferFrom(you, "],
    [/(\d+) 分钟前/g, "$1 min ago"], [/(\d+) 小时前/g, "$1 h ago"], [/刚刚/g, "just now"],
    [/剩余 (\d+)/g, "$1 left"], [/已于 (.+?) +到期/g, "expired $1"], [/求购 (\d+) 张/g, "wants $1"]
  ];
  var FRAG = {
    "统一价": "Flat price", "/ 张": "each", "BNB/张": "BNB each", "· 或": "· or", "· 共": "· total", "· 卖家": "· seller", "· 买家": "· buyer",
    "· 可交付": "· deliverable", "· 持有": "· held", "· 到期": "· expires", "· 已于": "· expired", "到期": "expiry",
    "求购": "wants", "张": "", "配方：": "Recipe: ", "仅可通过合成获得": "Synthesis only", "解析失败：": "Lookup failed: ",
    "读取链上数据失败：": "Couldn't read chain data: ", "分享链接已复制：": "Share link copied: ", "已复制：": "Copied: ",
    "数量": "Quantity", "46 个配方等你的 AI 来发现": "46 recipes waiting for your AI to discover", "阶段一奖励基金已入池": "Stage 1 so far",
    "我的": "my", "反应堆": "Reactor"
  };
  var FRAG_RE = new RegExp(Object.keys(FRAG).sort(function (a, b) { return b.length - a.length; }).map(function (k) { return k.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); }).join("|"), "g");
  var CJK = /[\u3400-\u9fff\uff08\uff09\uff1a\uff0c\u3002\u3001\u300c\u300d]/;
  var CJK_WORD = /[\u3400-\u9fff\u{20000}-\u{2ffff}]/u;

  function punct(s) {
    return s.replace(/（/g, " (").replace(/）/g, ")").replace(/：/g, ": ").replace(/，/g, ", ").replace(/。/g, ". ").replace(/、/g, ", ")
      .replace(/[「」]/g, "\"").replace(/＝/g, "=").replace(/；/g, "; ").replace(/ {2,}/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim();
  }
  function zhNames(s) {
    for (var k in ZH2EN) if (s.indexOf(k + " ") >= 0) s = s.split(k + " ").join(ZH2EN[k] + " ");
    return s;
  }
  function ctx(core, el) {
    if (!el || !el.closest) return null;
    for (var i = 0; i < CTX.length; i++) { var c = CTX[i]; if (c[1][core] != null && el.closest(c[0])) return c[1][core]; }
    return null;
  }
  function tr(s, el) {
    if (!s || !CJK.test(s)) return s;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), lead = m[1], core = m[2], trail = m[3];
    var out = ctx(core, el);
    if (out == null && Object.prototype.hasOwnProperty.call(EXACT, core)) out = EXACT[core];
    if (out == null) for (var i = 0; i < RX.length; i++) if (RX[i][0].test(core)) { out = core.replace(RX[i][0], RX[i][1]); break; }
    if (out == null) {
      out = core;
      for (var j = 0; j < SENT.length; j++) out = out.replace(SENT[j][0], SENT[j][1]);
      out = out.replace(FRAG_RE, function (k) { return FRAG[k]; });
    }
    if (CJK.test(out)) out = zhNames(out);
    if (CJK.test(out) && !CJK_WORD.test(out)) out = punct(out);
    return lead + out + trail;
  }
  window.LAB_TR = tr;

  var ATTRS = ["placeholder", "aria-label", "title", "alt"];
  function doText(n) {
    var p = n.parentNode; if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE") return;
    var t = tr(n.data, p); if (t !== n.data) n.data = t;
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) { var v = el.getAttribute && el.getAttribute(ATTRS[i]); if (v && CJK.test(v)) { var t = tr(v, el); if (t !== v) el.setAttribute(ATTRS[i], t); } }
  }
  function walk(node) {
    if (node.nodeType === 3) { doText(node); return; }
    if (node.nodeType !== 1 || node.nodeName === "SCRIPT" || node.nodeName === "STYLE") return;
    doAttrs(node);
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var c;
    while ((c = w.nextNode())) { if (c.nodeType === 3) doText(c); else if (c.nodeName !== "SCRIPT" && c.nodeName !== "STYLE") doAttrs(c); }
  }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === "childList") { for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]); }
      else if (r.type === "characterData") doText(r.target);
      else if (r.type === "attributes") doAttrs(r.target);
    }
  });
  mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  function finish() {
    document.title = "Agent Periodic Lab · an element-card lab for AI agents (BUILD-100)";
    walk(document.body);
    addToggle();
    // Main call to action: "Let your AI play" scrolls to the AI panel.
    var cta = document.getElementById("btnFocusSearch");
    if (cta) {
      var ic = cta.querySelector(".ic"); if (ic) ic.className = "ic ic-robot";
      cta.addEventListener("click", function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        var s = document.getElementById("secAI"); if (s) s.scrollIntoView({ block: "start", behavior: "smooth" });
      }, true);
    }
    // Short how-to under the AI panel text.
    var p = document.querySelector("#secAI .ai-l > p");
    if (p && !document.getElementById("aiSteps")) {
      var ol = document.createElement("ol"); ol.id = "aiSteps"; ol.className = "ai-steps muted";
      ol.innerHTML = "<li>You need a Binance Agentic Wallet that holds a SPACE ID .ai Agent ID, with Developer Mode on, and a little BNB for gas.</li>" +
        "<li>Copy the message on the right and send it to your AI agent.</li>" +
        "<li>Your AI reads agent.md, tells you its plan in a few sentences and asks whether you want to mint more. The first mint is free (gas only); synthesis costs no LAB.</li>" +
        "<li>Come back here and enter your .ai name at the top to watch your lab.</li>";
      p.parentNode.insertBefore(ol, p.nextSibling);
    }
    // Copy buttons in the buy-order dialog copy the English prompt shown on screen.
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("#bdCopyP"); if (!b) return;
      var c = document.getElementById("bdPrompt"); if (!c) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var t = c.textContent;
      var done = function (ok) { var o = b.textContent; b.textContent = ok ? "Copied" : "Copy failed"; setTimeout(function () { b.textContent = o; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(false); });
      else done(false);
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", finish); else finish();
  window.addEventListener("load", function () { walk(document.body); });
})();
