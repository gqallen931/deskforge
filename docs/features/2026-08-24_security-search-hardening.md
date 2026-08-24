# 渲染器安全边界与全局搜索 React 迁移

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-24 |
| 状态 | Done |
| 关联版本 | Deskforge 0.7.x |
| 涉及模块 | Electron Main、CSP、Legacy Bridge、Modal、全局搜索 |
| 标签 | security、React、IPC、SQLite、accessibility |

---

## 需求背景

在继续保持 A-UI 三栏视觉壳、甘特图和动画不变的前提下，补齐桌面窗口导航安全边界，并将 iframe 内最后一个真实数据弹窗“全局搜索”迁移到 React。搜索必须继续通过 Preload 白名单、鉴权 Main IPC 与 SQLite，不能改为前端模拟数据。

## 设计与实现

### Electron 安全边界

- 主窗口启用 Chromium renderer sandbox，继续保持 `contextIsolation: true` 与 `nodeIntegration: false`。
- 生产入口改为显式 `file://` URL，开发入口固定为 `http://127.0.0.1:5173/`。
- `will-navigate` 仅允许当前应用入口，拒绝跨页面导航。
- `setWindowOpenHandler` 默认拒绝新窗口；系统权限请求默认拒绝。
- 法律文档窗口同样限制为指定本地文件并拒绝新窗口。
- React 入口与 Dashboard 增加 CSP；A-UI 必需的 9,068 字节内联引导脚本使用 SHA-256 哈希固定，没有放宽 `script-src 'unsafe-inline'`。
- Legacy Bridge 校验 `postMessage` 的 `event.source`，只接受当前 Dashboard iframe 的模块请求。

### 全局搜索迁移

```text
A-UI #wbSearchInput Enter
  → postMessage { module: 'search', payload: { query } }
  → LegacyDashboardHost source 校验
  → SearchCenter
  → window.deskforge.workbench.search(query)
  → secureHandle('workbench:search')
  → SQLite tasks / projects / workspace_files
```

React 搜索结果按任务、项目和文件分组；文件结果保留安全的本地打开能力。组件包含加载、空结果和错误状态，并防止过期异步响应覆盖新查询。

### 通用稳定性与可访问性

- `Modal` 支持 Escape 关闭、初始焦点与 Tab 焦点环。
- `LegacyDashboardHost` 使用稳定关闭回调，避免重渲染时重复抢焦点。
- 顶层 `ErrorBoundary` 在渲染异常时提供安全重载界面，避免整窗白屏；不会删除本地数据。

## 遇到的问题与解决方案

1. **重装系统后 Codex 无法写入：** 项目仍由旧 Windows SID 所有，沙箱添加 ACE 返回错误 5。经用户授权后先接管项目所有权，再递归新增 `CodexSandboxUsers` 修改权限；未重置既有 ACL。
2. **首次打包网络失败：** 沙箱内连接 Electron 镜像返回 `EACCES`；按权限流程在沙箱外下载锁定版本资源后成功打包。
3. **搜索真实 EXE 测试误报空结果：** 测试硬编码 `DF`，但隔离数据库的 6 个任务不包含该文本。改为从实际 SQLite 任务读取名称作为搜索词，避免依赖编号格式。
4. **CSP 与 A-UI 内联脚本冲突：** 未使用 `unsafe-inline`，而是对原脚本内容计算并固定 SHA-256；视觉与交互保持不变。

## 验证结果

```text
✅ Vite build：43 modules transformed
✅ Security contract：12 renderer/navigation boundaries
✅ IPC contract：57 renderer channels
✅ tasks / data / workbench / migrations / reminders / auth 全部通过
✅ Packaged A-UI runtime rendered with 6 tasks
✅ Deskforge A-UI branding, React settings and backup passed
✅ A-UI visual shell preserved; React modules incl. search/team/analysis/workspaces passed
✅ 甘特图、三栏布局与 CSS 动画保留
```

本地验证安装包：`release/Deskforge-Setup-0.7.0.exe`，93,041,167 bytes，SHA-256 `786240CC757ECDE077EB01E95A368FE5721865271F9DDB8684530E500F7ED834`。该产物仅用于本地验收，未发布、推送或签名为商业发行版。

## 修改文件

- `electron/main.cjs`
- `index.html`
- `public/dashboard.html`
- `public/task-dashboard.js`
- `src/App.jsx`
- `src/components/ErrorBoundary.jsx`
- `src/components/Modal.jsx`
- `src/features/dashboard/LegacyDashboardHost.jsx`
- `src/features/search/SearchCenter.jsx`
- `src/styles.css`
- `scripts/verify-security-contract.cjs`
- `scripts/verify-react-migration.cjs`
- `package.json`

## 限制与下一步

- 消息和 AI 建议继续按产品约束显示“正在开发中”。
- 商业证书、公共更新源与云服务仍需外部材料，不在本次自动开发范围。
- 下一阶段继续统一任务、项目、文件、通知和设置模块的忙碌态、错误态与危险操作确认。

