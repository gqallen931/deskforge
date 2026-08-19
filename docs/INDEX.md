# Deskforge 工程文档索引

> 本地优先、可安装到 Windows 的个人工作台桌面软件。

---

## 项目状态

| 模块 | 状态 | 说明 |
|------|------|------|
| Dashboard 前端 | ✅ 已接入 | 原样复用 `A-UI/展示` 的 HTML、动画与交互 |
| Electron 桌面壳 | ✅ 已实现 | 开发模式与打包模式均可启动 |
| SQLite 本地持久化 | ✅ 已实现 | 数据保存到 `%APPDATA%/Deskforge/deskforge.db` |
| 任务管理业务闭环 | ✅ 已实现 | 结构化任务/分组表，新建、编辑、完成、归档和删除已接入真实数据 |
| 数据与设置 | ✅ 已实现 | JSON 导入导出、自动/手动备份恢复、设置持久化 |
| Deskforge 品牌 | ✅ 已实现 | 发布界面、窗口和 Windows 安装图标已统一 |
| Windows 安装包 | ✅ 已生成 | NSIS 安装包 `release/Deskforge-Setup-0.6.0.exe` |
| P0 工作台闭环 | ✅ 已实现 | 工作区、项目、标签、文件、通知、搜索和统计已接入 SQLite |
| P1 稳定性 | ✅ 已实现 | 版本化迁移、迁移前快照、项目任务、备份历史与 Windows 提醒 |
| 本地用户鉴权 | ✅ 已实现 | scrypt 密码哈希、登录限流、窗口会话及全业务 IPC 强制校验 |
| 发布生命周期 | ✅ 已验证 | 0.5.0 → 0.6.0 安装升级、卸载与用户数据保留自动验收 |
| 自动更新 | 🟡 待配置源 | 更新状态机与 UI 已完成，等待公共 HTTPS 更新地址 |
| Windows 代码签名 | 🔴 外部阻塞 | CI 与验证脚本已完成，等待受信任证书 |
| React 渐进迁移 | 🟡 进行中 | AuthGate 已原生 React 化，Legacy Dashboard 边界已隔离 |
| 商业发布准备 | 🟡 进行中 | 缺少正式图标、作者信息、代码签名与完整业务回归 |

---

## 快速开始

```powershell
# 1. 进入项目目录
cd D:\WebStorm-work\wenxibuddy-main\deskforge

# 2. 安装依赖（首次）
npm install

# 3. 启动开发模式
npm run dev

# 4. 验证 SQLite
npm run verify:db

# 5. 验证任务业务与真实按钮
npm run verify:tasks
npm run verify:task-buttons
npm run verify:data
npm run verify:productization
npm run verify:workbench
npm run verify:migrations
npm run verify:reminders
npm run verify:auth
npm run verify:ipc
npm run verify:updates
npm run verify:install-lifecycle
npm run verify:workbench-buttons

# 6. 生成 Windows 安装包
npm run package:win
```

---

## 📐 架构文档

| 文档 | 说明 |
|------|------|
| [项目架构](architecture/project-architecture.md) | **主文档**：技术栈、进程模型、SQLite 数据链路、构建与限制 |
| [开发日志](architecture/2026-08-19_development-journal.md) | 项目重构、SQLite 接入、Electron 安装与 EXE 打包全过程 |
| [ADR-001 本地优先 SQLite](architecture/2026-08-19_adr-001-local-first-sqlite.md) | 单机阶段选择 SQLite 而非 MySQL 的决策 |
| [ADR-002 云端同步后端边界](architecture/2026-08-19_adr-002-cloud-sync-backend.md) | 未来账户、同步、消息和协作架构 |

---

## 🐛 Bug 修复 (`bugs/`)

| 日期 | 标题 | 严重程度 |
|------|------|---------|
| 2026-08-19 | [Electron 下载超时](bugs/2026-08-19_electron-download-timeout.md) | P1 |
| 2026-08-19 | [开发模式数据库目录错误](bugs/2026-08-19_user-data-path.md) | P1 |
| 2026-08-19 | [打包后的 Deskforge 窗口黑屏](bugs/2026-08-19_packaged-app-black-screen.md) | P1 |
| 2026-08-19 | [安装后仍显示 WB / WenXiBuddy](bugs/2026-08-19_old-brand-install-version.md) | P1 |

---

## 🚀 功能开发 (`features/`)

| 日期 | 功能 | 状态 |
|------|------|------|
| 2026-08-19 | [SQLite 本地持久化](features/2026-08-19_local-sqlite-persistence.md) | Done |
| 2026-08-19 | [Windows NSIS 安装包](features/2026-08-19_windows-installer.md) | Done |
| 2026-08-19 | [任务管理模块结构化与按钮闭环](features/2026-08-19_task-module-productization-plan.md) | Done |
| 2026-08-19 | [数据管理、品牌图标与设置模块](features/2026-08-19_data-backup-brand-settings.md) | Done |
| 2026-08-19 | [P0 个人工作台业务闭环](features/2026-08-19_p0-workbench-business-loop.md) | Done |
| 2026-08-19 | [私有 GitHub 仓库发布](features/2026-08-19_private-github-repository.md) | Done |
| 2026-08-19 | [P1 稳定性：迁移、项目任务、备份历史与提醒](features/2026-08-19_p1-stability-migrations-reminders.md) | Done |
| 2026-08-19 | [本地鉴权与前后端 API 闭环审计](features/2026-08-19_local-auth-and-api-audit.md) | Done |
| 2026-08-19 | [发布生命周期、更新、备份保留与 React 迁移](features/2026-08-19_release-readiness-and-update.md) | Partial / Blockers documented |
