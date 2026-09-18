---
name: build-100-publish
description: 发布 build-100.com 的新作品时，更新主站、同步 Obsidian Tokyo 项目记录并部署上线。当用户说"发布第 N 个网站""上线 00X""build-100 发新作品""更新主站清单/进度/配图"时触发。涵盖进度计数器、静态兜底、清单解密、hero-latest/Signal/X 按钮、OG 配图、作品页 meta、Obsidian 笔记、部署与验证的完整流程。只要是 build-100.com 项目的新作品发布就一定要用这个 skill——它把上次发布 001 时踩过的坑全固化成步骤了。
---

# build-100-publish · 发布新作品时更新主站

每次 build-100 有新作品（第 NNN 号）上线，主站 `build-100/index.html` 必须同步更新，否则会出现"作品已发但主站显示 0 个"的割裂。本 skill 是这套流程的固化版本——**做什么、为什么做、做完什么效果**，三件事都讲清楚。

## 背景知识（先读）

build-100.com 是一个"用 AI 造 100 个网站"的静态项目站，主站是一个单文件 `build-100/index.html`（手写 CSS + Vanilla JS，无框架无构建）。每个作品是 `build-100/NNN/` 下的独立静态子站。主站靠 JS 读 `SITE` 配置动态渲染进度，但**爬虫、社媒预览、禁 JS 的场景只看静态 HTML**——所以静态兜底值必须和 JS 配置同步。这是本 skill 存在的根本原因。

URL 策略已锁死：**所有作品走 `build-100.com/NNN/` 路径，不用子域名**。nginx 已配 root，`/NNN/` 自动解析到对应子目录，无需改 nginx。

服务器：`root@43.167.166.94`，站点根 `/var/www/build100/`。部署用 scp/rsync，**不要在服务器上直接编辑**。

## 发布流程（按顺序）

下面每一步都标了「做什么 / 为什么 / 效果」。主站相关：步骤 1–4（含 3.5）；作品页：步骤 5 / 5.5；Obsidian：步骤 8；然后部署与验证。

> **发布前门槛**：作品页 `NNN/index.html` 必须先通过格式自检。读 `references/page-format-spec.md` 的「上线前自检清单」，逐条检查 favicon/title/nav/双语/分享/footer/CSS 尺寸/reduced-motion/beacon。格式不达标的作品页不要发布——002 上线时格式不一致，返工成本很高。

### 步骤 1 · 更新 SITE 配置与 PROJECTS 数组

**做什么**：在 `build-100/index.html` 的 `<script>` 里，把 `SITE.completed` 加 1，并在 `PROJECTS` 数组末尾追加一条 `{ name, url }`。

**为什么**：主站 JS 靠 `SITE.completed` 渲染计数器、进度条、进度格；靠 `PROJECTS` 给已点亮的格子加链接和 hover 名字。漏掉任一处，格子点亮了却点不进去，或名字显示 undefined。

**效果**：JS 渲染后计数器显示新数字、进度格多点亮一格且可点击直达作品。

### 步骤 2 · 同步静态兜底值（关键，最容易漏）

**做什么**：把三处**写死在 HTML 里**的值改成新进度：
- `id="counter"` 的文本（如 `001` → `002`）
- `id="statLine"` 的文本（如 `001 / 100 — 1% Complete` → `002 / 100 — 2% Complete`）
- `id="grid100"` 的 `aria-label`（如 `已点亮 1 格` → `已点亮 2 格`）

**为什么**：爬虫、X/Facebook 链接预览、禁 JS 浏览器**不执行 JS**，它们只读 HTML 原文。如果配置写了 `completed: 2` 但 HTML 写死 `001`，这些场景看到的还是旧进度——作品已经发了，第一印象却是"一个都没做"。这是发布 001 时实际踩过的坑。

**效果**：任何场景（含禁 JS）看到的进度都与实际一致。

### 步骤 3 · 清单行解密上线

**做什么**：在 `#manifest` 的 `.manifest` 容器里找到对应编号的机密行（`<span class="m-no">NNN</span>` 那行，通常带涂黑条 `<span class="redact">`），做三件事：
1. **剪到清单最顶部**（清单排序规则：最新上线的排最上面）
2. 给该行 `<div class="m-row">` 加上属性：`data-name="作品名"`、`data-sub="中文副标题"`、`data-sub-en="English subtitle"`、`data-url="https://build-100.com/NNN/"`、`data-url-source="GitHub 仓库链接"`、`data-open="self"`（同站路径用 self）
3. 把状态从 `is-dev is-classified`（Classified）改成 `is-dev`（In Dev）——**不要直接写 is-live**，解密动画的 `finish()` 会自动把它翻成 is-live

**为什么**：机密行带涂黑条，访客一进清单看到的是"??? + Classified"。加上 `data-name` 后，页面 JS 的解密动画（`declassify()`）会在该行滚入视野时把涂黑条解码成真名、翻状态为 Live、把整行变成可点击链接。这是 build-100 的"上线仪式感"。保留 `is-dev` 初始态是为了让首屏先显示灰色 In Dev 点、滚入后才翻绿——直接写 is-live 会出现"绿点配涂黑条"的矛盾中间态。

**效果**：访客进清单页，看到该行涂黑条 → 滚入视野 → 解码成作品真名 → 状态翻绿 Live → 整行可点击直达作品。

> **红线：解码特效只留给当天最新一件。** 清单里同时只允许一行带 `data-name` + `.redact`。发第 NNN 时，必须把上一件（NNN−1）从机密行改成永久 Live 写法（见主站 HTML 注释模板：`<a class="m-row revealed" …>`），去掉 `data-name` / 涂黑条。否则访客一滚，旧作品会排队全播解码，仪式感变成噪音。

### 步骤 3.5 · 更新 hero-latest / Signal / X 按钮（主站营销位）

**做什么**：在 `build-100/index.html` 里同步三处「最新作品」文案（和清单、进度一样，漏了访客会以为最新还是上一个）：

1. **`.hero-latest`**（计数器下方那条可点挂牌）
   - `href` → `https://build-100.com/NNN/`
   - `.latest-body` 正文 + `data-en`：`#NNN CODE-NNN —— 一句话中文` / `#NNN CODE-NNN — one-line English`
2. **`#signal .signal-log`**（最多 3 条，**新的插到最上面**，挤掉最旧的第 4 条）
   - 日期、中英文 `log-text`、`log-link` 的 `href` 都指向本作品
3. **`.btn-x`**（Signal 区底部关注 CTA）
   - 正文 + `data-en`：`不想错过第 NNN 个 ↗` / `Don't miss #NNN ↗`

**为什么**：这三处是主站首屏与记录区的「活着的证据」。只改计数器和清单、不改这三处，会出现「进度已是 003、挂牌还在推 002」的割裂——比漏改静态兜底值更显眼。

**效果**：首屏挂牌、Signal 首条、X CTA 全部指向最新上线作品。

### 步骤 4 · 更新主站 OG 配图

**做什么**：用 headless Chrome 截一张**主站 hero 区**的新 OG 图（计数器显示新进度，挂牌文案也应是最新作品），部署到服务器，更新 `og:image` / `twitter:image` 指向它。**尺寸必须严格 1200×628（1.91:1）**——见下方"OG 图尺寸红线"。

> **禁止**：把作品页专属卡（`NNN/og-NNN.png`）直接复制成主站 `og-NNN.png`。主站 OG 必须是主站 hero 截图（带大号计数器），作品 OG 是作品页自己的图——两者职责不同。

**为什么**：X/Facebook 分享 `build-100.com` 链接时，预览卡片用 `og:image` 指定的图。如果图还是旧进度（如 000），推文配图和实际站点对不上，冷启动期这种不一致最伤信任。

**效果**：分享主站链接时，预览图显示最新进度。

> **OG 图尺寸红线**：X 对 `summary_large_image` 卡片的图片有严格宽高比校验，要求 **1.91:1**（即 1200×628）。比例不符（如 1200×570 = 2.10:1）时 X 会**直接丢弃整个预览卡片**——表现是分享时"什么都没有"，不是显示旧图。截图时 viewport 设 `1200×688`、`deviceScaleFactor: 2`，`sessionStorage.setItem('booted','1')` 跳过开机动画，`clip` 取 `{x:0, y:60, width:1200, height:628}`（跳过 60px nav），输出 2400×1256（逻辑 1200×628）。`og:image:width` 写 1200、`og:image:height` 写 628。这是发布 001 时实际踩过的坑。

### 步骤 5 · 作品页补全 OG meta

**做什么**：确认 `build-100/NNN/index.html` 的 `<head>` 有完整的 og meta：`og:title`、`og:description`、`og:url`（指向 `https://build-100.com/NNN/`）、`og:image`（指向作品专属配图）、`twitter:card`（`summary_large_image`）等。如果没有专属 OG 图，截一张作品页 hero 区的图（**1200×628，同步骤 4 的尺寸红线**）部署到 `build-100/NNN/og-NNN.png`。

**为什么**：作品页若没有自己的 og meta，分享时要么显示空白、要么继承首页的通用图——都无法体现该作品的独特性。

**效果**：分享作品链接时显示该作品专属的标题/描述/配图。

### 步骤 5.5 · 注入访问追踪 beacon

**做什么**：在 `build-100/NNN/index.html` 的 `</body>` 标签前加一行 `<script src="/beacon.js"></script>`。beacon.js 本身在服务器根目录 `/var/www/build100/beacon.js`，所有作品共用这一个文件，不需要每个作品目录各放一份。

**为什么**：后台数据看板（`build-100.com/view/`）靠 beacon 统计每个页面的 UV/PV/停留时长。如果作品页没注入 beacon，看板里该作品的数据永远是 0——你不知道有没有人来看、看了多久。beacon.js 是全局的，主站和所有作品页都引用同一个，加一行就行。

**效果**：访客进入/离开作品页时自动上报到 collector，看板能看到该作品的访问数据。

> **注意**：`beacon.js` 和 `view/` 目录在 `.gitignore` 里——它们不上 GitHub（含密码 hash、IP 过滤列表、访客数据）。但作品页的 `<script src="/beacon.js">` 引用本身不敏感，index.html 照常上 GitHub 没问题。

### 步骤 6 · 部署到服务器

**做什么**：
- 主站：`scp build-100/index.html root@43.167.166.94:/var/www/build100/`
- 主站 OG 图：`scp build-100/og-NNN.png root@43.167.166.94:/var/www/build100/`
- 作品目录：`rsync -avz --exclude='.DS_Store' --exclude='node_modules' build-100/NNN/ root@43.167.166.94:/var/www/build100/NNN/`

**为什么**：本地改完不部署就是没上线。用 rsync 排除 `.DS_Store`（macOS 垃圾文件）和 `node_modules`（测试依赖，服务器不需要）。

**效果**：线上立即可访问。

### 步骤 7 · 验证

**做什么**：用 curl 确认线上状态：
- 主站静态兜底值（`curl -sS https://build-100.com/ | grep counter`）是否显示新进度
- 清单行状态是否正确
- 作品页 HTTP 200、子资源（engine.js/models.json 等）全部 200
- og meta 是否指向新图
- 图片是否可访问（HTTP 200）

**为什么**：部署后必须验证——scp 成功不等于内容正确。这一步能抓出"文件传了但路径错了""meta 没更新"等问题。

**效果**：确认线上每一项都正确，可以放心发推宣传。

### 步骤 8 · 同步 Obsidian Tokyo 项目记录

**做什么**：更新服务器 Obsidian vault `/root/tokyo-vault/` 中的 BUILD-100 笔记：

1. `01-项目记录/BUILD-100/发布记录.md` — 表格顶部追加本次上线行
2. `01-项目记录/BUILD-100/NNN-代号.md` — 新建或更新作品笔记（主旨、用户输入、核心逻辑、线上链接）
3. `01-项目记录/BUILD-100/00-概览.md` — 作品一览与进度 `N/100`
4. `01-项目记录/00-索引.md` — BUILD-100 状态与作品索引表

**为什么**：主站是给访客看的；Obsidian 是给未来的自己和 AI 看的项目记忆。只改主站不改笔记，过几周就忘了这个站为什么存在、算法怎么写的——返工成本比写笔记高一个数量级。

**效果**：Tokyo 项目记录与线上一致；下次维护、写推文、做第 N+1 个站时能直接 `[[wikilink]]` 跳转查阅。

> 详细模板与验证命令：读 `references/obsidian-sync.md`。

## X 链接预览缓存（重要提醒）

X（Twitter）会缓存链接预览卡片，改了 og:image 后 X 那边可能仍显示旧缓存数小时到数天。**解决办法**：发推时给链接加查询参数，如 `https://build-100.com/?1` 或 `https://build-100.com/NNN/?1`，X 会当成新链接重新抓取，立即显示新配图。nginx 忽略 query string，页面内容完全一样。

## 何时读本 skill 的 reference

- **写新作品页或检查作品页格式时**：读 `references/page-format-spec.md`——它是作品页格式规范（favicon/title/nav/双语/分享/footer/CSS 尺寸/reduced-motion），含上线前自检清单。002 上线时因为没按这个规范走，导致大量格式不一致需要返工。003 开始必须在写代码阶段就遵守。
- 执行发布前：读 `references/launch-checklist.md`——它是可勾选清单，含每个值精确改成什么、每段代码在 index.html 的什么位置。
- 同步 Obsidian 时：读 `references/obsidian-sync.md`——vault 路径、笔记模板、每次要改哪些文件。
