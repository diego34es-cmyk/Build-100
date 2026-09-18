# Obsidian · Tokyo 项目记录同步

每次发布第 NNN 号作品后，**必须**更新 Obsidian vault，与主站部署同等重要。

## Vault 位置

```
/root/tokyo-vault/
```

入口：[[01-项目记录/00-索引]]（Obsidian 内路径 `01-项目记录/00-索引.md`）

BUILD-100 专题目录：`01-项目记录/BUILD-100/`

## 每次发布要改什么

### 1 · 发布记录（必做）

文件：`01-项目记录/BUILD-100/发布记录.md`

在表格**顶部**追加一行（最新在上）：

```markdown
| YYYY-MM-DD | NNN | CODE-NNN | 一句话中文 | [[NNN-代号]] |
```

日期用 Signal 区 `log-date` 同一天。

### 2 · 作品笔记（必做）

- **新作品**：新建 `01-项目记录/BUILD-100/NNN-代号.md`
- **已有作品逻辑变更**：更新对应笔记的「核心逻辑」节

笔记最少包含这些节（可复制模板）：

```markdown
# NNN · CODE-NNN · 中文名

← [[00-概览|BUILD-100 概览]]

## 主旨
**痛点**：…
**主张**：…

## 用户输入
…

## 核心逻辑
…

## 线上
- URL：https://build-100.com/NNN/
- 源码：`/var/www/build100/NNN/`
- GitHub：https://github.com/diego34es-cmyk/Build-100/tree/main/NNN

## 视觉
- 强调色：…
```

信息来源优先级：

1. 作品页 hero / meta description
2. `engine.js` 或内联算法
3. 主站清单 `data-sub` / `data-sub-en`
4. Signal 区上线文案

### 3 · 概览与索引（必做）

- `01-项目记录/BUILD-100/00-概览.md`：作品一览表加一行，`SITE.completed` 对齐
- `01-项目记录/00-索引.md`：BUILD-100 状态改为 `N / 100 已上线`；作品索引表加一行

### 4 · 开发日志（可选）

有重大架构决策或翻车时，在 `03-开发日志/YYYY-MM-DD.md` 记一笔，文末链到 `[[01-项目记录/BUILD-100/发布记录]]`。

## 验证

```bash
# 发布记录含新编号
grep "NNN" /root/tokyo-vault/01-项目记录/BUILD-100/发布记录.md

# 作品笔记存在
test -f /root/tokyo-vault/01-项目记录/BUILD-100/NNN-*.md && echo OK

# 概览进度已更新
grep "NNN" /root/tokyo-vault/01-项目记录/BUILD-100/00-概览.md
```

## 注意

- Obsidian 用 `[[wikilink]]` 双链；文件名与链接一致
- **不要**把 `beacon.js`、`.env`、服务器密码写进 vault
- vault 在服务器本地，改完即生效；若另有同步盘，按用户习惯 commit/push
