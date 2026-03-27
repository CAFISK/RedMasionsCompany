import { EventBus } from './EventBus';
import type { CharacterState, GameSettings, GalleryState, HistoryEntry, SaveData } from './types';

const DEFAULT_SETTINGS: GameSettings = {
  textSpeed: 30,
  autoSpeed: 3000,
  bgmVolume: 0.8,
  sfxVolume: 0.8,
  voiceVolume: 0.8,
  bgsVolume: 0.6,
  masterVolume: 1.0,
  skipMode: 'read',
  fullscreen: false,
  language: 'zh-CN',
  fontSize: 24,
  fontFamily: 'sans-serif',
  textBoxOpacity: 0.85,
  screenShake: true,
  reducedMotion: false,
};

const STORAGE_PREFIX = 'vn_engine_';
const MAX_HISTORY = 200;
const MAX_SAVE_SLOTS = 30;

/**
 * StateManager - Manages all game state including variables, settings,
 * save/load, history, and gallery unlocks.
 */
export class StateManager {
  private variables: Map<string, unknown> = new Map();
  private characterStates: Map<string, CharacterState> = new Map();
  private settings: GameSettings;
  private history: HistoryEntry[] = [];
  private gallery: GalleryState;
  private readLines: Set<string> = new Set();

  // Current scene tracking
  private currentScene = '';
  private currentLineIndex = 0;
  private currentBg = '';
  private currentBgm = '';
  private currentChapter = '';
  private playtime = 0;
  private playtimeStart = 0;

  constructor(private eventBus: EventBus) {
    this.settings = this.loadSettings();
    this.gallery = this.loadGallery();
    this.loadReadLines();
    this.playtimeStart = Date.now();
  }

  // --- Variable Management ---

  getVariable(name: string): unknown {
    return this.variables.get(name);
  }

  setVariable(name: string, value: unknown): void {
    const oldValue = this.variables.get(name);
    this.variables.set(name, value);
    this.eventBus.emit('variable:change', name, value, oldValue);
  }

  getAllVariables(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    this.variables.forEach((v, k) => (obj[k] = v));
    return obj;
  }

  /**
   * Evaluate a simple condition string against current variables.
   * Supports: ==, !=, >=, <=, >, <, &&, ||
   */
  evaluateCondition(condition: string): boolean {
    try {
      // Replace variable names with their values
      const evaluated = condition.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
        if (['true', 'false', 'null', 'undefined', 'NaN'].includes(match)) return match;
        if (['and', 'or', 'not'].includes(match.toLowerCase())) {
          if (match.toLowerCase() === 'and') return '&&';
          if (match.toLowerCase() === 'or') return '||';
          if (match.toLowerCase() === 'not') return '!';
        }
        const val = this.variables.get(match);
        if (val === undefined) return '0';
        if (typeof val === 'string') return `"${val}"`;
        return String(val);
      });

      // Safe evaluation using Function constructor (no eval)
      return Boolean(new Function(`return (${evaluated})`)());
    } catch (err) {
      console.warn(`[StateManager] Failed to evaluate condition: "${condition}"`, err);
      return false;
    }
  }

  /**
   * Apply a set operation: variable op value
   */
  applySetOperation(variable: string, operator: string, value: unknown): void {
    const current = this.variables.get(variable);

    switch (operator) {
      case '=':
        this.setVariable(variable, value);
        break;
      case '+=':
        this.setVariable(variable, (Number(current) || 0) + Number(value));
        break;
      case '-=':
        this.setVariable(variable, (Number(current) || 0) - Number(value));
        break;
      case '*=':
        this.setVariable(variable, (Number(current) || 0) * Number(value));
        break;
      case '/=': {
        const divisor = Number(value);
        this.setVariable(variable, divisor !== 0 ? (Number(current) || 0) / divisor : 0);
        break;
      }
    }
  }

  // --- Character State ---

  getCharacterState(id: string): CharacterState | undefined {
    return this.characterStates.get(id);
  }

  setCharacterState(id: string, state: Partial<CharacterState>): void {
    const existing = this.characterStates.get(id) || {
      id,
      visible: false,
      position: 'center' as const,
      expression: 'normal',
      scale: 1,
      opacity: 1,
      flipped: false,
      zIndex: 0,
    };
    this.characterStates.set(id, { ...existing, ...state });
  }

  removeCharacterState(id: string): void {
    this.characterStates.delete(id);
  }

  getAllCharacterStates(): Record<string, CharacterState> {
    const obj: Record<string, CharacterState> = {};
    this.characterStates.forEach((v, k) => (obj[k] = v));
    return obj;
  }

  // --- Scene Tracking ---

  get scene(): string { return this.currentScene; }
  set scene(v: string) { this.currentScene = v; }

  get lineIndex(): number { return this.currentLineIndex; }
  set lineIndex(v: number) { this.currentLineIndex = v; }

  get bg(): string { return this.currentBg; }
  set bg(v: string) { this.currentBg = v; }

  get bgm(): string { return this.currentBgm; }
  set bgm(v: string) { this.currentBgm = v; }

  get chapter(): string { return this.currentChapter; }
  set chapter(v: string) { this.currentChapter = v; }

  // --- History ---

  addHistory(entry: HistoryEntry): void {
    this.history.push(entry);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  // --- Read Lines Tracking (for skip mode) ---

  markLineRead(sceneId: string, lineIndex: number): void {
    this.readLines.add(`${sceneId}:${lineIndex}`);
  }

  isLineRead(sceneId: string, lineIndex: number): boolean {
    return this.readLines.has(`${sceneId}:${lineIndex}`);
  }

  private loadReadLines(): void {
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}readLines`);
      if (data) {
        const arr = JSON.parse(data) as string[];
        this.readLines = new Set(arr);
      }
    } catch { /* ignore */ }
  }

  saveReadLines(): void {
    try {
      localStorage.setItem(
        `${STORAGE_PREFIX}readLines`,
        JSON.stringify([...this.readLines])
      );
    } catch { /* ignore */ }
  }

  // --- Settings ---

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.eventBus.emit('settings:change', this.settings);
  }

  private loadSettings(): GameSettings {
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}settings`);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(this.settings));
    } catch { /* ignore */ }
  }

  // --- Save / Load ---

  /**
   * Get current playtime in milliseconds
   */
  getPlaytime(): number {
    return this.playtime + (Date.now() - this.playtimeStart);
  }

  /**
   * Create a save data snapshot of the current state
   */
  createSaveData(slot: number, screenshot?: string): SaveData {
    return {
      slot,
      timestamp: new Date().toISOString(),
      chapter: this.currentChapter,
      scene: this.currentScene,
      lineIndex: this.currentLineIndex,
      variables: this.getAllVariables(),
      characterStates: this.getAllCharacterStates(),
      currentBg: this.currentBg,
      currentBgm: this.currentBgm,
      history: this.history.slice(-50),
      screenshot,
      playtime: this.getPlaytime(),
      engineVersion: '1.0.0',
    };
  }

  /**
   * Save game to a slot
   */
  saveGame(slot: number, screenshot?: string): void {
    this.eventBus.emit('save:before', slot);
    const data = this.createSaveData(slot, screenshot);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}save_${slot}`, JSON.stringify(data));
      this.saveReadLines();
      this.eventBus.emit('save:after', slot, data);
    } catch (err) {
      console.error('[StateManager] Failed to save game:', err);
    }
  }

  /**
   * Load game from a slot, returns the save data or null
   */
  loadGame(slot: number): SaveData | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}save_${slot}`);
      if (!raw) return null;

      this.eventBus.emit('load:before', slot);
      const data = JSON.parse(raw) as SaveData;

      // Restore state
      this.variables.clear();
      Object.entries(data.variables).forEach(([k, v]) => this.variables.set(k, v));

      this.characterStates.clear();
      Object.entries(data.characterStates).forEach(([k, v]) =>
        this.characterStates.set(k, v)
      );

      this.currentScene = data.scene;
      this.currentLineIndex = data.lineIndex;
      this.currentBg = data.currentBg;
      this.currentBgm = data.currentBgm;
      this.currentChapter = data.chapter;
      this.history = data.history || [];
      this.playtime = data.playtime || 0;
      this.playtimeStart = Date.now();

      this.eventBus.emit('load:after', slot, data);
      return data;
    } catch (err) {
      console.error('[StateManager] Failed to load game:', err);
      return null;
    }
  }

  /**
   * Get save data for a slot without loading it
   */
  getSaveInfo(slot: number): SaveData | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}save_${slot}`);
      return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Delete a save slot
   */
  deleteSave(slot: number): void {
    localStorage.removeItem(`${STORAGE_PREFIX}save_${slot}`);
  }

  /**
   * Get all save slot infos
   */
  getAllSaves(): (SaveData | null)[] {
    const saves: (SaveData | null)[] = [];
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      saves.push(this.getSaveInfo(i));
    }
    return saves;
  }

  /**
   * Auto-save to slot 0
   */
  autoSave(screenshot?: string): void {
    this.saveGame(0, screenshot);
  }

  /**
   * Export save data as JSON string (for file download)
   */
  exportSave(slot: number): string | null {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}save_${slot}`);
    return raw;
  }

  /**
   * Import save data from JSON string
   */
  importSave(slot: number, json: string): boolean {
    try {
      const data = JSON.parse(json) as SaveData;
      data.slot = slot;
      localStorage.setItem(`${STORAGE_PREFIX}save_${slot}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  // --- Gallery ---

  getGallery(): GalleryState {
    return { ...this.gallery };
  }

  unlockCG(id: string): void {
    if (!this.gallery.unlockedCGs.includes(id)) {
      this.gallery.unlockedCGs.push(id);
      this.saveGallery();
    }
  }

  unlockMusic(id: string): void {
    if (!this.gallery.unlockedMusic.includes(id)) {
      this.gallery.unlockedMusic.push(id);
      this.saveGallery();
    }
  }

  unlockScene(id: string): void {
    if (!this.gallery.unlockedScenes.includes(id)) {
      this.gallery.unlockedScenes.push(id);
      this.saveGallery();
    }
  }

  unlockAchievement(id: string): void {
    if (!this.gallery.unlockedAchievements.includes(id)) {
      this.gallery.unlockedAchievements.push(id);
      this.saveGallery();
      this.eventBus.emit('achievement:unlock', id);
    }
  }

  unlockEnding(id: string): void {
    this.gallery.endings[id] = true;
    this.saveGallery();
  }

  private loadGallery(): GalleryState {
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}gallery`);
      if (data) return JSON.parse(data);
    } catch { /* ignore */ }
    return {
      unlockedCGs: [],
      unlockedMusic: [],
      unlockedScenes: [],
      unlockedAchievements: [],
      endings: {},
    };
  }

  private saveGallery(): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}gallery`, JSON.stringify(this.gallery));
    } catch { /* ignore */ }
  }

  // --- Reset ---

  resetPlaythrough(): void {
    this.variables.clear();
    this.characterStates.clear();
    this.history = [];
    this.currentScene = '';
    this.currentLineIndex = 0;
    this.currentBg = '';
    this.currentBgm = '';
    this.currentChapter = '';
    this.playtime = 0;
    this.playtimeStart = Date.now();
  }
}
