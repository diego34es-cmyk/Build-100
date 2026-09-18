# 作品页格式规范

> 每个新作品页（NNN/index.html）必须遵守这些格式规范，和 001 保持一致。
> 这是 002 上线时踩过的坑的固化——003 开始不要再犯。
> 参考 `001/index.html` 作为唯一标准实现。

## 1. `<head>` 必备项

### title
格式：`CODE-NNN · 中文描述`（和 og:title 一致）
```html
<title>COMBO-001 · AI 订阅最优搭配器</title>
<title>RETIRE-002 · 只管存钱的退休计算器</title>
```
**不要**写成营销标题或带 `· BUILD-100` 后缀。

### favicon
纯文字编号，**不加任何额外元素**（002 曾加进度条 rects，已去掉）：
```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23060709'/%3E%3Ctext x='32' y='42' font-family='Menlo,Consolas,monospace' font-weight='700' font-size='20' fill='%23edeff1' text-anchor='middle'%3ENNN%3C/text%3E%3C/svg%3E">
```
关键：`y='42'`、`font-size='20'`、只有 rect + text，不加 rect 进度条。

### 其他必备 meta
- `<meta name="description">`
- `<meta name="theme-color" content="#060709">`
- `<link rel="canonical" href="https://build-100.com/NNN/">`
- 完整 og/twitter meta（见 launch-checklist 步骤 5）

## 2. nav 三要素

```html
<nav class="nav">
  <a class="nav-back" href="https://build-100.com/" data-en="← BUILD-100">← 返回主站</a>
  <span class="nav-brand">CODE<span>·NNN</span></span>
  <button class="nav-lang" id="langBtn" type="button" aria-label="Switch language">EN</button>
</nav>
```
- **返回链接**：必须有 `data-en`（双语跟随）
- **品牌**：`CODE<span>·NNN</span>`，NNN 是三位编号
- **语言按钮**：`#langBtn`，**不要**用静态标签（如"NO ADS"）替代

`.nav-lang` CSS（和 001 一致）：
```css
.nav-lang {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  background: none; border: 1px solid var(--line-strong); border-radius: 999px;
  color: var(--muted); padding: 7px 14px; cursor: pointer; transition: color .2s, background .2s; white-space: nowrap;
}
.nav-lang:hover { color: var(--ink); }
```

## 3. 双语系统（必须有）

每个作品页**必须有完整中英双语**，不是可选的。三层：

### ① 静态 HTML 文本：`data-en` 属性
所有可见文本元素加 `data-en`：
```html
<h1 data-en="Stop guessing.">别再瞎猜了。</h1>
<span class="field-title" data-en="How old are you?">你今年多大？</span>
```

### ② applyLang 函数（在页面 JS 里）
```js
var lang = "zh";
try { lang = localStorage.getItem("lang") || "zh"; } catch (e) {} // 复用主站 key
function t(zh, en) { return lang === "en" ? en : zh; }
function applyLang(l) {
  lang = l;
  document.querySelectorAll("[data-en]").forEach(function (el) {
    if (el.dataset.zh === undefined) el.dataset.zh = el.innerHTML;
    el.innerHTML = l === "en" ? el.dataset.en : el.dataset.zh;
  });
  document.documentElement.lang = l === "en" ? "en" : "zh-CN";
  document.getElementById("langBtn").textContent = l === "en" ? "中文" : "EN";
  try { localStorage.setItem("lang", l); } catch (e) {}
  if (hasSubmitted) renderResult(); // 已渲染的结果要重新渲染
}
document.getElementById("langBtn").addEventListener("click", function(){ applyLang(lang === "en" ? "zh" : "en"); });
if (lang === "en") applyLang("en"); // 初始化
```

### ③ 动态文案：用 `t(zh, en)` 包裹
所有 JS 动态生成的可见文本都要用 `t()`：
```js
el.textContent = t("岁。恭喜。", ". Congrats.");
```
**不要**在 JS 里硬编码中文。校验信息、结果模板、按钮反馈、AI 提示词——全都要双语。

### 卡片标签的双语
如果用选择卡片（如 002 的消费水平/经济假设），`state` 里要同时存中英两个名字：
```js
state.costName = lblEl.dataset.zh || lblEl.textContent;  // 中文
state.costNameEn = lblEl.dataset.en || state.costName;   // 英文
// 用的时候：t(state.costName, state.costNameEn)
```

## 4. 分享结构（统一 class 命名）

用 001 的 class 命名，**不要**自创：
```html
<div class="share-row">
  <button class="share-btn" id="copyBtn" data-en="Copy summary">复制文案</button>
  <button class="share-btn" id="shareImgBtn" data-en="Generate share image">生成分享图</button>
</div>
<div class="share-canvas-wrap" id="shareWrap">
  <canvas id="shareCanvas"></canvas>  <!-- 或 <img> -->
  <p class="share-hint" data-en="Long-press or right-click to save.">长按或右键保存。</p>
</div>
```
CSS：
```css
.share-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 28px; }
.share-btn {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  padding: 12px 20px; border: 1px solid var(--line-strong); background: none; color: var(--ink);
  cursor: pointer; border-radius: 4px; transition: all .2s;
}
.share-btn:hover { border-color: var(--ink); background: rgba(237,239,241,0.05); }
.share-btn.copied { border-color: var(--live); color: var(--live); }
```

## 5. footer 三段式

```html
<footer>
  <span class="mono"><a href="https://build-100.com/">build-100.com</a></span>
  <span class="mono"><a href="https://x.com/JCheng557" target="_blank" rel="noopener">@JCheng557</a></span>
  <span class="mono">CODE-NNN · 一句话标识</span>
</footer>
```
三段：主站链接 / X 账号 / 作品标识。**不要**写成一行长文本。

## 6. CSS 必须对齐的值

| 属性 | 值 | 说明 |
|---|---|---|
| `main { max-width }` | `880px` | 不要用 760 或其他值 |
| `.hero h1 { font-size }` | `clamp(2rem, 5.5vw, 3.4rem)` | |
| `.hero h1 { line-height }` | `1.14` | 不要用 1.32 |
| `.field-title { font-size }` | `clamp(1.05rem, 2vw, 1.25rem)` | |
| CSS 变量 | 和 001 完全一致 | --bg/--ink/--mono/--pad 等，连注释都保留 |

## 7. `prefers-reduced-motion`

必须有这个媒体查询块：
```css
@media (prefers-reduced-motion: reduce) {
  /* 禁用所有动画 */
  * { transition-duration: 0.01ms !important; }
}
```

## 8. beacon 注入

`</body>` 前加（见 launch-checklist 步骤 5.5）：
```html
<script src="/beacon.js"></script>
```

## 上线前自检清单

发布新作品前，对照这个清单逐条检查 `NNN/index.html`：

- [ ] title 是 `CODE-NNN · 描述` 格式
- [ ] favicon 只有 rect + text（y=42, font-size=20），无额外元素
- [ ] nav 有返回链接（带 data-en）+ 品牌 + 语言按钮
- [ ] 所有静态文本有 data-en
- [ ] JS 有 applyLang + langBtn + localStorage("lang")
- [ ] 所有动态文案用 t() 包裹
- [ ] 分享用 .share-row/.share-btn/.share-canvas-wrap
- [ ] footer 是三段式
- [ ] main max-width 880px
- [ ] 有 prefers-reduced-motion 媒体查询
- [ ] `</body>` 前有 beacon.js
- [ ] og:image 是 1200×628（1.91:1，见 launch-checklist 步骤 4 尺寸红线）
