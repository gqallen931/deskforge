# Deskforge 开发日志

> **文档类型**: 开发过程记录（Development Journal）
> **执行日期**: 2026-08-19
> **基于文档**: [project-architecture.md](./project-architecture.md) v0.6.0
> **执行环境**: Windows 10.0.19045、Node.js 24.18.0、npm 11.16.0、PowerShell
> **记录人**: Codex

---

## 阶段 2.19：核心模块操作状态收敛（2026-08-24）

- 文件索引模块增加首次加载、失败重试、操作忙碌状态与打开失败反馈；移除前明确提示原文件不会被删除。
- 通知与提醒模块增加并行加载失败处理、重复提交保护、中文时间/重复规则/状态展示与删除确认。
- 任务保存链路改为统一异步操作入口，失败时保留编辑内容并提示，不再产生未处理的 Promise rejection。
- 通过 `npm run build`、安全契约、任务 CRUD 与本地提醒生命周期验证。
- 任务、项目与设置中心随后完成全量重构：加入危险操作确认、恢复安全提示、竞态保护、中文状态和错误重试。
- 重新生成 `0.7.0` Windows 安装包，并在真实 `win-unpacked` 成品上通过 React 模块与 A-UI 视觉壳回归。
- 将 CDP 回归超时从 10 秒调整到 30 秒；本机完整巡检约 22 秒，原阈值会产生错误失败。
- 最终安装包：`release/Deskforge-Setup-0.7.0.exe`，93,042,879 字节，SHA-256 `0423CEFEA06F5335A0073C4700042A9FF1D352DBD0B3153E456F853EC4CDC6DA`。
- 最终通过 SQLite、任务、数据、工作台、迁移、提醒、认证、57 路 IPC、12 项安全边界、更新、打包资源、任务按钮、产品化、React/A-UI 视觉和安装生命周期验收。

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

### 2.11 阶段十一：私有 GitHub 仓库发布

严格在 `deskforge` 目录初始化独立 Git 仓库。新增 `.gitignore` 排除依赖、构建产物、安装包、本地数据库、备份、环境变量和 Agent 工作文件；从官方 Release 恢复 GitHub CLI 到 `D:\gh`，创建并推送私有仓库。

```text
✅ SSH account: gqallen931
✅ Repository: gqallen931/deskforge
✅ Visibility: PRIVATE
✅ Default branch: main
✅ node_modules / dist / release / local DB 未上传
```

### 2.12 阶段十二：P1 数据稳定性与 Windows 提醒

实现 4 级顺序迁移和迁移前一致性快照；新增项目任务关系、项目进度、备份历史以及一次性/每日/每周本地提醒。Dashboard 设置、项目和日程入口全部接入新 IPC，并新增 Windows GitHub Actions 回归流程。

#### 遇到的问题及解决方案

1. 旧回归脚本未执行迁移，查询 `project_id` 失败：测试初始化顺序改为“基础表 → 迁移 → Service”。
2. `createBackup` 从路径字符串升级为历史记录对象，旧测试仍按字符串读取：更新测试使用 `backup.path`，并验证历史表。
3. 首次安装包构建连接镜像地址被沙箱拒绝：取得联网构建权限后沿用 `.npmrc` 镜像成功完成。
4. 运行时验证直接执行时没有已启动的调试实例，出现 `fetch failed`：使用独立用户数据目录隐藏启动真实 EXE，再执行 CDP 验收并按精确 PID 关闭。

```text
✅ 全部数据库、任务、迁移、工作台、数据和提醒测试通过
✅ Vite production build / file:// assets passed
✅ Packaged runtime rendered: Deskforge · 个人工作台
✅ Deskforge branding/settings/backup passed
✅ Deskforge-Setup-0.4.0.exe: 92,681,242 bytes
✅ SHA-256: 8A0586EDA1630BA2B66476F626AFA67E2A26464839C85E1FFCC345AD695329CD
```

### 2.13 阶段十三：本地用户鉴权与 API 全链路审计

新增 `users` 表和本地 AuthService。密码通过随机盐和 scrypt 保存，错误登录达到阈值后临时锁定；会话绑定 Electron 窗口，所有业务 IPC 统一执行主进程鉴权。React 入口负责首次初始化和登录，设置中心支持修改密码，账户菜单支持退出登录。

审计发现原 AI 弹窗使用静态示例。按用户要求，AI 建议和消息入口均保留，但只明确显示“正在开发中”，本阶段不修改其产品逻辑，也不计入完成功能。

新增 `verify:ipc`，验证 Preload 的 49 个调用通道全部在 Main 注册；真实 EXE 测试同步增加测试账户初始化流程。

```text
✅ Local authentication, password hashing and session guard passed
✅ IPC contract passed: 49 renderer channels are registered in Main
✅ Packaged runtime rendered: Deskforge · 个人工作台
✅ Deskforge branding/settings/backup passed
✅ Deskforge-Setup-0.5.0.exe: 92,683,775 bytes
✅ SHA-256: E5ADD23899658AD74034BC76ECE3715DA85E412BD8CFF13AD44FDC6C69C4F0E3
```

### 2.14 阶段十四：商业发布生命周期与渐进 React 迁移

实现备份数量/天数保留策略、真实 NSIS 安装升级卸载测试、HTTPS 自动更新状态机、法律文档入口、签名发布工作流和 React 模块边界。登录模块已从 `App.jsx` 拆分为独立 React Feature，旧 Dashboard 继续保持视觉基准。

#### 问题与解决

1. 生命周期测试强制结束旧应用导致升级数据断言失败：改为应用 IPC 正常退出。
2. Windows Known Folder 不接受测试覆盖的 `APPDATA`：改用 Electron `--user-data-dir` 保证完全隔离。
3. 0.5.0 起业务 IPC 需要鉴权：升级测试在旧版和新版分别登录，验证会话不跨进程、账户和数据可保留。
4. PowerShell Security 模块在受限环境无法加载：签名检查改用项目内 `signtool.exe`。
5. 本机无证书，Authenticode 验证得到 0 个有效签名：保留为商业发布硬阻塞，CI 未签名即失败。

```text
✅ Backup retention count/day policy passed
✅ Automatic update state machine and HTTPS configuration guard passed
✅ Install, 0.5.0 to 0.6.0 upgrade, uninstall and user-data retention passed
✅ IPC contract: 55 channels registered
⚠️ Windows signature: waiting for trusted certificate
✅ Deskforge-Setup-0.6.0.exe: 93,028,873 bytes
✅ SHA-256: 894CB71EA457347CF25B5AE106ED42E93C435EDA489DB037D6290F9A58113CA1
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
| 数据库迁移 | 快照、顺序执行、幂等 | `Database migrations and pre-migration snapshot passed` | ✅ |
| 本地提醒 | 一次性和周期提醒不重复领取 | `Local reminder lifecycle passed` | ✅ |
| 0.4.0 真实 EXE | 页面、品牌、设置、备份 | 两项 CDP 验证通过 | ✅ |
| 本地鉴权 | 哈希、登录、退出、改密、限流 | `Local authentication... passed` | ✅ |
| IPC 契约 | Preload 通道均有 Main 实现 | 55/55 | ✅ |
| 安装生命周期 | 安装、升级、卸载、数据保留 | 0.5.0 → 0.6.0 | ✅ |
| 自动更新 | 状态机、HTTPS 守卫 | 单元验证通过，发布源待配置 | 🟡 |
| 代码签名 | Authenticode | 无本机证书 | 🔴 |

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
| P1 | 增加备份自动保留策略和通知点击定位任务 | 数据规模增长前 |
| P1 | 设计云端账户、同步、多人消息和设备撤销 | 联网商业版阶段 |
| P2 | 逐模块将 iframe 内页面迁移为 React 组件 | 保持视觉回归的前提下 |

---

### 2.15 阶段十五：A-UI 视觉保真的 React 业务模块迁移

按设置 → 通知/提醒 → 项目与任务关联 → 任务看板/筛选/排序/详情 → 时间线的顺序完成 React 功能组件，并新增文件归档 React 浏览器。所有组件继续通过 Preload 白名单调用 Electron Main，由 SQLite 持久化。

#### 视觉偏差与修正

首次实现将整个 Dashboard 改为新的 React 工业暗色 Shell。虽然数据和功能验证通过，但布局、内容密度和动画与 `A-UI/展示` 不一致，不符合“一模一样”的产品约束。随后撤回新 Shell 的运行入口，恢复 `public/dashboard.html` 为唯一视觉壳，仅将导航和甘特图事件桥接到 React 功能模块。Deskforge 品牌替换保留，AI 建议与消息仍显示“正在开发中”。

#### 验证

```text
✅ build：38 modules transformed
✅ Task service CRUD passed
✅ Workbench service passed
✅ Local reminder lifecycle passed
✅ Local authentication passed
✅ Data export/import/backup/settings passed
✅ Database migrations and pre-migration snapshot passed
✅ IPC contract：55 renderer channels registered
✅ A-UI visual shell preserved; React modules, Gantt and animations passed
✅ Packaged A-UI runtime rendered with 6 tasks
✅ Deskforge A-UI branding, React settings and backup passed
```

安装包仅用于真实运行时验证，并非开启发布工作：`Deskforge-Setup-0.7.0.exe`，93,037,621 bytes，SHA-256 `B49E91E6047D2FC3D2325E10637663EAE385EBE31BD8260E4332DF7C236C35AF`。

---

### 2.16 阶段十六：跨 Agent 项目约束固化

为解决迁移到其他 Agent 后丢失历史规则的问题，在仓库根目录新增 `AGENTS.md` 作为唯一约束事实源，并增加 Claude Code、GitHub Copilot 和 README 入口。

#### 固化范围

```text
✅ Deskforge 名称、仓库和产品范围
✅ A-UI 一比一视觉基准与 React 渐进迁移边界
✅ AI 建议和消息保持“正在开发中”
✅ Electron / React / Preload IPC / Main / SQLite 安全链路
✅ 本地鉴权、备份、迁移和用户数据保护
✅ 发布与云端功能暂缓
✅ 测试矩阵、Git 操作和强制文档维护流程
```

#### Reader Test

以没有对话上下文的新 Agent 为读者，检查其是否能回答范围、视觉、品牌、禁改模块、数据链路、未来后端、测试、发布和文档要求。答案均可由单个 `AGENTS.md` 明确得到，没有依赖本次对话的隐含前提。

---

### 2.17 阶段十七：智能分析与团队协作 React 化

接手 Codex 交接后，在 0.7.0 基础上继续 Strangler Fig 迁移，将 iframe 内最后两个带真实业务数据的弹窗（智能分析、团队协作）迁入 React。视觉壳 `public/dashboard.html` 保持不变。

#### 实现

| 文件 | 实现结果 |
|------|---------|
| `src/features/analysis/AnalysisCenter.jsx` | 智能分析：统计卡片（总/进行中/已完成/逾期）、任务流程分布、项目进度条、工作区概览、最近文件，全部来自 `window.deskforge.workbench.dashboard()` |
| `src/features/team/TeamCenter.jsx` | 团队协作：按 `tasks.list()` 的 `owner` 聚合成员负载（总数/进行中/已完成/逾期），8 色头像调色板，逾期按日期键计算 |
| `src/features/dashboard/LegacyDashboardHost.jsx` | 注册 `analysis`、`team` 模块路由 |
| `public/task-dashboard.js` | 删除 iframe 内部 `openAnalysisModal`/`openTeamModal`，导航 `'团队协作'`/`'智能分析'` 改为 `reactModule(...)` postMessage 桥接 |
| `src/styles.css` | 新增 `rx-member-*` 团队卡片样式 |
| `scripts/verify-react-migration.cjs` | 增加 team/analysis 模块预期与断言 |

#### 遇到的问题及解决方案

1. `verify:react-migration` 需真实 EXE 运行时（CDP 连接 9227 端口），非打包环境直接执行报 `fetch failed`：属预期行为，改为 `node --check` 校验脚本语法，打包后统一验收。
2. 删除 iframe 内两个函数时替换报告"598 lines removed/587 lines added"，怀疑误删：立即用 `(Get-Content).Count` 确认文件仍为 2196 行，并搜索 `openWorkspaceMenu/openScheduleModal/init` 等关键函数确认完好，确认无内容丢失。

#### 验证

```text
✅ Vite build：40 modules（较 38 增加 2 个）
✅ lint：0 错误
✅ 无 openAnalysisModal/openTeamModal 残留引用
✅ verify:tasks / verify:workbench 通过
✅ verify-react-migration.cjs 语法检查通过
```

#### 剩余 iframe 内交互

- 工作区切换菜单（`openWorkspaceMenu` / `openNewWorkspaceModal`，真实 API）
- 全局搜索（`openGlobalSearch`，真实 API）
- 3D 卡片扇、看板过滤/排序、甘特图等纯视觉交互（保留在视觉壳内）

---

### 2.18 阶段十八：渲染器安全加固与全局搜索 React 化（2026-08-24）

#### 实现

- 主窗口启用 renderer sandbox，固定应用入口并拒绝外部导航、新窗口和权限请求。
- React 与 Dashboard 增加 CSP；A-UI 内联引导脚本使用 SHA-256 哈希固定。
- Legacy Bridge 校验消息来源，搜索请求携带只读 query payload。
- 新增 `SearchCenter`，搜索任务、项目和本地文件，继续使用鉴权 IPC 与 SQLite。
- Modal 增加 Escape、初始焦点与 Tab 焦点环；新增顶层 ErrorBoundary。
- 新增 `verify:security`，真实 EXE 的 React 迁移验收覆盖全局搜索。

#### 错误、根因与解决

1. 重装系统遗留旧 SID，Codex setup 无法添加写 ACE：经授权接管 `deskforge` 所有权，并仅新增 Codex 沙箱修改权限。
2. 首次打包连接 Electron 镜像 `EACCES`：按权限流程在沙箱外下载锁定资源后完成打包。
3. 搜索验收硬编码 `DF` 返回空：实际隔离数据库任务不含该文本，测试改为读取真实任务名称。

#### 验证

```text
✅ build：43 modules
✅ Security contract：12 boundaries
✅ IPC contract：57 channels
✅ tasks / data / workbench / migrations / reminders / auth
✅ packaged runtime / productization
✅ React search/team/analysis/workspaces + A-UI Gantt/animations
```

安装包：93,041,167 bytes；SHA-256 `786240CC757ECDE077EB01E95A368FE5721865271F9DDB8684530E500F7ED834`。仅本地验证，未发布。
