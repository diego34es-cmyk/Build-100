# 实施计划

顺序锁死：P0 → P1 → P2 → P3 → P4。不跳门。

## P0 发现（本阶段产出）

- [x] 结构 / 栈 / 入口 / 测试 / CI / 部署 / 密钥扫描 / `git log -30`（完成）
- [x] `user-intent.md`（每行 Evidence/Inference）
- [x] `project-map.md`
- [x] `industrial-gap.md`
- [x] 本文件

## P1 工业化（固定顺序）

1. **干净安装 + 启动**  
   根 `package.json` 改为可复现脚本：`npm ci`（或无多余依赖时零安装）+ `npm start` 静态服务。删除未使用的 `playwright-core`，除非马上写成冒烟。
2. **密钥 / 危险默认**  
   扫描后保持不入库；补 `.env.example`（PORT、可选 mock 开关）。`beacon.js` 继续 gitignore。
3. **关键路径测试**  
   保留 001/003；抽出 002 `compute`；catalog 一致性；006–013 收回后跑原测试；004 对 mock 输入校验写测试。
4. **最小 CI**  
   GitHub Actions：`node --test` 全仓 + `node --check` + catalog 检查。
5. **错误 / 日志**  
   `scripts/serve.mjs` 分级日志；`/health` JSON；004 无 API 时展示可恢复错误（已有 UI，本地 mock 补齐）。
6. **配置外置**  
   `catalog.json` 为清单与计数唯一源；检查脚本防止主站与目录漂移。
7. **README + runbook + CHANGELOG**  
   中文为主、中英对照命令；runbook 含启动/停止/备份/恢复/回滚/常见失败。
8. **产品路径打磨（不大做新功能）**  
   主站进度与线上 013 对齐；收回已上线 005–013；补空态/移动端不破坏。P4 新作品进 `lab/`。

## P2 审查

- 当自己没写过这些代码：`review.md` Critical/High/Medium/Low。
- 只修 Critical + High，再验证，然后才 P3。

## P3 组合

- `portfolio.md`：每站一张卡。
- `needs-model.md`：只留 ≥2 个项目或反复痛点支持的需求；写明 owner **不需要**什么。

## P4 新项目

- 评 3–5 个，紧扣已有主题（纸面金融结构、西语行政、个人运维、小游戏、品牌资产）。不发明无关 SaaS。
- #1：`lab/paper-grid/` 可运行 MVP + 测试 + README + 进 CI + runbook。默认 dry-run，无下单。
- #2/#3：完整规格 + 骨架目录。

## 明确不做

- 不 SSH / 不改 43.167.166.94。
- 不 force-push、不改历史。
- 不提交密钥、beacon 会话、真实交易。
- 不把 P4 MVP 塞进已硬化的 `001/`–`013/`。
