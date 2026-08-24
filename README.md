# Deskforge

Deskforge 是本地优先的个人工作台桌面软件，目标平台是 Windows。

> AI Agent、代码助手和新贡献者在开始工作前，必须先完整阅读 [AGENTS.md](AGENTS.md)。它是项目约束、视觉基准、安全边界、测试和文档维护规则的唯一入口。

技术栈：Electron + React + Vite，数据持久化使用 Electron 内置 SQLite（`node:sqlite`），无需安装任何数据库。原始 `A-UI` 目录继续作为视觉和交互基准，不直接改造。

## 产品方向

这是一个可以安装到 Windows 电脑本地的个人工作台，不依赖在线账号即可使用。数据优先保存在本机（`%APPDATA%/Deskforge/deskforge.db`），后续再按需要增加同步、AI 和多人协作能力。

## 当前状态（v0.7.0）

- **视觉保真**：以 `A-UI/展示/task-dashboard.html` 为唯一视觉基准，保留三栏布局、甘特图与动画；`public/dashboard.html` 为 Deskforge 品牌化视觉壳，业务弹层已 React 化。
- **React 渐进迁移（已完成）**：设置、通知/提醒、项目与项目任务关联、任务看板/筛选/排序/详情、文件归档、时间线、智能分析、团队、工作区与全局搜索已迁移为 React 模块，数据全部走 `React → Preload 白名单 → Main 服务 → SQLite`。
- **业务闭环**：任务 CRUD、工作区/项目/标签/文件/通知/搜索统计、JSON 导入导出、自动/手动备份恢复与保留策略、Windows 本地提醒均已接入真实数据。
- **安全边界**：`contextIsolation` + `sandbox` + CSP，导航/新窗口/权限守卫，postMessage 来源校验；本地账户 scrypt 密码哈希、登录限流、窗口会话，全部业务 IPC 强制鉴权。
- **可交付**：NSIS 安装包 `release/Deskforge-Setup-0.7.0.exe`，支持选择安装目录、桌面/开始菜单快捷方式；0.5.0 → 0.6.0 → 0.7.0 升级与卸载数据保留已自动验收。
- **工程文档**：ADRs、架构主文档、开发日志、功能/Bug 记录与索引全部维护在 [`docs/INDEX.md`](docs/INDEX.md)，另有 `_templates/` 文档模板体系。

### 已知限制

- 自动更新：状态机与 UI 已完成，等待公共 HTTPS 更新地址（`build/update-config.json`）。
- Windows 代码签名：CI 与验证脚本已完成，等待受信任证书；未签名的构建不代表商业就绪。
- AI 建议与消息按产品约束保留为"正在开发中"占位。

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
# 核心验证（服务层 + 静态契约）
npm run verify:db
npm run verify:tasks
npm run verify:data
npm run verify:workbench
npm run verify:migrations
npm run verify:reminders
npm run verify:auth
npm run verify:ipc
npm run verify:security
```

端到端回归（`verify:task-buttons`、`verify:workbench-buttons`、`verify:productization`、`verify:packaged-runtime`、`verify:react-migration`）需要先以远程调试端口启动打包应用，例如：

```powershell
.\release\win-unpacked\Deskforge.exe --remote-debugging-port=9227
```

安装/升级/卸载生命周期验收：`npm run verify:install-lifecycle`（需要 `release/` 下有 0.6.0 与 0.7.0 安装包）。

## Windows 安装包

```bash
npm run package:win
```

安装包使用 Electron Builder + NSIS。应用采用本地优先架构：先用 SQLite/本地文件保存个人数据，需要同步或多人协作时再增加后端服务。

后端建议：Python + FastAPI。当前阶段不引入后端；只有需要跨设备同步、账号、多人协作或 AI 服务代理时再增加它。
