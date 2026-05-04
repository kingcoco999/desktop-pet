# Desktop Pet 🐾

AI 驱动的智能桌面宠物助手 — 一只住在你桌面上的像素小猫，能聊天、能记事、能提醒。

## 功能特性

- 🐱 **桌面宠物** — 像素小猫悬浮在桌面上，支持多种动画状态
- 💬 **AI 对话** — 集成 OpenAI 兼容 API，支持自然语言交互
- ✅ **待办管理** — AI 自动创建/查询/删除待办事项
- 📒 **记事本** — AI 帮你记录重要信息
- ⏰ **提醒系统** — 定时提醒 + 系统通知 + 重复提醒
- 🎮 **互动玩法** — 点击、拖拽、右键菜单
- 🖥️ **控制台** — 完整的管理界面

## 技术栈

- Electron + TypeScript
- Vue 3 + Vite（控制台 UI）
- Canvas 2D（宠物渲染）
- SQLite (better-sqlite3)（本地存储）
- node-notifier（系统通知）

## 安装

```bash
# 克隆项目
git clone <repo-url>
cd desktop-pet

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

## 开发

```bash
# 开发模式（同时启动主进程 + 渲染进程）
npm run dev

# 仅启动主进程
npm run dev:main

# 仅启动控制台 UI
npm run dev:renderer

# 仅启动宠物渲染
npm run dev:pet
```

## 构建

```bash
# 构建所有
npm run build

# 打包为可执行文件
npm run dist
```

## 项目结构

```
desktop-pet/
├── src/
│   ├── main/                    ← Electron 主进程
│   │   ├── index.ts             ← 应用入口
│   │   ├── windows/             ← 窗口管理
│   │   ├── ipc/                 ← IPC 处理器
│   │   ├── services/            ← 业务服务
│   │   ├── store/               ← 数据库
│   │   └── utils/               ← 工具函数
│   ├── renderer/
│   │   ├── pet/                 ← 宠物窗口渲染
│   │   ├── console/             ← 控制台 UI (Vue 3)
│   │   └── shared/              ← 共享类型/常量
│   └── assets/                  ← 静态资源
├── docs/                        ← 文档
└── resources/                   ← 打包资源
```

## 使用说明

### 首次使用

1. 启动应用后，像素小猫会出现在屏幕右下角
2. 右键点击小猫 → **设置** → 配置 AI API 地址和 Key
3. 双击小猫展开输入框，开始对话

### 快捷操作

| 操作 | 效果 |
|------|------|
| 左键单击 | 小猫开心动画 |
| 左键双击 | 展开/收起输入框 |
| 鼠标拖拽 | 移动小猫位置 |
| 右键单击 | 弹出菜单 |

### AI 对话示例

- "帮我记一下 wifi 密码是 123456"
- "我有什么待办？"
- "下午3点提醒我开会"
- "删除买牛奶这个待办"

## 配置

AI 配置通过控制台 → 设置面板进行：

- **API 地址** — 支持任何 OpenAI 兼容 API
- **API Key** — 你的 API 密钥
- **模型** — 选择要使用的模型
- **人设** — 自定义宠物的性格和说话风格

## License

MIT
