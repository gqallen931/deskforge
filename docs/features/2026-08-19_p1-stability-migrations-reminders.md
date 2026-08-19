# P1 稳定性：迁移、项目任务、备份历史与提醒

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge |
| 涉及模块 | Electron Main、SQLite、Preload、Dashboard、CI |
| 标签 | migration、backup、reminder、project、windows |

---

## 需求背景

Deskforge 进入长期本地使用阶段后，需要保证旧数据库可安全升级，项目可以真实管理任务，用户能在应用内管理备份，并通过 Windows 收到本地提醒。

---

## 设计思路

### 方案对比

| 方案 | 优点 | 缺点 | 为什么选/不选 |
|------|------|------|-------------|
| 独立 Python/Java 后端 | 容易扩展为服务端 | 单机安装复杂、增加运行时 | 当前不选 |
| Electron Main + SQLite | 离线、零额外安装、现有架构一致 | 主进程需保持清晰边界 | 选择 |

**最终选择：** Electron Main 承载迁移和业务服务，Renderer 仅通过白名单 IPC 操作。

---

## 核心实现

### 数据库迁移

- `schema_migrations` 按版本记录 1—4 号迁移。
- 有待执行迁移时，先用 SQLite `VACUUM INTO` 在 `migration-backups` 创建一致性快照。
- 每个迁移独立事务执行，失败立即回滚并报告具体版本。
- v2 增加 `tasks.project_id`，v3 增加 `reminders`，v4 增加 `backup_history`。

### 业务闭环

- 项目支持进度统计、更新、删除、关联任务和移出任务；删除项目会先解绑任务。
- JSON 备份格式升级到 v3，保留 v1/v2 导入兼容，新增项目关系与提醒。
- 备份历史支持列表、按记录恢复和安全删除；恢复前自动创建 `pre-restore` 备份。
- 提醒支持一次性、每天、每周；主进程每分钟领取到期记录并调用 Windows 原生通知。

### 数据流 / 调用链

```text
Dashboard → Preload IPC → Electron Main Service → SQLite
                                     └→ Electron Notification → Windows 通知中心
启动 → 基础表 → 迁移前快照 → 顺序迁移 → 注册业务 IPC
```

---

## 技术难点

### 难点 1：旧数据库安全升级

- **挑战：** 新 SQL 直接引用旧库不存在的列会导致启动失败。
- **解决：** 主进程严格在基础表建立后、数据管理器准备查询前执行迁移，并用幂等测试验证重复启动。

### 难点 2：避免重复提醒

- **挑战：** 定时轮询可能反复弹出同一提醒。
- **解决：** 一次性提醒领取后标记 `notified`；周期提醒在同一事务中推进到下一次时间。

---

## 验证结果

```text
✅ Database migrations and pre-migration snapshot passed
✅ Local reminder lifecycle passed
✅ Workbench service passed
✅ Data export/import/backup/settings passed
✅ Packaged runtime rendered: Deskforge · 个人工作台
✅ Deskforge branding/settings/backup passed
✅ Deskforge-Setup-0.4.0.exe generated
```

安装包：92,681,242 字节；SHA-256：`8A0586EDA1630BA2B66476F626AFA67E2A26464839C85E1FFCC345AD695329CD`。

---

## 后续改进

- 为自动备份增加数量/时间保留策略。
- 提醒增加系统启动自启、稍后提醒与通知点击定位任务。
- 商业发布前配置作者、版权和 Windows 代码签名。
