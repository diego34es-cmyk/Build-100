# build-100 发布检查清单

> 每次发布第 NNN 号作品时，照此清单逐条执行并勾选。文件路径均相对于 `/Users/llway/ZCodeProject/build-100/`。

## 发布前：确认作品就绪

- [ ] `NNN/` 目录下作品文件齐全（至少有 `index.html`）
- [ ] 作品在本地跑通（headless 冒烟测试无 console 错误）
- [ ] 作品页有 `<title>` 和 `<meta name="description">`
- [ ] 价格/数据类作品有 `node --test` 测试且全过

## 步骤 1 · SITE 配置与 PROJECTS

文件：`index.html`，位置：`<script>` 块内顶部（搜 `const SITE`）

- [ ] `SITE.completed` 的值加 1（如 `1` → `2`）
- [ ] `SITE.updated` 改成当前年月（如 `"2026.07"`）
- [ ] `PROJECTS` 数组末尾追加一条：
  ```js
  { name: "作品名", url: "https://build-100.com/NNN/" }
  ```

## 步骤 2 · 静态兜底值（关键！）

文件：`index.html`。这三处是写死在 HTML 里的，JS 不参与渲染它们——爬虫和禁 JS 场景只看这些。

搜以下三个 id，把值改成新进度（假设发布第 2 个，则 `002` / `2%` / `2 格`）：

- [ ] `id="counter"`：`001<small>/100</small>` → `002<small>/100</small>`
- [ ] `id="statLine"`：`001 / 100 — 1% Complete` → `002 / 100 — 2% Complete`
- [ ] `id="grid100"` 的 `aria-label`：`已点亮 1 格` → `已点亮 2 格`

> 验证方法：`grep -n 'id="counter">00\|statLine">00\|已点亮' index.html` 应全部显示新值。

## 步骤 3 · 清单行解密

文件：`index.html`，位置：`<div class="manifest">` 内。

- [ ] 找到 `<span class="m-no">NNN</span>` 对应的机密行
- [ ] 把整行 `<div class="m-row">…</div>` **剪切到 `.manifest` 容器的最顶部**（最新上线排最上）
- [ ] 给该 `<div class="m-row">` 加属性：
  ```html
  data-name="作品代号"
  data-sub="中文一句话副标题"
  data-sub-en="English one-liner"
  data-url="https://build-100.com/NNN/"
  data-url-source="https://github.com/diego34es-cmyk/Build-100/tree/main/NNN"
  data-open="self"
  ```
- [ ] 状态 `<span class="m-status">`：去掉 `is-classified`，保留 `is-dev`，文字从 `Classified` 改成 `In&nbsp;Dev`
  ```html
  <span class="m-status is-dev"><i class="dot"></i>In&nbsp;Dev</span>
  ```
- [ ] 确认 `.m-name` 里仍是 `<span class="redact" style="width: Xem;"></span>` 涂黑条（解密动画会替换它，不要手写真名）
- [ ] **把上一件（NNN−1）改成永久 Live**：去掉 `data-name` / `.redact` / `is-dev`，写成 `<a class="m-row revealed" href="…">`（真名 + 副标题 + Live）。全站清单同时只允许最新一行保留解码特效。

> 为什么不直接写 is-live：解密动画 `declassify()` 的 `finish()` 会把 is-dev 翻成 is-live。直接写 is-live 会出现"绿点 + 涂黑条"的矛盾中间态。

## 步骤 3.5 · hero-latest / Signal / X 按钮

文件：`index.html`。这三处是主站「最新作品」营销位，必须和进度、清单一起改。

- [ ] **`.hero-latest`**
  - `href="https://build-100.com/NNN/"`
  - `.latest-body` 中文 + `data-en` 英文都指向本作品（格式：`#NNN CODE-NNN —— …`）
- [ ] **`#signal .signal-log`**
  - 新 `<li>` 插到列表最顶部（最多保留 3 条，删掉最旧）
  - `log-date` / `log-text`（含 `data-en`）/ `log-link href` 都更新
- [ ] **`.btn-x`**
  - 中文：`不想错过第 NNN 个&nbsp;↗`
  - `data-en="Don&#39;t miss #NNN&nbsp;↗"`

> 验证：`grep -n 'hero-latest\|log-text\|btn-x' index.html` 应全部出现新编号 NNN，不应再把上一个作品当「最新」。

## 步骤 4 · 主站 OG 配图

用 headless Chrome 截**主站 hero 区**，计数器显示新进度。不要把作品页 `NNN/og-NNN.png` 复制过来冒充主站 OG。

> ⚠️ **尺寸红线**：OG 图必须严格 **1200×628（1.91:1）**。X 对 `summary_large_image` 卡片校验宽高比，比例不符（如 1200×570 = 2.10:1）会**直接丢弃预览卡片**（分享时什么都没有）。发布 001 时踩过此坑。

- [ ] 截图脚本参数：viewport `1200×688`、`deviceScaleFactor: 2`、`sessionStorage.setItem('booted','1')` 跳过开机动画、`waitForTimeout(3000)` 等计数器动画落定、`clip: {x:0, y:60, width:1200, height:628}`（跳过 60px nav）
- [ ] 截前确认计数器文本是新的（`page.locator("#counter").innerText()`），且 hero-latest 已是本作品
- [ ] 存为 `build-100/og-NNN.png`（如 `og-002.png`）——这是**主站**配图，与 `NNN/og-NNN.png`（作品页）分开
- [ ] 验证图片尺寸：`sips -g pixelWidth -g pixelHeight og-NNN.png` 应为 2400×1256，比例 1.91:1
- [ ] 更新 `index.html` 的 og meta：
  ```html
  <meta property="og:image" content="https://build-100.com/og-NNN.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="628">
  <meta name="twitter:image" content="https://build-100.com/og-NNN.png">
  ```

## 步骤 5 · 作品页 OG meta

文件：`NNN/index.html` 的 `<head>`。

- [ ] 确认有以下 meta（没有就加）。**og:image:height 必须是 628**，不是 570：
  ```html
  <meta property="og:type" content="website">
  <meta property="og:title" content="作品标题">
  <meta property="og:description" content="一句话描述">
  <meta property="og:url" content="https://build-100.com/NNN/">
  <meta property="og:image" content="https://build-100.com/NNN/og-NNN.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="628">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="作品标题">
  <meta name="twitter:description" content="一句话描述">
  <meta name="twitter:image" content="https://build-100.com/NNN/og-NNN.png">
  ```
- [ ] 如无专属 OG 图，截作品页 hero 区一张（同步骤 4 的尺寸红线：1200×628），存为 `NNN/og-NNN.png`

## 步骤 5.5 · 注入访问追踪 beacon

文件：`NNN/index.html`，位置：`</body>` 标签前。

- [ ] 在 `</body>` 前加一行：`<script src="/beacon.js"></script>`
  ```html
  <!-- 例：001/index.html 末尾 -->
  </script>
  <script src="/beacon.js"></script>
  </body>
  </html>
  ```
- [ ] 确认 beacon.js 在服务器 `/var/www/build100/beacon.js`（全局共用，不需要放作品目录）
- [ ] 确认该行在所有 `</script>` 之后、`</body>` 之前

> beacon.js 和 view/ 目录不上 GitHub（.gitignore 排除），但 index.html 里的 `<script src>` 引用不敏感，照常提交。

## 步骤 6 · 部署

```bash
# 主站
scp build-100/index.html root@43.167.166.94:/var/www/build100/
# 主站 OG 图
scp build-100/og-NNN.png root@43.167.166.94:/var/www/build100/
# 作品目录（rsync 排除垃圾文件）
rsync -avz --exclude='.DS_Store' --exclude='node_modules' build-100/NNN/ root@43.167.166.94:/var/www/build100/NNN/
```

- [ ] 主站 index.html 已传
- [ ] 主站 OG 图已传
- [ ] 作品目录已传（含 og-NNN.png）

## 步骤 7 · 验证（部署后必做）

```bash
# 主站静态兜底值（应显示新进度）
curl -sS https://build-100.com/ | grep -oE 'counter">[0-9]+|statLine">[0-9]+ / 100|已点亮 [0-9]+ 格'

# 作品页 + 子资源
curl -sS -o /dev/null -w "%{http_code}\n" https://build-100.com/NNN/
curl -sS -o /dev/null -w "%{http_code}\n" https://build-100.com/NNN/og-NNN.png

# og meta
curl -sS https://build-100.com/ | grep og:image
curl -sS https://build-100.com/NNN/ | grep og:image
```

- [ ] 主站 counter/statLine/aria-label 全部显示新进度
- [ ] 作品页 HTTP 200
- [ ] 作品 OG 图 HTTP 200
- [ ] 主站 og:image 指向 og-NNN.png
- [ ] 作品页 og:image 指向 NNN/og-NNN.png
- [ ] （如有引擎测试）服务器上 `node --test` 全过

## 步骤 8 · Obsidian Tokyo 项目记录

Vault：`/root/tokyo-vault/`（详见 `references/obsidian-sync.md`）

- [ ] `01-项目记录/BUILD-100/发布记录.md` 表格顶部追加本次上线行
- [ ] 新建或更新 `01-项目记录/BUILD-100/NNN-代号.md`（主旨 / 输入 / 核心逻辑 / 线上链接）
- [ ] `01-项目记录/BUILD-100/00-概览.md` 作品表与 `N/100` 进度
- [ ] `01-项目记录/00-索引.md` BUILD-100 状态与作品索引
- [ ] 验证：`grep NNN /root/tokyo-vault/01-项目记录/BUILD-100/发布记录.md`

## 发布后：宣传

- [ ] 发推时链接加查询参数避免 X 缓存旧预览：`https://build-100.com/?1` 或 `https://build-100.com/NNN/?1`
- [ ] 推文配图用 `og-NNN.png`（16:9 横版）或作品专属图
