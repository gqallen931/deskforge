# [SQLite 本地持久化]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge |
| 涉及模块 | Electron Main、Preload、Dashboard |
| 标签 | SQLite、IPC、本地优先 |

---

## 需求背景

原始 Dashboard 的任务操作只存在于页面内存，刷新或重启后丢失。单机商业软件必须在无网络环境下保存个人任务数据，同时不能要求用户安装数据库服务。

---

## 设计思路

### 方案对比

| 方案 | 优点 | 缺点 | 为什么选/不选 |
|------|------|------|-------------|
| Electron 内置 SQLite | 无额外依赖、事务可靠、可随 EXE 使用 | API 当前有实验性提示 | 选择，符合最小依赖和单机目标 |
| `better-sqlite3` | API 稳定、生态成熟 | 原生模块需要 Electron ABI 重建 | 当前阶段不选 |
| MySQL | 适合服务端多人系统 | 单机安装复杂 | 不选 |

**最终选择：** Electron 主进程使用 `node:sqlite`，通过最小 IPC 接口提供读写。

---

## 核心实现

### 关键代码

```text
database.cjs 负责建表和 JSON 往返读写
preload.cjs 暴露 storage.load/save
main.cjs 注册 db:load/db:save
task-dashboard.js 恢复状态并通过 MutationObserver 防抖保存
```

### 数据流 / 调用链

```text
Dashboard 操作 → DOM 变化 → 快照 → IPC → SQLite
SQLite → IPC → 恢复分组、任务详情、负责人、序号和筛选状态
```

---

## 技术难点

### 难点 1: 保持原始动画和交互不变
- **挑战：** 原页面不是 React 数据驱动实现，直接重写容易造成视觉偏差。
- **解决：** 保留页面和交互脚本，通过状态快照接入持久化层。

### 难点 2: Electron 安全隔离
- **挑战：** 页面不能直接获得 Node.js 和文件系统权限。
- **解决：** 保持 `contextIsolation=true`、`nodeIntegration=false`，仅暴露两个 IPC 方法。

---

## 面试要点

### 如果让你重新设计，会怎么改进？
- 数据量和业务稳定后，将单条状态 JSON 迁移为标准化任务、项目、标签和事件表。

### 涉及哪些设计模式？
- Repository：`database.cjs` 隔离存储实现。
- Observer：`MutationObserver` 监听界面状态变化。
- Bridge：Preload 在渲染进程和主进程之间建立受控桥梁。

### 性能 / 安全 / 扩展性考量？
- 120ms 防抖减少写入；渲染进程不接触数据库；未来可通过 schema migration 扩展。
