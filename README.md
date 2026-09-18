# BUILD-100 — The 100 Websites Project

**一个人 + AI，公开做 100 个网站。** 代码全开源，工作流、成本、翻车、复盘全记录。

**One person + AI, building 100 websites in public.** All code open-sourced — workflow, cost, failures, and debriefs included.

- 主页 / Home: **[build-100.com](https://build-100.com)**
- 追更 / Follow: **[@Jcheng557 on X](https://x.com/Jcheng557)**

## 进度 / Progress: 021 / 100

| # | 站点 | 一句话 | LIVE | SOURCE |
|---|------|--------|------|--------|
| 001 | **COMBO-001** | AI 订阅最优搭配器 | [build-100.com/001](https://build-100.com/001/) | [`/001`](./001) |
| 002 | **RETIRE-002** | 只管存钱的退休计算器 | [build-100.com/002](https://build-100.com/002/) | [`/002`](./002) |
| 003 | **PROMPT-003** | 提示词结构器 | [build-100.com/003](https://build-100.com/003/) | [`/003`](./003) |
| 004 | **WEEK-004** | 下个礼拜会怎样 | [build-100.com/004](https://build-100.com/004/) | [`/004`](./004) |
| 005 | **LOCK-005** | 扫尾盘图书馆 | [build-100.com/005](https://build-100.com/005/) | [`/005`](./005) |
| 006 | **LIFE-006** | 生活麻烦工具箱 | [build-100.com/006](https://build-100.com/006/) | [`/006`](./006) |
| 007 | **PPP-007** | 欧洲 vs 国内购买力 | [build-100.com/007](https://build-100.com/007/) | [`/007`](./007) |
| 008 | **REGRET-008** | 订阅后悔计算器 | [build-100.com/008](https://build-100.com/008/) | [`/008`](./008) |
| 009 | **INTUIT-009** | 金融直觉馆 | [build-100.com/009](https://build-100.com/009/) | [`/009`](./009) |
| 010 | **DECIDE-010** | 决策一页纸 | [build-100.com/010](https://build-100.com/010/) | [`/010`](./010) |
| 011 | **PAPER-011** | 办事清单生成器 | [build-100.com/011](https://build-100.com/011/) | [`/011`](./011) |
| 012 | **PLAY-012** | 3 分钟金融小游戏 | [build-100.com/012](https://build-100.com/012/) | [`/012`](./012) |
| 013 | **INDEX-013** | 分类总目录 | [build-100.com/013](https://build-100.com/013/) | [`/013`](./013) |
| 014 | **VAULT-014** | 本地隔离柜 | [build-100.com/014](https://build-100.com/014/) | [`/014`](./014) |
| 015 | **METASTRIP-015** | 发图前清 EXIF | [build-100.com/015](https://build-100.com/015/) | [`/015`](./015) |
| 016 | **WHYSAVE-016** | 收藏坟场复盘 | [build-100.com/016](https://build-100.com/016/) | [`/016`](./016) |
| 017 | **REDACT-017** | 截图脱敏打码 | [build-100.com/017](https://build-100.com/017/) | [`/017`](./017) |
| 018 | **UNHIDE-018** | 粘贴前揭隐形字 | [build-100.com/018](https://build-100.com/018/) | [`/018`](./018) |
| 019 | **OGCARD-019** | 粘贴 meta 预览分享卡 | [build-100.com/019](https://build-100.com/019/) | [`/019`](./019) |
| 020 | **BOTRULES-020** | AI 爬虫 robots.txt | [build-100.com/020](https://build-100.com/020/) | [`/020`](./020) |
| 021 | **LLMSTXT-021** | 一键出 llms.txt | [build-100.com/021](https://build-100.com/021/) | [`/021`](./021) |


## 结构 / Structure

- 每个站一个编号目录（`001/`、`002/`…），纯静态，无构建步骤
- `index.html` 是主站
- 各站的实现规范与决策记录随复盘发布在 X

## 技术底线 / Ground rules

- HTML + Vanilla JS，能不上框架就不上
- 数据文件独立可替换（如 `001/data/models.json`）
- 引擎逻辑纯函数 + `node --test` 测试（如 `001/engine.test.js`，`cd 001 && npm test`）

---

*Est. 2026 · No deadline. Done when it's done.*
