# [打包后的 Deskforge 窗口黑屏]

| 字段 | 内容 |
|------|------|
| 日期 | 2026-08-19 |
| 严重程度 | P1-功能阻断 |
| 关联项目 | Deskforge |
| 相关文件 | `vite.config.js`、`dist/index.html`、`scripts/verify-packaged-assets.cjs` |
| 触发条件 | 运行 `release/win-unpacked/Deskforge.exe` 或安装版 EXE |

---

## 现象描述

Electron 窗口、标题和系统菜单正常显示，但整个渲染区域为黑色，Dashboard 没有出现。开发服务器模式不具备同样的 `file://` 加载条件，因此仅验证开发模式未能提前发现问题。

---

## 排查过程

| 步骤 | 假设 | 验证方法 | 结果 |
|------|------|---------|------|
| 1 | Vite 资源路径不兼容 `file://` | 检查 `dist/index.html` | JS/CSS 使用 `/assets/...` 绝对路径，命中根因 |
| 2 | Dashboard iframe 路径错误 | 检查 React 入口和 `dist/dashboard.html` | `./dashboard.html` 正确 |
| 3 | 打包遗漏静态文件 | 列出 `app.asar` 内容 | Dashboard、脚本和 assets 均存在 |
| 4 | 修复后是否真实渲染 | 通过 CDP 查询打包版 DOM | React 根节点、iframe 和“任务管理”正文均存在 |

关键转折点：窗口能打开只说明主进程正常，必须验证生产 `file://` 入口是否能解析前端资源。

---

## 根因分析

```text
Vite 默认 base 为 `/`，构建出的 index.html 引用 `/assets/index-*.js` 和 `/assets/index-*.css`。
Electron 生产模式使用 win.loadFile()，页面协议是 file://；绝对路径被解析到文件系统根目录，
导致 React 脚本未加载、#root 为空，最终只显示 body 的黑色背景。
```

---

## 解决方案

**修改的文件：**

1. `vite.config.js` — 设置 `base: './'`，让构建资源使用相对路径。
2. `scripts/verify-packaged-assets.cjs` — 检查生产入口不存在 `/assets/...` 绝对引用且所有资源存在。
3. `scripts/verify-packaged-runtime.cjs` — 通过本地 CDP 验证打包 EXE 实际渲染 Dashboard。
4. `package.json` — 增加两条可重复验证命令。

**核心 diff 逻辑：**

```javascript
export default defineConfig({
  base: './',
  plugins: [react()],
});
```

---

## 面试要点

### 这个问题考察什么能力？
- Web 开发服务器与桌面应用 `file://` 生产加载模型的差异。
- 建立能捕获用户真实症状的自动化反馈环。

### 回答思路
1. 先确认主进程还是渲染进程故障。
2. 检查构建入口、资源路径和 ASAR 内容。
3. 用静态资源检查复现问题，再用 CDP 验证真实打包运行时。

### 延伸追问
- Q: 为什么开发模式正常、打包后黑屏？
  A: 开发模式由 HTTP 服务器处理 `/assets`，生产模式通过 `file://` 读取文件，绝对 URL 的语义不同。
