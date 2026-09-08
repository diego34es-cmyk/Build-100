# PAPER GRID 运行手册

## 启动

```bash
cd lab/paper-grid
python3 -m http.server 4180 --bind 127.0.0.1
```

或在仓库根 `npm start`，打开 `/lab/paper-grid/`。

## 停止

对静态服务进程 Ctrl+C / `kill`。无守护进程、无数据目录。

## 备份 / 恢复

无状态。备份 = git 提交。恢复 = `git checkout -- lab/paper-grid`。

## 回滚

`git revert` 或检出上一标签。无迁移。

## 常见失败

| 现象 | 处理 |
|------|------|
| `file://` 下 import 失败 | 用 HTTP 静态服务 |
| `range_order` | 上沿必须 > 下沿 |
| `price_outside_range` | 当前价必须在带内 |
| 有人要把这里接交易所 | **拒绝。** 本目录只出纸面表 |

## Dry-run

唯一模式。没有 `--live` 开关。
