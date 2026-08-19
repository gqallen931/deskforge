# [Windows NSIS 安装包]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 状态 | Done |
| 关联项目 | Deskforge |
| 涉及模块 | Electron、Vite、electron-builder |
| 标签 | Windows、EXE、NSIS |

---

## 需求背景

Deskforge 的商业目标是可安装到 Windows 的本地个人工作台，需要同时提供安装包和便于测试的未安装版。

---

## 设计思路

### 方案对比

| 方案 | 优点 | 缺点 | 为什么选/不选 |
|------|------|------|-------------|
| electron-builder + NSIS | Electron 主流方案，可定制安装目录和快捷方式 | 需要下载 NSIS 资源 | 选择 |
| 仅 zip 免安装版 | 构建简单 | 不符合普通用户安装体验 | 仅作为测试产物保留 |

**最终选择：** 使用 NSIS，允许选择安装目录，并创建桌面和开始菜单快捷方式。

### 构建产物

| 文件 | 大小 | SHA-256 |
|------|------|---------|
| `release/Deskforge-Setup-0.3.0.exe` | 92,677,659 字节（约 88.38 MB） | `BD658E436686AB9732A6FFA392B7AEF81CC8F63B31900F1094C3F3238A771530` |

---

## 核心实现

```text
npm run package:win
  → vite build
  → electron-builder --win nsis
  → release/win-unpacked/Deskforge.exe
  → release/Deskforge-Setup-0.3.0.exe
```

### 数据流 / 调用链

```text
源代码 → Vite dist → Electron 打包 → NSIS 安装器 → Windows 用户目录数据
```

---

## 技术难点

### 难点 1: 下载 Electron 与 Builder 二进制超时
- **挑战：** 默认下载源连接超时。
- **解决：** npm registry、Electron 和 Builder 二进制使用 npmmirror。

### 难点 2: 安装版渲染区黑屏
- **挑战：** 开发模式正常，但 `file://` 生产入口无法加载 `/assets/...`。
- **解决：** Vite 设置 `base: './'`，并增加静态资源与 CDP 运行时双重验证。

---

## 面试要点

### 如果让你重新设计，会怎么改进？
- 增加 CI 构建、版本签名、自动更新、品牌图标和发布校验清单。

### 涉及哪些设计模式？
- 构建流水线将 Web 产物、桌面运行时和安装器分层组装。

### 性能 / 安全 / 扩展性考量？
- 正式分发前必须增加代码签名；数据库放在用户数据目录，避免写入只读安装目录。

### 品牌资源

- `build/icon.svg`：可维护的图标母版。
- `build/icon.png`：位图预览。
- `build/icon.ico`：Windows 窗口、安装器和快捷方式图标。
