# A-UI 视觉保真下的 React 模块迁移

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge |
| 涉及模块 | Dashboard、设置、通知、提醒、项目、任务、文件、时间线 |
| 标签 | React、SQLite、IPC、视觉回归 |

---

## 需求背景

在不改变 `A-UI/展示/task-dashboard.html` 三栏布局、内容密度、甘特图和动画观感的前提下，将业务模块迁移为 React，并继续使用既有 SQLite 与安全 IPC。AI 建议和消息保持“正在开发中”。本阶段不处理发布事项。

---

## 设计思路

### 方案对比

| 方案 | 优点 | 缺点 | 为什么选/不选 |
|------|------|------|-------------|
| 全量重画 React Dashboard | 无 iframe | 容易偏离原稿；本轮第一次实现已出现明显视觉回归 | 不选 |
| A-UI 视觉壳 + React 功能模块 | 原稿像素、动画和内容稳定；可逐模块迁移业务 | 过渡期仍保留单个视觉 iframe | 选用 |

**最终选择：** 保留经过 Deskforge 品牌替换的 `public/dashboard.html` 作为唯一视觉基准，通过 `postMessage` 将功能入口路由到父级 React 模块。Renderer 只调用 Preload 白名单 API，数据继续由 Electron Main 写入 SQLite。

---

## 核心实现

### 模块范围

- `SettingsCenter`：设置、备份保留、导入导出、备份恢复、改密、更新状态及法律入口。
- `NotificationsCenter`：通知已读、提醒新增和删除。
- `ProjectsCenter`：项目创建/归档、进度与任务加入/移出。
- `TaskCenter`：任务看板、搜索、状态筛选、排序、详情及 CRUD。
- `FilesCenter`：本地文件索引添加、打开和移除。
- `TimelineCenter`：任务截止日期时间线及动画。
- `AnalysisCenter`：智能分析——真实 `workbench.dashboard()` 数据，统计卡片、任务流程分布、项目进度与文件概览。
- `TeamCenter`：团队协作——真实 `tasks.list()` 数据按负责人统计成员任务负载与逾期。

### 数据流 / 调用链

```text
A-UI 导航/甘特图 → postMessage → LegacyDashboardHost
  → React Feature → window.deskforge.* → Preload IPC
  → Electron Main Service/Repository → SQLite
```

---

## 技术难点

### 难点 1：React 化与一模一样的视觉要求冲突

- **挑战：** 新 React Shell 功能正确，但视觉结构偏离 `A-UI/展示`。
- **解决：** 以原 HTML 为唯一视觉基准，撤回新 Shell 的运行入口；保留已经完成的 React 业务组件，以桥接方式渐进替换功能弹层。

### 难点 2：真实打包环境验证

- **挑战：** 受限环境中的开发版 Electron 因 GPU 运行库退出。
- **解决：** 使用正式 `win-unpacked` 运行时和 CDP 验证，检查原三栏布局、甘特图、CSS 关键帧、品牌及各 React 弹层入口。

---

## 验证结果

```text
✅ Vite build：38 modules
✅ SQLite 任务、工作台、提醒、鉴权、数据和迁移测试
✅ IPC contract：55/55
✅ A-UI visual shell preserved; React modules, Gantt and animations passed
✅ Packaged A-UI runtime rendered with 6 tasks
✅ Deskforge A-UI branding, React settings and backup passed
✅ Deskforge-Setup-0.7.0.exe：93,037,621 bytes
✅ SHA-256：B49E91E6047D2FC3D2325E10637663EAE385EBE31BD8260E4332DF7C236C35AF
```

---

## 后续迭代：AnalysisCenter / TeamCenter（2026-08-19）

在 0.7.0 基础上将 iframe 内最后两个带业务数据的弹窗迁入 React：

### 变更

- 新增 `src/features/analysis/AnalysisCenter.jsx`：统计卡片（总/进行中/已完成/逾期）、任务流程分布、项目进度条、工作区概览与最近文件，全部来自 `window.deskforge.workbench.dashboard()`。
- 新增 `src/features/team/TeamCenter.jsx`：按任务 `owner` 聚合成员负载（总数/进行中/已完成/逾期），来自 `window.deskforge.tasks.list()`；新增 `rx-member-*` 样式类。
- `LegacyDashboardHost` 注册 `analysis`、`team` 两个模块路由。
- `task-dashboard.js`：删除 iframe 内部 `openAnalysisModal`/`openTeamModal`，导航 `'团队协作'`/`'智能分析'` 改为 `reactModule('team'/'analysis')` postMessage 桥接。

### 验证

```text
✅ Vite build：40 modules（新增 2 个模块）
✅ 无 lint 错误
✅ 删除函数无残留引用
✅ 数据字段与 SQLite 实际返回结构一致
```

### 剩余 iframe 内交互

- 工作区切换菜单（`openWorkspaceMenu` / `openNewWorkspaceModal`，真实 API）
- 全局搜索（`openGlobalSearch`，真实 API）
- 3D 卡片扇、看板过滤/排序、甘特图等纯视觉交互（保留在视觉壳内）

---

## 面试要点

### 如果让你重新设计，会怎么改进？

- 将原 A-UI CSS 抽为不可变视觉契约，再按区域将 HTML 转成同 DOM 结构的 React 组件，以截图基线约束每次替换。

### 涉及哪些设计模式？

- Adapter：Legacy Dashboard 事件适配到 React 模块路由。
- Repository/Service：Renderer 与 SQLite 之间隔离数据访问。
- Strangler Fig：保持旧视觉稳定，逐模块替换内部实现。

### 性能 / 安全 / 扩展性考量？

- `contextIsolation` 与 IPC 白名单不变，Renderer 不直接访问 Node.js 或数据库。
- React 弹层按需挂载；原页面动画继续由浏览器合成层执行。
