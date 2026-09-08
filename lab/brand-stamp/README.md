# BRAND-STAMP · BUILD-100 品牌戳（规格 + 骨架）

提案 #3。给每个新站生成同一套 OG / favicon / 编号戳，避免每站手画一遍。

## 要解决的痛

001–013 各自有 `og-NNN.png` 和内联 SVG favicon，规则相近、实现复制。主站 `og-004.png` 曾落后于最新编号。品牌一致性是重复劳动，不是新 SaaS。

证据：各站 `og-*.png` + 主站 root OG；本次任务 related interests「品牌资产」。

## 不做

- 不接付费设计云。
- 不把生成大图提交进 git（gitignore `demo-*.png` 已有）。
- 不自动发 X / 不自动改生产 nginx。

## 范围（MVP 规格）

1. 输入：`id`（001–100）、`code`（如 LOCK）、`sub_zh`、`sub_en`。
2. 输出：SVG favicon data URI + 1200×628 OG 的 canvas 指令（或 Playwright 可选，默认不装）。
3. 校验：编号三位、code `[A-Z0-9-]{2,16}`。
4. Dry-run 默认：打印将要写入的路径，不写文件；`--write` 才输出到 `tmp/`。

## 骨架

- `engine.js`：`planStamp(input)` 做校验；写文件未实现。
- 测试锁住校验与 dry-run 默认。

## 验收

- 同一输入两次 plan 字节稳定。
- `--write` 与 dry-run 有测试分叉。
- 不覆盖 `001/`–`013/` 已有 og，除非显式 `--force`。
