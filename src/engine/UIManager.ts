import { EventBus } from './EventBus';
import type { ChoiceOption, GameSettings, HistoryEntry } from './types';

/**
 * UIManager - Manages all UI elements including dialogue box, choices,
 * menus, settings panel, save/load screen, and notifications.
 */
export class UIManager {
  private uiLayer: HTMLElement;
  private dialogueBox!: HTMLElement;
  private nameplate!: HTMLElement;
  private dialogueText!: HTMLElement;
  private quickMenu!: HTMLElement;
  private choiceContainer!: HTMLElement;
  private historyPanel!: HTMLElement;
  private settingsPanel!: HTMLElement;
  private saveLoadPanel!: HTMLElement;
  private notificationArea!: HTMLElement;
  private chapterCard!: HTMLElement;
  private inputOverlay!: HTMLElement;

  private typewriterTimer: number | null = null;
  private isTyping = false;
  private fullText = '';
  private currentSettings: GameSettings;

  // Callbacks
  private onAdvance: (() => void) | null = null;
  private onChoiceSelect: ((index: number) => void) | null = null;
  private onSaveSlotClick: ((slot: number) => void) | null = null;
  private onLoadSlotClick: ((slot: number) => void) | null = null;

  constructor(
    uiLayer: HTMLElement,
    private eventBus: EventBus,
    settings: GameSettings
  ) {
    this.uiLayer = uiLayer;
    this.currentSettings = settings;
    this.initUI();
    this.initStyles();
  }

  /**
   * Initialize all UI elements
   */
  private initUI(): void {
    this.uiLayer.style.pointerEvents = 'auto';

    // Dialogue box
    this.dialogueBox = this.createElement('vn-dialogue-box', `
      position: absolute;
      bottom: 0; left: 0;
      width: 100%; height: auto;
      padding: 20px 30px 25px;
      box-sizing: border-box;
      background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,${this.currentSettings.textBoxOpacity}) 15%);
      cursor: pointer;
      display: none;
      z-index: 10;
    `);

    // Name plate
    this.nameplate = this.createElement('vn-nameplate', `
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      margin-bottom: 8px;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
      min-height: 24px;
    `);
    this.dialogueBox.appendChild(this.nameplate);

    // Dialogue text
    this.dialogueText = this.createElement('vn-dialogue-text', `
      font-size: ${this.currentSettings.fontSize}px;
      color: #eee;
      line-height: 1.7;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
      min-height: 60px;
      font-family: ${this.currentSettings.fontFamily};
    `);
    this.dialogueBox.appendChild(this.dialogueText);

    // Click indicator
    const indicator = this.createElement('vn-click-indicator', `
      position: absolute;
      bottom: 10px; right: 20px;
      width: 0; height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 10px solid rgba(255,255,255,0.7);
      animation: vn-bounce 1s ease infinite;
      display: none;
    `);
    indicator.id = 'vn-click-indicator';
    this.dialogueBox.appendChild(indicator);

    this.uiLayer.appendChild(this.dialogueBox);

    // Click to advance
    this.dialogueBox.addEventListener('click', () => this.handleClick());

    // Quick menu
    this.quickMenu = this.createElement('vn-quick-menu', `
      position: absolute;
      bottom: 0; right: 0;
      display: flex;
      gap: 2px;
      padding: 4px;
      z-index: 15;
    `);
    this.createQuickMenuButtons();
    this.uiLayer.appendChild(this.quickMenu);

    // Choice container
    this.choiceContainer = this.createElement('vn-choices', `
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      display: none;
      flex-direction: column;
      gap: 12px;
      z-index: 20;
      min-width: 400px;
      max-width: 80%;
    `);
    this.uiLayer.appendChild(this.choiceContainer);

    // History panel
    this.historyPanel = this.createElement('vn-history', `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.92);
      overflow-y: auto;
      padding: 30px;
      box-sizing: border-box;
      display: none;
      z-index: 40;
      color: #ddd;
    `);
    this.uiLayer.appendChild(this.historyPanel);

    // Settings panel
    this.settingsPanel = this.createElement('vn-settings', `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.92);
      display: none;
      z-index: 40;
      overflow-y: auto;
      padding: 30px;
      box-sizing: border-box;
      color: #ddd;
    `);
    this.uiLayer.appendChild(this.settingsPanel);

    // Save/Load panel
    this.saveLoadPanel = this.createElement('vn-saveload', `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.92);
      display: none;
      z-index: 40;
      overflow-y: auto;
      padding: 30px;
      box-sizing: border-box;
      color: #ddd;
    `);
    this.uiLayer.appendChild(this.saveLoadPanel);

    // Notification area
    this.notificationArea = this.createElement('vn-notifications', `
      position: absolute;
      top: 10px; right: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 50;
      pointer-events: none;
    `);
    this.uiLayer.appendChild(this.notificationArea);

    // Chapter card
    this.chapterCard = this.createElement('vn-chapter-card', `
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: white;
      z-index: 35;
      display: none;
      pointer-events: none;
    `);
    this.uiLayer.appendChild(this.chapterCard);

    // Input overlay
    this.inputOverlay = this.createElement('vn-input-overlay', `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 45;
    `);
    this.uiLayer.appendChild(this.inputOverlay);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  private createElement(className: string, style: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    el.style.cssText = style;
    return el;
  }

  private createQuickMenuButtons(): void {
    const buttons = [
      { label: '存档', action: 'save' },
      { label: '读档', action: 'load' },
      { label: '自动', action: 'auto' },
      { label: '快进', action: 'skip' },
      { label: '记录', action: 'history' },
      { label: '设置', action: 'settings' },
      { label: '隐藏', action: 'hide' },
    ];

    buttons.forEach(({ label, action }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = 'vn-quick-btn';
      btn.style.cssText = `
        background: rgba(0,0,0,0.5);
        color: #ccc;
        border: 1px solid rgba(255,255,255,0.2);
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 3px;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.15)';
        btn.style.color = '#fff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(0,0,0,0.5)';
        btn.style.color = '#ccc';
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleQuickMenuAction(action);
      });
      this.quickMenu.appendChild(btn);
    });
  }

  /**
   * Inject CSS animations and styles
   */
  private initStyles(): void {
    if (document.getElementById('vn-engine-styles')) return;

    const style = document.createElement('style');
    style.id = 'vn-engine-styles';
    style.textContent = `
      @keyframes vn-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(5px); }
      }
      @keyframes vn-rain {
        0% { transform: translateY(-100vh); }
        100% { transform: translateY(100vh); }
      }
      @keyframes vn-snow {
        0% { transform: translateY(-10vh) translateX(0) rotate(0deg); }
        100% { transform: translateY(110vh) translateX(50px) rotate(360deg); }
      }
      @keyframes vn-sakura {
        0% { transform: translateY(-10vh) translateX(0) rotate(0deg); }
        100% { transform: translateY(110vh) translateX(100px) rotate(720deg); }
      }
      @keyframes vn-fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes vn-slideIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes vn-notification {
        0% { opacity: 0; transform: translateX(100%); }
        10% { opacity: 1; transform: translateX(0); }
        90% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(100%); }
      }
      .vn-choice-btn {
        background: rgba(0, 0, 0, 0.75);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 14px 30px;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.25s ease;
        text-align: center;
        border-radius: 4px;
        backdrop-filter: blur(4px);
      }
      .vn-choice-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.02);
      }
      .vn-choice-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .vn-choice-btn:disabled:hover {
        background: rgba(0, 0, 0, 0.75);
        border-color: rgba(255, 255, 255, 0.3);
        transform: none;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Dialogue ---

  /**
   * Show dialogue with typewriter effect
   */
  showDialogue(character: string | null, text: string, color?: string): Promise<void> {
    return new Promise((resolve) => {
      this.dialogueBox.style.display = 'block';
      this.nameplate.textContent = character || '';
      this.nameplate.style.color = color || '#fff';
      this.fullText = text;
      this.onAdvance = resolve;

      const indicator = this.dialogueBox.querySelector('#vn-click-indicator') as HTMLElement;

      if (this.currentSettings.textSpeed === 0) {
        // Instant display
        this.dialogueText.innerHTML = this.parseTextTags(text);
        this.isTyping = false;
        if (indicator) indicator.style.display = 'block';
      } else {
        // Typewriter effect
        this.isTyping = true;
        if (indicator) indicator.style.display = 'none';
        this.typewriterEffect(text, () => {
          this.isTyping = false;
          if (indicator) indicator.style.display = 'block';
        });
      }
    });
  }

  /**
   * Show dialogue instantly without waiting for click (used in skip mode)
   */
  showDialogueInstant(character: string | null, text: string, color?: string): void {
    this.stopTypewriter();
    this.dialogueBox.style.display = 'block';
    this.nameplate.textContent = character || '';
    this.nameplate.style.color = color || '#fff';
    this.fullText = text;
    this.dialogueText.innerHTML = this.parseTextTags(text);
    this.isTyping = false;

    // Clear any pending advance callback so it doesn't leak
    this.onAdvance = null;

    const indicator = this.dialogueBox.querySelector('#vn-click-indicator') as HTMLElement;
    if (indicator) indicator.style.display = 'none';
  }

  /**
   * Show narrator text (no character name)
   */
  showNarrator(text: string): Promise<void> {
    return this.showDialogue(null, text);
  }

  /**
   * Show monologue (italic style)
   */
  showMonologue(character: string, text: string, color?: string): Promise<void> {
    this.dialogueText.style.fontStyle = 'italic';
    const promise = this.showDialogue(character, text, color);
    promise.then(() => {
      this.dialogueText.style.fontStyle = 'normal';
    });
    return promise;
  }

  /**
   * Hide dialogue box
   */
  hideDialogue(): void {
    this.dialogueBox.style.display = 'none';
    this.stopTypewriter();
  }

  /**
   * Typewriter text animation
   */
  private typewriterEffect(text: string, onComplete: () => void): void {
    this.stopTypewriter();
    const parsed = this.parseTextTags(text);
    // Strip HTML tags for character counting
    const plainText = parsed.replace(/<[^>]+>/g, '');
    const speed = 1000 / this.currentSettings.textSpeed;

    let charIndex = 0;
    this.dialogueText.innerHTML = '';

    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = parsed;
    const fullHTML = temp.innerHTML;

    this.typewriterTimer = window.setInterval(() => {
      charIndex++;
      if (charIndex >= plainText.length) {
        this.dialogueText.innerHTML = fullHTML;
        this.stopTypewriter();
        onComplete();
        return;
      }

      // Show characters progressively
      this.dialogueText.innerHTML = this.truncateHTML(fullHTML, charIndex);
    }, speed);
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer !== null) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  /**
   * Truncate HTML string to show only N visible characters
   */
  private truncateHTML(html: string, maxChars: number): string {
    let visibleCount = 0;
    let result = '';
    let inTag = false;

    for (let i = 0; i < html.length; i++) {
      const ch = html[i];
      if (ch === '<') {
        inTag = true;
        result += ch;
      } else if (ch === '>') {
        inTag = false;
        result += ch;
      } else if (inTag) {
        result += ch;
      } else {
        if (visibleCount < maxChars) {
          result += ch;
          visibleCount++;
        } else {
          break;
        }
      }
    }

    // Close any unclosed tags
    const openTags: string[] = [];
    const tagRegex = /<\/?([a-zA-Z]+)[^>]*>/g;
    let match;
    while ((match = tagRegex.exec(result)) !== null) {
      if (match[0].startsWith('</')) {
        openTags.pop();
      } else if (!match[0].endsWith('/>')) {
        openTags.push(match[1]);
      }
    }
    while (openTags.length > 0) {
      result += `</${openTags.pop()}>`;
    }

    return result;
  }

  /**
   * Parse VN text tags into HTML
   * Supports: [b], [i], [color=#xxx], [size=N]
   */
  private parseTextTags(text: string): string {
    return text
      .replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>')
      .replace(/\[color=([^\]]+)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>')
      .replace(/\[size=(\d+)\](.*?)\[\/size\]/g, '<span style="font-size:$1px">$2</span>')
      .replace(/\[ruby=([^\]]+)\](.*?)\[\/ruby\]/g, '<ruby>$2<rp>(</rp><rt>$1</rt><rp>)</rp></ruby>')
      .replace(/\{(\w+)\}/g, (_, varName) => {
        // Variable interpolation - will be resolved by the engine
        return `<span class="vn-var" data-var="${varName}"></span>`;
      });
  }

  private handleClick(): void {
    if (this.isTyping) {
      // Complete typewriter immediately
      this.stopTypewriter();
      this.dialogueText.innerHTML = this.parseTextTags(this.fullText);
      this.isTyping = false;
      const indicator = this.dialogueBox.querySelector('#vn-click-indicator') as HTMLElement;
      if (indicator) indicator.style.display = 'block';
    } else if (this.onAdvance) {
      const advance = this.onAdvance;
      this.onAdvance = null;
      advance();
    }
  }

  // --- Choices ---

  /**
   * Show choice buttons and wait for player selection
   */
  showChoices(options: ChoiceOption[], evaluateCondition: (cond: string) => boolean): Promise<number> {
    return new Promise((resolve) => {
      this.choiceContainer.innerHTML = '';
      this.choiceContainer.style.display = 'flex';

      options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'vn-choice-btn';
        btn.textContent = option.text;
        btn.style.animation = `vn-fadeIn 0.3s ease ${index * 0.1}s both`;

        // Check condition
        if (option.condition && !evaluateCondition(option.condition)) {
          btn.disabled = true;
          btn.title = '条件未满足';
        }

        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          this.choiceContainer.style.display = 'none';
          this.choiceContainer.innerHTML = '';
          resolve(index);
        });

        this.choiceContainer.appendChild(btn);
      });
    });
  }

  /**
   * Hide choices
   */
  hideChoices(): void {
    this.choiceContainer.style.display = 'none';
    this.choiceContainer.innerHTML = '';
  }

  // --- History Panel ---

  /**
   * Show text history panel
   */
  showHistory(entries: HistoryEntry[]): void {
    this.historyPanel.innerHTML = '';
    this.historyPanel.style.display = 'block';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;';
    header.innerHTML = '<h2 style="margin:0; color:#fff;">对话记录</h2>';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ 关闭';
    closeBtn.style.cssText = 'background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.3); padding:6px 16px; cursor:pointer; border-radius:4px;';
    closeBtn.addEventListener('click', () => this.hideHistory());
    header.appendChild(closeBtn);
    this.historyPanel.appendChild(header);

    entries.forEach((entry) => {
      const item = document.createElement('div');
      item.style.cssText = 'padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);';
      if (entry.character) {
        item.innerHTML = `<span style="color:#88ccff; font-weight:bold;">${entry.character}</span>: ${entry.text}`;
      } else {
        item.innerHTML = `<span style="color:#aaa; font-style:italic;">${entry.text}</span>`;
      }
      this.historyPanel.appendChild(item);
    });

    // Scroll to bottom
    this.historyPanel.scrollTop = this.historyPanel.scrollHeight;
  }

  hideHistory(): void {
    this.historyPanel.style.display = 'none';
  }

  // --- Settings Panel ---

  /**
   * Show settings panel
   */
  showSettings(
    settings: GameSettings,
    onUpdate: (partial: Partial<GameSettings>) => void
  ): void {
    this.settingsPanel.innerHTML = '';
    this.settingsPanel.style.display = 'block';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;';
    header.innerHTML = '<h2 style="margin:0; color:#fff;">设置</h2>';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ 关闭';
    closeBtn.style.cssText = 'background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.3); padding:6px 16px; cursor:pointer; border-radius:4px;';
    closeBtn.addEventListener('click', () => this.hideSettings());
    header.appendChild(closeBtn);
    this.settingsPanel.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:600px; margin:0 auto;';

    // Slider settings
    const sliders: { label: string; key: keyof GameSettings; min: number; max: number; step: number; display?: (v: number) => string }[] = [
      { label: '文字速度', key: 'textSpeed', min: 0, max: 100, step: 5, display: (v) => v === 0 ? '瞬间' : `${v}字/秒` },
      { label: '自动播放速度', key: 'autoSpeed', min: 500, max: 10000, step: 500, display: (v) => `${(v / 1000).toFixed(1)}秒` },
      { label: '主音量', key: 'masterVolume', min: 0, max: 1, step: 0.05, display: (v) => `${Math.round(v * 100)}%` },
      { label: 'BGM 音量', key: 'bgmVolume', min: 0, max: 1, step: 0.05, display: (v) => `${Math.round(v * 100)}%` },
      { label: '音效音量', key: 'sfxVolume', min: 0, max: 1, step: 0.05, display: (v) => `${Math.round(v * 100)}%` },
      { label: '语音音量', key: 'voiceVolume', min: 0, max: 1, step: 0.05, display: (v) => `${Math.round(v * 100)}%` },
      { label: '文字大小', key: 'fontSize', min: 16, max: 36, step: 2, display: (v) => `${v}px` },
      { label: '对话框透明度', key: 'textBoxOpacity', min: 0, max: 1, step: 0.05, display: (v) => `${Math.round(v * 100)}%` },
    ];

    sliders.forEach(({ label, key, min, max, step, display }) => {
      const item = document.createElement('div');
      const value = settings[key] as number;
      item.innerHTML = `
        <label style="display:block; margin-bottom:5px; color:#aaa; font-size:14px;">${label}: <span id="vn-setting-${key}-val">${display ? display(value) : value}</span></label>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${value}"
          style="width:100%; accent-color:#88ccff;" id="vn-setting-${key}">
      `;
      const input = item.querySelector('input')!;
      const valSpan = item.querySelector(`#vn-setting-${key}-val`)!;
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        valSpan.textContent = display ? display(v) : String(v);
        onUpdate({ [key]: v } as Partial<GameSettings>);
      });
      grid.appendChild(item);
    });

    this.settingsPanel.appendChild(grid);
  }

  hideSettings(): void {
    this.settingsPanel.style.display = 'none';
  }

  // --- Save/Load Panel ---

  /**
   * Show save or load panel
   */
  showSaveLoadPanel(
    mode: 'save' | 'load',
    saves: (import('./types').SaveData | null)[],
    onSlotClick: (slot: number) => void
  ): void {
    this.saveLoadPanel.innerHTML = '';
    this.saveLoadPanel.style.display = 'block';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;';
    header.innerHTML = `<h2 style="margin:0; color:#fff;">${mode === 'save' ? '存档' : '读档'}</h2>`;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ 关闭';
    closeBtn.style.cssText = 'background:rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.3); padding:6px 16px; cursor:pointer; border-radius:4px;';
    closeBtn.addEventListener('click', () => this.hideSaveLoadPanel());
    header.appendChild(closeBtn);
    this.saveLoadPanel.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px;';

    saves.forEach((save, index) => {
      const slot = document.createElement('div');
      slot.style.cssText = `
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 100px;
      `;
      slot.addEventListener('mouseenter', () => {
        slot.style.borderColor = 'rgba(255,255,255,0.4)';
        slot.style.background = 'rgba(255,255,255,0.1)';
      });
      slot.addEventListener('mouseleave', () => {
        slot.style.borderColor = 'rgba(255,255,255,0.15)';
        slot.style.background = 'rgba(255,255,255,0.05)';
      });

      if (save) {
        const date = new Date(save.timestamp);
        const timeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        slot.innerHTML = `
          <div style="font-size:12px; color:#888; margin-bottom:5px;">${index === 0 ? '自动存档' : `存档 ${index}`}</div>
          <div style="font-size:14px; color:#fff; margin-bottom:5px;">${save.chapter || '未知章节'}</div>
          <div style="font-size:12px; color:#aaa;">${timeStr}</div>
        `;
      } else {
        slot.innerHTML = `
          <div style="font-size:12px; color:#888; margin-bottom:5px;">${index === 0 ? '自动存档' : `存档 ${index}`}</div>
          <div style="font-size:14px; color:#666; margin-top:20px; text-align:center;">空</div>
        `;
      }

      slot.addEventListener('click', () => {
        if (mode === 'load' && !save) return;
        onSlotClick(index);
        this.hideSaveLoadPanel();
      });

      grid.appendChild(slot);
    });

    this.saveLoadPanel.appendChild(grid);
  }

  hideSaveLoadPanel(): void {
    this.saveLoadPanel.style.display = 'none';
  }

  // --- Chapter Card ---

  /**
   * Show chapter title card
   */
  async showChapterCard(title: string, subtitle?: string, duration = 3000): Promise<void> {
    this.chapterCard.innerHTML = `
      <div style="font-size: 36px; font-weight: bold; text-shadow: 2px 2px 8px rgba(0,0,0,0.8); margin-bottom: 10px;">${title}</div>
      ${subtitle ? `<div style="font-size: 20px; color: #ccc; text-shadow: 1px 1px 4px rgba(0,0,0,0.8);">${subtitle}</div>` : ''}
    `;
    this.chapterCard.style.display = 'block';
    this.chapterCard.style.animation = 'vn-slideIn 0.5s ease';
    this.chapterCard.style.opacity = '1';

    await new Promise((r) => setTimeout(r, duration - 500));

    this.chapterCard.style.transition = 'opacity 0.5s ease';
    this.chapterCard.style.opacity = '0';

    await new Promise((r) => setTimeout(r, 500));
    this.chapterCard.style.display = 'none';
    this.chapterCard.style.transition = '';
  }

  // --- Notifications ---

  /**
   * Show a toast notification
   */
  showNotification(message: string, duration = 3000): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(0,0,0,0.8);
      color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      border: 1px solid rgba(255,255,255,0.2);
      animation: vn-notification ${duration}ms ease forwards;
      pointer-events: none;
      backdrop-filter: blur(4px);
    `;
    toast.textContent = message;
    this.notificationArea.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  // --- Input Dialog ---

  /**
   * Show text input dialog
   */
  showInput(prompt: string, maxLength = 20): Promise<string> {
    return new Promise((resolve) => {
      this.inputOverlay.style.display = 'flex';
      this.inputOverlay.innerHTML = `
        <div style="background:rgba(20,20,30,0.95); padding:30px 40px; border-radius:10px; border:1px solid rgba(255,255,255,0.2); text-align:center; min-width:300px;">
          <div style="color:#fff; font-size:18px; margin-bottom:20px;">${prompt}</div>
          <input type="text" maxlength="${maxLength}" style="
            width:100%; padding:10px; font-size:18px; box-sizing:border-box;
            background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.3);
            color:#fff; border-radius:4px; outline:none; text-align:center;
          " id="vn-input-field">
          <button style="
            margin-top:15px; padding:8px 30px; font-size:16px;
            background:rgba(100,150,255,0.3); color:#fff;
            border:1px solid rgba(100,150,255,0.5); border-radius:4px;
            cursor:pointer;
          " id="vn-input-confirm">确认</button>
        </div>
      `;

      const input = this.inputOverlay.querySelector('#vn-input-field') as HTMLInputElement;
      const confirmBtn = this.inputOverlay.querySelector('#vn-input-confirm') as HTMLButtonElement;

      input.focus();

      const submit = () => {
        const value = input.value.trim() || '玩家';
        this.inputOverlay.style.display = 'none';
        this.inputOverlay.innerHTML = '';
        resolve(value);
      };

      confirmBtn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    });
  }

  // --- Quick Menu Actions ---

  private handleQuickMenuAction(action: string): void {
    this.eventBus.emit(`ui:${action}`);
  }

  // --- Keyboard Shortcuts ---

  private handleKeyboard(e: KeyboardEvent): void {
    // Don't handle if input is focused
    if (document.activeElement?.tagName === 'INPUT') return;

    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        this.handleClick();
        break;
      case 'Escape':
        this.hideHistory();
        this.hideSettings();
        this.hideSaveLoadPanel();
        break;
      case 'h':
      case 'H':
        this.eventBus.emit('ui:history');
        break;
      case 's':
        if (e.ctrlKey) {
          e.preventDefault();
          this.eventBus.emit('ui:save');
        }
        break;
      case 'l':
        if (e.ctrlKey) {
          e.preventDefault();
          this.eventBus.emit('ui:load');
        }
        break;
    }
  }

  // --- UI Visibility ---

  /**
   * Hide all UI (for screenshot / CG viewing)
   */
  hideAllUI(): void {
    this.uiLayer.style.opacity = '0';
    this.uiLayer.style.pointerEvents = 'none';
  }

  /**
   * Show all UI
   */
  showAllUI(): void {
    this.uiLayer.style.opacity = '1';
    this.uiLayer.style.pointerEvents = 'auto';
  }

  /**
   * Update settings reference
   */
  updateSettings(settings: GameSettings): void {
    this.currentSettings = settings;
    this.dialogueText.style.fontSize = `${settings.fontSize}px`;
    this.dialogueText.style.fontFamily = settings.fontFamily;
  }

  /**
   * Check if any panel is open
   */
  isPanelOpen(): boolean {
    return (
      this.historyPanel.style.display !== 'none' ||
      this.settingsPanel.style.display !== 'none' ||
      this.saveLoadPanel.style.display !== 'none' ||
      this.inputOverlay.style.display !== 'none'
    );
  }

  /**
   * Destroy UI
   */
  destroy(): void {
    this.stopTypewriter();
    this.uiLayer.innerHTML = '';
  }
}
