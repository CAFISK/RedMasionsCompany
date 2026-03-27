import { VNEngine } from './engine';
import type { GameConfig } from './engine';

/**
 * Main application entry point.
 * Loads game configuration and initializes the engine.
 */
async function main() {
  // Load game config
  let config: GameConfig;

  try {
    const response = await fetch('./game/config.json');
    config = await response.json();
  } catch {
    // Use default demo config if no config file found
    config = getDefaultConfig();
  }

  // Initialize engine
  const engine = new VNEngine('vn-game', config);

  // Load demo scene if available
  try {
    const response = await fetch('./game/scripts/prologue.vns');
    const script = await response.text();
    engine.loadScene('prologue', script);
  } catch {
    // Load built-in demo scene
    engine.loadScene('prologue', getDemoScript());
  }

  // Show title screen
  engine.showTitleScreen();

  // Expose engine to window for debugging
  (window as unknown as Record<string, unknown>).vnEngine = engine;
}

function getDefaultConfig(): GameConfig {
  return {
    title: '视觉小说引擎 Demo',
    version: '1.0.0',
    author: 'VN Engine',
    description: '一个基于 Web 技术的视觉小说引擎演示',
    resolution: { width: 1280, height: 720 },
    startScene: 'prologue',
    characters: {
      sakura: {
        id: 'sakura',
        name: '樱',
        color: '#FF69B4',
        sprites: {
          expressions: {
            normal: 'characters/sakura/normal.png',
            happy: 'characters/sakura/happy.png',
            sad: 'characters/sakura/sad.png',
            angry: 'characters/sakura/angry.png',
            surprised: 'characters/sakura/surprised.png',
          },
        },
      },
      takeshi: {
        id: 'takeshi',
        name: '武',
        color: '#4488FF',
        sprites: {
          expressions: {
            normal: 'characters/takeshi/normal.png',
            smile: 'characters/takeshi/smile.png',
            serious: 'characters/takeshi/serious.png',
          },
        },
      },
    },
    chapters: [
      {
        id: 'prologue',
        title: '序章 - 樱花树下的相遇',
        scenes: ['prologue'],
      },
    ],
    defaultSettings: {
      textSpeed: 30,
      autoSpeed: 3000,
      bgmVolume: 0.7,
      language: 'zh-CN',
    },
    assets: {
      backgrounds: {},
      characters: {},
      cg: {},
      bgm: {},
      bgs: {},
      sfx: {},
      voice: {},
      ui: {},
    },
  };
}

/**
 * Built-in demo script for testing the engine
 */
function getDemoScript(): string {
  return `# Prologue - Demo Scene
# This is a built-in demo to showcase the engine features

[chapter "序章" subtitle="樱花树下的相遇" duration=3000]

[fade in color=#000000 duration=1000]

: 春天的风轻轻吹过校园，带着樱花的芬芳。

: 这是新学期的第一天，一切都充满了可能性。

[show sakura at center with fade]

sakura(happy): "早上好！今天天气真好呢！"

: 一个粉色头发的女孩向我打了招呼。

sakura: "你是新转来的同学吧？我叫樱，请多多关照！"

[input player_name prompt="请输入你的名字" max=10]

sakura(happy): "原来你叫{player_name}啊，名字真好听！"

: 她的笑容像春天的阳光一样温暖。

[choice]
  "你好，樱同学" -> choice_polite
  "嗯...你好" -> choice_shy
  "（沉默不语）" -> choice_silent
[/choice]

[label choice_polite]
[set affection_sakura += 5]
sakura(happy): "哇，你好有礼貌！我们一定能成为好朋友的！"
[jump after_choice]

[label choice_shy]
[set affection_sakura += 3]
sakura: "嘻嘻，你有点害羞呢，不过没关系的！"
[jump after_choice]

[label choice_silent]
[set affection_sakura += 1]
sakura(sad): "嗯...你不太爱说话吗？没关系，慢慢来就好。"
[jump after_choice]

[label after_choice]

[show takeshi at right with slide_left]

takeshi(smile): "哟，樱！又在跟新同学搭话了？"

sakura: "啊，武！来得正好，这位是{player_name}同学。"

takeshi: "{player_name}，你好。我是武，樱的青梅竹马。"

[choice]
  "你们认识很久了吗？" -> choice_ask
  "请多关照" -> choice_greet
[/choice]

[label choice_ask]
takeshi(smile): "哈哈，从小学就认识了。她啊，一直都是这么热情。"
sakura(happy): "那当然！交朋友是一件很开心的事情嘛！"
[jump scene_end]

[label choice_greet]
takeshi: "嗯，也请多关照。有什么不懂的可以问我们。"
[jump scene_end]

[label scene_end]

: 就这样，我在这所学校的新生活开始了。

: 在樱和武的帮助下，我渐渐适应了这里的一切。

: 然而，我还不知道...

: 这个看似平凡的春天，将会改变我的一生。

[fade out color=#000000 duration=2000]

[chapter "序章 完" duration=2000]

: 感谢体验视觉小说引擎 Demo！

: 这个引擎支持丰富的功能，包括：
: - 对话与旁白系统
: - 角色立绘显示与表情切换
: - 选择分支与条件判断
: - 变量系统与文本插值
: - 存档/读档系统
: - 章节标题卡
: - 文字输入
: - 以及更多...

[achievement unlock "first_play" title="初次体验" desc="完成了序章的阅读"]
`;
}

// Start the application
main().catch(console.error);
