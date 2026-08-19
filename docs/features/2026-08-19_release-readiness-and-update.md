# 发布生命周期、更新、备份保留与 React 迁移

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Partially Done / External blockers documented |
| 关联项目 | Deskforge 0.6.0 |
| 涉及模块 | NSIS、electron-updater、SQLite、React、GitHub Actions、法律文档 |
| 标签 | release、update、signing、retention、react |

## 完成内容

### 安装生命周期

- 自动在临时目录静默安装旧版本。
- 登录后写入验证任务，升级到新版本并重新登录。
- 验证账户、迁移和任务数据保留。
- 静默卸载后确认用户数据库继续存在。

结果：`Install, 0.5.0 to 0.6.0 upgrade, uninstall and user-data retention passed`。

### 备份保留

- 默认最多 20 份、最长 90 天，可在设置调整为 1—100 份、1—3650 天。
- 创建备份和保存策略时自动清理，用户也可手动触发。
- 只允许删除 Deskforge 备份目录内的已登记文件。

### 自动更新

- 使用官方 `electron-updater` 的 NSIS 更新能力。
- 支持检查、发现版本、下载进度、下载完成和退出安装状态。
- 更新源必须使用 HTTPS；默认配置为关闭。
- 私有 GitHub 更新需要客户端令牌，不用于终端用户。
- 启用前需在 `build/update-config.json` 填写公共更新地址，并上传安装包、blockmap 和 `latest.yml`。

参考：[electron-builder Auto Update](https://www.electron.build/docs/features/auto-update/)。

### 法律与元数据

- `package.json` 已补充作者与版权。
- 设置中心可打开随安装包发布的隐私政策和用户协议。
- 文档明确本地数据、账户哈希、文件权限、卸载保留和未启用联网功能。

### React 渐进迁移

- 登录/初始化模块已独立为 `src/features/auth/AuthGate.jsx`，完全由 React 管理。
- iframe 被隔离为 `LegacyDashboardHost`，后续按模块替换，不再把新 React 功能继续堆入 `App.jsx`。
- 下一迁移顺序：设置 → 通知/提醒 → 项目 → 任务看板 → 甘特与视觉动画。

## 外部阻塞

| 项目 | 当前状态 | 需要用户提供 |
|------|---------|-------------|
| 商业代码签名 | 未签名，验证脚本正确失败 | 受信任证书 `.pfx` 和密码，或云签名服务 |
| 自动更新上线 | 代码完成、通道关闭 | 公共 HTTPS 更新域名/对象存储 |
| 法律文档定稿 | 产品条款已随包提供 | 正式个人/公司主体、联系邮箱、注册地址（公司时） |
| 云端协作 | 仅完成 ADR | 服务器、域名、数据库、预算与部署区域 |

GitHub `Signed Windows Release` 工作流已准备使用 `WINDOWS_CSC_LINK` 和 `WINDOWS_CSC_KEY_PASSWORD` Secrets；签名验证失败将阻止发布产物通过。

## 0.6.0 发布产物

- 安装包：`release/Deskforge-Setup-0.6.0.exe`
- 大小：93,028,873 字节
- SHA-256：`894CB71EA457347CF25B5AE106ED42E93C435EDA489DB037D6290F9A58113CA1`
- 真实 EXE：渲染、鉴权、品牌、设置和备份验证通过。
