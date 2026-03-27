// ============================================================
// Core type definitions for the Visual Novel Engine
// ============================================================

// --- Script & Command Types ---

export type CommandType =
  | 'dialogue'
  | 'narrator'
  | 'monologue'
  | 'show'
  | 'hide'
  | 'bg'
  | 'bgm'
  | 'bgs'
  | 'sfx'
  | 'voice'
  | 'choice'
  | 'jump'
  | 'label'
  | 'set'
  | 'if'
  | 'elif'
  | 'else'
  | 'endif'
  | 'scene'
  | 'expression'
  | 'move'
  | 'shake'
  | 'flash'
  | 'weather'
  | 'camera'
  | 'cinematic'
  | 'chapter'
  | 'video'
  | 'input'
  | 'achievement'
  | 'wait'
  | 'parallel'
  | 'timed'
  | 'stop'
  | 'fade'
  | 'end';

export interface BaseCommand {
  type: CommandType;
  lineNumber?: number;
}

export interface DialogueCommand extends BaseCommand {
  type: 'dialogue';
  character: string;
  expression?: string;
  text: string;
  voice?: string;
}

export interface NarratorCommand extends BaseCommand {
  type: 'narrator';
  text: string;
}

export interface MonologueCommand extends BaseCommand {
  type: 'monologue';
  character: string;
  text: string;
}

export interface ShowCommand extends BaseCommand {
  type: 'show';
  character: string;
  expression?: string;
  position?: CharacterPosition;
  transition?: TransitionConfig;
}

export interface HideCommand extends BaseCommand {
  type: 'hide';
  character: string;
  transition?: TransitionConfig;
}

export interface BgCommand extends BaseCommand {
  type: 'bg';
  image: string;
  transition?: TransitionConfig;
}

export interface BgmCommand extends BaseCommand {
  type: 'bgm';
  track: string;
  volume?: number;
  fadeIn?: number;
  loop?: boolean;
}

export interface BgsCommand extends BaseCommand {
  type: 'bgs';
  track: string;
  volume?: number;
  fadeIn?: number;
  loop?: boolean;
}

export interface SfxCommand extends BaseCommand {
  type: 'sfx';
  sound: string;
  volume?: number;
}

export interface VoiceCommand extends BaseCommand {
  type: 'voice';
  file: string;
  character?: string;
}

export interface ChoiceOption {
  text: string;
  target: string;
  condition?: string;
}

export interface ChoiceCommand extends BaseCommand {
  type: 'choice';
  options: ChoiceOption[];
  timeout?: number;
  defaultOption?: number;
}

export interface JumpCommand extends BaseCommand {
  type: 'jump';
  target: string;
  transition?: TransitionConfig;
}

export interface LabelCommand extends BaseCommand {
  type: 'label';
  name: string;
}

export interface SetCommand extends BaseCommand {
  type: 'set';
  variable: string;
  operator: '=' | '+=' | '-=' | '*=' | '/=';
  value: string | number | boolean;
}

export interface IfCommand extends BaseCommand {
  type: 'if';
  condition: string;
}

export interface ElifCommand extends BaseCommand {
  type: 'elif';
  condition: string;
}

export interface ElseCommand extends BaseCommand {
  type: 'else';
}

export interface EndifCommand extends BaseCommand {
  type: 'endif';
}

export interface SceneCommand extends BaseCommand {
  type: 'scene';
  name: string;
}

export interface ExpressionCommand extends BaseCommand {
  type: 'expression';
  character: string;
  expression: string;
}

export interface MoveCommand extends BaseCommand {
  type: 'move';
  character: string;
  position: CharacterPosition;
  duration?: number;
}

export interface ShakeCommand extends BaseCommand {
  type: 'shake';
  target: 'screen' | string;
  intensity?: number;
  duration?: number;
}

export interface FlashCommand extends BaseCommand {
  type: 'flash';
  color?: string;
  duration?: number;
}

export interface WeatherCommand extends BaseCommand {
  type: 'weather';
  effect: 'rain' | 'snow' | 'fog' | 'sakura' | 'fireflies' | 'clear';
  intensity?: number;
  transition?: TransitionConfig;
}

export interface CameraCommand extends BaseCommand {
  type: 'camera';
  action: 'zoom' | 'pan' | 'reset';
  zoom?: number;
  target?: string;
  x?: number;
  y?: number;
  duration?: number;
  ease?: string;
}

export interface CinematicCommand extends BaseCommand {
  type: 'cinematic';
  enabled: boolean;
}

export interface ChapterCommand extends BaseCommand {
  type: 'chapter';
  title: string;
  subtitle?: string;
  duration?: number;
}

export interface VideoCommand extends BaseCommand {
  type: 'video';
  src: string;
  skippable?: boolean;
}

export interface InputCommand extends BaseCommand {
  type: 'input';
  variable: string;
  prompt: string;
  maxLength?: number;
}

export interface AchievementCommand extends BaseCommand {
  type: 'achievement';
  id: string;
  title: string;
  description: string;
}

export interface WaitCommand extends BaseCommand {
  type: 'wait';
  duration: number;
}

export interface StopCommand extends BaseCommand {
  type: 'stop';
  channel: 'bgm' | 'bgs' | 'sfx' | 'voice' | 'all';
  fadeOut?: number;
}

export interface FadeCommand extends BaseCommand {
  type: 'fade';
  direction: 'in' | 'out';
  color?: string;
  duration?: number;
}

export interface EndCommand extends BaseCommand {
  type: 'end';
}

export type Command =
  | DialogueCommand
  | NarratorCommand
  | MonologueCommand
  | ShowCommand
  | HideCommand
  | BgCommand
  | BgmCommand
  | BgsCommand
  | SfxCommand
  | VoiceCommand
  | ChoiceCommand
  | JumpCommand
  | LabelCommand
  | SetCommand
  | IfCommand
  | ElifCommand
  | ElseCommand
  | EndifCommand
  | SceneCommand
  | ExpressionCommand
  | MoveCommand
  | ShakeCommand
  | FlashCommand
  | WeatherCommand
  | CameraCommand
  | CinematicCommand
  | ChapterCommand
  | VideoCommand
  | InputCommand
  | AchievementCommand
  | WaitCommand
  | StopCommand
  | FadeCommand
  | EndCommand;

// --- Character Types ---

export type CharacterPosition =
  | 'far_left'
  | 'left'
  | 'center'
  | 'right'
  | 'far_right'
  | { x: number; y: number };

export interface CharacterSpriteConfig {
  base?: string;
  expressions: Record<string, string>;
  outfits?: Record<string, string>;
}

export interface CharacterConfig {
  id: string;
  name: string;
  color?: string;
  voiceFolder?: string;
  sprites: CharacterSpriteConfig;
  sideImage?: string;
}

export interface CharacterState {
  id: string;
  visible: boolean;
  position: CharacterPosition;
  expression: string;
  outfit?: string;
  scale: number;
  opacity: number;
  flipped: boolean;
  zIndex: number;
}

// --- Scene & Transition Types ---

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'slide_left'
  | 'slide_right'
  | 'slide_up'
  | 'slide_down'
  | 'blinds'
  | 'pixelate'
  | 'blur'
  | 'zoom'
  | 'crossfade'
  | 'flash'
  | 'wipe';

export interface TransitionConfig {
  type: TransitionType;
  duration?: number;
  easing?: string;
  color?: string;
}

// --- Audio Types ---

export interface AudioConfig {
  src: string;
  volume?: number;
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

// --- Save/Load Types ---

export interface SaveData {
  slot: number;
  timestamp: string;
  chapter: string;
  scene: string;
  lineIndex: number;
  variables: Record<string, unknown>;
  characterStates: Record<string, CharacterState>;
  currentBg: string;
  currentBgm: string;
  history: HistoryEntry[];
  screenshot?: string;
  playtime: number;
  engineVersion: string;
}

export interface HistoryEntry {
  character?: string;
  text: string;
  timestamp: number;
  voice?: string;
}

// --- Settings Types ---

export interface GameSettings {
  textSpeed: number;       // chars per second, 0 = instant
  autoSpeed: number;       // ms delay for auto-advance
  bgmVolume: number;       // 0-1
  sfxVolume: number;       // 0-1
  voiceVolume: number;     // 0-1
  bgsVolume: number;       // 0-1
  masterVolume: number;    // 0-1
  skipMode: 'read' | 'all';
  fullscreen: boolean;
  language: string;
  fontSize: number;
  fontFamily: string;
  textBoxOpacity: number;  // 0-1
  screenShake: boolean;
  reducedMotion: boolean;
}

// --- Game Config Types ---

export interface GameConfig {
  title: string;
  version: string;
  author: string;
  description: string;
  resolution: { width: number; height: number };
  startScene: string;
  characters: Record<string, CharacterConfig>;
  chapters: ChapterInfo[];
  defaultSettings: Partial<GameSettings>;
  assets: AssetManifest;
}

export interface ChapterInfo {
  id: string;
  title: string;
  scenes: string[];
}

export interface AssetManifest {
  backgrounds: Record<string, string>;
  characters: Record<string, CharacterSpriteConfig>;
  cg: Record<string, string>;
  bgm: Record<string, string>;
  bgs: Record<string, string>;
  sfx: Record<string, string>;
  voice: Record<string, string>;
  ui: Record<string, string>;
}

// --- Gallery Types ---

export interface GalleryState {
  unlockedCGs: string[];
  unlockedMusic: string[];
  unlockedScenes: string[];
  unlockedAchievements: string[];
  endings: Record<string, boolean>;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon?: string;
  hidden?: boolean;
}

// --- Plugin Types ---

export interface VNPlugin {
  name: string;
  version: string;
  init(engine: VNEngineAPI): void;
  destroy(): void;
}

export interface VNEngineAPI {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
  getCurrentScene(): string;
  showUI(html: string, options?: { modal?: boolean }): void;
  hideUI(): void;
}

// --- Event Types ---

export type EngineEvent =
  | 'scene:enter'
  | 'scene:exit'
  | 'dialogue'
  | 'choice:show'
  | 'choice:select'
  | 'save:before'
  | 'save:after'
  | 'load:before'
  | 'load:after'
  | 'variable:change'
  | 'achievement:unlock'
  | 'chapter:start'
  | 'chapter:end'
  | 'game:start'
  | 'game:end';
