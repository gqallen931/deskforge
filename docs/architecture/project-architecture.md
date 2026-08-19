# Deskforge 工程架构文档

> **版本**: 0.3.0
> **状态**: 活跃开发中
> **定位**: 本地优先、可安装到 Windows 的个人工作台桌面软件
> **技术栈**: Electron + React + Vite + 原生 HTML/CSS/JavaScript + SQLite
> **最后更新**: 2026-08-19

---

## 一、技术栈

### 1.1 前端与桌面端

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面框架 | Electron | 37.10.3 | Windows 窗口、IPC、本地文件与安装包运行时 |
| UI 框架 | React | 19.2.8 | 应用入口与 Dashboard 容器 |
| 构建工具 | Vite | 7.3.6 | 开发服务器与生产构建 |
| 展示层 | 原生 HTML/CSS/JavaScript | — | 保持 `A-UI/展示` 的视觉、动画与交互一致 |
| 打包工具 | electron-builder | 26.15.3 | 生成 NSIS Windows 安装包 |

### 1.2 本地数据层

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 运行时 | Electron Main / Node.js | Electron 内置 | 本地业务逻辑与安全 IPC |
| 数据库 | `node:sqlite` / SQLite | Electron 内置 | 单机持久化，无需用户安装数据库 |
| 数据模型 | `task_groups`、`tasks` | v2 | 结构化保存分组、任务、负责人、优先级、日期和状态 |
| 兼容层 | `app_state` 键值表 | v1 | 仅用于旧 Dashboard 快照首次迁移 |
| 设置 | `settings` 键值表 | v1 | 白名单保存用户和显示偏好 |
| 工作台模型 | `workspaces`、`projects`、`tags`、`task_tags`、`workspace_files`、`notifications` | v1 | P0 本地工作台业务数据 |

当前不启用 MySQL 或独立 Web 后端。需要账号、跨设备同步或多人协作时，再评估 Python + FastAPI + MySQL/PostgreSQL。

---

## 二、目录结构

```text
deskforge/
├── package.json
├── package-lock.json
├── .npmrc
├── index.html
├── vite.config.js
├── electron/
│   ├── main.cjs                  # Electron 主进程、窗口和 IPC
│   ├── preload.cjs               # 安全暴露 SQLite API
│   ├── database.cjs              # SQLite 状态仓库
│   ├── database-check.cjs        # SQLite 往返验证
│   ├── task-repository.cjs       # 任务与分组参数化 SQL
│   ├── task-service.cjs          # 校验与任务业务规则
│   ├── task-service-check.cjs    # 任务 CRUD 单元验证
│   ├── data-manager.cjs          # JSON、备份恢复、设置业务
│   ├── data-manager-check.cjs    # 数据安全回归验证
│   ├── workbench-service.cjs     # 工作区、项目、标签、文件、通知和搜索
│   └── workbench-service-check.cjs # P0 业务回归验证
├── src/
│   ├── main.jsx                  # React 入口
│   ├── App.jsx                   # Dashboard iframe 容器
│   └── styles.css                # 全屏容器样式
├── public/
│   ├── dashboard.html            # 原始 Dashboard 视觉基准
│   └── task-dashboard.js         # 原始交互 + 结构化任务 API 适配
├── scripts/
│   ├── verify-task-buttons.cjs   # 真实 EXE 按钮/SQLite 端到端验证
│   ├── verify-packaged-runtime.cjs # 打包版渲染与数据一致性验证
│   ├── verify-productization.cjs # 品牌、设置和备份真实 EXE 验证
│   └── verify-workbench-buttons.cjs # 工作台按钮真实 EXE 验证
├── build/
│   ├── icon.svg                  # 品牌图标矢量母版
│   ├── icon.png                  # 图标位图预览
│   └── icon.ico                  # Windows 发布图标
├── dist/                         # Vite 构建产物
├── release/                      # Windows 安装包与未安装版
├── docs/                         # 工程文档
└── _templates/                   # 文档模板与规范
```

---

## 三、系统架构

### 3.1 进程模型

```text
用户启动 Deskforge
    │
    ├─ Electron Main
    │   ├─ 固定应用名 Deskforge
    │   ├─ 创建 BrowserWindow
    │   ├─ 初始化 %APPDATA%/Deskforge/deskforge.db
    │   ├─ 初始化 Repository / Service
    │   └─ 注册存储、任务、工作台、数据管理与设置 IPC
    │
    ├─ Preload（contextIsolation=true）
    │   └─ 暴露 tasks、workbench、projects、files、tags、notifications 等最小业务 API
    │
    └─ Renderer
        ├─ React 加载全屏 Dashboard iframe
        └─ task-dashboard.js 从结构化任务数据重建界面并调用业务 API
```

### 3.2 安全边界

| 设置 | 当前值 | 目的 |
|------|--------|------|
| `contextIsolation` | `true` | 隔离网页与 Node.js 上下文 |
| `nodeIntegration` | `false` | 阻止页面直接访问 Node.js |
| Preload API | `storage`、`tasks`、`groups`、`data`、`settings` | 只暴露业务操作，不暴露 SQL 和文件系统 |

### 3.3 任务数据链路

```text
用户点击任务按钮
    → task-dashboard.js
    → window.parent.deskforge.tasks.*
    → Preload ipcRenderer.invoke
    → Electron Main TaskService
    → TaskRepository 参数化 SQL
    → SQLite tasks / task_groups
    → 返回记录后更新 Dashboard DOM

首次结构化启动
    → 若 tasks 为空，恢复旧 app_state 快照
    → 将当前 Dashboard 分组和任务 seed 到结构化表
后续启动
    → 从 tasks / task_groups 查询
    → 重建任务分组、详情和负责人
```

---

## 四、接口

| IPC 通道 | 方向 | 用途 |
|----------|------|------|
| `db:load` | Renderer → Main | 读取 Dashboard 状态 |
| `db:save` | Renderer → Main | 写入 Dashboard 状态 |
| `tasks:list` / `tasks:seed` | Renderer → Main | 查询任务或执行首次迁移 |
| `tasks:create` / `tasks:update` | Renderer → Main | 新建或编辑任务 |
| `tasks:complete` | Renderer → Main | 完成任务 |
| `tasks:archive` / `tasks:remove` | Renderer → Main | 归档或删除任务 |
| `groups:create` | Renderer → Main | 新建任务分组 |
| `settings:get` / `settings:save` | Renderer → Main | 读取和保存白名单设置 |
| `data:export` / `data:import` | Renderer → Main | JSON 数据迁移 |
| `data:backup` / `data:restore` | Renderer → Main | 本地备份与安全恢复 |
| `workbench:dashboard` / `workbench:search` | Renderer → Main | 聚合统计与跨模块搜索 |
| `workspaces:create` / `workspaces:switch` | Renderer → Main | 工作区管理 |
| `projects:*` | Renderer → Main | 项目列表、创建和归档 |
| `tags:*` | Renderer → Main | 标签列表和任务关联 |
| `files:*` | Renderer → Main | 文件选择、登记、打开和移除记录 |
| `notifications:*` | Renderer → Main | 本地通知和已读状态 |

没有 HTTP API、远程数据库和账号服务。

---

## 五、启动与构建

### 5.1 开发模式

```powershell
cd D:\WebStorm-work\wenxibuddy-main\deskforge
npm install
npm run dev
```

开发模式启动 Vite `127.0.0.1:5173`，随后启动 Electron。

### 5.2 验证

```powershell
npm run verify:db
npm run verify:tasks
npm run verify:data
npm run verify:workbench
npm run build
npm run verify:package-assets
```

打包版运行时验证：以远程调试端口启动未安装版后，执行 `npm run verify:packaged-runtime` 和 `npm run verify:task-buttons`。

### 5.3 Windows 安装包

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
npm run package:win
```

输出：`release/Deskforge-Setup-0.3.0.exe`。

---

## 六、设计原则

1. 本地优先：没有网络也能运行。
2. 最小依赖：SQLite 使用 Electron/Node 内置能力。
3. 视觉基准唯一：以 `A-UI/展示` 为当前 1:1 参考。
4. 安全 IPC：渲染进程不直接获得 Node.js 权限。
5. 先稳定产品内核，再逐步将原生 Dashboard 组件化。

---

## 七、已知限制

| 限制 | 原因 | 计划 |
|------|------|------|
| `node:sqlite` 有 ExperimentalWarning | Electron 37 对该 API 仍标记实验性 | 发布前评估升级 Electron 或切换稳定 SQLite 驱动 |
| Dashboard 通过 iframe 接入 | 优先保证原页面 1:1 动画和内容 | 分模块迁移到 React，期间保持视觉回归 |
| 消息与多人协作尚未启用 | 当前为本地单机产品，无账号服务 | 云同步阶段增加服务端和身份系统 |
| 备份恢复通过文件选择器操作 | 当前优先保证安全与可控 | 后续增加应用内备份历史列表和保留策略 |
| `package.json` 缺少 author | 商业元数据未完善 | 发布前补充公司/作者信息 |
| 安装包未配置商业代码签名证书 | 当前仅内部测试 | 正式分发前购买并配置 Windows 代码签名 |
| 生产构建必须保持相对资源路径 | Electron 使用 `file://` 加载 `dist/index.html` | `vite.config.js` 固定 `base: './'`，并执行资源回归检查 |

---

## 版本变更记录

| 版本 | 日期 | 更新摘要 | 触发原因 |
|------|------|---------|---------|
| 0.1.0 | 2026-08-19 | Electron + React 壳、原始 Dashboard、SQLite、本地 NSIS 安装包 | 建立可运行的 Windows 单机版本 |
| 0.2.0 | 2026-08-19 | JSON 导入导出、备份恢复、设置、Deskforge 品牌和 Windows 图标 | 建立可迁移、可恢复的产品化单机版本 |
| 0.3.0 | 2026-08-19 | 工作区、项目、标签、文件、通知、搜索、统计和备份 v2 | 完成本地个人工作台 P0 业务闭环 |
