# 🐾 桌面宠物 Desktop Pet — 项目策划书

> **版本：** v1.0  
> **日期：** 2026-05-05  
> **状态：** 策划阶段

---

## 一、项目概述

### 1.1 项目名称
**Desktop Pet** — AI 驱动的智能桌面宠物助手

### 1.2 一句话描述
一只住在你桌面上的像素小猫，能聊天、能记事、能提醒，是你的 AI 桌面伙伴。

### 1.3 核心卖点
- **不只是装饰品**：集成 AI 对话、待办管理、记事、提醒于一体的桌面助手
- **自然语言交互**：双击宠物直接用自然语言创建待办/记事/提醒，AI 自动解析意图
- **高度可定制**：支持导入自定义宠物（GIF 格式），更换外观
- **轻量原生**：基于 Electron，打包为 Windows EXE，开箱即用

### 1.4 目标用户
- 喜欢桌面美化、桌面宠物的用户
- 需要轻量级待办/提醒工具的个人用户
- 对 AI 交互感兴趣的极客/开发者

---

## 二、功能设计

### 2.1 功能全景图

```
┌─────────────────────────────────────────────────────────┐
│                    Desktop Pet                           │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  桌面宠物层   │  │   AI 对话系统  │  │   任务管理系统  │  │
│  │             │  │              │  │               │  │
│  │ • 宠物渲染   │  │ • 自然语言输入 │  │ • 待办(CRUD)  │  │
│  │ • 动画状态机 │  │ • AI API 调用 │  │ • 记事(CRUD)  │  │
│  │ • 自动行为   │  │ • 意图解析    │  │ • 提醒/闹钟   │  │
│  │ • 拖拽交互   │  │ • 对话气泡    │  │ • 定时调度    │  │
│  │ • 右键菜单   │  │ • 角色扮演    │  │ • 系统通知    │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  控制台 UI   │  │   配置系统    │  │   宠物系统    │  │
│  │             │  │              │  │               │  │
│  │ • 聊天面板   │  │ • API 配置   │  │ • 内置宠物    │  │
│  │ • 待办面板   │  │ • 外观设置   │  │ • 自定义导入  │  │
│  │ • 记事面板   │  │ • 人设配置   │  │ • GIF 支持    │  │
│  │ • 提醒面板   │  │ • 数据管理   │  │ • 帧序列支持  │  │
│  │ • 设置面板   │  │              │  │               │  │
│  │ • 概览面板   │  │              │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 功能模块详细说明

#### 模块一：桌面宠物层

**2.2.1 宠物渲染**
- 宠物以透明无边框窗口悬浮在桌面上
- 使用 Canvas 渲染，支持像素风清晰显示
- 窗口可拖拽移动位置
- 支持调整宠物大小（默认 80×80px）
- 支持调整窗口透明度

**2.2.2 动画状态机**

宠物有以下动画状态，状态之间有明确的转换规则：

```
                    ┌──────┐
         ┌─────────│ idle │─────────┐
         │         └──┬───┘         │
         │            │             │
         ▼            ▼             ▼
    ┌────────┐   ┌────────┐   ┌────────┐
    │  walk  │   │  sit   │   │  talk  │
    └────────┘   └───┬────┘   └────────┘
                     │
                     ▼
                ┌────────┐
                │ sleep  │
                └────────┘

    交互触发：
    click    → happy → idle
    drag     → drag → fall → idle
    eat      → eat → happy → idle
    reminder → happy + 气泡通知
```

| 状态 | 触发条件 | 动画帧数 | 循环 | 下一状态 |
|------|---------|---------|------|---------|
| `idle` | 默认/恢复 | 4帧 | ✅ | sit/walk/talk |
| `walk-left` | 自动行走 | 3帧 | ✅ | idle |
| `walk-right` | 自动行走 | 3帧 | ✅ | idle |
| `sit` | 闲置5-15秒后随机触发 | 1帧 | ❌ | sleep/idle |
| `sleep` | 坐下10-30秒后随机触发 | 2帧 | ✅ | idle |
| `talk` | 用户对话/AI回复 | 2帧 | ✅ | idle |
| `happy` | 点击/完成任务/吃东西 | 2帧 | ❌ | idle |
| `eat` | 吃东西道具 | 2帧 | ❌ | happy |
| `drag` | 鼠标拖拽中 | 1帧 | ❌ | fall |
| `fall` | 松手后落地 | 2帧 | ❌ | idle |

**2.2.3 自动行为系统（BehaviorEngine）**

宠物在没有用户交互时会自主行动，增加"活"的感觉：

| 行为 | 触发条件 | 说明 |
|------|---------|------|
| 随机行走 | 每 8-20 秒随机触发 | 在桌面上随机方向走一段 |
| 坐下发呆 | idle 状态持续 5-15 秒 | 概率 30% |
| 睡觉 | sit 状态持续 10-30 秒 | 概率 20% |
| 边缘检测 | 走到屏幕边缘 | 自动转向或停在边缘 |
| 任务栏休息 | 长时间无交互 | 移动到任务栏上方坐下 |

**2.2.4 交互方式**

| 交互 | 操作 | 效果 |
|------|------|------|
| 左键单击 | 点击宠物 | 播放 happy 动画 |
| 左键双击 | 双击宠物 | 展开/聚焦输入框，进入对话模式 |
| 鼠标拖拽 | 按住拖动 | 宠物跟随鼠标移动，播放 drag 动画 |
| 松手 | 松开鼠标 | 宠物下落，播放 fall 动画 |
| 右键单击 | 右键点击 | 弹出右键菜单 |

**2.2.5 右键菜单**

```
┌──────────────────────┐
│ 💬 打开对话           │
│ 📝 新建待办           │
│ 📒 新建记事           │
│ ⏰ 设置提醒           │
│ ──────────────────── │
│ 🖥️ 打开控制台         │
│ ⚙️ 快速设置           │
│ ──────────────────── │
│ 😴 休息模式           │
│ 🔄 重新加载           │
│ 🚪 退出              │
└──────────────────────┘
```

**2.2.6 对话输入/输出**

- **输入**：宠物旁边显示一个输入框（可展开/收起），用户直接输入文字
- **输出**：AI 回复以对话气泡形式显示在宠物上方
- 气泡支持自动换行、最大宽度限制、自动消失（可配置）
- 对话中宠物播放 `talk` 动画

---

#### 模块二：AI 对话系统

**2.2.7 AI API 集成**

- 支持配置 API 地址（兼容 OpenAI 格式的任意 API）
- 支持配置 API Key
- 支持测试连接功能（发送测试请求验证 API 可用性）
- 支持获取可用模型列表
- 支持选择模型
- 支持配置系统人设（System Prompt）

**2.2.8 角色扮演功能**

- 用户可自定义宠物的 System Prompt
- 内置默认人设：
  ```
  你是一只住在用户桌面上的像素小猫，名叫「小喵」。
  性格：活泼、可爱、偶尔犯傻、有点傲娇。
  说话风格：简短、口语化，喜欢用颜文字和emoji。
  你关心主人，会主动提醒他们喝水、休息。
  ```

**2.2.9 意图解析（核心功能）**

每次用户输入，AI 需要判断意图并返回结构化 JSON：

```json
// System Prompt 中要求 AI 始终返回 JSON
// 包含意图分类 + 对应的数据

// 场景1：普通对话
{
  "intent": "chat",
  "reply": "好的喵～有什么需要帮忙的？",
  "mood": "happy"
}

// 场景2：创建待办
{
  "intent": "create_todo",
  "reply": "好的！已帮你创建待办「下午3点开会」✅",
  "mood": "happy",
  "data": {
    "title": "下午3点开会",
    "due": "2026-05-05T15:00:00",
    "priority": "high"
  }
}

// 场景3：创建记事
{
  "intent": "create_note",
  "reply": "记好了喵！wifi密码是123456 📝",
  "mood": "happy",
  "data": {
    "content": "wifi密码：123456",
    "tags": ["密码", "网络"]
  }
}

// 场景4：创建提醒
{
  "intent": "create_reminder",
  "reply": "收到！9点会提醒你喝水的 💧",
  "mood": "happy",
  "data": {
    "content": "喝水",
    "time": "2026-05-05T09:00:00",
    "repeat": "daily"
  }
}

// 场景5：查询待办
{
  "intent": "query_todos",
  "reply": "你有3个待办哦～\n1. 买牛奶\n2. 下午3点开会\n3. 提交周报",
  "mood": "normal"
}

// 场景6：删除待办
{
  "intent": "delete_todo",
  "reply": "已删除「买牛奶」🗑️",
  "mood": "normal",
  "data": {
    "todoTitle": "买牛奶"
  }
}

// 场景7：修改待办
{
  "intent": "update_todo",
  "reply": "已把开会时间改到4点啦～",
  "mood": "happy",
  "data": {
    "todoTitle": "开会",
    "updates": { "due": "2026-05-05T16:00:00" }
  }
}
```

**AI 返回的 `mood` 字段会影响宠物动画：**
- `"happy"` → 播放 happy 动画
- `"normal"` → 继续 talk 动画
- `"surprised"` → 播放 happy（惊讶和开心共用）

**2.2.10 AI System Prompt 模板**

```json
{
  "role": "system",
  "content": "你是{{pet_name}}，{{pet_description}}\n\n性格：{{pet_personality}}\n\n你的职责：\n1. 陪主人聊天，用可爱的语气回复\n2. 帮主人管理待办、记事、提醒\n3. 主动关心主人（提醒喝水、休息等）\n\n重要规则：\n- 你必须始终返回JSON格式的回复\n- 今天的日期是 {{current_date}}，现在是 {{current_time}}\n- 如果用户想创建待办/记事/提醒，提取相关信息并返回对应JSON\n- 如果是普通聊天，返回 chat 类型的JSON\n- 回复要简短、口语化、符合你的性格\n- JSON格式如下：\n\n{\"intent\":\"chat\",\"reply\":\"你的回复\",\"mood\":\"happy|normal|surprised\"}\n{\"intent\":\"create_todo\",\"reply\":\"回复\",\"mood\":\"happy\",\"data\":{\"title\":\"标题\",\"due\":\"ISO时间或null\",\"priority\":\"low|normal|high\"}}\n{\"intent\":\"create_note\",\"reply\":\"回复\",\"mood\":\"happy\",\"data\":{\"content\":\"内容\",\"tags\":[\"标签\"]}}\n{\"intent\":\"create_reminder\",\"reply\":\"回复\",\"mood\":\"happy\",\"data\":{\"content\":\"内容\",\"time\":\"ISO时间\",\"repeat\":\"none|daily|weekly|monthly\"}}\n{\"intent\":\"query_todos\",\"reply\":\"回复\",\"mood\":\"normal\"}\n{\"intent\":\"query_notes\",\"reply\":\"回复\",\"mood\":\"normal\"}\n{\"intent\":\"delete_todo\",\"reply\":\"回复\",\"mood\":\"normal\",\"data\":{\"todoTitle\":\"标题\"}}\n{\"intent\":\"update_todo\",\"reply\":\"回复\",\"mood\":\"happy\",\"data\":{\"todoTitle\":\"原标题\",\"updates\":{}}}"
}
```

---

#### 模块三：任务管理系统

**2.2.11 待办（Todo）**

数据模型：
```typescript
interface Todo {
  id: string;           // UUID
  title: string;        // 标题
  description?: string; // 详情（可选）
  completed: boolean;   // 是否完成
  priority: 'low' | 'normal' | 'high';
  due?: string;         // ISO 时间，截止日期
  createdAt: string;    // 创建时间
  updatedAt: string;    // 更新时间
  source: 'ai' | 'manual'; // 创建来源
}
```

操作：
- ✅ 创建（AI 自动 / 手动）
- ✅ 查看列表（控制台）
- ✅ 编辑（控制台）
- ✅ 标记完成
- ✅ 删除
- ✅ 按优先级/截止日期排序
- ✅ 自然语言查询（"我有什么待办？"）

**2.2.12 记事（Note）**

数据模型：
```typescript
interface Note {
  id: string;
  content: string;      // 记事内容
  tags: string[];        // 标签
  createdAt: string;
  updatedAt: string;
  source: 'ai' | 'manual';
  pinned: boolean;       // 是否置顶
}
```

操作：
- ✅ 创建（AI 自动 / 手动）
- ✅ 查看列表
- ✅ 编辑
- ✅ 删除
- ✅ 按标签筛选
- ✅ 搜索
- ✅ 自然语言查询（"我之前记的wifi密码是多少？"）

**2.2.13 提醒 / 闹钟（Reminder）**

数据模型：
```typescript
interface Reminder {
  id: string;
  content: string;       // 提醒内容
  time: string;          // ISO 时间
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;      // 是否启用
  createdAt: string;
  source: 'ai' | 'manual';
  lastTriggered?: string; // 上次触发时间
}
```

触发机制：
- 应用内调度器每秒检查一次
- 到达提醒时间时：
  1. 宠物播放 happy 动画
  2. 显示气泡通知（内容）
  3. 发送系统通知（Windows Notification）
  4. 播放提醒音效（可选）
- 重复提醒自动计算下次触发时间

操作：
- ✅ 创建（AI 自动 / 手动）
- ✅ 查看列表
- ✅ 编辑
- ✅ 启用/禁用
- ✅ 删除
- ✅ 自然语言查询（"我设了哪些提醒？"）

---

#### 模块四：控制台 UI

**2.2.14 控制台概览**

独立窗口，可通过右键菜单或快捷键打开。左侧为导航栏，右侧为内容面板。

```
┌────────────────────────────────────────────────────────────┐
│  🐾 Desktop Pet Console                          ─ □ ✕    │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│  📊 概览  │  （当前选中面板的内容区域）                        │
│          │                                                 │
│  💬 聊天  │                                                 │
│          │                                                 │
│  ✅ 待办  │                                                 │
│          │                                                 │
│  📒 记事  │                                                 │
│          │                                                 │
│  ⏰ 提醒  │                                                 │
│          │                                                 │
│  ⚙️ 设置  │                                                 │
│          │                                                 │
└──────────┴─────────────────────────────────────────────────┘
```

**2.2.15 概览面板**
- 今日待办数量（完成/总数）
- 最近记事预览
- 即将到来的提醒
- 今日对话条数
- 宠物状态（当前动画/心情）

**2.2.16 聊天面板**
- 完整对话历史（时间线形式）
- 区分用户消息和 AI 回复
- 支持搜索历史消息
- 底部输入框可直接对话
- 支持清空对话历史
- AI 回复中对应创建的待办/记事/提醒可点击跳转

**2.2.17 待办面板**
- 待办列表（可按状态/优先级/日期筛选）
- 每个待办项显示：标题、截止日期、优先级、完成状态、来源（AI/手动）
- 操作按钮：完成、编辑、删除
- 支持手动新建待办
- 支持拖拽排序（可选）
- 空状态提示

**2.2.18 记事面板**
- 记事列表（卡片式/列表式切换）
- 每个记事显示：内容预览、标签、创建时间
- 操作按钮：编辑、删除、置顶
- 支持按标签筛选
- 支持搜索
- 支持手动新建记事

**2.2.19 提醒面板**
- 提醒列表（按时间排序）
- 每个提醒显示：内容、时间、重复规则、启用状态
- 操作按钮：编辑、删除、启用/禁用
- 支持手动新建提醒
- 已过期的提醒标记灰色

**2.2.20 设置面板**

```
┌─────────────────────────────────────────┐
│                                         │
│  🤖 AI 设置                              │
│  ┌───────────────────────────────────┐  │
│  │ API 地址:  [https://api.xxx.com ] │  │
│  │ API Key:   [••••••••••••    ]     │  │
│  │            [🔍 测试连接]          │  │
│  │ 模型:      [▼ GPT-4o-mini   ]    │  │
│  │            [🔄 获取模型列表]       │  │
│  │ 宠物人设:  [📝 编辑人设...]       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  🐾 外观                                 │
│  ┌───────────────────────────────────┐  │
│  │ 宠物:      [▼ 像素小猫     ]      │  │
│  │            [📦 导入自定义宠物]     │  │
│  │ 宠物大小:  [────●────] 80px       │  │
│  │ 透明度:    [──────●──] 90%        │  │
│  │ 气泡显示:  [☑ 默认展开]           │  │
│  │ 气泡消失:  [────●────] 5秒        │  │
│  │ 开机自启:  [☐]                    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  🔔 提醒                                 │
│  ┌───────────────────────────────────┐  │
│  │ 提醒音效:  [☑ 开启]               │  │
│  │ 音效文件:  [default.wav ▾]        │  │
│  │ 通知方式:  [▼ 气泡 + 系统通知]    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  💾 数据                                 │
│  ┌───────────────────────────────────┐  │
│  │ 聊天记录:  1,247 条  [清空]        │  │
│  │ 待办:      23 条                   │  │
│  │ 记事:      15 条                   │  │
│  │ 提醒:      8 条                    │  │
│  │                                    │  │
│  │ [📤 导出全部数据]  [📥 导入数据]   │  │
│  │ [⚠️ 清空所有数据]                  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ℹ️ 关于                                 │
│  ┌───────────────────────────────────┐  │
│  │ 版本: v1.0.0                      │  │
│  │ [GitHub] [反馈问题] [检查更新]     │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

#### 模块五：宠物自定义系统

**2.2.21 内置宠物**

默认提供「像素小猫」，包含完整动画集：
- idle, walk-left, walk-right, talk, happy, sit, sleep, eat, drag, fall
- PNG 帧序列格式，80×80px，像素风
- 内置默认人设和行为参数

**2.2.22 自定义宠物导入格式**

支持两种格式：

**格式一：GIF 模式（推荐，用户友好）**
```
my-pet/
├── pet.json          ← 必须，配置文件
├── idle.gif          ← 必须，闲置动画
├── walk.gif          ← 可选，行走
├── talk.gif          ← 可选，说话
├── happy.gif         ← 可选，开心
├── sit.gif           ← 可选，坐下
├── sleep.gif         ← 可选，睡觉
├── eat.gif           ← 可选，吃东西
├── drag.gif          ← 可选，拖拽
└── fall.gif          ← 可选，落地
```

**格式二：帧序列模式（精细控制）**
```
my-pet/
├── pet.json
├── idle/
│   ├── 0.png
│   ├── 1.png
│   ├── 2.png
│   └── 3.png
├── walk-left/
│   ├── 0.png
│   └── 1.png
└── ...
```

**pet.json 配置文件：**
```json
{
  "name": "宠物名称",
  "author": "作者",
  "version": "1.0",
  "format": "gif",
  "size": { "width": 96, "height": 96 },
  "animations": {
    "idle":       { "file": "idle.gif",  "loop": true },
    "walk":       { "file": "walk.gif",  "loop": true },
    "talk":       { "file": "talk.gif",  "loop": true },
    "happy":      { "file": "happy.gif", "loop": false, "next": "idle" },
    "sit":        { "file": "sit.gif",   "loop": false },
    "sleep":      { "file": "sleep.gif", "loop": true },
    "eat":        { "file": "eat.gif",   "loop": false, "next": "happy" },
    "drag":       { "file": "drag.gif",  "loop": false }
  },
  "behaviors": {
    "idleToSitChance": 0.3,
    "walkInterval": [8000, 20000]
  },
  "bubble": {
    "offsetX": 0,
    "offsetY": -130,
    "maxWidth": 250
  }
}
```

**2.2.23 动画 ↔ 功能映射表**

| 功能/场景 | 触发动画 | 是否必须 |
|----------|---------|---------|
| 桌面闲置 | `idle` | ✅ 必须 |
| 随机走动 | `walk-left` / `walk-right` / `walk` | 可选 |
| 坐下发呆 | `sit` | 可选 |
| 睡觉 | `sleep` | 可选 |
| 左键点击互动 | `happy` | 可选 |
| 对话中 | `talk` | 可选 |
| 吃东西 | `eat` | 可选 |
| 被拖拽 | `drag` | 可选 |
| 落地 | `fall` | 可选 |
| 提醒触发 | `happy` | 可选 |

**缺失动画 fallback 策略：** 任何缺失的动画状态均 fallback 到 `idle`，功能不受影响，仅缺少专属动画效果。

**2.2.24 导入流程**

```
控制台 → 设置 → 宠物管理 → 导入宠物
  │
  ▼
选择包含 pet.json + GIF/PNG 的文件夹
  │
  ▼
校验 pet.json 格式 + 检查必须文件
  │
  ▼
预览各动画状态
  │
  ▼
确认 → 复制到 pets/ 目录 → 可在设置中切换
```

---

## 三、技术架构

### 3.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | **Electron** | 跨平台桌面应用，透明窗口支持好 |
| 语言 | **TypeScript** | 类型安全，减少运行时错误 |
| 控制台 UI | **Vue 3** + Vite | 响应式 UI，开发效率高 |
| 宠物渲染 | **Canvas 2D** | 像素风清晰渲染，性能好 |
| 本地存储 | **SQLite** (better-sqlite3) | 结构化存储，查询方便 |
| AI 调用 | **fetch API** | 调用 OpenAI 兼容格式的 API |
| 打包 | **electron-builder** | 打包为 Windows EXE |
| 提醒通知 | **node-notifier** | 调用系统原生通知 |

### 3.2 架构图

```
┌──────────────────────────────────────────────────────────────┐
│                        Electron App                          │
│                                                              │
│  ┌─────────────────────┐    IPC     ┌─────────────────────┐  │
│  │   Main Process      │◄─────────►│  Renderer Process    │  │
│  │                     │           │                     │  │
│  │  ┌───────────────┐  │           │  ┌───────────────┐  │  │
│  │  │  AI Service    │  │           │  │  Pet Window    │  │  │
│  │  │  - API 调用    │  │           │  │  - Canvas渲染  │  │  │
│  │  │  - 意图解析    │  │           │  │  - 动画状态机  │  │  │
│  │  │  - 连接测试    │  │           │  │  - 行为引擎    │  │  │
│  │  │  - 模型列表    │  │           │  │  - 输入框      │  │  │
│  │  └───────────────┘  │           │  │  - 气泡管理    │  │  │
│  │                     │           │  └───────────────┘  │  │
│  │  ┌───────────────┐  │           │                     │  │
│  │  │  Storage       │  │           │  ┌───────────────┐  │  │
│  │  │  - SQLite      │  │           │  │ Console Window │  │  │
│  │  │  - 聊天记录    │  │           │  │  - 聊天面板    │  │  │
│  │  │  - 待办CRUD    │  │           │  │  - 待办面板    │  │  │
│  │  │  - 记事CRUD    │  │           │  │  - 记事面板    │  │  │
│  │  │  - 提醒CRUD    │  │           │  │  - 提醒面板    │  │  │
│  │  │  - 设置存储    │  │           │  │  - 设置面板    │  │  │
│  │  └───────────────┘  │           │  │  - 概览面板    │  │  │
│  │                     │           │  └───────────────┘  │  │
│  │  ┌───────────────┐  │           │                     │  │
│  │  │  Scheduler     │  │           └─────────────────────┘  │
│  │  │  - 提醒调度    │  │                                    │
│  │  │  - 系统通知    │  │                                    │
│  │  │  - 音效播放    │  │                                    │
│  │  └───────────────┘  │                                    │
│  │                     │                                    │
│  │  ┌───────────────┐  │                                    │
│  │  │  Pet Manager   │  │                                    │
│  │  │  - 宠物加载    │  │                                    │
│  │  │  - GIF解析     │  │                                    │
│  │  │  - 帧序列管理  │  │                                    │
│  │  │  - 宠物切换    │  │                                    │
│  │  └───────────────┘  │                                    │
│  └─────────────────────┘                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                    数据层                             │    │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐  │    │
│  │  │ SQLite  │  │ pets/    │  │ config.json         │  │    │
│  │  │ 数据库  │  │ 宠物素材  │  │ API/外观/行为配置    │  │    │
│  │  └─────────┘  └──────────┘  └─────────────────────┘  │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
        │                                    │
        ▼                                    ▼
  ┌───────────┐                      ┌──────────────┐
  │  AI API   │                      │  系统通知 API │
  │ (可配置)   │                      │ (Windows)    │
  └───────────┘                      └──────────────┘
```

### 3.3 项目目录结构

```
desktop-pet/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
│
├── src/
│   ├── main/                        ← Electron 主进程
│   │   ├── index.ts                 ← 应用入口
│   │   ├── windows/
│   │   │   ├── petWindow.ts         ← 宠物透明窗口
│   │   │   └── consoleWindow.ts     ← 控制台窗口
│   │   ├── ipc/
│   │   │   ├── ai.ts                ← AI 相关 IPC handlers
│   │   │   ├── todo.ts              ← 待办 CRUD IPC
│   │   │   ├── note.ts              ← 记事 CRUD IPC
│   │   │   ├── reminder.ts          ← 提醒 CRUD IPC
│   │   │   ├── chat.ts              ← 聊天记录 IPC
│   │   │   ├── pet.ts               ← 宠物管理 IPC
│   │   │   └── settings.ts          ← 设置 IPC
│   │   ├── services/
│   │   │   ├── aiService.ts         ← AI API 调用 + 解析
│   │   │   ├── scheduler.ts         ← 提醒调度器
│   │   │   └── storage.ts           ← SQLite 存储层
│   │   ├── store/
│   │   │   └── database.ts          ← SQLite 初始化 + 表结构
│   │   └── utils/
│   │       ├── gifParser.ts         ← GIF 帧解析
│   │       └── notifications.ts     ← 系统通知封装
│   │
│   ├── renderer/
│   │   ├── pet/                     ← 宠物窗口（独立 HTML）
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   ├── PetRenderer.ts       ← Canvas 绘制 + 动画播放
│   │   │   ├── BubbleManager.ts     ← 对话气泡管理
│   │   │   ├── InputBox.ts          ← 输入框组件
│   │   │   ├── BehaviorEngine.ts    ← 自动行为引擎
│   │   │   └── PetState.ts          ← 宠物状态管理
│   │   │
│   │   ├── console/                 ← 控制台窗口（Vue 应用）
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   ├── App.vue
│   │   │   ├── router/
│   │   │   │   └── index.ts
│   │   │   ├── components/
│   │   │   │   ├── Sidebar.vue
│   │   │   │   ├── OverviewPanel.vue
│   │   │   │   ├── ChatPanel.vue
│   │   │   │   ├── TodoPanel.vue
│   │   │   │   ├── NotePanel.vue
│   │   │   │   ├── ReminderPanel.vue
│   │   │   │   ├── SettingsPanel.vue
│   │   │   │   └── common/
│   │   │   │       ├── Modal.vue
│   │   │   │       ├── ConfirmDialog.vue
│   │   │   │       └── Toast.vue
│   │   │   ├── stores/
│   │   │   │   ├── chatStore.ts
│   │   │   │   ├── todoStore.ts
│   │   │   │   ├── noteStore.ts
│   │   │   │   ├── reminderStore.ts
│   │   │   │   └── settingsStore.ts
│   │   │   └── styles/
│   │   │       └── main.css
│   │   │
│   │   └── shared/                  ← 共享代码
│   │       ├── types.ts             ← 类型定义
│   │       ├── constants.ts         ← 常量
│   │       └── ipcChannels.ts       ← IPC 通道名称
│   │
│   └── assets/
│       ├── pets/                    ← 内置宠物素材
│       │   └── pixel-cat/
│       │       ├── pet.json
│       │       ├── idle/
│       │       ├── walk-left/
│       │       ├── walk-right/
│       │       ├── talk/
│       │       ├── happy/
│       │       ├── sit/
│       │       ├── sleep/
│       │       ├── eat/
│       │       ├── drag/
│       │       └── fall/
│       ├── icons/                   ← 应用图标
│       └── sounds/                  ← 音效文件
│           └── reminder.wav
│
├── resources/                       ← 打包资源
│   └── icon.ico
│
└── docs/
    └── PROJECT_PLAN.md              ← 本文档
```

### 3.4 数据库设计

使用 SQLite，表结构如下：

```sql
-- 聊天记录
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,           -- 'user' | 'assistant'
  content TEXT NOT NULL,
  mood TEXT,                    -- AI 返回的情绪
  intent TEXT,                  -- AI 返回的意图类型
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 待办
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal',  -- 'low' | 'normal' | 'high'
  due TEXT,
  source TEXT NOT NULL DEFAULT 'manual',    -- 'ai' | 'manual'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 记事
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tags TEXT,                    -- JSON 数组字符串
  pinned INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 提醒
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  time TEXT NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'none',  -- 'none' | 'daily' | 'weekly' | 'monthly'
  enabled INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual',
  last_triggered TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 设置（键值对）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.5 IPC 通信设计

主进程与渲染进程之间通过 IPC 通信，通道列表：

```typescript
// AI 相关
'ai:test-connection'      // 测试 API 连接
'ai:get-models'           // 获取可用模型列表
'ai:chat'                 // 发送消息 + 获取 AI 回复

// 待办
'todo:get-all'            // 获取所有待办
'todo:create'             // 创建待办
'todo:update'             // 更新待办
'todo:delete'             // 删除待办
'todo:toggle'             // 切换完成状态

// 记事
'note:get-all'
'note:create'
'note:update'
'note:delete'

// 提醒
'reminder:get-all'
'reminder:create'
'reminder:update'
'reminder:delete'
'reminder:toggle'

// 聊天记录
'chat:get-history'        // 获取历史消息
'chat:clear'              // 清空历史

// 宠物
'pet:get-list'            // 获取可用宠物列表
'pet:switch'              // 切换宠物
'pet:import'              // 导入自定义宠物
'pet:get-current'         // 获取当前宠物信息

// 设置
'settings:get'            // 获取设置
'settings:set'            // 更新设置
'settings:get-all'        // 获取所有设置

// 窗口
'window:open-console'     // 打开控制台
'window:close-console'    // 关闭控制台

// 提醒触发（主进程 → 渲染进程）
'reminder:triggered'      // 提醒到达，通知宠物窗口播放动画
```

---

## 四、AI 意图解析详细设计

### 4.1 意图类型定义

```typescript
type Intent =
  | 'chat'              // 普通对话
  | 'create_todo'       // 创建待办
  | 'create_note'       // 创建记事
  | 'create_reminder'   // 创建提醒
  | 'query_todos'       // 查询待办
  | 'query_notes'       // 查询记事
  | 'query_reminders'   // 查询提醒
  | 'delete_todo'       // 删除待办
  | 'delete_note'       // 删除记事
  | 'delete_reminder'   // 删除提醒
  | 'update_todo'       // 更新待办
  | 'update_note'       // 更新记事
  | 'update_reminder'   // 更新提醒
  | 'complete_todo';    // 完成待办
```

### 4.2 意图处理流程

```
用户输入
  │
  ▼
┌─────────────────────────────┐
│ 构建请求                      │
│ - System Prompt（含人设+意图规则）│
│ - 历史消息（最近N条）          │
│ - 当前日期时间                │
│ - 用户当前待办/记事摘要（上下文）│
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 调用 AI API                   │
│ POST /v1/chat/completions    │
│ model: 用户选择的模型          │
│ messages: [system, ...history, user] │
│ response_format: { type: "json_object" } │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 解析 AI 返回的 JSON            │
│                              │
│ ├── intent === 'chat'        │
│ │   → 显示气泡回复             │
│ │                              │
│ ├── intent === 'create_todo' │
│ │   → 调用 todo:create        │
│ │   → 显示气泡确认             │
│ │                              │
│ ├── intent === 'create_note' │
│ │   → 调用 note:create        │
│ │   → 显示气泡确认             │
│ │                              │
│ ├── intent === 'create_reminder' │
│ │   → 调用 reminder:create    │
│ │   → 注册调度任务             │
│ │   → 显示气泡确认             │
│ │                              │
│ ├── intent === 'query_*'     │
│ │   → 查询本地数据              │
│ │   → 将结果拼入上下文           │
│ │   → 再次调用 AI 生成回复      │
│ │   → 显示气泡                 │
│ │                              │
│ ├── intent === 'delete_*'    │
│ │   → 匹配并删除数据            │
│ │   → 显示气泡确认             │
│ │                              │
│ ├── intent === 'update_*'    │
│ │   → 匹配并更新数据            │
│ │   → 显示气泡确认             │
│ │                              │
│ └── intent === 'complete_todo' │
│     → 匹配并标记完成            │
│     → 显示气泡 + happy 动画    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 记录聊天消息到数据库            │
│ 更新控制台聊天面板（如已打开）    │
└─────────────────────────────┘
```

### 4.3 查询类意图的二次调用

对于查询类意图（查询待办/记事/提醒），流程略有不同：

```
用户: "我有什么待办？"
  │
  ▼
AI 第一次返回:
  { "intent": "query_todos" }
  │
  ▼
从数据库查询所有待办，格式化为文本摘要
  │
  ▼
构建新请求，将查询结果作为上下文:
  messages: [
    system,
    user: "我有什么待办？",
    assistant: "{intent: query_todos}",  // 第一次回复
    system: "查询结果：1. 买牛奶 2. 开会 3. 提交周报。请用你的风格回复用户。",
  ]
  │
  ▼
AI 第二次返回:
  { "intent": "chat", "reply": "你有3个待办喵～\n1. 🛒 买牛奶\n2. 📋 下午3点开会\n3. 📝 提交周报", "mood": "normal" }
  │
  ▼
显示气泡回复
```

---

## 五、提醒调度系统设计

### 5.1 调度器工作原理

```
┌─────────────────────────────────┐
│         Scheduler               │
│                                 │
│  ┌───────────┐                  │
│  │ 定时器     │ 每秒执行一次      │
│  │ (setInterval 1000ms)         │
│  └─────┬─────┘                  │
│        │                        │
│        ▼                        │
│  ┌───────────────────┐          │
│  │ 查询 enabled=1     │          │
│  │ 且 time <= now     │          │
│  │ 的提醒记录          │          │
│  └─────┬─────────────┘          │
│        │                        │
│        ▼                        │
│  ┌───────────────────┐          │
│  │ 对每个到期提醒：     │          │
│  │ 1. 发送 IPC 到宠物窗口│        │
│  │    → 播放 happy 动画 │         │
│  │    → 显示气泡通知    │         │
│  │ 2. 发送系统通知      │         │
│  │ 3. 播放音效          │         │
│  │ 4. 更新 last_triggered│       │
│  │ 5. 如果有 repeat：   │         │
│  │    计算下次触发时间    │         │
│  │    更新 time 字段     │         │
│  │ 6. 如果无 repeat：   │         │
│  │    设置 enabled=0    │         │
│  └───────────────────┘          │
└─────────────────────────────────┘
```

### 5.2 重复提醒的下次触发时间计算

```typescript
function nextTriggerTime(current: Date, repeat: string): Date {
  const next = new Date(current);
  switch (repeat) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}
```

---

## 六、像素小猫素材规格

### 6.1 基本参数

| 参数 | 值 |
|------|-----|
| 画布大小 | 80 × 80 px |
| 风格 | 像素风（Pixel Art） |
| 色彩 | 有限调色板（8-16色） |
| 帧格式 | PNG，透明背景 |
| 渲染方式 | Canvas，`imageSmoothingEnabled = false` 保持像素锐利 |

### 6.2 各动画帧设计

| 动画 | 帧数 | 描述 |
|------|------|------|
| `idle` | 4帧 | 小猫站立，轻微呼吸晃动，尾巴摆动 |
| `walk-left` | 3帧 | 向左行走，四肢交替 |
| `walk-right` | 3帧 | 向右行走（镜像或独立绘制） |
| `talk` | 2帧 | 嘴巴张合 |
| `happy` | 2帧 | 蹦跶/冒爱心 |
| `sit` | 1帧 | 坐下姿势 |
| `sleep` | 2帧 | 趴下 + ZZZ 气泡 |
| `eat` | 2帧 | 吃东西动作 |
| `drag` | 1帧 | 被抓住挣扎 |
| `fall` | 2帧 | 落地弹一下 |

---

## 七、开发路线

### 阶段 P0：项目基础 ✅

**目标：** 能跑起来，看到宠物在桌面上

- [ ] Electron + TypeScript + Vue 3 项目初始化
- [ ] 透明无边框窗口（宠物窗口）
- [ ] Canvas 渲染像素小猫（idle 动画）
- [ ] 窗口拖拽移动
- [ ] 帧动画播放器

### 阶段 P1：基础交互

**目标：** 能和宠物互动

- [ ] 左键单击 → happy 动画
- [ ] 鼠标拖拽宠物移动
- [ ] drag/fall 动画
- [ ] 右键菜单（基础版）
- [ ] 自动行为引擎（随机走动、坐下、睡觉）
- [ ] 边缘检测

### 阶段 P2：AI 对话

**目标：** 能和宠物说话

- [ ] 输入框组件
- [ ] 对话气泡组件
- [ ] AI Service（API 调用 + JSON 解析）
- [ ] 设置页：API 配置（地址/Key/模型）
- [ ] 测试连接 + 获取模型列表
- [ ] 聊天消息存入数据库
- [ ] talk 动画联动

### 阶段 P3：任务管理（AI 驱动）

**目标：** AI 自动创建待办/记事/提醒

- [ ] SQLite 数据库初始化 + 表结构
- [ ] 待办 CRUD + IPC
- [ ] 记事 CRUD + IPC
- [ ] 提醒 CRUD + IPC
- [ ] AI 意图解析完整实现
- [ ] 查询类意图二次调用
- [ ] 创建/删除/更新意图处理
- [ ] 气泡确认反馈

### 阶段 P4：提醒系统

**目标：** 定时提醒真正工作

- [ ] Scheduler 调度器
- [ ] 系统通知（node-notifier）
- [ ] 提醒音效
- [ ] 重复提醒逻辑
- [ ] 宠物动画联动

### 阶段 P5：控制台 UI

**目标：** 完整的管理界面

- [ ] 控制台窗口（独立 Electron 窗口）
- [ ] Vue 3 路由 + 侧边栏导航
- [ ] 概览面板
- [ ] 聊天面板（完整历史 + 搜索）
- [ ] 待办面板（列表 + CRUD + 筛选）
- [ ] 记事面板（卡片 + CRUD + 标签）
- [ ] 提醒面板（列表 + CRUD + 启用/禁用）
- [ ] 设置面板（API + 外观 + 提醒 + 数据）

### 阶段 P6：宠物系统

**目标：** 支持自定义宠物

- [ ] GIF 帧解析器
- [ ] 帧序列加载器
- [ ] pet.json 配置解析
- [ ] 宠物列表 + 切换
- [ ] 自定义宠物导入（文件夹选择 + 校验 + 预览）
- [ ] 宠物素材 fallback 机制

### 阶段 P7：打磨 & 发布

**目标：** 可发布版本

- [ ] 角色扮演 System Prompt 配置界面
- [ ] 开机自启选项
- [ ] 数据导出/导入
- [ ] 错误处理 + 边界情况
- [ ] 性能优化
- [ ] electron-builder 打包配置
- [ ] 生成 Windows EXE 安装包
- [ ] 测试 + Bug 修复

---

## 八、配置项清单

### 8.1 config.json 默认值

```json
{
  "ai": {
    "apiUrl": "https://api.openai.com/v1",
    "apiKey": "",
    "model": "gpt-4o-mini",
    "systemPrompt": "你是一只住在用户桌面上的像素小猫...",
    "maxHistoryLength": 20
  },
  "pet": {
    "currentPet": "pixel-cat",
    "size": 80,
    "opacity": 0.9,
    "bubbleAutoHide": true,
    "bubbleHideDelay": 5000,
    "bubbleDefaultOpen": true
  },
  "behavior": {
    "enabled": true,
    "walkEnabled": true,
    "idleToSitChance": 0.3,
    "sitToSleepChance": 0.2,
    "walkInterval": [8000, 20000],
    "walkDuration": [2000, 5000]
  },
  "reminder": {
    "soundEnabled": true,
    "soundFile": "default",
    "notifyMode": "both"
  },
  "app": {
    "startOnBoot": false,
    "startMinimized": false
  }
}
```

---

## 九、风险与限制

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AI API 延迟（1-3秒） | 用户等待感 | 显示"思考中..."动画 + 进度指示 |
| AI 返回格式不标准 | 意图解析失败 | 重试机制 + 兜底回复 |
| API 费用 | 长期使用成本 | 选择便宜模型（gpt-4o-mini / 通义-turbo） |
| GIF 帧解析兼容性 | 部分 GIF 格式可能不支持 | 使用成熟的 gif 解析库 |
| 系统通知权限 | Windows 可能禁用通知 | 降级为气泡通知 |
| Electron 包体大 | 安装包约 80MB+ | 可接受，后续考虑 Tauri 替代方案 |
| 跨平台 | 当前仅设计 Windows | 架构预留跨平台能力，但首发仅 Windows |

---

## 十、后续扩展方向（v2.0+）

以下功能不在 v1.0 范围内，但架构已预留扩展空间：

- **多宠物同时显示** — 宠物之间互动
- **宠物商店** — 在线下载社区宠物
- **道具系统** — 喂食、玩具、服装
- **经验值/等级** — 互动越多宠物越"成长"
- **语音交互** — 接入 TTS/STT
- **屏幕边缘坐在任务栏上** — 更自然的桌面集成
- **插件系统** — 第三方扩展功能
- **跨平台** — macOS / Linux 支持

---

## 十一、总结

本项目的核心价值在于将 **AI 对话** 与 **桌面宠物** 深度融合，让宠物不仅是装饰品，更是实用的桌面助手。通过自然语言即可完成待办/记事/提醒的管理，降低了使用门槛，同时保留了桌面宠物的趣味性和陪伴感。

技术上采用 Electron + TypeScript + Vue 3 的成熟方案，确保开发效率和可维护性。宠物系统支持帧序列和 GIF 双格式导入，兼顾精细控制和用户友好性。

**下一步：进入 P0 阶段，开始编码。**
