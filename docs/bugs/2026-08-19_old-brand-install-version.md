# [安装后仍显示 WB / WenXiBuddy]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 严重程度 | P1-功能阻断 |
| 状态 | Fixed |
| 关联项目 | Deskforge |
| 涉及模块 | electron-builder、NSIS、Windows 安装、品牌资源 |

---

## 现象描述

用户打开软件后，左上角仍显示 `WB / WenXiBuddy`，期望显示 `DF / Deskforge`。

---

## 排查过程

| 步骤 | 检查内容 | 结果 |
|------|---------|------|
| 1 | 搜索发布源码 | 不包含 `WenXiBuddy` |
| 2 | 直接读取 `release/win-unpacked/resources/app.asar` | 包内包含 Deskforge，不包含 WenXiBuddy |
| 3 | 检查安装包版本 | 新旧安装包均为 `0.1.0` |
| 4 | 发布 `0.2.0` 并运行真实 EXE | 显示 `DF / Deskforge` |

### 关键转折点

包内资源与截图相反，证明不是品牌替换遗漏，而是 Windows 启动了旧安装目录或旧快捷方式指向的 0.1.0 实例。

---

## 根因分析

### 直接原因

品牌重构后未递增 `package.json` 版本，安装器仍命名为 `Deskforge-Setup-0.1.0.exe`。

### 根本原因

发布流程只验证了未安装版运行，没有将“功能版本变化必须递增应用版本”和 Logo 精确值纳入回归检查。

---

## 解决方案

- 将应用与锁文件版本升级为 `0.2.0`。
- 生成 `Deskforge-Setup-0.2.0.exe`，让 NSIS 明确执行版本升级。
- 真实 EXE 回归增加 `DF` 标记与 `Deskforge` 名称断言。
- 直接检查 ASAR，确保发布资源不含旧品牌。

### 验证结果

```text
✅ ProductVersion: 0.2.0.0
✅ Packaged runtime rendered: Deskforge · 个人工作台
✅ Deskforge branding/settings/backup passed
✅ Packaged brand assets: DF / Deskforge only
```

---

## 面试要点

### 为什么开发模式正常但用户仍看到旧界面？
- Windows 桌面快捷方式启动的是已安装目录，不是工作区或最新 `win-unpacked`；相同版本号会放大新旧实例混淆。

### 如何避免类似问题？
- 发布时强制版本递增，并对安装包内部资源、EXE 版本、真实 UI 品牌三层验证。
