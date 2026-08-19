# [私有 GitHub 仓库发布]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge |
| 涉及模块 | Git、GitHub CLI、SSH、发布安全 |
| 标签 | GitHub、Private、Git、源码管理 |

---

## 需求背景

仅将 `D:\WebStorm-work\wenxibuddy-main\deskforge` 作为独立主项目上传到 GitHub，并确保仓库为私密；父目录、依赖、构建产物、本地数据库和安装包不得上传。

---

## 设计思路

### 方案对比

| 方案 | 优点 | 缺点 | 为什么选/不选 |
|------|------|------|-------------|
| 在父目录初始化 Git | 操作少 | 会误纳入其他项目 | 不选 |
| 在 `deskforge` 内独立初始化 | 边界明确 | 需单独维护仓库 | 选择 |
| 上传构建产物 | 用户可直接下载 | 体积大且不适合源码仓库 | 不选 |

**最终选择：** `deskforge` 目录独立 Git 仓库，GitHub 仓库 `gqallen931/deskforge` 设置为 Private。

---

## 核心实现

### 发布范围

```text
包含：src、public、electron、scripts、docs、_templates、build 品牌资源、依赖清单
排除：node_modules、dist、release、*.db、backups、.env、task_plan.md、notes.md
```

### 数据流 / 调用链

```text
敏感信息与大文件扫描
→ .gitignore
→ deskforge 内 git init -b main
→ 本地提交
→ gh repo create --private
→ git push -u origin main
→ gh repo view 验证 PRIVATE
```

---

## 技术难点

### 难点 1: GitHub CLI 被删除
- **挑战：** 系统和 D 盘均找不到 `gh.exe`，`winget` 不可用。
- **解决：** 从 GitHub CLI 官方 Release 下载 Windows x64 ZIP 到 `D:\gh`，核对官方 SHA-256 后使用 `D:\gh\bin\gh.exe`。

### 难点 2: 防止错误上传大文件和本地数据
- **挑战：** `node_modules`、安装包和 Electron EXE 超过 50 MB。
- **解决：** 提交前创建并验证 `.gitignore`，最终提交仅包含 51 个源码与文档文件；后续文档作为第二次提交。

### 难点 3: Git 作者信息缺失
- **挑战：** 初次提交无法识别作者。
- **解决：** 仅在当前仓库设置 `GQALLEN931` 和 GitHub 隐私邮箱，不修改全局配置。

---

## 验证结果

```text
仓库：https://github.com/gqallen931/deskforge
可见性：PRIVATE
默认分支：main
SSH：认证成功
origin：git@github.com:gqallen931/deskforge.git
```

---

## 面试要点

### 如果让你重新设计，会怎么改进？
- 增加 GitHub Actions，在每次推送时运行单元测试和生产构建。

### 涉及哪些设计模式？
- 发布边界与最小权限原则：源码仓库不携带运行时数据、凭据和可再生成产物。

### 性能 / 安全 / 扩展性考量？
- 私有仓库、SSH 远程、隐私邮箱、敏感词扫描和大文件排除共同降低泄露风险。
