# 🌙 树影日记（Shuyin Diary）

一款基于 **Electron + React + TypeScript** 的跨平台本地日记桌面应用。数据完全保存在本机，日记内容经 AES-256-GCM 加密后存入 SQLite，即使数据库文件泄露也无法读取。

## ✨ 功能特性

- **日记管理**：新建、查看、编辑、删除（软删除，可在回收站恢复）
- **回收站**：删除的日记进入回收站，支持恢复、彻底删除、一键清空；超过 30 天自动清理
- **锁屏密码**：可设置 PIN 密码，启动即锁、手动锁定，支持系统空闲自动锁定（关闭 / 1 / 5 / 15 分钟）；密码经 scrypt 加盐哈希存储，锁定时主进程直接拒绝数据读写
- **自动保存**：编辑停止 800ms 后自动落库，界面显示保存时间；切换日记或关闭窗口前自动保存未落库的修改，不丢字
- **搜索筛选**：按关键词（标题 + 正文）、标签、日期范围检索
- **标签系统**：为每篇日记添加多个标签，侧边栏按标签聚合筛选
- **心情 / 天气**：记录写作时的心情与天气
- **数据导出**：一键导出为 JSON 或 Markdown 文件
- **Markdown 预览**：正文支持 Markdown 语法，编辑/预览一键切换（marked 渲染 + DOMPurify 消毒）
- **明暗主题**：一键切换浅色 / 深色，偏好持久化保存
- **隐私加密**：标题与正文使用 AES-256-GCM 加密，主密钥由操作系统凭据系统（Windows DPAPI / macOS Keychain）保护

## 🧱 技术栈

| 领域 | 技术 |
| --- | --- |
| 桌面框架 | Electron 44 |
| 前端 | React 19 + TypeScript 7 |
| 构建工具 | Vite 8 |
| 状态管理 | Zustand 5 |
| 本地数据库 | better-sqlite3 13（Node-API 预编译） |
| Markdown 渲染 | marked + DOMPurify（XSS 消毒） |
| 加密 | Node.js crypto（AES-256-GCM）+ Electron safeStorage |
| 打包 | electron-builder 26（NSIS） |

## 📁 目录结构

```
shuyin_diary/
├── src/
│   ├── main/                 # 主进程
│   │   ├── index.ts          # 应用入口
│   │   ├── encryption.ts     # AES-256-GCM 加密与密钥管理
│   │   ├── database.ts       # SQLite 建表、CRUD、软删除、标签、设置
│   │   ├── lock.ts           # 锁屏密码（PIN 哈希、锁定状态、空闲自动锁）
│   │   ├── ipc.ts            # IPC 处理器（参数校验、锁定守卫、数据导出）
│   │   └── window.ts         # 窗口创建与安全配置
│   ├── preload/
│   │   └── index.ts          # contextBridge 安全桥接（window.diaryAPI）
│   ├── renderer/             # 渲染进程（React）
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/   # Toolbar / Sidebar / Editor / LockScreen / SettingsModal
│   │       ├── store/        # Zustand 状态
│   │       ├── api/          # preload API 类型封装
│   │       └── styles/       # 全局样式与主题变量
│   └── shared/               # 主/渲染共享的类型与常量
│       ├── types.ts
│       ├── constants.ts
│       └── datetime.ts       # 时区安全的日期工具
├── electron-builder.json
├── tsconfig.json             # 渲染进程 TS 配置
├── tsconfig.main.json        # 主进程 TS 配置
└── vite.config.mts
```

## 🚀 快速开始

### 环境要求

- Node.js 20+
- npm

### 安装依赖

```bash
npm install
```

> 项目已配置 npmmirror 镜像（见 `.npmrc`），Electron 二进制可正常下载。

### 开发模式

```bash
npm run dev
```

该命令会并行启动：Vite 开发服务器（5173 端口，支持热更新）、主进程 TypeScript 监听编译、Electron 窗口。

### 生产模式预览

```bash
npm run build   # 编译主进程 + 渲染进程
npm start       # 启动 Electron 加载 dist 产物
```

### 打包安装包

```bash
npm run dist
```

产物输出到 `release/`：

- `Shuyin Diary Setup x.y.z.exe`：Windows NSIS 安装包
- `win-unpacked/`：免安装可直接运行的目录

> ⚠️ **重新打包前请先关闭正在运行的应用**，否则 `win-unpacked` 目录被占用会报 `EBUSY: resource busy or locked`。

## 🔐 数据与安全

- 数据目录（Electron `userData`）：
  - Windows：`%APPDATA%\shuyin-diary\`
  - macOS：`~/Library/Application Support/shuyin-diary/`
- `diary.db`：SQLite 数据库，标题与正文为密文
- `secret.key`：被系统凭据 API 加密包裹的 AES 主密钥

安全措施：

- `contextIsolation: true`、`nodeIntegration: false`，渲染进程仅能访问 preload 暴露的白名单 API
- 所有 IPC 通道均做入参类型校验，SQL 全部使用参数化查询
- 配置了内容安全策略（CSP）
- 锁屏密码仅以 scrypt 加盐哈希形式存储；应用锁定时，主进程拒绝所有日记数据的读写请求（非仅前端遮罩）

## 📝 关于原生模块

better-sqlite3 v13 随包提供 **Node-API 预编译二进制**（`prebuilds/win32-x64.node` 等），Node-API 跨 Node/Electron ABI 通用，**无需安装 Visual Studio 或执行 electron-rebuild**。因此 `electron-builder.json` 中设置了 `"npmRebuild": false`，并通过 `asarUnpack` 将其解包到 asar 外加载。

## 🗺️ 后续规划

- 富文本编辑器（tiptap）与图片插入
- PDF 导出
- 字体大小设置界面
- 每日写日记提醒
- 单元测试与端到端测试

## 📄 License

MIT
