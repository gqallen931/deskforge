# Deskforge

Deskforge 是本地优先的个人工作台桌面软件，目标平台是 Windows。

技术栈：Electron + React + Vite。原始 `A-UI` 目录继续作为视觉和交互参考，不直接改造。

## 产品方向

这是一个可以安装到 Windows 电脑本地的个人工作台，不依赖在线账号才能使用。数据优先保存在本机，后续再按需要增加同步、AI 和多人协作能力。

## 当前阶段

- 已将 `A-UI/展示/task-dashboard.html` 和对应交互脚本原样接入 Deskforge。
- 当前 Deskforge 的第一版界面以原始 Dashboard 为唯一视觉基准，保留原有动画和交互。
- 下一步再把原页面的存储和系统能力逐步替换为 Electron 本地能力。
- 已准备 NSIS Windows 安装包配置。

## 开发

```bash
npm install
npm run dev
```

## Windows 安装包

```bash
npm run package:win
```

安装包使用 Electron Builder + NSIS。应用采用本地优先架构：先用 SQLite/本地文件保存个人数据，需要同步或多人协作时再增加后端服务。

后端建议：Python + FastAPI。当前阶段不引入后端；只有需要跨设备同步、账号、多人协作或 AI 服务代理时再增加它。
