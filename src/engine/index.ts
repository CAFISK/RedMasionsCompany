import { EventBus } from './EventBus';
import { ScriptParser } from './ScriptParser';
import { StateManager } from './StateManager';
import { AssetManager } from './AssetManager';
import { AudioManager } from './AudioManager';
import { RenderEngine } from './RenderEngine';
import { UIManager } from './UIManager';
import { SceneController } from './SceneController';
import type { GameConfig, VNPlugin, VNEngineAPI } from './types';

/**
 * VNEngine - Main entry point for the Visual Novel Engine.
 * Initializes all subsystems and provides the public API.
 */
export class VNEngine implements VNEngineAPI {
  private eventBus: EventBus;
  private parser: ScriptParser;
  private state: StateManager;
  private assets: AssetManager;
  private audio: AudioManager;
  private renderer: RenderEngine;
  private ui: UIManager;
  private sceneController: SceneController;
  private plugins: VNPlugin[] = [];
  private config: GameConfig;
  private titleScreen: HTMLElement | null = null;

  constructor(containerId: string, config: GameConfig) {
    this.config = config;
    this.eventBus = new EventBus();
    this.parser = new ScriptParser();
    this.state = new StateManager(this.eventBus);
    this.assets = new AssetManager();
    this.audio = new AudioManager(this.eventBus);
    this.renderer = new RenderEngine(containerId, this.assets, this.eventBus);
    this.ui = new UIManager(
      this.renderer.getUILayer(),
      this.eventBus,
      this.state.getSettings()
    );
    this.sceneController = new SceneController(
      this.eventBus,
      this.parser,
      this.state,
      this.assets,
      this.audio,
      this.renderer,
      this.ui,
      config
    );

    // Apply default settings from config
    if (config.defaultSettings) {
      this.state.updateSettings(config.defaultSettings);
    }

    // Apply audio settings
    this.audio.applySettings(this.state.getSettings());

    console.log(`[VNEngine] Initialized: "${config.title}" v${config.version}`);
  }

  // --- Public API ---

  /**
   * Show the title screen
   */
  showTitleScreen(): void {
    this.ui.hideDialogue();
    this.sceneController.stop();
    this.renderer.clear();

    const container = this.renderer.getContainer();

    this.titleScreen = document.createElement('div');
    this.titleScreen.className = 'vn-title-screen';
    this.titleScreen.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a2a 100%);
      z-index: 100;
      color: white;
      font-family: serif;
    `;

    this.titleScreen.innerHTML = `
      <div style="text-align: center; animation: vn-fadeIn 1s ease;">
        <h1 style="font-size: 48px; margin-bottom: 10px; text-shadow: 0 0 20px rgba(100,150,255,0.5); letter-spacing: 4px;">
          ${this.config.title}
        </h1>
        ${this.config.description ? `<p style="font-size: 16px; color: #8899bb; margin-bottom: 50px;">${this.config.description}</p>` : '<div style="margin-bottom:50px;"></div>'}
        <div class="vn-title-menu" style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
        </div>
      </div>
    `;

    const menuContainer = this.titleScreen.querySelector('.vn-title-menu')!;

    const menuItems: { label: string; action: () => void; condition?: boolean }[] = [
      { label: '开始游戏', action: () => this.startNewGame() },
      {
        label: '继续游戏',
        action: () => this.continueGame(),
        condition: this.state.getSaveInfo(0) !== null,
      },
      { label: '读取存档', action: () => this.showLoadScreen() },
      { label: '设置', action: () => this.showTitleSettings() },
      { label: '画廊', action: () => this.showGallery() },
    ];

    menuItems.forEach(({ label, action, condition }) => {
      if (condition === false) return;

      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        background: transparent;
        color: #aabbdd;
        border: 1px solid rgba(100,150,255,0.2);
        padding: 12px 50px;
        font-size: 20px;
        font-family: serif;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 220px;
        letter-spacing: 2px;
        border-radius: 4px;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(100,150,255,0.1)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'rgba(100,150,255,0.5)';
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
        btn.style.color = '#aabbdd';
        btn.style.borderColor = 'rgba(100,150,255,0.2)';
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('click', action);
      menuContainer.appendChild(btn);
    });

    container.appendChild(this.titleScreen);
  }

  /**
   * Start a new game from the beginning
   */
  async startNewGame(): Promise<void> {
    this.hideTitleScreen();
    this.state.resetPlaythrough();
    this.eventBus.emit('game:start');

    // Load and start the first scene
    await this.loadAndStartScene(this.config.startScene);
  }

  /**
   * Continue from auto-save
   */
  async continueGame(): Promise<void> {
    const data = this.state.loadGame(0);
    if (data) {
      this.hideTitleScreen();
      await this.loadAndStartScene(data.scene);
    }
  }

  /**
   * Load a scene and start it
   */
  async loadAndStartScene(sceneId: string): Promise<void> {
    // Try to load scene if not already loaded
    if (!this.isSceneLoaded(sceneId)) {
      try {
        await this.sceneController.loadSceneFromURL(sceneId, `./game/scripts/${sceneId}.vns`);
      } catch (err) {
        console.error(`[VNEngine] Failed to load scene: ${sceneId}`, err);
        return;
      }
    }
    await this.sceneController.startScene(sceneId);
  }

  private isSceneLoaded(sceneId: string): boolean {
    // SceneController manages loaded scenes internally
    return false; // Always try to load for now
  }

  /**
   * Load a scene from script text
   */
  loadScene(sceneId: string, scriptText: string): void {
    this.sceneController.loadScene(sceneId, scriptText);
  }

  /**
   * Load a scene from a URL
   */
  async loadSceneFromURL(sceneId: string, url: string): Promise<void> {
    await this.sceneController.loadSceneFromURL(sceneId, url);
  }

  /**
   * Start a specific scene
   */
  async startScene(sceneId: string): Promise<void> {
    this.hideTitleScreen();
    await this.sceneController.startScene(sceneId);
  }

  private hideTitleScreen(): void {
    if (this.titleScreen) {
      this.titleScreen.style.transition = 'opacity 0.5s ease';
      this.titleScreen.style.opacity = '0';
      const ts = this.titleScreen;
      setTimeout(() => ts.remove(), 500);
      this.titleScreen = null;
    }
  }

  private showLoadScreen(): void {
    const saves = this.state.getAllSaves();
    this.ui.showSaveLoadPanel('load', saves, async (slot) => {
      const data = this.state.loadGame(slot);
      if (data) {
        this.hideTitleScreen();
        await this.loadAndStartScene(data.scene);
      }
    });
  }

  private showTitleSettings(): void {
    this.ui.showSettings(this.state.getSettings(), (partial) => {
      this.state.updateSettings(partial);
      this.audio.applySettings(this.state.getSettings());
    });
  }

  private showGallery(): void {
    const gallery = this.state.getGallery();
    this.ui.showNotification(`CG: ${gallery.unlockedCGs.length} | 音乐: ${gallery.unlockedMusic.length} | 成就: ${gallery.unlockedAchievements.length}`);
  }

  // --- Plugin System ---

  /**
   * Register a plugin
   */
  use(plugin: VNPlugin): void {
    plugin.init(this);
    this.plugins.push(plugin);
    console.log(`[VNEngine] Plugin loaded: ${plugin.name} v${plugin.version}`);
  }

  // --- VNEngineAPI Implementation ---

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.eventBus.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.eventBus.off(event, handler);
  }

  getVariable(name: string): unknown {
    return this.state.getVariable(name);
  }

  setVariable(name: string, value: unknown): void {
    this.state.setVariable(name, value);
  }

  getCurrentScene(): string {
    return this.state.scene;
  }

  showUI(html: string, options?: { modal?: boolean }): void {
    const overlay = document.createElement('div');
    overlay.className = 'vn-plugin-ui';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 60;
      ${options?.modal ? 'background: rgba(0,0,0,0.5);' : 'pointer-events: none;'}
    `;
    overlay.innerHTML = html;
    this.renderer.getUILayer().appendChild(overlay);
  }

  hideUI(): void {
    this.renderer.getUILayer().querySelectorAll('.vn-plugin-ui').forEach((el) => el.remove());
  }

  // --- Utility ---

  /**
   * Get the state manager (for advanced usage)
   */
  getState(): StateManager {
    return this.state;
  }

  /**
   * Get the event bus (for advanced usage)
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Destroy the engine and clean up
   */
  destroy(): void {
    this.sceneController.stop();
    this.plugins.forEach((p) => p.destroy());
    this.audio.destroy();
    this.ui.destroy();
    this.renderer.destroy();
    this.eventBus.clear();
    this.state.saveReadLines();
    console.log('[VNEngine] Destroyed');
  }
}

// Export all modules
export { EventBus } from './EventBus';
export { ScriptParser } from './ScriptParser';
export { StateManager } from './StateManager';
export { AssetManager } from './AssetManager';
export { AudioManager } from './AudioManager';
export { RenderEngine } from './RenderEngine';
export { UIManager } from './UIManager';
export { SceneController } from './SceneController';
export type * from './types';
