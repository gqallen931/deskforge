# [任务管理模块结构化与按钮闭环]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge |
| 涉及模块 | Dashboard、Electron IPC、SQLite |
| 标签 | 前后端交互、任务管理、产品化 |

---

## 需求背景

当前 Dashboard 已具备完整视觉和演示交互，但部分数据通过 DOM 快照保存，部分按钮仍是演示反馈。商业单机软件需要明确的数据模型、稳定的前后端契约和真实可验证的业务操作。

---

## 设计思路

### 方案对比

| 方案 | 优点 | 缺点 | 为什么选/不选 |
|------|------|------|-------------|
| 逐个按钮直接写 SQLite | 初期看起来快 | 数据逻辑分散、后续难测试和迁移 | 不选 |
| 先建立数据模型、Repository 和 IPC，再接按钮 | 边界清晰、可测试、便于扩展 | 前期多一个基础阶段 | 选择 |
| 增加 Python/Java HTTP 后端 | 适合远程协作 | 单机阶段增加进程和部署成本 | 暂不选择 |

**最终选择：** Electron Main 作为本地后端，SQLite 作为数据库，Preload 提供最小业务 API，前端只调用业务方法。

---

## 核心实现

### 已实现数据流

```text
用户点击按钮
  → Dashboard 事件
  → window.deskforge.tasks.create/update/complete/remove
  → Preload IPC
  → Electron Main Service
  → SQLite Repository
  → 返回最新业务数据
  → 前端重新渲染状态
```

### 实施顺序

| 优先级 | 范围 | 功能 |
|--------|------|------|
| P0 | 数据基础 | 数据库迁移、tasks/projects/groups/tags/settings 表、Repository、输入校验 |
| P0 | 任务闭环 | 新建、查看、编辑、完成、删除、归档、重启后恢复 |
| P0 | 列表能力 | 搜索、状态筛选、负责人筛选、优先级排序、分组管理 |
| P1 | 数据管理 | JSON 导入导出、备份恢复、标签管理 |
| P1 | 时间能力 | 真实截止日期、甘特图数据联动 |
| P2 | 扩展模块 | 通知、消息、个人资料、设置、AI 建议 |

### 本次完成范围

| 能力 | 实现结果 |
|------|---------|
| 数据模型 | 新增 `task_groups`、`tasks` 与索引，任务编号采用 `DF-YYYY-NNNN` |
| 分层 | Repository 负责参数化 SQL，Service 负责输入校验和状态规则 |
| 安全接口 | Preload 暴露任务级方法，Renderer 不接触 Node.js、文件系统或 SQL |
| 数据迁移 | 结构化表为空时，先恢复旧 `app_state`，再将当前 Dashboard 内容一次性迁移 |
| 按钮闭环 | 新建、编辑、完成、归档、删除任务及新建分组均先写库再更新界面 |
| 异步体验 | Modal、Dropdown 支持 Promise、提交禁用和统一错误提示 |

### 验证结果

```text
✅ Task service CRUD passed
✅ SQLite round-trip passed
✅ Task buttons CRUD passed
✅ Packaged runtime rendered: WenXiBuddy · 任务管理
✅ 数据库任务数与页面任务数一致
✅ Vite 生产构建及 file:// 资源检查通过
```

### 未纳入本次范围

- 搜索、状态筛选和现有排序继续使用页面端逻辑；任务数据来源已切换为 SQLite。
- JSON 导入导出、通知、消息、AI 建议、设置和云同步属于后续阶段。

---

## 技术难点

### 难点 1: 从 DOM 快照迁移到结构化数据
- **挑战：** 当前界面状态和业务数据混合在页面 DOM 中。
- **解决：** 保留视觉层，逐个业务动作替换为 IPC 调用，迁移完成后停止保存 HTML 快照。

### 难点 2: 防止渲染进程越权
- **挑战：** 前端不能直接执行 SQL 或访问文件系统。
- **解决：** Preload 仅暴露任务级业务方法，主进程统一校验输入并执行事务。

---

## 面试要点

### 如果让你重新设计，会怎么改进？
- 先定义领域模型和业务事件，再将旧页面视为一个可替换的渲染适配器。

### 涉及哪些设计模式？
- Repository：隔离 SQLite。
- Service Layer：集中业务规则。
- Bridge：Preload IPC。
- Adapter：让旧 Dashboard 接入新业务 API。

### 性能 / 安全 / 扩展性考量？
- SQL 参数化、主进程输入校验、事务写入、schema version 迁移；未来可将 Service 接到同步后端而不重写 UI。
