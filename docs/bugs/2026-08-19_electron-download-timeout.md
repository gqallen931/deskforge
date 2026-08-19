# [Electron 运行时下载超时]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 严重程度 | P1-功能阻断 |
| 关联项目 | Deskforge |
| 相关文件 | `.npmrc`、`package.json` |
| 触发条件 | 默认源下载 Electron 或 electron-builder 二进制 |

---

## 现象描述

`npm rebuild electron` 在 `node install.js` 阶段长时间无输出，随后出现连接 GitHub 地址的 `ETIMEDOUT`，导致无法启动 Electron 和生成 EXE。

---

## 排查过程

| 步骤 | 假设 | 验证方法 | 结果 |
|------|------|---------|------|
| 1 | 项目目录错误 | 检查根目录和 `deskforge/package.json` | `npm run dev` 必须在 `deskforge` 执行 |
| 2 | npm 包未安装 | 检查 `node_modules/electron` | JS 包存在，但 Electron 二进制曾缺失 |
| 3 | 默认下载源不可达 | 使用 verbose 重建 | 连接 `20.205.243.166:443` 超时 |
| 4 | 国内镜像可用 | 清理依赖并通过 npmmirror 安装 | Electron 37.10.3 下载成功 |

关键转折点：区分 npm registry 包下载与 Electron/Builder 二进制下载，两者需要不同镜像设置。

---

## 根因分析

```text
Electron 的 npm 包安装脚本仍需从二进制发布源下载运行时；默认网络链路超时。
此外，曾在没有 package.json 的仓库根目录执行 npm 命令，产生了误导性的成功/ENOENT 结果。
```

---

## 解决方案

**修改/配置：**

1. `.npmrc` — 使用 `https://registry.npmmirror.com`。
2. 安装/打包命令 — 设置 `ELECTRON_MIRROR` 与 `ELECTRON_BUILDER_BINARIES_MIRROR`。
3. 所有 npm 命令固定从 `deskforge` 项目目录执行。

**核心逻辑：**

```powershell
cd D:\WebStorm-work\wenxibuddy-main\deskforge
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
npm install
```

---

## 面试要点

### 这个问题考察什么能力？
- 区分包管理器 registry、安装脚本和平台二进制分发链路。

### 回答思路
1. 确认执行目录和依赖树。
2. 用 verbose 日志定位真正超时的域名和阶段。
3. 对应配置镜像并重新验证运行时版本。

### 延伸追问
- Q: 为什么改 npm registry 后仍可能失败？
  A: Electron 运行时由 postinstall 单独下载，不一定使用 npm registry。
