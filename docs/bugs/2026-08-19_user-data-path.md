# [开发模式数据库写入 Electron 默认目录]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 严重程度 | P1-功能阻断 |
| 关联项目 | Deskforge |
| 相关文件 | `electron/main.cjs` |
| 触发条件 | 使用 `npm run dev` 启动未打包 Electron |

---

## 现象描述

应用与 SQLite 均启动成功，但数据库被创建在 `%APPDATA%/Electron/deskforge.db`，不符合 Deskforge 产品数据目录规范。

---

## 排查过程

| 步骤 | 假设 | 验证方法 | 结果 |
|------|------|---------|------|
| 1 | 数据库未创建 | 在 `%APPDATA%` 搜索 `deskforge.db` | 找到 `%APPDATA%/Electron/deskforge.db` |
| 2 | `userData` 路径受应用名影响 | 检查 Electron 开发模式应用名 | 默认为 `Electron` |
| 3 | 固定产品名可统一路径 | 在 `whenReady` 前调用 `app.setName('Deskforge')` | 数据库创建到正确目录 |

关键转折点：数据库逻辑正常，错误来自 Electron 开发模式的默认应用名称。

---

## 根因分析

```text
app.getPath('userData') 基于应用名称计算目录；开发模式未显式设置名称时使用 Electron。
```

---

## 解决方案

**修改的文件：**

1. `electron/main.cjs` — 在应用就绪前调用 `app.setName('Deskforge')`。

**核心 diff 逻辑：**

```javascript
let store;
app.setName('Deskforge');
```

验证路径：`C:\Users\JaysonGuo\AppData\Roaming\Deskforge\deskforge.db`。

---

## 面试要点

### 这个问题考察什么能力？
- Electron 生命周期、开发/生产环境差异和用户数据目录管理。

### 回答思路
1. 验证文件是否生成。
2. 定位实际路径。
3. 追踪 `userData` 与应用名的关系。

### 延伸追问
- Q: 为什么数据库不能放在安装目录？
  A: `Program Files` 可能只读，升级或卸载也可能覆盖/删除安装目录内容。
