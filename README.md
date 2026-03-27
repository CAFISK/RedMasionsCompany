# 🎭 Web Visual Novel Engine — Web 视觉小说引擎

一个基于现代 Web 技术构建的视觉小说引擎，支持纯静态部署，对策划友好，功能完整。

## ✨ 特性概览

### 🎬 核心功能
- **对话系统** — 打字机效果、富文本标签（加粗/斜体/颜色/大小/注音）、旁白、内心独白
- **角色系统** — 多角色同屏、表情切换、位置移动、高亮说话者、入场/退场动画
- **场景系统** — 背景切换、多种转场效果（淡入淡出/溶解/滑动/闪白等）
- **音频系统** — BGM/环境音/音效/语音 四声道管理，交叉淡入淡出，音量独立控制
- **选择分支** — 基础选择、条件选择、多路线、多结局
- **变量系统** — 标志/计数器/字符串/物品栏，条件判断，文本插值
- **存档系统** — 30 个存档位、自动存档、快速存读、存档导出/导入

### 🎨 视觉效果
- 天气效果（雨/雪/樱花/雾）
- 屏幕震动、闪白、淡入淡出
- 电影模式（宽银幕黑边）
- 章节标题卡动画

### 🎮 玩家体验
- 对话历史回看
- 自动播放 / 快进模式（已读/全部）
- 完整设置面板（文字速度/音量/字体大小等）
- 键盘快捷键支持
- 成就系统 & 通知提示
- 文字输入（玩家姓名等）

### 📦 部署
- 构建输出为纯静态文件
- 支持 GitHub Pages 一键部署
- 支持任意静态服务器（Nginx/Apache/Caddy 等）
- 内置 GitHub Actions CI/CD 工作流

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/your-username/web-visual-novel-engine.git
cd web-visual-novel-engine

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

启动后在浏览器打开 `http://localhost:5173` 即可看到引擎 Demo。

---

## 📁 项目结构

```
VisualNovel/
├── public/
│   └── game/                    # 游戏资源目录
│       ├── config.json          # 游戏配置文件
│       └── scripts/             # 剧本脚本
│           └── prologue.vns     # 序章脚本
├── src/
│   ├── engine/                  # 引擎核心
│   │   ├── types.ts             # 类型定义
│   │   ├── EventBus.ts          # 事件总线
│   │   ├── ScriptParser.ts      # 脚本解析器
│   │   ├── StateManager.ts      # 状态管理器
│   │   ├── AssetManager.ts      # 资源管理器
│   │   ├── AudioManager.ts      # 音频管理器
│   │   ├── RenderEngine.ts      # 渲染引擎
│   │   ├── UIManager.ts         # UI 管理器
│   │   ├── SceneController.ts   # 场景控制器
│   │   └── index.ts             # 引擎入口 & 导出
│   └── main.ts                  # 应用入口
├── index.html                   # HTML 模板
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .github/
    └── workflows/
        └── deploy.yml           # GitHub Pages 部署工作流
```

---

## 📝 脚本语法指南 (VNS)

VNS (Visual Novel Script) 是引擎的脚本格式，语法简洁直观，对策划友好。

### 基础语法

```vns
# 这是注释

# 章节标题卡
[chapter "第一章" subtitle="新的开始" duration=3000]

# 设置背景
[bg school/classroom with fade duration=1000]

# 播放背景音乐
[bgm spring_theme]

# 显示角色
[show sakura at center with fade]

# 对话（角色名(表情): "对话内容"）
sakura(happy): "早上好！"

# 旁白（冒号开头）
: 樱花在窗外纷纷飘落。

# 内心独白
player(thinking): (她看起来很开心的样子...)

# 切换表情
[expression sakura sad]

# 移动角色
[move sakura to left duration=500]

# 隐藏角色
[hide sakura with fade]
```

### 选择分支

```vns
# 基础选择
[choice]
  "去公园" -> scene_park
  "回家" -> scene_home
  "打电话给樱" -> scene_phone
[/choice]

# 条件选择（不满足条件的选项会被禁用）
[choice]
  "表白" [if affection >= 50] -> scene_confess
  "送礼物" [if has_gift == true] -> scene_gift
  "聊天" -> scene_talk
[/choice]
```

### 变量操作

```vns
# 设置变量
[set affection_sakura = 0]
[set affection_sakura += 10]
[set met_sakura = true]

# 文本输入
[input player_name prompt="请输入你的名字" max=10]

# 在对话中使用变量
sakura: "你好，{player_name}！"

# 条件判断
[if affection_sakura >= 50]
  sakura(happy): "我真的很喜欢你！"
[elif affection_sakura >= 30]
  sakura: "你是个好人。"
[else]
  sakura(sad): "我们...不太熟吧。"
[/if]
```

### 视觉效果

```vns
# 屏幕震动
[shake screen intensity=5 duration=500]

# 屏幕闪白
[flash color=#ffffff duration=300]

# 淡入淡出
[fade out color=#000000 duration=1000]
[fade in color=#000000 duration=1000]

# 天气效果
[weather rain intensity=0.7]
[weather snow intensity=0.5]
[weather sakura intensity=0.3]
[weather clear]

# 电影模式
[cinematic on]
: 世界仿佛慢了下来...
[cinematic off]
```

### 音频控制

```vns
# 背景音乐
[bgm main_theme]
[bgm sad_theme fadeIn=2000]

# 环境音（可叠加）
[bgs rain]
[bgs wind]

# 音效
[sfx door_open]

# 停止音频
[stop bgm fadeOut=1000]
[stop all]
```

### 流程控制

```vns
# 标签与跳转
[label start]
sakura: "你确定吗？"
[choice]
  "确定" -> continue
  "再想想" -> start
[/choice]
[label continue]

# 跳转到其他场景（带转场）
[jump chapter02_scene01 with fade duration=500]

# 等待
[wait 2000]

# 成就解锁
[achievement unlock "first_meeting" title="初次相遇" desc="第一次遇见了樱"]
```

---

## ⚙️ 游戏配置

编辑 `public/game/config.json` 来配置你的游戏：

```json
{
  "title": "我的视觉小说",
  "version": "1.0.0",
  "author": "作者名",
  "description": "游戏描述",
  "resolution": { "width": 1280, "height": 720 },
  "startScene": "prologue",
  "characters": {
    "角色ID": {
      "id": "角色ID",
      "name": "显示名称",
      "color": "#FF69B4",
      "sprites": {
        "expressions": {
          "normal": "characters/角色ID/normal.png",
          "happy": "characters/角色ID/happy.png"
        }
      }
    }
  },
  "chapters": [
    {
      "id": "prologue",
      "title": "序章",
      "scenes": ["prologue"]
    }
  ],
  "defaultSettings": {
    "textSpeed": 30,
    "autoSpeed": 3000,
    "bgmVolume": 0.7
  }
}
```

---

## 🎨 资源目录规范

将游戏资源放入 `public/` 目录，引擎会按照约定自动识别：

```
public/
├── game/
│   ├── config.json
│   └── scripts/
│       ├── prologue.vns
│       ├── chapter01.vns
│       └── ...
└── assets/
    ├── images/
    │   ├── backgrounds/        # 背景图片
    │   │   ├── school/
    │   │   │   ├── classroom.jpg
    │   │   │   └── rooftop.jpg
    │   │   └── city/
    │   │       └── street.jpg
    │   ├── characters/         # 角色立绘
    │   │   ├── sakura/
    │   │   │   ├── normal.png
    │   │   │   ├── happy.png
    │   │   │   └── sad.png
    │   │   └── takeshi/
    │   │       ├── normal.png
    │   │       └── smile.png
    │   ├── cg/                 # CG 图片
    │   │   ├── cg001.jpg
    │   │   └── cg002.jpg
    │   └── ui/                 # UI 素材
    │       └── textbox.png
    └── audio/
        ├── bgm/                # 背景音乐
        │   ├── main_theme.mp3
        │   └── sad_theme.mp3
        ├── bgs/                # 环境音
        │   └── rain.ogg
        ├── sfx/                # 音效
        │   └── door_open.wav
        └── voice/              # 语音
            └── sakura/
                ├── line_001.mp3
                └── line_002.mp3
```

---

## 🌐 部署指南

### GitHub Pages 部署

1. 将项目推送到 GitHub 仓库
2. 进入仓库 Settings → Pages
3. Source 选择 "GitHub Actions"
4. 推送代码到 `main` 分支即可自动部署

项目已内置 `.github/workflows/deploy.yml` 工作流，无需额外配置。

### 个人服务器部署

```bash
# 构建
npm run build

# 将 dist/ 目录下的所有文件上传到服务器的 Web 根目录
# 例如使用 rsync:
rsync -avz dist/ user@server:/var/www/my-novel/
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name my-novel.example.com;
    root /var/www/my-novel;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|webp|mp3|ogg|wav)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `空格` / `Enter` | 推进对话 / 完成打字机效果 |
| `Esc` | 关闭当前面板 |
| `H` | 打开对话历史 |
| `Ctrl+S` | 打开存档面板 |
| `Ctrl+L` | 打开读档面板 |

---

## 🏗️ 引擎架构

```
┌─────────────────────────────────────────────────────┐
│                     VNEngine                         │
│              (主引擎 / 公共 API)                      │
├──────────┬──────────┬──────────┬────────────────────┤
│  Script  │  Render  │  Audio   │   State Manager    │
│  Parser  │  Engine  │  Manager │  (变量/存档/设置)    │
├──────────┴──────────┴──────────┴────────────────────┤
│                Scene Controller                      │
│            (命令执行 / 流程控制)                       │
├─────────────────────────────────────────────────────┤
│              Asset Manager & Loader                  │
│           (资源加载 / 缓存 / 预加载)                   │
├─────────────────────────────────────────────────────┤
│              EventBus (事件总线)                      │
├─────────────────────────────────────────────────────┤
│         UI Manager (对话框/选择/菜单/设置)             │
└─────────────────────────────────────────────────────┘
```

### 模块说明

| 模块 | 文件 | 职责 |
|------|------|------|
| **EventBus** | `EventBus.ts` | 事件发布/订阅系统，模块间解耦通信 |
| **ScriptParser** | `ScriptParser.ts` | 解析 `.vns` 脚本为命令序列 |
| **StateManager** | `StateManager.ts` | 管理游戏变量、存档、设置、画廊解锁 |
| **AssetManager** | `AssetManager.ts` | 资源路径解析、图片加载与缓存 |
| **AudioManager** | `AudioManager.ts` | BGM/BGS/SFX/Voice 四声道音频管理 |
| **RenderEngine** | `RenderEngine.ts` | DOM/CSS 渲染：背景、角色、特效、天气 |
| **UIManager** | `UIManager.ts` | 对话框、选择按钮、菜单、设置面板 |
| **SceneController** | `SceneController.ts` | 命令执行引擎，协调所有子系统 |
| **VNEngine** | `index.ts` | 主入口，初始化所有模块，提供公共 API |

---

## 🔌 插件系统

引擎支持通过插件扩展功能：

```typescript
import { VNEngine } from './engine';

// 定义插件
const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  init(engine) {
    // 监听事件
    engine.on('dialogue', (data) => {
      console.log('对话:', data);
    });

    engine.on('choice:select', (index, option) => {
      console.log('选择了:', option.text);
    });

    // 读写变量
    const score = engine.getVariable('score');
    engine.setVariable('score', (score as number || 0) + 1);
  },
  destroy() {
    console.log('插件已卸载');
  },
};

// 注册插件
engine.use(myPlugin);
```

### 可用事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `scene:enter` | `sceneId` | 进入新场景 |
| `scene:exit` | `sceneId` | 离开场景 |
| `dialogue` | `{ character, text }` | 显示对话 |
| `choice:show` | `options[]` | 显示选择 |
| `choice:select` | `index, option` | 玩家做出选择 |
| `save:before` | `slot` | 存档前 |
| `save:after` | `slot, data` | 存档后 |
| `load:before` | `slot` | 读档前 |
| `load:after` | `slot, data` | 读档后 |
| `variable:change` | `name, newVal, oldVal` | 变量变化 |
| `achievement:unlock` | `id` | 成就解锁 |
| `chapter:start` | `title` | 章节开始 |
| `settings:change` | `settings` | 设置变更 |

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **TypeScript** | 类型安全的开发语言 |
| **Vite** | 极速开发服务器与构建工具 |
| **Howler.js** | 跨浏览器音频引擎 |
| **DOM + CSS** | 渲染引擎（轻量、兼容性好） |

---

## 📋 创建你的视觉小说

### 第一步：配置游戏

编辑 `public/game/config.json`，设置游戏标题、角色定义等。

### 第二步：编写剧本

在 `public/game/scripts/` 目录下创建 `.vns` 脚本文件。

### 第三步：准备素材

将背景图、角色立绘、音频等放入 `public/assets/` 对应目录。

### 第四步：测试运行

```bash
npm run dev
```

### 第五步：构建部署

```bash
npm run build
# 将 dist/ 目录部署到 GitHub Pages 或个人服务器
```

---

## 📄 许可证

MIT License — 自由使用，无限制。
