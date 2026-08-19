# Deskforge 开发日志

> **文档类型**: 开发过程记录（Development Journal）
> **执行日期**: 2026-08-19
> **基于文档**: [project-architecture.md](./project-architecture.md) v0.3.0
> **执行环境**: Windows 10.0.19045、Node.js 24.18.0、npm 11.16.0、PowerShell
> **记录人**: Codex

---

## 目录

1. [总体思路](#1-总体思路)
2. [阶段实施](#2-阶段实施)
3. [关键技术决策记录](#3-关键技术决策记录)
4. [回归测试记录](#4-回归测试记录)
5. [文件变更总览](#5-文件变更总览)
6. [待完成工作](#6-待完成工作)

---

## 1. 总体思路

### 1.1 问题分析

原项目是 `A-UI/展示` 下的静态 WenXiBuddy Dashboard。目标是保留其内容、动画与交互，逐步构建为名为 Deskforge 的商业 Windows 单机软件，并实现无需 MySQL 的本地持久化和 EXE 安装包。

### 1.2 任务拆解策略

| 阶段 | 依赖 | 可并行 |
|------|------|--------|
| 建立 Electron + React 壳 | 无 | — |
| 原样接入 Dashboard | 桌面壳 | 与品牌准备并行 |
| 接入 SQLite 与安全 IPC | Dashboard | 与打包配置并行 |
| 修复 Electron 安装链路 | 依赖清单 | 否 |
| 生成并验证 Windows 安装包 | 前述全部 | 否 |

### 1.3 实施方法

优先复用现有展示页面，避免重写导致动画偏差；使用 Electron 内置 SQLite 保持最少依赖；每个阶段执行语法检查、SQLite 往返检查、Vite 构建和桌面启动验证。

---

## 2. 阶段实施

### 2.1 阶段一：Deskforge 桌面项目

#### 思考过程

项目从静态页面演进为 Windows 软件，需要桌面窗口、受控本地能力和安装器。采用 Electron + React + Vite；React 当前只负责入口，不立即重写成熟展示稿。

#### 创建了什么

| 文件 | 说明 |
|------|------|
| `package.json` | 开发、构建、SQLite 验证和 NSIS 打包脚本 |
| `electron/main.cjs` | Electron 主进程 |
| `electron/preload.cjs` | 安全桥接 |
| `src/*` | React/Vite 入口与全屏容器 |

#### 验证结果

```text
✅ npm run build
✅ Electron 37.10.3 启动
```

### 2.2 阶段二：1:1 接入原 Dashboard

#### 思考过程

手动重写 React 版本会造成动画和交互差异，因此将原页面复制为 Deskforge 的独立发布资产，并用全屏 iframe 承载。

#### 创建了什么

| 文件 | 说明 |
|------|------|
| `public/dashboard.html` | 原始展示页副本 |
| `public/task-dashboard.js` | 原始交互脚本与后续持久化适配 |

#### 验证结果

```text
✅ Dashboard 与 task-dashboard.js 被复制到 dist
✅ 开发服务器可访问 /dashboard.html
```

### 2.3 阶段三：SQLite 本地持久化

#### 思考过程

单机应用不需要 MySQL 服务。为保持现有 DOM 驱动代码，第一版存储完整状态快照，而不是立即重构全部数据模型。

#### 创建了什么

| 文件 | 说明 |
|------|------|
| `electron/database.cjs` | SQLite 仓库 |
| `electron/database-check.cjs` | 临时数据库往返测试 |

#### 改进了什么

| 文件 | 改动内容 | 为什么 |
|------|---------|--------|
| `electron/main.cjs` | 初始化数据库、注册 IPC | 数据库只能由主进程访问 |
| `electron/preload.cjs` | 暴露 load/save | 保持上下文隔离 |
| `public/task-dashboard.js` | 恢复和防抖保存状态 | 保留原界面实现 |

#### 验证结果

```text
✅ npm run verify:db → SQLite round-trip passed
✅ 数据库创建于 %APPDATA%/Deskforge/deskforge.db
```

### 2.4 阶段四：依赖恢复与 Electron 下载

#### 操作步骤

1. 用户清理 `node_modules` 和 `package-lock.json`。
2. `.npmrc` 使用 npmmirror registry。
3. Electron 和 electron-builder 二进制使用 npmmirror。
4. 执行 `npm install --verbose`。
5. 验证 `electron --version` 为 37.10.3。

#### 遇到的问题

- 默认 Electron 二进制源连接超时。
- 在仓库根目录执行 `npm run dev` 时找不到 `package.json`。

#### 解决方案

- 所有 npm 命令改在 `deskforge` 目录执行。
- 分别配置 npm registry 与 Electron/Builder 二进制镜像。

### 2.5 阶段五：Windows 安装包

#### 关键实现

```text
electron-builder --win nsis
productName=Deskforge
oneClick=false
allowToChangeInstallationDirectory=true
createDesktopShortcut=true
```

#### 验证结果

```text
✅ release/win-unpacked/Deskforge.exe 启动并保持运行
✅ release/Deskforge-Setup-0.1.0.exe 生成
✅ 最新安装包大小 92,672,877 字节，SHA-256: 7EF91195F9A6D7FE1CE402C210160DE20EDD0A5428A0E99C1E7D6A480E66F478
✅ 使用 Deskforge 品牌图标
⚠️ package.json 缺少 author
⚠️ 未配置商业代码签名证书
```

### 2.6 阶段六：修复打包版黑屏

#### 思考过程

用户截图显示窗口和菜单栏存在但渲染区域黑屏，先建立生产资源检查作为反馈环。检查首次运行稳定失败，并明确指出 `/assets/...` 绝对路径。ASAR 列表证明文件未遗漏，排除了打包配置问题。

#### 改进了什么

| 文件 | 改动内容 | 为什么 |
|------|---------|--------|
| `vite.config.js` | 增加 `base: './'` | 兼容 Electron `file://` 加载 |
| `scripts/verify-packaged-assets.cjs` | 验证资源路径和文件存在性 | 构建后数秒内捕获同类黑屏 |
| `scripts/verify-packaged-runtime.cjs` | 通过 CDP 验证真实 DOM | 防止“进程没崩溃但页面为空”的假通过 |
| `package.json` | 增加两条验证脚本 | 固化回归命令 |

#### 验证结果

```text
❌ 修复前：file:// incompatible absolute assets: /assets/index-*.js, /assets/index-*.css
✅ 修复后：Packaged file:// assets passed
✅ 真实 EXE：Packaged runtime rendered: WenXiBuddy · 任务管理
✅ SQLite round-trip passed
```

### 2.7 阶段七：结构化任务后端与真实按钮闭环

继续使用 Electron Main 作为本地后端，不引入 Python、Java 或 HTTP 服务。新增 Repository + Service 分层；首次启动从旧 `app_state` 迁移，后续以结构化任务表为准。

| 文件 | 实现结果 |
|------|---------|
| `electron/task-repository.cjs` | `task_groups`、`tasks`、索引及参数化 CRUD |
| `electron/task-service.cjs` | 字段、状态、优先级、分组校验和业务状态转换 |
| `electron/main.cjs` / `preload.cjs` | 注册并安全暴露任务与分组 IPC |
| `public/task-dashboard.js` | 新建、编辑、完成、归档、删除、分组按钮真实写库 |
| `scripts/verify-task-buttons.cjs` | 真实打包版按钮与数据库端到端验证 |

```text
✅ Task service CRUD passed
✅ SQLite round-trip passed
✅ Task buttons CRUD passed
✅ Packaged runtime rendered: WenXiBuddy · 任务管理
✅ Vite build：29 modules transformed
✅ Packaged file:// assets passed
```

### 2.8 阶段八：数据安全、设置与 Deskforge 品牌

以版本化 JSON 作为可读交换格式；导入与恢复前自动备份，并使用 SQLite 事务保证原子性。设置采用白名单键值表，品牌资源使用 SVG 母版和 Windows ICO。

| 文件 | 实现结果 |
|------|---------|
| `electron/data-manager.cjs` | JSON 校验、导入导出、备份恢复、设置持久化 |
| `electron/main.cjs` / `preload.cjs` | 文件对话框及 `data`、`settings` IPC |
| `public/dashboard.html` / `task-dashboard.js` | Deskforge 品牌、设置弹窗和真实数据按钮 |
| `build/icon.svg/png/ico` | Windows 品牌图标资源 |
| `scripts/verify-productization.cjs` | 真实 EXE 品牌、设置和备份验证 |

#### 遇到的问题及解决方案

1. 非法备份测试提示文本断言不一致：程序已正确拒绝文件，修正测试正则。
2. 默认 GitHub 下载源被网络策略阻断，未显式镜像时 Electron 解包无输出：改用 npmmirror 并固化项目配置。
3. 系统拒绝读取进程命令行：使用隔离输出目录排除目录占用和图标问题。

```text
✅ Data export/import/backup/settings passed
✅ Deskforge branding/settings/backup passed
✅ Packaged runtime rendered: Deskforge · 个人工作台
✅ Task buttons CRUD passed
```

### 2.9 阶段九：修复旧品牌安装实例混淆

用户截图仍显示 `WB / WenXiBuddy`。源码搜索和 ASAR 读取均证明最新发布资源已经是 Deskforge，但安装器版本仍为 0.1.0，导致旧安装目录、快捷方式与新包难以区分。

#### 解决方案

- `package.json`、`package-lock.json` 升级为 0.2.0。
- 生成 `release/Deskforge-Setup-0.2.0.exe`。
- 品牌回归增加 `DF` 与 `Deskforge` 精确断言。
- 新增 Bug 文档记录现象、证据、根因和用户升级方法。

```text
✅ ProductVersion: 0.2.0.0
✅ Packaged runtime rendered: Deskforge · 个人工作台
✅ Packaged brand assets: DF / Deskforge only
✅ SHA-256: 696BF4AAA850F65E38C0CA5E15D6BBDD1DC4AA291427A810F27D5332F21EB72B
```

### 2.10 阶段十：P0 工作台全功能闭环

新增统一 `WorkbenchService` 和六张业务表，将项目、文件、工作区、标签、通知、搜索和统计接入 SQLite。Dashboard 侧栏及头部按钮全部切换为真实本地数据；消息入口明确提示单机模式，不继续展示虚构消息。

#### 实现范围

| 模块 | 结果 |
|------|------|
| 工作区 | 创建、切换、当前工作区持久化 |
| 项目 | 创建、列表、截止日期、归档 |
| 标签 | 标签创建与任务多对多关联 |
| 文件 | 系统选择、元数据登记、打开、移除记录 |
| 通知 | 自动生成逾期通知、全部已读 |
| 搜索/统计 | 任务、项目、文件搜索及四类实时统计 |
| 备份 | v2 覆盖全部新模型，兼容 v1 |

#### 问题与解决

- 批量按钮测试 8 秒超时：延长为 20 秒。
- 残留弹窗栈导致脚本读取旧节点：验收前清理，并选择最后一个弹窗。
- Dropdown 测试使用了错误类名：修正为实际 `.wbi-drop`。

```text
✅ Workbench service passed
✅ Data export/import/backup/settings passed
✅ Workbench navigation/search buttons passed
✅ Task buttons CRUD passed
✅ Deskforge branding/settings/backup passed
✅ ProductVersion: 0.3.0.0
```

---

## 3. 关键技术决策记录

### 决策 1：本地 SQLite 而非 MySQL

**决策**：单机阶段使用 Electron 内置 SQLite。

**替代方案**：本机 MySQL、JSON 文件、`better-sqlite3`。

**理由**：用户无需安装服务，离线可用，且无原生扩展依赖。

### 决策 2：先复用原页面再组件化

**决策**：通过 React 全屏 iframe 原样加载 Dashboard。

**替代方案**：立即将约 150 KB 的原始页面与交互重写为 React。

**理由**：当前产品基准要求内容和动画一致，先复用可降低视觉回归风险。

---

## 4. 回归测试记录

| 测试项 | 预期结果 | 实际结果 | 是否通过 |
|--------|---------|---------|---------|
| Electron 版本 | 输出安装版本 | v37.10.3 | ✅ |
| 依赖树 | 无缺失依赖 | 8 个直接依赖完整 | ✅ |
| SQLite 往返 | 保存后读取一致 | `SQLite round-trip passed` | ✅ |
| Vite 构建 | 生成 dist | 29 模块构建成功 | ✅ |
| 开发模式 | Vite 与 Electron 同时启动 | 窗口启动成功 | ✅ |
| 用户数据库路径 | `%APPDATA%/Deskforge/deskforge.db` | 文件存在，12,288 字节 | ✅ |
| NSIS 打包 | 生成安装包 | `Deskforge-Setup-0.1.0.exe` | ✅ |
| 未安装版启动 | EXE 保持运行 | PID 15240 启动成功 | ✅ |
| 打包资源路径 | 所有资源可由 `file://` 解析 | `Packaged file:// assets passed` | ✅ |
| 打包版真实渲染 | Dashboard 正文出现 | `Packaged runtime rendered: WenXiBuddy · 任务管理` | ✅ |
| 任务 Service | CRUD 与非法输入校验 | `Task service CRUD passed` | ✅ |
| 真实任务按钮 | 新建、编辑、完成、删除写入 SQLite | `Task buttons CRUD passed` | ✅ |
| 页面/数据库一致性 | 两端任务数一致 | 运行时断言通过 | ✅ |
| 数据导入导出 | 版本、关联、恢复一致 | `Data export/import/backup/settings passed` | ✅ |
| 设置与品牌 | 设置持久化、弹窗和品牌正确 | `Deskforge branding/settings/backup passed` | ✅ |
| 0.2.0 品牌升级 | EXE 版本和 Logo 均为新版 | `DF / Deskforge only` | ✅ |
| P0 Workbench Service | 工作区、项目、标签、文件、通知、搜索 | `Workbench service passed` | ✅ |
| P0 真实按钮 | 侧栏、工作区和搜索入口 | `Workbench navigation/search buttons passed` | ✅ |

---

## 5. 文件变更总览

### 新增文件

```text
electron/database.cjs
electron/database-check.cjs
electron/task-repository.cjs
electron/task-service.cjs
electron/task-service-check.cjs
electron/data-manager.cjs
electron/data-manager-check.cjs
scripts/verify-packaged-assets.cjs
scripts/verify-packaged-runtime.cjs
scripts/verify-task-buttons.cjs
scripts/verify-productization.cjs
build/icon.svg
build/icon.png
build/icon.ico
public/dashboard.html
public/task-dashboard.js
docs/INDEX.md
docs/architecture/project-architecture.md
docs/architecture/2026-08-19_development-journal.md
docs/architecture/2026-08-19_adr-001-local-first-sqlite.md
docs/features/2026-08-19_local-sqlite-persistence.md
docs/features/2026-08-19_windows-installer.md
docs/bugs/2026-08-19_electron-download-timeout.md
docs/bugs/2026-08-19_user-data-path.md
docs/bugs/2026-08-19_packaged-app-black-screen.md
```

### 修改文件

| 文件 | 修改阶段 | 改动摘要 |
|------|---------|---------|
| `package.json` | 桌面与打包 | scripts、NSIS 配置、产品名 |
| `electron/main.cjs` | SQLite、任务后端、Bug 修复 | IPC、Service、数据库路径、应用名称 |
| `electron/preload.cjs` | SQLite、任务后端 | 最小存储与任务业务 API |
| `src/App.jsx` | Dashboard | 全屏加载原页面 |
| `src/styles.css` | Dashboard | 无边框全屏布局 |
| `README.md` | 项目说明 | 产品方向、启动与打包 |
| `vite.config.js` | 黑屏修复 | 生产资源改为相对路径 |
| `public/dashboard.html` | 品牌阶段 | 展示文本替换为 Deskforge |
| `.npmrc` | 发布阶段 | 固化 Electron 与 Builder 镜像 |

---

## 6. 待完成工作

| 优先级 | 任务 | 计划 |
|--------|------|------|
| P0 | 验证安装器完整安装、卸载与数据保留 | 下个发布任务 |
| P0 | 增加 author 和版权信息 | 商业发布前 |
| P0 | 配置 Windows 代码签名证书 | 对外分发前 |
| P1 | 将项目、标签、设置继续迁移为标准化业务表 | 任务模型完成后 |
| P1 | 完成素材授权审计 | 商业发布前 |
| P1 | 增加备份历史列表、保留策略和数据库迁移版本 | 数据规模增长前 |
| P2 | 逐模块将 iframe 内页面迁移为 React 组件 | 保持视觉回归的前提下 |
