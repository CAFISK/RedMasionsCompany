import { EventBus } from './EventBus';
import { ScriptParser } from './ScriptParser';
import { StateManager } from './StateManager';
import { AssetManager } from './AssetManager';
import { AudioManager } from './AudioManager';
import { RenderEngine } from './RenderEngine';
import { UIManager } from './UIManager';
import type {
  Command,
  DialogueCommand,
  NarratorCommand,
  MonologueCommand,
  ShowCommand,
  HideCommand,
  BgCommand,
  BgmCommand,
  BgsCommand,
  SfxCommand,
  ChoiceCommand,
  JumpCommand,
  SetCommand,
  IfCommand,
  ElifCommand,
  ExpressionCommand,
  MoveCommand,
  ShakeCommand,
  FlashCommand,
  WeatherCommand,
  CameraCommand,
  CinematicCommand,
  ChapterCommand,
  InputCommand,
  AchievementCommand,
  WaitCommand,
  StopCommand,
  FadeCommand,
  CharacterConfig,
  GameConfig,
} from './types';

/**
 * SceneController - The core execution engine that processes script commands
 * sequentially and orchestrates all subsystems.
 */
export class SceneController {
  private commands: Command[] = [];
  private currentIndex = 0;
  private running = false;
  private paused = false;
  private autoMode = false;
  private skipMode = false;
  private autoTimer: number | null = null;

  private scenes: Map<string, Command[]> = new Map();
  private labels: Map<string, number> = new Map();
  private characters: Map<string, CharacterConfig> = new Map();

  constructor(
    private eventBus: EventBus,
    private parser: ScriptParser,
    private state: StateManager,
    private assets: AssetManager,
    private audio: AudioManager,
    private renderer: RenderEngine,
    private ui: UIManager,
    private config: GameConfig
  ) {
    // Register characters from config
    Object.entries(config.characters || {}).forEach(([id, char]) => {
      this.characters.set(id, { ...char, id });
    });

    // Listen for UI events
    this.eventBus.on('ui:auto', () => this.toggleAutoMode());
    this.eventBus.on('ui:skip', () => this.toggleSkipMode());
    this.eventBus.on('ui:save', () => this.showSavePanel());
    this.eventBus.on('ui:load', () => this.showLoadPanel());
    this.eventBus.on('ui:history', () => this.showHistory());
    this.eventBus.on('ui:settings', () => this.showSettings());
    this.eventBus.on('ui:hide', () => this.toggleUIVisibility());
  }

  /**
   * Load and register a scene from script text
   */
  loadScene(sceneId: string, scriptText: string): void {
    const commands = this.parser.parse(scriptText);
    this.scenes.set(sceneId, commands);

    // Build label index for this scene
    commands.forEach((cmd, index) => {
      if (cmd.type === 'label') {
        this.labels.set(`${sceneId}:${cmd.name}`, index);
      }
    });
  }

  /**
   * Load scene from a URL
   */
  async loadSceneFromURL(sceneId: string, url: string): Promise<void> {
    const response = await fetch(url);
    const text = await response.text();
    this.loadScene(sceneId, text);
  }

  /**
   * Start playing a scene
   */
  async startScene(sceneId: string): Promise<void> {
    const commands = this.scenes.get(sceneId);
    if (!commands) {
      console.error(`[SceneController] Scene not found: ${sceneId}`);
      return;
    }

    this.eventBus.emit('scene:enter', sceneId);
    this.state.scene = sceneId;
    this.state.unlockScene(sceneId);
    this.commands = commands;
    this.currentIndex = 0;
    this.running = true;
    this.paused = false;

    // Build labels for current scene
    this.labels.clear();
    commands.forEach((cmd, index) => {
      if (cmd.type === 'label') {
        this.labels.set(cmd.name, index);
      }
    });

    await this.executeLoop();
  }

  /**
   * Main execution loop
   */
  private async executeLoop(): Promise<void> {
    while (this.running && this.currentIndex < this.commands.length) {
      if (this.paused) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }

      const command = this.commands[this.currentIndex];
      this.state.lineIndex = this.currentIndex;

      try {
        await this.executeCommand(command);
      } catch (err) {
        console.error(`[SceneController] Error executing command at line ${this.currentIndex}:`, err);
      }

      this.currentIndex++;
    }

    if (this.currentIndex >= this.commands.length) {
      this.running = false;
      this.eventBus.emit('scene:exit', this.state.scene);
    }
  }

  /**
   * Execute a single command
   */
  private async executeCommand(command: Command): Promise<void> {
    switch (command.type) {
      case 'dialogue':
        await this.executeDialogue(command);
        break;
      case 'narrator':
        await this.executeNarrator(command);
        break;
      case 'monologue':
        await this.executeMonologue(command);
        break;
      case 'show':
        await this.executeShow(command);
        break;
      case 'hide':
        await this.executeHide(command);
        break;
      case 'bg':
        await this.executeBg(command);
        break;
      case 'bgm':
        this.executeBgm(command);
        break;
      case 'bgs':
        this.executeBgs(command);
        break;
      case 'sfx':
        this.executeSfx(command);
        break;
      case 'choice':
        await this.executeChoice(command);
        break;
      case 'jump':
        await this.executeJump(command);
        break;
      case 'label':
        // Labels are no-ops during execution
        break;
      case 'set':
        this.executeSet(command);
        break;
      case 'if':
        this.executeIf(command);
        break;
      case 'elif':
        this.executeElif(command);
        break;
      case 'else':
        this.executeElse();
        break;
      case 'endif':
        // End of conditional block
        break;
      case 'scene':
        // Scene markers are informational
        break;
      case 'expression':
        await this.executeExpression(command);
        break;
      case 'move':
        this.executeMove(command);
        break;
      case 'shake':
        await this.executeShake(command);
        break;
      case 'flash':
        await this.executeFlash(command);
        break;
      case 'weather':
        this.executeWeather(command);
        break;
      case 'camera':
        // Camera commands - simplified for DOM renderer
        break;
      case 'cinematic':
        this.executeCinematic(command);
        break;
      case 'chapter':
        await this.executeChapter(command);
        break;
      case 'input':
        await this.executeInput(command);
        break;
      case 'achievement':
        this.executeAchievement(command);
        break;
      case 'wait':
        await this.executeWait(command);
        break;
      case 'stop':
        this.executeStop(command);
        break;
      case 'fade':
        await this.executeFade(command);
        break;
      case 'end':
        // End of game - stop execution
        this.running = false;
        this.eventBus?.emit('game:end');
        break;
    }
  }

  // --- Command Executors ---

  private async executeDialogue(cmd: DialogueCommand): Promise<void> {
    const charConfig = this.characters.get(cmd.character);
    const charName = charConfig?.name || cmd.character;
    const charColor = charConfig?.color;

    // Update expression if specified
    if (cmd.expression && charConfig) {
      this.state.setCharacterState(cmd.character, { expression: cmd.expression });
      await this.renderer.updateCharacterExpression(cmd.character, cmd.expression, charConfig);
    }

    // Highlight active speaker
    this.renderer.highlightCharacter(cmd.character);

    // Resolve variable interpolation in text
    const text = this.resolveVariables(cmd.text);

    // Play voice if available
    if (cmd.voice) {
      this.audio.playVoice(cmd.voice);
    }

    // Mark line as read
    this.state.markLineRead(this.state.scene, this.currentIndex);

    // Add to history
    this.state.addHistory({
      character: charName,
      text,
      timestamp: Date.now(),
      voice: cmd.voice,
    });

    this.eventBus.emit('dialogue', { character: charName, text });

    // Handle skip mode
    if (this.skipMode) {
      const settings = this.state.getSettings();
      if (settings.skipMode === 'all' || this.state.isLineRead(this.state.scene, this.currentIndex)) {
        await new Promise((r) => setTimeout(r, 50));
        return;
      }
    }

    // Show dialogue and wait for advance
    await this.ui.showDialogue(charName, text, charColor);

    // Auto mode delay
    if (this.autoMode) {
      await new Promise((r) => {
        this.autoTimer = window.setTimeout(r, this.state.getSettings().autoSpeed);
      });
    }
  }

  private async executeNarrator(cmd: NarratorCommand): Promise<void> {
    const text = this.resolveVariables(cmd.text);

    this.renderer.highlightCharacter(null);
    this.state.markLineRead(this.state.scene, this.currentIndex);
    this.state.addHistory({ text, timestamp: Date.now() });
    this.eventBus.emit('dialogue', { character: null, text });

    if (this.skipMode) {
      await new Promise((r) => setTimeout(r, 50));
      return;
    }

    await this.ui.showNarrator(text);

    if (this.autoMode) {
      await new Promise((r) => {
        this.autoTimer = window.setTimeout(r, this.state.getSettings().autoSpeed);
      });
    }
  }

  private async executeMonologue(cmd: MonologueCommand): Promise<void> {
    const charConfig = this.characters.get(cmd.character);
    const charName = charConfig?.name || cmd.character;
    const charColor = charConfig?.color;
    const text = this.resolveVariables(cmd.text);

    this.state.markLineRead(this.state.scene, this.currentIndex);
    this.state.addHistory({ character: charName, text, timestamp: Date.now() });

    if (this.skipMode) {
      await new Promise((r) => setTimeout(r, 50));
      return;
    }

    await this.ui.showMonologue(charName, text, charColor);

    if (this.autoMode) {
      await new Promise((r) => {
        this.autoTimer = window.setTimeout(r, this.state.getSettings().autoSpeed);
      });
    }
  }

  private async executeShow(cmd: ShowCommand): Promise<void> {
    const charConfig = this.characters.get(cmd.character);
    if (!charConfig) {
      // Create a minimal config for unknown characters
      const minConfig: CharacterConfig = {
        id: cmd.character,
        name: cmd.character,
        sprites: { expressions: {} },
      };
      this.characters.set(cmd.character, minConfig);
    }

    const config = this.characters.get(cmd.character)!;
    const state = this.state.getCharacterState(cmd.character) || {
      id: cmd.character,
      visible: true,
      position: cmd.position || 'center',
      expression: cmd.expression || 'normal',
      scale: 1,
      opacity: 1,
      flipped: false,
      zIndex: 10,
    };

    state.visible = true;
    if (cmd.position) state.position = cmd.position;
    if (cmd.expression) state.expression = cmd.expression;

    this.state.setCharacterState(cmd.character, state);
    await this.renderer.showCharacter(cmd.character, state, config, cmd.transition);
  }

  private async executeHide(cmd: HideCommand): Promise<void> {
    await this.renderer.hideCharacter(cmd.character, cmd.transition);
    this.state.removeCharacterState(cmd.character);
  }

  private async executeBg(cmd: BgCommand): Promise<void> {
    this.state.bg = cmd.image;
    await this.renderer.setBackground(cmd.image, cmd.transition);
  }

  private executeBgm(cmd: BgmCommand): void {
    this.state.bgm = cmd.track;
    this.state.unlockMusic(cmd.track);
    this.audio.playBGM(cmd.track, {
      volume: cmd.volume,
      fadeIn: cmd.fadeIn,
      loop: cmd.loop,
    });
  }

  private executeBgs(cmd: BgsCommand): void {
    this.audio.playBGS(cmd.track, {
      volume: cmd.volume,
      fadeIn: cmd.fadeIn,
      loop: cmd.loop,
    });
  }

  private executeSfx(cmd: SfxCommand): void {
    this.audio.playSFX(cmd.sound, cmd.volume);
  }

  private async executeChoice(cmd: ChoiceCommand): Promise<void> {
    this.ui.hideDialogue();
    this.eventBus.emit('choice:show', cmd.options);

    const selectedIndex = await this.ui.showChoices(
      cmd.options,
      (cond) => this.state.evaluateCondition(cond)
    );

    const selected = cmd.options[selectedIndex];
    this.eventBus.emit('choice:select', selectedIndex, selected);

    // Auto-save on choice
    this.state.autoSave();

    // Jump to target
    if (selected.target) {
      await this.jumpTo(selected.target);
    }
  }

  private async executeJump(cmd: JumpCommand): Promise<void> {
    if (cmd.transition) {
      await this.renderer.fadeScreen('out', '#000', cmd.transition.duration || 500);
    }
    await this.jumpTo(cmd.target);
    if (cmd.transition) {
      await this.renderer.fadeScreen('in', '#000', cmd.transition.duration || 500);
    }
  }

  private async jumpTo(target: string): Promise<void> {
    // Check if target is a label in current scene
    if (this.labels.has(target)) {
      this.currentIndex = this.labels.get(target)!;
      return;
    }

    // Check if target is a scene
    if (this.scenes.has(target)) {
      this.eventBus.emit('scene:exit', this.state.scene);
      this.running = false; // Stop current loop
      // Start new scene (will be called after current loop ends)
      setTimeout(() => this.startScene(target), 0);
      return;
    }

    // Try to load scene from URL
    try {
      const url = `./scripts/${target}.vns`;
      await this.loadSceneFromURL(target, url);
      this.eventBus.emit('scene:exit', this.state.scene);
      this.running = false;
      setTimeout(() => this.startScene(target), 0);
    } catch {
      console.error(`[SceneController] Jump target not found: ${target}`);
    }
  }

  private executeSet(cmd: SetCommand): void {
    this.state.applySetOperation(cmd.variable, cmd.operator, cmd.value);
  }

  /**
   * Handle conditional blocks by skipping to the appropriate branch
   */
  private executeIf(cmd: IfCommand): void {
    const result = this.state.evaluateCondition(cmd.condition);
    if (!result) {
      this.skipToNextBranch();
    }
  }

  private executeElif(cmd: ElifCommand): void {
    // If we reached elif normally, it means the previous if/elif was true
    // Skip to endif
    this.skipToEndif();
  }

  private executeElse(): void {
    // If we reached else normally, previous condition was true
    this.skipToEndif();
  }

  private skipToNextBranch(): void {
    let depth = 0;
    while (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      const cmd = this.commands[this.currentIndex];
      if (cmd.type === 'if') depth++;
      if (depth === 0) {
        if (cmd.type === 'elif') {
          const elifCmd = cmd as ElifCommand;
          if (this.state.evaluateCondition(elifCmd.condition)) {
            return; // Execute this branch
          }
          // Continue to next branch
        } else if (cmd.type === 'else') {
          return; // Execute else branch
        } else if (cmd.type === 'endif') {
          return;
        }
      }
      if (cmd.type === 'endif') depth--;
    }
  }

  private skipToEndif(): void {
    let depth = 0;
    while (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      const cmd = this.commands[this.currentIndex];
      if (cmd.type === 'if') depth++;
      if (cmd.type === 'endif') {
        if (depth === 0) return;
        depth--;
      }
    }
  }

  private async executeExpression(cmd: ExpressionCommand): Promise<void> {
    const charConfig = this.characters.get(cmd.character);
    if (charConfig) {
      this.state.setCharacterState(cmd.character, { expression: cmd.expression });
      await this.renderer.updateCharacterExpression(cmd.character, cmd.expression, charConfig);
    }
  }

  private executeMove(cmd: MoveCommand): void {
    this.state.setCharacterState(cmd.character, { position: cmd.position });
    this.renderer.moveCharacter(cmd.character, cmd.position, cmd.duration);
  }

  private async executeShake(cmd: ShakeCommand): Promise<void> {
    if (!this.state.getSettings().screenShake) return;
    await this.renderer.shakeScreen(cmd.intensity, cmd.duration);
  }

  private async executeFlash(cmd: FlashCommand): Promise<void> {
    await this.renderer.flashScreen(cmd.color, cmd.duration);
  }

  private executeWeather(cmd: WeatherCommand): void {
    this.renderer.setWeather(cmd.effect, cmd.intensity);
  }

  private executeCinematic(cmd: CinematicCommand): void {
    this.renderer.setCinematicMode(cmd.enabled);
  }

  private async executeChapter(cmd: ChapterCommand): Promise<void> {
    this.state.chapter = cmd.title;
    this.eventBus.emit('chapter:start', cmd.title);
    await this.ui.showChapterCard(cmd.title, cmd.subtitle, cmd.duration);
  }

  private async executeInput(cmd: InputCommand): Promise<void> {
    const value = await this.ui.showInput(cmd.prompt, cmd.maxLength);
    this.state.setVariable(cmd.variable, value);
  }

  private executeAchievement(cmd: AchievementCommand): void {
    this.state.unlockAchievement(cmd.id);
    this.ui.showNotification(`🏆 成就解锁: ${cmd.title}`);
  }

  private async executeWait(cmd: WaitCommand): Promise<void> {
    if (this.skipMode) return;
    await new Promise((r) => setTimeout(r, cmd.duration));
  }

  private executeStop(cmd: StopCommand): void {
    this.audio.stopChannel(cmd.channel, cmd.fadeOut);
  }

  private async executeFade(cmd: FadeCommand): Promise<void> {
    await this.renderer.fadeScreen(cmd.direction, cmd.color, cmd.duration);
  }

  // --- Variable Resolution ---

  private resolveVariables(text: string): string {
    return text.replace(/\{(\w+)\}/g, (_, varName) => {
      const value = this.state.getVariable(varName);
      return value !== undefined ? String(value) : `{${varName}}`;
    });
  }

  // --- Mode Toggles ---

  toggleAutoMode(): void {
    this.autoMode = !this.autoMode;
    this.skipMode = false;
    this.ui.showNotification(this.autoMode ? '自动播放: 开启' : '自动播放: 关闭');
  }

  toggleSkipMode(): void {
    this.skipMode = !this.skipMode;
    this.autoMode = false;
    this.ui.showNotification(this.skipMode ? '快进模式: 开启' : '快进模式: 关闭');
  }

  private uiHidden = false;
  toggleUIVisibility(): void {
    this.uiHidden = !this.uiHidden;
    if (this.uiHidden) {
      this.ui.hideAllUI();
    } else {
      this.ui.showAllUI();
    }
  }

  // --- Panel Shortcuts ---

  private showSavePanel(): void {
    const saves = this.state.getAllSaves();
    this.ui.showSaveLoadPanel('save', saves, (slot) => {
      this.state.saveGame(slot);
      this.ui.showNotification(`已保存到存档 ${slot}`);
    });
  }

  private showLoadPanel(): void {
    const saves = this.state.getAllSaves();
    this.ui.showSaveLoadPanel('load', saves, (slot) => {
      const data = this.state.loadGame(slot);
      if (data) {
        this.ui.showNotification(`已读取存档 ${slot}`);
        // Restart scene from saved position
        this.restoreFromSave(data);
      }
    });
  }

  private showHistory(): void {
    this.ui.showHistory(this.state.getHistory());
  }

  private showSettings(): void {
    this.ui.showSettings(this.state.getSettings(), (partial) => {
      this.state.updateSettings(partial);
      this.ui.updateSettings(this.state.getSettings());
      this.audio.applySettings(this.state.getSettings());
    });
  }

  /**
   * Restore game state from save data and resume execution
   */
  private async restoreFromSave(data: import('./types').SaveData): Promise<void> {
    this.running = false;

    // Restore visual state
    this.renderer.clear();

    // Restore background
    if (data.currentBg) {
      await this.renderer.setBackground(data.currentBg);
    }

    // Restore BGM
    if (data.currentBgm) {
      this.audio.playBGM(data.currentBgm);
    }

    // Restore characters
    for (const [id, charState] of Object.entries(data.characterStates)) {
      const config = this.characters.get(id);
      if (config && charState.visible) {
        await this.renderer.showCharacter(id, charState, config);
      }
    }

    // Resume scene execution
    const sceneCommands = this.scenes.get(data.scene);
    if (sceneCommands) {
      this.commands = sceneCommands;
      this.currentIndex = data.lineIndex;
      this.running = true;

      // Rebuild labels
      this.labels.clear();
      sceneCommands.forEach((cmd, index) => {
        if (cmd.type === 'label') {
          this.labels.set(cmd.name, index);
        }
      });

      await this.executeLoop();
    }
  }

  /**
   * Stop execution
   */
  stop(): void {
    this.running = false;
    this.autoMode = false;
    this.skipMode = false;
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume execution
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Check if currently running
   */
  isRunning(): boolean {
    return this.running;
  }
}
