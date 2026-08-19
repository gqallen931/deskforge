# 文档体系使用说明

本目录提供一套**通用的工程文档记录体系**，可无痛迁移到任意项目。

---

## 一、目录结构

```
docs/
├── INDEX.md                                    # 文档索引（总入口）
├── architecture/
│   ├── project-architecture.md                 # 项目架构主文档
│   └── YYYY-MM-DD_development-journal.md       # 开发日志
├── features/
│   └── YYYY-MM-DD_feature-name.md              # 功能开发记录
├── bugs/
│   └── YYYY-MM-DD_bug-title.md                 # Bug 修复记录
└── _templates/
    ├── adr.md                                  # ADR 模板
    ├── bug.md                                  # Bug 记录模板
    ├── feature.md                              # 功能记录模板
    ├── INDEX.template.md                       # INDEX 模板
    ├── project-architecture.template.md        # 架构文档模板
    └── development-journal.template.md          # 开发日志模板
```

---

## 二、文档类型详解

### 2.1 INDEX.md — 文档索引

**作用**：项目文档的总入口，提供快速导航。

**核心章节**：
- 项目状态表（各模块完成情况）
- 快速开始指南（安装、启动命令）
- 架构文档索引
- Bug 修复索引
- 功能开发索引

**更新时机**：每次新增文档后同步更新索引。

### 2.2 project-architecture.md — 架构主文档

**作用**：记录项目的整体架构设计，是技术决策的最终依据。

**核心章节**：
1. 技术栈（前端/后端/基础设施）
2. 目录结构
3. 系统架构（进程模型、前端架构、路由、状态管理）
4. API 通信链路（开发/生产模式的请求路由）
5. Mock 服务（降级方案）
6. 启动与构建
7. 设计规范（视觉、代码原则）
8. 已知限制
9. 版本变更记录

**更新时机**：架构变更时立即更新，并递增版本号。

### 2.3 development-journal.md — 开发日志

**作用**：记录开发过程的思考、决策和实施细节。

**核心章节**：
1. 总体思路（问题分析、任务拆解）
2. 分阶段实施记录（每阶段包含思考过程、创建/修改的文件、关键实现、验证结果）
3. 关键技术决策记录
4. 回归测试记录
5. 文件变更总览
6. 待完成工作

**更新时机**：每个开发阶段完成后更新。

### 2.4 ADR — 架构决策记录

**作用**：记录重要的架构决策及其理由，供未来参考。

**命名规则**：`YYYY-MM-DD_adr-XXX-title.md`

**核心章节**：背景 → 决策 → 备选方案（带评分） → 后果（正面/负面/风险） → 面试要点

**使用场景**：
- 技术选型（如选 React 还是 Vue）
- 架构模式选择（如单体还是微服务）
- 重大技术债务的处理决策

### 2.5 Feature — 功能开发记录

**作用**：记录单个功能的完整开发过程。

**命名规则**：`YYYY-MM-DD_feature-name.md`

**核心章节**：需求背景 → 设计思路（方案对比） → 核心实现（关键代码 + 数据流） → 技术难点 → 面试要点

**使用场景**：
- 新功能开发完成后
- 重构现有功能时
- 技术方案需要详细记录时

### 2.6 Bug — Bug 修复记录

**作用**：记录 Bug 的排查和修复过程。

**命名规则**：`YYYY-MM-DD_bug-title.md`

**核心章节**：现象描述 → 排查过程（步骤表 + 关键转折点） → 根因分析 → 解决方案 → 面试要点

**严重程度**：
- **P0-Crash**：程序崩溃、数据丢失
- **P1-功能阻断**：核心功能不可用
- **P2-体验异常**：非核心功能异常、UI 问题

---

## 三、迁移到新项目的步骤

### 步骤 1：复制模板目录

将 `_templates/` 下的所有模板复制到新项目的 `docs/` 目录。

### 步骤 2：创建初始文档

```bash
# 1. 创建目录结构
mkdir -p docs/architecture
mkdir -p docs/features
mkdir -p docs/bugs

# 2. 从模板创建 INDEX.md
cp docs/_templates/INDEX.template.md docs/INDEX.md

# 3. 从模板创建架构文档
cp docs/_templates/project-architecture.template.md docs/architecture/project-architecture.md

# 4. 从模板创建开发日志
cp docs/_templates/development-journal.template.md docs/architecture/YYYY-MM-DD_development-journal.md
```

### 步骤 3：替换占位符

所有模板使用 `{{PLACEHOLDER}}` 格式的占位符。主要占位符：

| 占位符 | 说明 | 示例 |
|--------|------|------|
| `{{PROJECT_NAME}}` | 项目名称 | MyProject |
| `{{PROJECT_DESC}}` | 项目描述 | 一个示例项目 |
| `{{PROJECT_POSITIONING}}` | 项目定位 | 桌面客户端应用 |
| `{{TECH_STACK_LIST}}` | 技术栈列表 | Electron + React + Python |
| `{{PROJECT_ROOT}}` | 项目根目录 | /path/to/project |
| `{{INSTALL_CMD}}` | 安装命令 | npm install |
| `{{DEV_CMD}}` | 开发命令 | npm run dev |
| `{{BUILD_CMD}}` | 构建命令 | npm run build |

### 步骤 4：按项目实际情况填充

- 根据项目实际技术栈填写**前端/后端技术栈**
- 根据项目实际目录结构填写**目录结构**
- 根据项目实际架构绘制**系统架构图**（可用 ASCII 或 Mermaid）
- 根据项目实际接口填写**API 端点**

### 步骤 5：建立维护流程

1. **每次新增功能** → 在 `features/` 创建记录，并更新 `INDEX.md`
2. **每次修复 Bug** → 在 `bugs/` 创建记录，并更新 `INDEX.md`
3. **每次架构决策** → 在 `architecture/` 创建 ADR，并更新 `INDEX.md`
4. **每次架构变更** → 更新 `project-architecture.md` 的版本号和变更记录
5. **每个开发阶段** → 更新 `development-journal.md`

---

## 四、命名规范

### 日期前缀格式

所有文档文件使用 `YYYY-MM-DD` 日期前缀，确保按时间排序。

```
2026-08-19_feature-api-integration.md
2026-08-19_bug-white-screen.md
2026-07-29_adr-002-project-boundary.md
```

### ADR 编号规则

- 格式：`ADR-XXX`（三位数字，不足补零）
- 编号全局递增，不因文档归档而重置
- 示例：`ADR-001`、`ADR-002`、`ADR-010`

---

## 五、最佳实践

### 5.1 文档即沟通

- 文档是团队成员之间、人与 AI Agent 之间的沟通媒介
- 写文档时假设读者对项目一无所知
- 关键决策必须记录，即使当时看起来很明显

### 5.2 保持更新

- **INDEX.md** 是文档导航的唯一入口，必须始终保持最新
- **project-architecture.md** 是架构真相的唯一来源，修改代码后必须同步
- 过期文档比没有文档更危险——过时的架构文档会误导后续开发者

### 5.3 粒度适中

- Feature 记录聚焦单个功能点（一个文件一个故事）
- Bug 记录聚焦单个问题（便于未来检索相似问题）
- ADR 聚焦单个决策（便于追溯决策理由）

### 5.4 面试价值

所有模板都包含「面试要点」章节，记录的不仅是技术细节，更是：
- 设计思路和权衡
- 问题分析能力的展示
- 方案对比和选择理由
- 可迁移的设计模式知识

这些内容在面试时可以直接作为技术深度展示的素材。
