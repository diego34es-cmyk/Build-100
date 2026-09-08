# PAPER GRID · 纸面网格表

等距网格工作表。只算档位与名义金额，**不下单、不连交易所、不签名**。

这是 BUILD-100 工业化提案的 #1 MVP，放在 `lab/`，不进入已上线的 `001/`–`013/`。

## 安装 / 运行 / 测试

无需安装依赖（Node ≥ 20）。

```bash
cd lab/paper-grid
npm test
```

本地打开页面（仓库根已有 `npm start`；或本目录）：

```bash
cd lab/paper-grid
python3 -m http.server 4180 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:4180/
```

模块页必须通过 HTTP 打开，不要用 `file://`。

## 行为

- 输入：本金、下沿、上沿、档数、当前价。
- 当前价必须落在带内；上沿必须大于下沿。
- 输出：`BUY_PAPER` / `SELL_PAPER` / `SPOT_MARK`。`liveOrders` 恒为 `false`。
- 空/错：校验失败只返回 `{ ok:false, error }`，页面留在表单并显示错误。

## CI

仓库根 `npm test` 会跑本目录测试。见 `../../.github/workflows/ci.yml`。

## 运维

见 [RUNBOOK.md](./RUNBOOK.md)。
