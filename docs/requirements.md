# Web Visual Novel Engine — Requirements Analysis Document

> **Version**: 1.0  
> **Date**: 2026-03-26  
> **Status**: Draft

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Target Users](#2-target-users)
3. [Deployment Goals](#3-deployment-goals)
4. [Core Engine Architecture](#4-core-engine-architecture)
5. [Functional Requirements](#5-functional-requirements)
   - 5.1 [Script & Dialogue System](#51-script--dialogue-system)
   - 5.2 [Character System](#52-character-system)
   - 5.3 [Scene & Background System](#53-scene--background-system)
   - 5.4 [Audio System](#54-audio-system)
   - 5.5 [UI & HUD System](#55-ui--hud-system)
   - 5.6 [Choice & Branching System](#56-choice--branching-system)
   - 5.7 [Variable & State System](#57-variable--state-system)
   - 5.8 [Save & Load System](#58-save--load-system)
   - 5.9 [Animation & Transition System](#59-animation--transition-system)
   - 5.10 [Gallery & Extras System](#510-gallery--extras-system)
   - 5.11 [Localization / i18n System](#511-localization--i18n-system)
   - 5.12 [Plugin & Extension System](#512-plugin--extension-system)
6. [Smart One-Click Import System](#6-smart-one-click-import-system)
7. [Editor / Authoring Tool](#7-editor--authoring-tool)
8. [Deployment & Distribution](#8-deployment--distribution)
9. [Performance & Compatibility](#9-performance--compatibility)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Tech Stack Recommendation](#11-tech-stack-recommendation)
12. [Appendix: Script DSL Reference](#12-appendix-script-dsl-reference)

---

## 1. Project Overview

### 1.1 Background

Visual Novel (视觉小说) is a narrative-driven interactive game genre that combines text storytelling, character art, background illustrations, music, sound effects, and player choices. This project aims to build a **fully web-based visual novel engine** that:

- Runs entirely in the browser (no plugins required)
- Provides a planner/writer-friendly authoring workflow
- Supports smart one-click import of story scripts, images, and audio assets
- Outputs pure static files deployable on GitHub Pages, Netlify, Vercel, or any personal web server

### 1.2 Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Planner-First** | Non-programmers (writers, artists, planners) can create complete visual novels with minimal technical knowledge |
| **Zero-Server Runtime** | The final game is a static site — no backend required at runtime |
| **Asset-Driven** | Convention-over-configuration: drop files into folders, engine auto-discovers and registers them |
| **Extensible** | Plugin architecture for advanced users to add custom mechanics (mini-games, stats, etc.) |
| **Cross-Platform** | Works on desktop browsers, mobile browsers, and can be wrapped as desktop apps via Electron/Tauri |

---

## 2. Target Users

| Role | Description | Key Needs |
|------|-------------|-----------|
| **Planner / Writer** | Writes story scripts, designs branching plots | Simple script syntax, visual branch editor, one-click import |
| **Artist** | Creates character sprites, CGs, backgrounds | Clear asset naming conventions, automatic sprite sheet support |
| **Composer / Sound Designer** | Produces BGM and sound effects | Easy audio mapping, loop/fade controls |
| **Developer** | Extends engine, creates plugins | Clean API, TypeScript support, modular architecture |
| **Player** | Plays the final visual novel | Smooth experience, save/load, settings, gallery |

---

## 3. Deployment Goals

### 3.1 GitHub Pages Deployment
- Build output is a single folder of static files (HTML + JS + CSS + assets)
- Support `github-actions` CI/CD auto-deploy workflow
- Configurable `base path` for project sub-paths (e.g., `username.github.io/my-novel/`)

### 3.2 Personal Server Deployment
- Standard static file hosting (Nginx, Apache, Caddy, etc.)
- Optional: server-side save sync API (for cloud saves)
- Optional: analytics integration (page views, chapter completion rates)

### 3.3 Offline / Desktop Packaging
- Electron or Tauri wrapper for offline desktop distribution
- PWA (Progressive Web App) support for installable web experience

---

## 4. Core Engine Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Visual Novel Engine                │
├──────────┬──────────┬──────────┬────────────────────┤
│  Script  │  Render  │  Audio   │   State Manager    │
│  Parser  │  Engine  │  Engine  │  (Variables/Flags) │
├──────────┴──────────┴──────────┴────────────────────┤
│                  Scene Controller                    │
│         (orchestrates all subsystems per tick)       │
├─────────────────────────────────────────────────────┤
│              Asset Manager & Loader                  │
│        (lazy loading, caching, preloading)           │
├─────────────────────────────────────────────────────┤
│            Plugin System / Event Bus                 │
├─────────────────────────────────────────────────────┤
│         Save/Load │ Settings │ i18n │ Gallery        │
└─────────────────────────────────────────────────────┘
```

### 4.1 Module Breakdown

| Module | Responsibility |
|--------|---------------|
| **Script Parser** | Parses `.vns` / `.yaml` / `.json` script files into an internal command sequence |
| **Render Engine** | Manages canvas/DOM rendering of backgrounds, characters, UI overlays, effects |
| **Audio Engine** | Handles BGM, SFX, voice playback with volume/fade/loop control |
| **State Manager** | Manages game variables, flags, affection points, inventory, etc. |
| **Scene Controller** | Executes script commands sequentially, handles branching, jumps, and flow control |
| **Asset Manager** | Discovers, loads, caches, and preloads all game assets |
| **Plugin System** | Provides hooks and APIs for extending engine functionality |
| **Save/Load** | Serializes/deserializes complete game state to localStorage or file |
| **Settings** | Player-configurable options (text speed, volume, fullscreen, etc.) |
| **i18n** | Multi-language support for both UI and story content |
| **Gallery** | Unlockable CG gallery, music room, scene replay |

---

## 5. Functional Requirements

### 5.1 Script & Dialogue System

#### 5.1.1 Script Format
- Support a custom **Visual Novel Script (VNS)** DSL — human-readable, planner-friendly
- Also support **YAML** and **JSON** formats for programmatic generation
- Support **Markdown-like** rich text in dialogue (bold, italic, color, size, ruby text)
- Line-by-line execution model with explicit `wait` / `auto` / `skip` controls

#### 5.1.2 Dialogue Display
- **Dialogue Box Mode**: Classic bottom-screen text box with character name plate
- **ADV Mode** (Adventure): Full-screen text overlay (NVL style)
- **Mixed Mode**: Switch between ADV and NVL within the same scene
- Typewriter effect with configurable speed (characters per second)
- Support for **inline waits** (pause mid-sentence for dramatic effect)
- Support for **text tags**: `[b]bold[/b]`, `[i]italic[/i]`, `[color=#ff0000]red[/color]`, `[size=24]big[/size]`
- Support for **ruby text** (furigana): `[ruby=かわいい]可愛い[/ruby]`
- Support for **shake**, **wave**, **fade-in** text animation effects
- Clickable text advancement + auto-play mode + skip mode (read/unread)

#### 5.1.3 Narrator & Inner Monologue
- Narrator text (no character name displayed)
- Inner monologue style (different text box style, e.g., italic or different color)
- Centered text mode for dramatic statements

#### 5.1.4 Text History / Backlog
- Scrollable text history panel
- Shows character name + dialogue + timestamp
- Clickable entries to jump back to that point (with confirmation)
- Voice replay button per entry (if voice is available)

---

### 5.2 Character System

#### 5.2.1 Character Definition
```yaml
characters:
  sakura:
    name: "Sakura"
    color: "#FF69B4"          # Name plate color
    voice_folder: "voices/sakura/"
    sprites:
      base: "characters/sakura/base.png"
      expressions:
        happy: "characters/sakura/happy.png"
        sad: "characters/sakura/sad.png"
        angry: "characters/sakura/angry.png"
        surprised: "characters/sakura/surprised.png"
      outfits:
        school: "characters/sakura/school/"
        casual: "characters/sakura/casual/"
    side_image: "characters/sakura/side.png"  # Small portrait in dialogue box
```

#### 5.2.2 Character Display
- Support up to **5+ characters on screen simultaneously**
- Configurable positions: `far_left`, `left`, `center`, `right`, `far_right`, or custom `x,y` coordinates
- **Layered sprite composition**: base body + expression + outfit + accessory layers
- Smooth **enter/exit animations**: slide, fade, dissolve, bounce
- **Highlight active speaker**: dim/darken non-speaking characters
- **Flip/mirror** sprite horizontally
- **Scale** characters (for perspective/distance effects)
- **Z-order** control for overlapping characters

#### 5.2.3 Live2D / Spine Support (Optional)
- Integration with Live2D Cubism SDK for animated character models
- Integration with Spine runtime for skeletal animation
- Fallback to static sprites if Live2D/Spine assets not available

---

### 5.3 Scene & Background System

#### 5.3.1 Background Management
- Full-screen background images with **smooth transitions**
- Transition types: `fade`, `dissolve`, `slide_left`, `slide_right`, `slide_up`, `slide_down`, `blinds`, `pixelate`, `blur`, `zoom`, `crossfade`
- Custom transition duration and easing curves
- **Parallax scrolling** for wide/tall backgrounds (pan effect)
- **Background zoom** and **camera movement** (Ken Burns effect)

#### 5.3.2 CG (Computer Graphics) Events
- Full-screen CG display with overlay dialogue
- CG gallery unlock tracking
- Multi-part CGs (variations of the same scene)
- CG zoom and pan controls for player

#### 5.3.3 Foreground Overlays
- Weather effects: rain, snow, fog, sakura petals, fireflies
- Time-of-day overlays: morning glow, sunset, night filter, moonlight
- Custom particle systems
- Screen effects: vignette, blur, sepia, grayscale, color grading

#### 5.3.4 Scene Composition Layers
```
Layer Order (bottom to top):
├── Background Image
├── Far Characters (scaled down)
├── Mid Characters (normal)
├── Near Characters (scaled up)
├── Foreground Overlay / Weather
├── Screen Effects (color grading, vignette)
├── UI Layer (dialogue box, buttons)
├── Popup Layer (menus, choices)
└── System Layer (save/load, settings)
```

---

### 5.4 Audio System

#### 5.4.1 Audio Channels
| Channel | Description | Behavior |
|---------|-------------|----------|
| **BGM** | Background music | Loops by default, crossfade between tracks |
| **BGS** | Background sound/ambience | Loops, layerable (e.g., rain + wind) |
| **SFX** | Sound effects | One-shot, can overlap |
| **Voice** | Character voice lines | One at a time per character, stops on advance |
| **System** | UI sounds (click, hover) | Always plays regardless of voice settings |

#### 5.4.2 Audio Features
- **Crossfade** between BGM tracks with configurable duration
- **Fade in / fade out** for all channels
- **Volume control** per channel (player settings)
- **Audio ducking**: lower BGM volume during voice playback
- Support formats: **MP3**, **OGG**, **WAV**, **FLAC** (with fallback chain)
- **Preloading** of upcoming audio assets
- **Music room** in extras (unlockable track list)

#### 5.4.3 Voice System
- Per-line voice file mapping (auto-match by script line ID)
- Auto-advance after voice line finishes (optional)
- Per-character voice toggle in settings
- Voice replay in text history

---

### 5.5 UI & HUD System

#### 5.5.1 Title Screen
- Animated or static title background
- Menu items: **New Game**, **Continue**, **Load**, **Settings**, **Gallery**, **Credits**
- Chapter select (if enabled)
- Customizable logo and title animation

#### 5.5.2 In-Game HUD
- **Dialogue box** with character name plate
  - Customizable skin/theme (multiple dialogue box designs)
  - Transparency control
  - Position: bottom, top, center, or custom
- **Quick menu bar**: Save, Load, Auto, Skip, Log, Settings, Hide UI
- **Character name plate** with per-character color
- **Side image** (small character portrait in dialogue box corner)
- Click/tap indicator animation

#### 5.5.3 Pause / System Menu
- Save / Load screen with thumbnail previews
- Settings panel
- Return to title
- Quit confirmation

#### 5.5.4 Settings Panel
| Setting | Type | Description |
|---------|------|-------------|
| Text Speed | Slider | Characters per second (1-100, instant) |
| Auto Speed | Slider | Delay between auto-advance (0.5s - 10s) |
| BGM Volume | Slider | 0-100% |
| SFX Volume | Slider | 0-100% |
| Voice Volume | Slider | 0-100% |
| Per-Character Voice | Toggle per character | Enable/disable voice per character |
| Skip Mode | Radio | Skip Read Only / Skip All |
| Fullscreen | Toggle | Browser fullscreen mode |
| Resolution | Dropdown | Auto / 1280×720 / 1920×1080 |
| Language | Dropdown | Available languages |
| Font | Dropdown | Available fonts |
| Font Size | Slider | Text size adjustment |
| Text Box Opacity | Slider | Dialogue box transparency |
| Screen Shake | Toggle | Enable/disable screen shake effects |

#### 5.5.5 Notification System
- Toast notifications for achievements, auto-save, etc.
- Chapter title cards with transition effects

---

### 5.6 Choice & Branching System

#### 5.6.1 Basic Choices
```
[choice]
  "Go to the park" -> scene_park
  "Stay home" -> scene_home
  "Call Sakura" -> scene_phone
[/choice]
```
- 2-6 choice buttons displayed on screen
- Customizable button styles (text, image, icon)
- Timed choices (countdown timer, default selection on timeout)
- Choice history tracking (highlight previously selected choices)

#### 5.6.2 Conditional Choices
```
[choice]
  "Confess your feelings" [if affection >= 50] -> scene_confess
  "Give her the gift" [if has_item("necklace")] -> scene_gift
  "Just talk" -> scene_talk
[/choice]
```
- Show/hide choices based on variable conditions
- Gray out unavailable choices (with optional hint text)
- Conditional text variations within choices

#### 5.6.3 Branching Architecture
- **Linear**: Simple A → B → C progression
- **Branching**: Choices lead to different paths that may reconverge
- **Route-based**: Major story routes (e.g., character routes in dating sims)
- **Flag-based**: Accumulated flags/points determine outcomes
- **Multi-ending**: Different endings based on player choices and variables
- Visual **flowchart editor** for planners to design and visualize story structure

#### 5.6.4 Route / Ending Management
- Route unlock conditions (e.g., "Complete Sakura's route to unlock Secret route")
- Ending list with unlock status
- True ending / hidden ending support
- New Game+ flags (carry over certain data between playthroughs)

---

### 5.7 Variable & State System

#### 5.7.1 Variable Types
| Type | Example | Use Case |
|------|---------|----------|
| **Flag** (boolean) | `met_sakura = true` | Track story events |
| **Counter** (number) | `affection_sakura = 45` | Affection/relationship points |
| **String** | `player_name = "Alex"` | Player input, dynamic text |
| **Inventory** (list) | `items = ["key", "letter"]` | Item collection |
| **Timer** | `day = 3` | Day/time progression |

#### 5.7.2 Variable Operations
```
[set affection_sakura += 10]
[set met_sakura = true]
[set player_name = input("What is your name?")]
[if affection_sakura >= 80]
  Sakura: "I... I really like you."
[elif affection_sakura >= 50]
  Sakura: "You're a good friend."
[else]
  Sakura: "Oh, it's you."
[/if]
```

#### 5.7.3 Global vs Local Variables
- **Global variables**: Persist across scenes and save files (e.g., gallery unlocks, route completion)
- **Local variables**: Scoped to current playthrough
- **System variables**: Engine-managed (current scene, text speed, etc.)

#### 5.7.4 Player Input
- Text input dialog (for player name, etc.)
- Numeric input (for puzzles, etc.)
- Input validation and sanitization

---

### 5.8 Save & Load System

#### 5.8.1 Save Slots
- **20+ save slots** with thumbnail preview
- **Auto-save** at configurable intervals (every choice, every scene, etc.)
- **Quick save / Quick load** (single key shortcut)
- Save metadata: timestamp, chapter name, scene name, playtime, thumbnail

#### 5.8.2 Save Data Contents
```json
{
  "slot": 1,
  "timestamp": "2026-03-26T20:00:00Z",
  "chapter": "Chapter 3: The Festival",
  "scene": "scene_festival_01",
  "line": 42,
  "variables": { "affection_sakura": 65, "met_sakura": true },
  "inventory": ["festival_ticket", "goldfish"],
  "history": ["...last 50 dialogue lines..."],
  "screenshot": "data:image/jpeg;base64,..."
}
```

#### 5.8.3 Storage Backends
| Backend | Description | Use Case |
|---------|-------------|----------|
| **localStorage** | Browser local storage | Default, no server needed |
| **IndexedDB** | Browser database | Large save data, many slots |
| **File Export/Import** | Download/upload JSON | Backup, transfer between devices |
| **Cloud Sync** (optional) | Server API | Cross-device sync (requires backend) |

#### 5.8.4 Save Compatibility
- Version migration system for save data
- Graceful handling of saves from older game versions

---

### 5.9 Animation & Transition System

#### 5.9.1 Screen Transitions
| Transition | Description |
|------------|-------------|
| `fade` | Fade to black/white then to new scene |
| `dissolve` | Cross-dissolve between scenes |
| `slide` | Slide in from direction |
| `wipe` | Wipe effect in direction |
| `blinds` | Venetian blinds effect |
| `pixelate` | Pixelation transition |
| `zoom` | Zoom in/out transition |
| `flash` | White flash (for dramatic moments) |
| `shake` | Screen shake (for impact/earthquake) |
| `custom` | User-defined shader/CSS transition |

#### 5.9.2 Character Animations
- Enter/exit: slide, fade, bounce, drop
- Emotion change: cross-dissolve between expressions
- Idle animations: subtle breathing, blinking (if using layered sprites)
- Action animations: jump, shake, nod (sprite movement)

#### 5.9.3 Text Animations
- Typewriter (default)
- Fade-in per character
- Wave / bounce / shake per character
- Glitch effect (for horror/sci-fi)
- Custom CSS animation per text segment

#### 5.9.4 Cinematic Features
- **Letterbox mode** (black bars for cinematic scenes)
- **Camera shake** with intensity and duration
- **Zoom to character** (focus effect)
- **Pan across scene** (panoramic backgrounds)
- **Slow motion / fast forward** text and animations
- **Video playback** (MP4/WebM) for cutscenes
- **Timed sequences** (events that play out without player input)

---

### 5.10 Gallery & Extras System

#### 5.10.1 CG Gallery
- Grid view of all CGs (locked ones shown as silhouettes)
- Unlock tracking per CG
- Full-screen CG viewer with zoom/pan
- CG variations grouped together
- Unlock percentage display

#### 5.10.2 Music Room
- List of all BGM tracks (locked ones grayed out)
- Play/pause/loop controls
- Track info: name, composer, scene where it first appears
- Unlock percentage display

#### 5.10.3 Scene Replay
- Replay any previously viewed scene
- Jump to specific chapters
- Scene completion tracking

#### 5.10.4 Character Profiles
- Unlockable character bios
- Character relationship chart
- Character sprite viewer (all expressions/outfits)

#### 5.10.5 Achievements
- Achievement list with unlock conditions
- Toast notification on unlock
- Achievement art/icons

#### 5.10.6 Statistics
- Total playtime
- Endings unlocked (X / Y)
- CGs unlocked (X / Y)
- Choices made breakdown
- Route completion percentage

---

### 5.11 Localization / i18n System

#### 5.11.1 Multi-Language Support
- Separate language files per locale
- Hot-switch language without restarting
- Support for CJK (Chinese, Japanese, Korean) text rendering
- RTL (Right-to-Left) text support for Arabic, Hebrew
- Font fallback chains per language

#### 5.11.2 Localization File Structure
```
locales/
├── zh-CN/
│   ├── ui.json          # UI strings
│   ├── chapter01.json   # Story text
│   └── characters.json  # Character names
├── en/
│   ├── ui.json
│   ├── chapter01.json
│   └── characters.json
└── ja/
    ├── ui.json
    ├── chapter01.json
    └── characters.json
```

#### 5.11.3 Translation Workflow
- Export all translatable strings to CSV/XLSX for translators
- Import translated files back
- Missing translation fallback (show original language)
- Translation completeness report

---

### 5.12 Plugin & Extension System

#### 5.12.1 Plugin Architecture
```typescript
interface VNPlugin {
  name: string;
  version: string;
  init(engine: VNEngine): void;
  destroy(): void;
}
```

#### 5.12.2 Built-in Extension Points
| Hook | Description |
|------|-------------|
| `onSceneEnter` | Triggered when entering a new scene |
| `onSceneExit` | Triggered when leaving a scene |
| `onDialogue` | Triggered on each dialogue line |
| `onChoice` | Triggered when player makes a choice |
| `onSave` | Triggered before save |
| `onLoad` | Triggered after load |
| `onVariableChange` | Triggered when any variable changes |
| `onAchievementUnlock` | Triggered when achievement unlocks |

#### 5.12.3 Example Plugins
- **Mini-game plugin**: Embed simple HTML5 games (puzzle, rhythm, etc.)
- **Stats screen plugin**: RPG-style character stats display
- **Map plugin**: Clickable location map for exploration
- **Phone/messaging plugin**: In-game phone UI with chat messages
- **Calendar plugin**: Day-by-day progression with events
- **Relationship chart plugin**: Visual relationship web between characters
- **Investigation plugin**: Point-and-click investigation scenes

---

## 6. Smart One-Click Import System

> **Core Goal**: Allow planners to prepare assets in a simple folder structure, then run a single command to import everything into the engine.

### 6.1 Import Workflow Overview

```
                    ┌──────────────────┐
                    │  Raw Asset Folder │
                    │  (Planner drops   │
                    │   files here)     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Smart Importer   │
                    │  CLI / GUI Tool   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼─────┐  ┌────▼────────┐
     │   Script    │  │   Image    │  │   Audio     │
     │   Parser    │  │  Processor │  │  Processor  │
     └────────┬───┘  └──────┬─────┘  └────┬────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼─────────┐
                    │  Project Builder  │
                    │  (generates game  │
                    │   config & assets)│
                    └──────────────────┘
```

### 6.2 Script Import

#### 6.2.1 Supported Input Formats
| Format | Description |
|--------|-------------|
| **Plain Text (.txt)** | Simple dialogue script with minimal markup |
| **Markdown (.md)** | Structured script with headings as scenes |
| **Excel / CSV (.xlsx, .csv)** | Tabular format: Character, Dialogue, Expression, BGM, etc. |
| **Fountain (.fountain)** | Screenplay format (industry standard) |
| **Custom VNS (.vns)** | Engine-native script format |
| **YAML (.yaml)** | Structured data format |
| **JSON (.json)** | Programmatic format |

#### 6.2.2 Smart Script Parsing
- **Auto-detect character names** from dialogue patterns (e.g., `Sakura: "Hello!"`)
- **Auto-generate character definitions** from detected names
- **Auto-detect scene breaks** from blank lines, `---`, or heading markers
- **Auto-map expressions** from keywords in dialogue (e.g., `(angry)`, `(happy)`)
- **Auto-detect choices** from indented bullet points or numbered lists
- **Validate script** for errors (undefined characters, broken jumps, etc.)

#### 6.2.3 Excel/CSV Template
| Column | Description | Example |
|--------|-------------|---------|
| Scene | Scene identifier | `chapter01_scene01` |
| Character | Speaking character | `Sakura` |
| Expression | Character expression | `happy` |
| Dialogue | Dialogue text | `"Good morning!"` |
| BGM | Background music file | `spring_theme.mp3` |
| BG | Background image | `school_classroom.jpg` |
| SFX | Sound effect | `door_open.wav` |
| Voice | Voice file | `sakura_001.wav` |
| Command | Special command | `shake`, `fade`, `choice` |
| Notes | Planner notes (ignored) | `This is the first meeting` |

### 6.3 Image Import

#### 6.3.1 Auto-Detection Rules
```
assets/
├── backgrounds/           → Auto-registered as backgrounds
│   ├── school/
│   │   ├── classroom.jpg  → bg: school_classroom
│   │   ├── hallway.jpg    → bg: school_hallway
│   │   └── rooftop.jpg    → bg: school_rooftop
│   └── city/
│       ├── street.jpg     → bg: city_street
│       └── cafe.jpg       → bg: city_cafe
├── characters/            → Auto-registered as character sprites
│   ├── sakura/
│   │   ├── normal.png     → sakura: expression "normal"
│   │   ├── happy.png      → sakura: expression "happy"
│   │   ├── sad.png        → sakura: expression "sad"
│   │   └── angry.png      → sakura: expression "angry"
│   └── takeshi/
│       ├── normal.png     → takeshi: expression "normal"
│       └── smile.png      → takeshi: expression "smile"
├── cg/                    → Auto-registered as CG gallery items
│   ├── cg001.jpg
│   └── cg002.jpg
└── ui/                    → Auto-registered as UI elements
    ├── textbox.png
    ├── namebox.png
    └── choice_button.png
```

#### 6.3.2 Image Processing
- **Auto-resize** to target resolution (with quality preservation)
- **Auto-generate thumbnails** for save slots and gallery
- **Auto-detect transparent backgrounds** (PNG) for character sprites
- **WebP conversion** for smaller file sizes (with PNG/JPG fallback)
- **Sprite sheet generation** from individual expression images
- **Image optimization** (compression without visible quality loss)
- **Lazy loading manifest** generation (load assets only when needed)

### 6.4 Audio Import

#### 6.4.1 Auto-Detection Rules
```
assets/
├── bgm/                  → Auto-registered as background music
│   ├── main_theme.mp3
│   ├── sad_theme.mp3
│   └── battle_theme.mp3
├── bgs/                  → Auto-registered as background sounds
│   ├── rain.ogg
│   ├── wind.ogg
│   └── crowd.ogg
├── sfx/                  → Auto-registered as sound effects
│   ├── door_open.wav
│   ├── footsteps.wav
│   └── phone_ring.wav
└── voice/                → Auto-registered as voice lines
    ├── sakura/
    │   ├── chapter01_001.wav
    │   ├── chapter01_002.wav
    │   └── ...
    └── takeshi/
        ├── chapter01_001.wav
        └── ...
```

#### 6.4.2 Audio Processing
- **Auto-convert** to web-compatible formats (MP3 + OGG dual format)
- **Auto-normalize** volume levels across all audio files
- **Auto-detect loop points** for BGM (or use metadata tags)
- **Generate audio sprites** for SFX (combine small files for fewer HTTP requests)
- **Waveform preview** generation for editor

### 6.5 One-Click Import CLI

```bash
# Initialize a new project
vnengine init my-novel

# Import all assets from a folder
vnengine import ./raw-assets

# Import only scripts
vnengine import --scripts ./scripts

# Import only images with WebP conversion
vnengine import --images --webp ./images

# Validate project (check for missing assets, broken references)
vnengine validate

# Build for production
vnengine build

# Preview locally
vnengine preview

# Deploy to GitHub Pages
vnengine deploy --github
```

### 6.6 Import Report
After import, generate a detailed report:
```
╔══════════════════════════════════════════╗
║        Import Report - My Novel          ║
╠══════════════════════════════════════════╣
║ Scripts:                                 ║
║   ✅ 12 scenes imported                  ║
║   ✅ 5 characters detected               ║
║   ✅ 23 choices found                    ║
║   ⚠️  2 undefined character references   ║
║                                          ║
║ Images:                                  ║
║   ✅ 15 backgrounds imported             ║
║   ✅ 32 character sprites imported       ║
║   ✅ 8 CGs imported                      ║
║   ✅ WebP conversion saved 45% size      ║
║                                          ║
║ Audio:                                   ║
║   ✅ 6 BGM tracks imported               ║
║   ✅ 12 SFX imported                     ║
║   ✅ 156 voice lines imported            ║
║   ⚠️  3 voice lines have no script match ║
║                                          ║
║ Total asset size: 234 MB → 156 MB        ║
║ (33% reduction after optimization)       ║
╚══════════════════════════════════════════╝
```

---

## 7. Editor / Authoring Tool

### 7.1 Visual Script Editor (Web-based)

#### 7.1.1 Node-based Flowchart Editor
- Drag-and-drop scene nodes
- Visual connections between scenes (branches)
- Color-coded nodes by type (dialogue, choice, condition, etc.)
- Zoom, pan, minimap navigation
- Export flowchart as image for documentation

#### 7.1.2 Scene Editor
- WYSIWYG preview of the current scene
- Drag characters to position them on screen
- Select backgrounds from asset browser
- Write dialogue with live preview
- Add choices with visual branch connections
- Timeline view for animations and transitions

#### 7.1.3 Character Editor
- Import and organize character sprites
- Define expressions and outfits
- Preview character with different expressions
- Set character colors and properties

#### 7.1.4 Asset Browser
- Thumbnail grid of all project assets
- Filter by type (background, character, CG, audio)
- Search by name or tag
- Drag-and-drop into scene editor
- Bulk import and organize

### 7.2 Live Preview
- Real-time preview of the visual novel as you edit
- Hot-reload on script/asset changes
- Debug panel showing current variables and state
- Step-through mode (advance one command at a time)
- Breakpoints on specific lines or conditions

### 7.3 Testing & Debug Tools
- **Variable inspector**: View and modify all variables in real-time
- **Scene jumper**: Jump to any scene instantly
- **Speed controls**: Fast-forward through content
- **Flag editor**: Toggle flags for testing different paths
- **Coverage report**: Which scenes/choices have been tested
- **Lint checker**: Validate scripts for common errors

---

## 8. Deployment & Distribution

### 8.1 Build Process

```bash
vnengine build --production
```

Output structure:
```
dist/
├── index.html              # Entry point
├── assets/
│   ├── images/             # Optimized images
│   ├── audio/              # Optimized audio
│   └── fonts/              # Web fonts
├── scripts/                # Compiled game scripts
├── engine/                 # Engine runtime (minified JS)
├── css/                    # Styles
├── manifest.json           # Asset manifest
├── sw.js                   # Service worker (PWA)
└── favicon.ico
```

### 8.2 GitHub Pages Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy Visual Novel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 8.3 Build Optimization
- **Tree-shaking**: Only include used engine features
- **Code splitting**: Lazy-load engine modules
- **Asset chunking**: Split assets by chapter for progressive loading
- **Compression**: Gzip/Brotli for text assets
- **Image optimization**: WebP with fallback, responsive sizes
- **Audio optimization**: Appropriate bitrate per channel type
- **Total bundle target**: Engine core < 200KB gzipped

### 8.4 Loading Strategy
- **Splash screen** with loading progress bar
- **Chapter-based loading**: Only load current chapter's assets
- **Predictive preloading**: Preload next scene's assets during dialogue
- **Background loading**: Non-blocking asset loading during gameplay
- **Offline support**: Service worker caches all assets for offline play

---

## 9. Performance & Compatibility

### 9.1 Target Performance
| Metric | Target |
|--------|--------|
| First Contentful Paint | < 2 seconds |
| Time to Interactive | < 3 seconds |
| Frame Rate | 60 FPS (animations) |
| Memory Usage | < 200 MB |
| Save/Load Time | < 500ms |
| Scene Transition | < 300ms |

### 9.2 Browser Compatibility
| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 14+ |
| Edge | 90+ |
| Mobile Chrome | 90+ |
| Mobile Safari | 14+ |
| Samsung Internet | 15+ |

### 9.3 Device Support
- **Desktop**: Full experience with keyboard shortcuts
- **Tablet**: Touch-optimized with gesture support
- **Mobile**: Responsive layout, portrait and landscape modes
- **Gamepad**: Optional controller support for desktop

### 9.4 Accessibility
- **Keyboard navigation**: Full game playable with keyboard only
- **Screen reader support**: ARIA labels for UI elements
- **High contrast mode**: Alternative color scheme
- **Font size adjustment**: Scalable text
- **Dyslexia-friendly font** option
- **Reduced motion** option (disable animations)
- **Self-voicing** option (TTS for dialogue text)

---

## 10. Non-Functional Requirements

### 10.1 Security
- No eval() or dynamic code execution from user scripts
- Content Security Policy (CSP) headers
- Sanitized user input (player name, etc.)
- No external API calls from the game runtime (fully offline-capable)

### 10.2 Maintainability
- TypeScript for type safety
- Comprehensive unit and integration tests
- JSDoc / TSDoc documentation for all public APIs
- Semantic versioning for engine releases
- Changelog generation from commits

### 10.3 Licensing
- Engine: Open-source (MIT or Apache 2.0)
- Games created with the engine: No license restrictions
- Third-party dependencies: Compatible open-source licenses only

### 10.4 Documentation
- Getting Started guide
- Script language reference
- API documentation
- Tutorial: "Create your first visual novel in 30 minutes"
- Video tutorials
- Example projects (demo games)
- Community forum / Discord

---

## 11. Tech Stack Recommendation

### 11.1 Engine Runtime
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | **TypeScript** | Type safety, better DX, IDE support |
| Rendering | **PixiJS** + DOM hybrid | Canvas for effects/animations, DOM for text/UI |
| Audio | **Howler.js** | Cross-browser audio with sprite support |
| State Management | **Zustand** or custom | Lightweight, serializable state |
| Build Tool | **Vite** | Fast dev server, optimized builds |
| Bundler | **Rollup** (via Vite) | Tree-shaking, code splitting |

### 11.2 Authoring Tools
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Editor UI | **React** + **TailwindCSS** | Rich interactive UI |
| Flowchart | **React Flow** | Node-based visual editor |
| Script Editor | **Monaco Editor** | VS Code-like editing experience |
| CLI | **Node.js** + **Commander.js** | Cross-platform CLI tool |

### 11.3 Asset Pipeline
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Image Processing | **Sharp** | Fast image resize/convert/optimize |
| Audio Processing | **FFmpeg** (via ffmpeg.wasm) | Format conversion, normalization |
| Script Parsing | **PEG.js** / **Chevrotain** | Custom DSL parser |
| Excel Parsing | **SheetJS (xlsx)** | Read Excel/CSV files |

---

## 12. Appendix: Script DSL Reference

### 12.1 Basic Syntax

```vns
# Scene definition
[scene school_classroom]
[bg school/classroom with fade duration=1000]
[bgm spring_theme]

# Character entrance
[show sakura at center with slide_left]

# Dialogue
sakura(happy): "Good morning! Isn't it a beautiful day?"

# Narrator
: The cherry blossoms were in full bloom outside the window.

# Inner monologue
player(thinking): (I wonder if I should talk to her...)

# Expression change
[expression sakura sad]
sakura: "But... I heard some bad news today."

# Sound effect
[sfx thunder]
[shake screen intensity=5 duration=500]

# Choice
[choice]
  "Ask what happened" -> scene_ask
  "Change the subject" -> scene_change_topic
  "Stay silent" [if courage >= 30] -> scene_silent
[/choice]

# Variable operations
[set affection_sakura += 5]
[set met_sakura = true]

# Conditional dialogue
[if affection_sakura >= 50]
  sakura(happy): "I'm so glad you're here with me."
[else]
  sakura(neutral): "Oh, you're still here."
[/if]

# Scene transition
[jump scene_next with dissolve]
```

### 12.2 Advanced Commands

```vns
# Video cutscene
[video opening.mp4 skippable=true]

# Timed sequence
[timed 5000]
  [show explosion at center]
  [sfx explosion]
  [shake screen intensity=10 duration=1000]
[/timed]

# Parallel commands
[parallel]
  [move sakura to left duration=1000]
  [move takeshi to right duration=1000]
[/parallel]

# Text input
[input player_name prompt="What is your name?" max=20]
: "Nice to meet you, {player_name}!"

# Camera controls
[camera zoom=1.5 target=sakura duration=2000 ease=easeInOut]
[camera pan x=100 y=0 duration=1500]
[camera reset duration=1000]

# Weather effects
[weather rain intensity=0.7]
[weather snow intensity=0.3]
[weather clear with fade duration=2000]

# Letterbox cinematic mode
[cinematic on]
  : The world seemed to slow down...
  [camera zoom=2.0 target=sakura duration=3000]
  sakura: "I love you."
[cinematic off]

# Chapter title card
[chapter "Chapter 3" subtitle="The Festival" duration=3000]

# Achievement
[achievement unlock "first_meeting" title="First Encounter" desc="Met Sakura for the first time"]

# Label and goto
[label loop_start]
sakura: "Are you sure?"
[choice]
  "Yes" -> continue
  "No" -> loop_start
[/choice]
[label continue]
```

### 12.3 Script File Organization
```
scripts/
├── config.yaml              # Global game configuration
├── characters.yaml          # Character definitions
├── chapters/
│   ├── prologue/
│   │   ├── scene_01.vns
│   │   ├── scene_02.vns
│   │   └── scene_03.vns
│   ├── chapter01/
│   │   ├── scene_01.vns
│   │   ├── scene_02.vns
│   │   └── choices/
│   │       ├── park.vns
│   │       └── home.vns
│   └── endings/
│       ├── true_end.vns
│       ├── good_end.vns
│       └── bad_end.vns
└── common/
    ├── shared_scenes.vns
    └── minigames.vns
```

---

## Summary

This document outlines a comprehensive web-based visual novel engine that prioritizes:

1. **Complete VN Feature Coverage** — From basic dialogue to advanced cinematic sequences, branching narratives, and gallery systems
2. **Planner-Friendly Workflow** — Simple script syntax, Excel import, visual editors, and smart asset auto-detection
3. **One-Click Import** — Drop files into folders, run a single command, and the engine handles the rest
4. **Static Deployment** — Build to pure static files for GitHub Pages or any web server
5. **Extensibility** — Plugin system for custom mechanics beyond standard VN features
6. **Modern Web Standards** — TypeScript, Vite, PixiJS, responsive design, PWA support

The engine aims to lower the barrier for visual novel creation while providing enough depth for complex, professional-quality productions.
