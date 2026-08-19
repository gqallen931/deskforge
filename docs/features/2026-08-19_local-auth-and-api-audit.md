# 本地鉴权与前后端 API 闭环审计

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge 0.5.0 |
| 涉及模块 | React、Preload、Electron Main、SQLite、Dashboard、CI |
| 标签 | auth、security、ipc、api、audit |

---

## 需求背景

0.4.0 的业务数据已经本地持久化，但应用打开后可直接调用全部 IPC，不具备用户身份边界；同时需要确认所有前端 API 都有主进程实现，并消除静态演示功能。

---

## 设计思路

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 本机另启 Python/Java HTTP 服务 | 接近云端架构 | 安装、端口和进程管理复杂 | 单机版不选 |
| Electron Main 本地鉴权 | 零额外运行时、IPC 可统一保护 | 会话只在本机窗口内有效 | 选择 |

密码使用 Node.js `crypto.scryptSync` 加盐派生 64 字节哈希；比较使用 `timingSafeEqual`。会话只保存在主进程内存并绑定 `webContents.id`，关闭窗口或退出登录即失效。

---

## 核心实现

### 鉴权链路

```text
首次打开 → React 初始化账户 → auth:register → scrypt 哈希 → users
再次打开 → React 登录 → auth:login → 主进程内存会话
业务按钮 → Preload IPC → secureHandle → requireSession → Service → SQLite
```

- 连续 5 次错误密码后锁定 5 分钟。
- 用户可在设置中修改密码，也可从账户菜单退出登录。
- `users` 表属于设备安全数据，不包含在普通业务 JSON 备份中，防止导入覆盖账户。
- 数据库迁移升级到 v5，旧用户数据库自动创建账户表并显示初始化界面。

### API 与按钮审计

| 范围 | 状态 | 说明 |
|------|------|------|
| 任务、分组、筛选、排序、状态 | Done | TaskService + SQLite |
| 项目、项目任务、进度 | Done | WorkbenchService + `tasks.project_id` |
| 文件、知识库入口 | Done | 本地文件元数据登记、打开、移除 |
| 日程与提醒 | Done | SQLite + Windows Notification |
| 工作区、标签、通知、搜索、统计 | Done | 全部通过 IPC 落库或实时查询 |
| 设置、导入导出、备份历史 | Done | JSON v3 + SQLite 历史索引 |
| AI 建议 | In Progress | 按用户要求保留入口并显示“正在开发中” |
| 消息/多人实时协作 | In Progress | 按用户要求保留入口并显示“正在开发中” |

`verify:ipc` 静态检查 Preload 暴露的每个通道是否在 Main 注册；本次共验证 49 个通道，无缺失。

---

## 技术难点

### 主进程强制鉴权

- **挑战：** 只做登录页面可被 Renderer 直接调用 IPC 绕过。
- **解决：** 除注册、登录、状态和退出外，全部业务通道通过 `secureHandle` 在 Main 校验窗口会话。

### 旧端到端测试兼容

- **挑战：** 加入登录门后，原 CDP 测试无法直接看到 Dashboard。
- **解决：** 测试先通过公开鉴权通道建立隔离测试账户，再刷新页面执行原业务断言。

---

## 验证结果

```text
✅ Local authentication, password hashing and session guard passed
✅ IPC contract passed: 49 renderer channels are registered in Main
✅ Database migrations and pre-migration snapshot passed
✅ Workbench service passed
✅ Packaged runtime rendered: Deskforge · 个人工作台
✅ Deskforge branding/settings/backup passed
```

安装包：`release/Deskforge-Setup-0.5.0.exe`，92,683,775 字节，SHA-256：`E5ADD23899658AD74034BC76ECE3715DA85E412BD8CFF13AD44FDC6C69C4F0E3`。

---

## 安全与扩展性

- 本地鉴权解决同一 Windows 设备上的应用访问边界，不等同于云端身份认证。
- 后续跨设备同步应使用独立服务端、TLS、短期访问令牌、刷新令牌、设备撤销和服务端权限校验。
- 正式商业发布仍需 Windows 代码签名、依赖漏洞扫描和威胁建模。
