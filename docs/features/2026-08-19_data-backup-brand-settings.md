# [数据管理、品牌图标与设置模块]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge |
| 涉及模块 | Electron Main、Preload、SQLite、Dashboard、Windows 打包 |
| 标签 | JSON、备份恢复、设置、品牌、ICO |

---

## 需求背景

任务 CRUD 完成后，产品需要具备可迁移、可恢复的数据安全能力，并去除旧展示品牌。用户还需要在桌面端修改个人信息和显示偏好，安装包、窗口及快捷方式需要统一图标。

---

## 设计思路

### 方案对比

| 方案 | 优点 | 缺点 | 为什么选/不选 |
|------|------|------|-------------|
| 直接复制 SQLite 文件 | 完整 | 易受锁和版本差异影响 | 不选 |
| 版本化 JSON + 事务恢复 | 可读、可校验、可迁移 | 需维护格式版本 | 选择 |
| 前端直接读写文件 | 实现直观 | 破坏 Electron 安全边界 | 不选 |

**最终选择：** Electron Main 统一处理文件对话框与 SQLite，Preload 仅暴露业务方法；覆盖数据前自动创建安全备份。

---

## 核心实现

### 数据格式

```text
format: deskforge-backup
version: 2（兼容导入 v1）
settings: 用户与显示偏好
groups: 全部分组（含归档）
tasks: 全部任务（含归档）
workspaces/projects/tags/taskTags/files/notifications: P0 工作台数据
```

### 数据流 / 调用链

```text
Dashboard → Preload data/settings API → Electron Main
  → 文件选择与 10 MB 限制 → 格式/关联/重复校验
  → 自动备份当前数据 → SQLite 事务恢复 → 刷新界面
```

### 完成能力

- JSON 导出、导入。
- `%APPDATA%/Deskforge/backups` 手动备份与恢复。
- 导入和恢复前自动安全备份。
- `settings` 表保存姓名、角色、工作区、紧凑模式、减少动画。
- Dashboard、窗口标题和发布文本替换为 Deskforge。
- SVG 图标母版、PNG 预览和 Windows ICO，接入窗口及 NSIS。

---

## 技术难点

### 难点 1: 防止恢复破坏现有数据
- **挑战：** 非法、重复或不完整 JSON 可能造成数据丢失。
- **解决：** 文件大小限制、格式版本、分组外键、任务编号重复校验；校验后才进入事务，覆盖前自动备份。

### 难点 2: 保持 Renderer 最小权限
- **挑战：** 导入导出需要文件系统能力。
- **解决：** 文件对话框和文件读写全部放在 Main，Renderer 只接收取消状态、摘要和结果。

---

## 面试要点

### 如果让你重新设计，会怎么改进？
- 增加 schema 迁移器、备份列表与定期自动备份保留策略。

### 涉及哪些设计模式？
- Facade：DataManager 聚合导出、导入、备份、设置。
- Bridge：Preload 隔离 Renderer 与本地能力。
- Transaction Script：恢复流程保证原子性。

### 性能 / 安全 / 扩展性考量？
- 10 MB 上限防止超大文件占用；SQL 参数化；白名单设置字段；v2 覆盖 P0 工作台数据并兼容导入 v1。
